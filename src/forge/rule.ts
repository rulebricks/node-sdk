import { RulebricksClient } from "../Client.js";
import type { RuleImportPayload } from "../api/types/RuleImportPayload.js";
import { RulebricksError } from "../errors/index.js";
import { RuleType, Field, RuleSettings, OperatorResult } from "./types.js";
import { BooleanField, NumberField, StringField, DateField, ListField } from "./operators.js";

/** Request-specific configuration accepted by the underlying rule import endpoint. */
type PushRequestOptions = Parameters<RulebricksClient["assets"]["rules"]["push"]>[1];

/**
 * Raised when the workspace rejects a rule update or publish — for example,
 * when a publish is blocked because critical tests are failing. The message
 * is the human-readable error returned by the API; the HTTP status code and
 * response body are preserved for programmatic handling.
 */
export class RulePublishError extends Error {
    public readonly statusCode?: number;
    public readonly body?: unknown;

    constructor(message: string, statusCode?: number, body?: unknown) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
        this.name = "RulePublishError";
        this.statusCode = statusCode;
        this.body = body;
    }
}

/**
 * Convert an API error from the rule import endpoint into a RulePublishError
 * carrying the API's message. Non-API errors (timeouts, network failures)
 * are returned unchanged.
 */
function toRulePublishError(error: unknown): unknown {
    if (!(error instanceof RulebricksError)) {
        return error;
    }
    const body = error.body;
    const apiMessage =
        body !== null && typeof body === "object" && typeof (body as Record<string, unknown>).error === "string"
            ? ((body as Record<string, unknown>).error as string)
            : undefined;
    return new RulePublishError(apiMessage ?? error.message, error.statusCode, body);
}

export class RuleTest {
    id: string;
    name: string;
    request: Record<string, any>;
    response: Record<string, any>;
    critical: boolean;
    lastExecuted: string | null;
    testState: string | null;
    error: string | null;
    success: boolean | null;

    constructor() {
        this.id = this.generateId();
        this.name = "Untitled Test";
        this.request = {};
        this.response = {};
        this.critical = false;
        this.lastExecuted = null;
        this.testState = null;
        this.error = null;
        this.success = null;
    }

    private generateId(): string {
        return Array.from(
            { length: 21 },
            () => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 62)]
        ).join("");
    }

    setName(name: string): RuleTest {
        this.name = name;
        return this;
    }

    expect(request: Record<string, any>, response: Record<string, any>): RuleTest {
        this.request = request;
        this.response = response;
        return this;
    }

    isCritical(critical: boolean = true): RuleTest {
        this.critical = critical;
        return this;
    }

    toDict(): Record<string, any> {
        return {
            id: this.id,
            name: this.name,
            request: this.request,
            response: this.response,
            critical: this.critical,
            lastExecuted: this.lastExecuted,
            testState: this.testState,
            error: this.error,
            success: this.success,
        };
    }

    static fromJSON(data: string | Record<string, any>): RuleTest {
        const jsonData = typeof data === "string" ? JSON.parse(data) : data;

        if (typeof jsonData !== "object") {
            throw new Error("Input must be a dictionary or JSON object");
        }

        const test = new RuleTest();
        test.id = jsonData.id || test.generateId();
        test.name = jsonData.name || "Untitled Test";
        test.request = jsonData.request || {};
        test.response = jsonData.response || {};
        test.critical = jsonData.critical || false;
        test.lastExecuted = jsonData.lastExecuted || null;
        test.testState = jsonData.testState || null;
        test.error = jsonData.error || null;
        test.success = jsonData.success || null;

        return test;
    }
}

export class Condition {
    private index: number | null;
    private conditions: Record<string, [string, any[]]>;
    public request: Record<string, { op: string; args: any[] }> = {};
    public response: Record<string, { value: any }> = {};
    public settings: {
        enabled: boolean;
        groupId: string | null;
        priority: number;
        schedule: Record<string, unknown>[];
        or?: boolean;
    };

    constructor(
        private rule: Rule,
        conditions: Record<string, [string, any[]]> = {},
        index: number | null = null,
        settings: Partial<Condition["settings"]> = {}
    ) {
        this.index = index;
        this.conditions = conditions;
        this.settings = {
            enabled: true,
            groupId: null,
            priority: 0,
            schedule: [],
            or: false,
            ...settings,
        };
    }

    // Helper to process vocabulary values
    private processVocabularyValues(arg: any): any {
        if (arg && typeof arg === "object" && arg.$rb) {
            return arg;
        } else if (Array.isArray(arg)) {
            return arg.map((item) => this.processVocabularyValues(item));
        } else if (arg && typeof arg === "object") {
            return Object.entries(arg).reduce((acc, [key, value]) => {
                acc[key] = this.processVocabularyValues(value);
                return acc;
            }, {} as Record<string, any>);
        }
        return arg;
    }

    when(conditions: Record<string, [string, any[]]>): Condition {
        for (const [fieldName, [operator, args]] of Object.entries(conditions)) {
            if (!(fieldName in this.rule.fields)) {
                throw new Error(`Field '${fieldName}' is not defined in request schema`);
            }

            if (this.index !== null) {
                // Editing existing condition
                this.rule.conditions[this.index].request[fieldName] = {
                    op: operator,
                    args: args.map((arg) => this.processVocabularyValues(arg)),
                };
            } else {
                // Creating new condition
                this.conditions[fieldName] = [operator, args];
            }
        }
        return this;
    }

    then(responses: Record<string, any>): Rule | Condition {
        for (const [fieldName, value] of Object.entries(responses)) {
            if (!(fieldName in this.rule.responseFields)) {
                throw new Error(`Field '${fieldName}' is not defined in response schema`);
            }
        }

        if (this.index !== null) {
            // Editing existing condition
            for (const [fieldName, value] of Object.entries(responses)) {
                this.rule.conditions[this.index].response[fieldName] = {
                    value: this.processVocabularyValues(value),
                };
            }
            return this;
        } else {
            // Creating new condition
            this.response = responses;
            const condition = {
                request: {},
                response: {},
                settings: this.settings,
            };

            // Process conditions
            for (const [fieldName, [operator, args]] of Object.entries(this.conditions)) {
                (condition.request as Record<string, any>)[fieldName] = {
                    op: operator,
                    args: args.map((arg) => this.processVocabularyValues(arg)),
                };
            }

            // Process responses
            for (const [fieldName, value] of Object.entries(this.response)) {
                (condition.response as Record<string, any>)[fieldName] = {
                    value: this.processVocabularyValues(value),
                };
            }

            this.rule.conditions.push(condition as Condition);
            return this.rule;
        }
    }

    setPriority(priority: number): Condition {
        this.settings.priority = priority;
        if (this.index !== null) {
            this.rule.conditions[this.index].settings.priority = priority;
        }
        return this;
    }

    enable(): Condition {
        this.settings.enabled = true;
        if (this.index !== null) {
            this.rule.conditions[this.index].settings.enabled = true;
        }
        return this;
    }

    disable(): Condition {
        this.settings.enabled = false;
        if (this.index !== null) {
            this.rule.conditions[this.index].settings.enabled = false;
        }
        return this;
    }

    delete(): void {
        if (this.index !== null) {
            this.rule.conditions.splice(this.index, 1);
        }
    }

    toString(): string {
        return this.index !== null ? `<Condition: Row ${this.index}>` : "<Condition: New>";
    }

    [Symbol.toStringTag](): string {
        return this.toString();
    }

    [Symbol.for("nodejs.util.inspect.custom")]() {
        return this.toString();
    }

    toJSON(): Record<string, any> {
        return {
            request: this.request,
            response: this.response,
            settings: this.settings,
        };
    }
}

export class Rule {
    public id: string = this.generateUUID();
    public name: string = "Untitled Rule";
    public description: string = "";
    public folderId: string | null = null;
    public slug: string = this.generateSlug();
    public createdAt: string = new Date().toISOString();
    public updatedAt: string = this.createdAt;
    public updatedBy: string = "Rulebricks Forge SDK";
    public published: boolean = false;

    private workspace?: RulebricksClient;
    private sampleRequest: Record<string, any> = {};
    private sampleResponse: Record<string, any> = {};
    public testRequest: Record<string, any> = {};
    private testSuite: RuleTest[] = [];
    public fields: Record<string, Field> = {};
    public responseFields: Record<string, Field> = {};
    public conditions: Condition[] = [];
    private groups: Record<string, any> = {};
    private publishedRequestSchema: any[] | null = null;
    private publishedResponseSchema: any[] | null = null;
    private publishedConditions: any[] | null = null;
    private publishedGroups: Record<string, any> | null = null;

    private history: any[] = [];
    private form: any | null = null;
    public accessGroups: string[] = [];
    public settings: RuleSettings = {
        testing: false,
        schemaValidation: false,
        allProperties: false,
        lockSchema: false,
    };

    constructor() {}

    private generateUUID(): string {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }

    private generateSlug(length: number = 10): string {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    }

    private getFieldType(field: BooleanField | NumberField | StringField | DateField | ListField): RuleType {
        if (field instanceof BooleanField) return RuleType.BOOLEAN;
        if (field instanceof NumberField) return RuleType.NUMBER;
        if (field instanceof StringField) return RuleType.STRING;
        if (field instanceof DateField) return RuleType.DATE;
        if (field instanceof ListField) return RuleType.LIST;
        return RuleType.STRING; // Default fallback
    }

    setWorkspace(client: RulebricksClient): Rule {
        this.workspace = client;
        return this;
    }

    setName(name: string): Rule {
        this.name = name;
        return this;
    }

    setDescription(description: string): Rule {
        this.description = description;
        return this;
    }

    async setFolder(folderName: string, createIfMissing: boolean = false): Promise<Rule> {
        if (!this.workspace) {
            throw new Error("A Rulebricks client is required to set a folder by name");
        }
        const folders = await this.workspace.assets.folders.list();
        let folder = folders.find((f) => f.name === folderName);

        if (!folder && createIfMissing) {
            if (folders.some((f) => f.name === folderName)) {
                throw new Error("Folder name conflicts with an existing folder");
            }
            folder = await this.workspace.assets.folders.upsert({ name: folderName });
        }

        if (!folder) {
            throw new Error(`Folder '${folderName}' not found and createIfMissing is false`);
        }

        this.folderId = folder.id || null;
        return this;
    }

    setFolderById(folderId: string): Rule {
        this.folderId = folderId;
        return this;
    }

    async setAlias(alias: string): Promise<Rule> {
        if (!this.workspace) {
            throw new Error("A Rulebricks client is required to set an alias");
        }

        if (alias.length < 3) {
            throw new Error("Alias must be at least 3 characters long");
        }

        if (alias.includes("/") || alias.includes("\\") || alias.includes(" ")) {
            throw new Error("Alias cannot contain slashes or spaces");
        }

        const validChars = /^[a-zA-Z0-9\-_]+$/;
        if (!validChars.test(alias)) {
            throw new Error("Alias cannot contain special characters");
        }

        const rules = await this.workspace.assets.rules.list();
        if (rules.some((r) => r.slug === alias && r.id !== this.id)) {
            throw new Error("Alias conflicts with an existing rule");
        }

        this.slug = alias;
        return this;
    }

    addBooleanField(name: string, description: string = "", defaultValue: boolean = false): BooleanField {
        const field = new BooleanField(name, description, defaultValue);
        this.fields[name] = field;
        return field;
    }

    addNumberField(name: string, description: string = "", defaultValue: number = 0): NumberField {
        const field = new NumberField(name, description, defaultValue);
        this.fields[name] = field;
        return field;
    }

    addStringField(name: string, description: string = "", defaultValue: string = ""): StringField {
        const field = new StringField(name, description, defaultValue);
        this.fields[name] = field;
        return field;
    }

    addDateField(name: string, description: string = "", defaultValue?: Date): DateField {
        const field = new DateField(name, description, defaultValue);
        this.fields[name] = field;
        return field;
    }

    addListField(name: string, description: string = "", defaultValue: any[] = []): ListField {
        const field = new ListField(name, description, defaultValue);
        this.fields[name] = field;
        return field;
    }

    enableContinuousTesting(enabled: boolean = true): Rule {
        this.settings.testing = enabled;
        return this;
    }

    enableSchemaValidation(enabled: boolean = true): Rule {
        this.settings.schemaValidation = enabled;
        return this;
    }

    requireAllProperties(enabled: boolean = true): Rule {
        this.settings.allProperties = enabled;
        return this;
    }

    lockSchema(enabled: boolean = true): Rule {
        this.settings.lockSchema = enabled;
        return this;
    }

    async addAccessGroup(groupName: string, createIfMissing: boolean = false): Promise<Rule> {
        if (!this.workspace) {
            throw new Error("A Rulebricks client is required to manage access groups");
        }

        const existingGroups = await this.workspace.users.groups.list();
        let group = existingGroups.find((g) => g.name === groupName);

        if (!group && !createIfMissing) {
            throw new Error(`User group '${groupName}' not found and createIfMissing is False`);
        }

        if (!group && createIfMissing) {
            group = await this.workspace.users.groups.create({ name: groupName });
        }

        if (!this.accessGroups.includes(groupName)) {
            this.accessGroups.push(groupName);
        }

        return this;
    }

    removeAccessGroup(groupName: string): Rule {
        const index = this.accessGroups.indexOf(groupName);
        if (index !== -1) {
            this.accessGroups.splice(index, 1);
        }
        return this;
    }

    addBooleanResponse(name: string, description: string = "", defaultValue: boolean = false): BooleanField {
        const field = new BooleanField(name, description, defaultValue);
        this.responseFields[name] = field;
        return field;
    }

    addNumberResponse(name: string, description: string = "", defaultValue: number = 0): NumberField {
        const field = new NumberField(name, description, defaultValue);
        this.responseFields[name] = field;
        return field;
    }

    addStringResponse(name: string, description: string = "", defaultValue: string = ""): StringField {
        const field = new StringField(name, description, defaultValue);
        this.responseFields[name] = field;
        return field;
    }

    addDateResponse(name: string, description: string = "", defaultValue?: Date): DateField {
        const field = new DateField(name, description, defaultValue);
        this.responseFields[name] = field;
        return field;
    }

    addListResponse(name: string, description: string = "", defaultValue: any[] = []): ListField {
        const field = new ListField(name, description, defaultValue);
        this.responseFields[name] = field;
        return field;
    }

    findConditions(conditions: Record<string, [string, any[]]>): Condition[] {
        return this.conditions
            .map((condition, index) => {
                let matchesAll = Object.entries(conditions).every(([field, [operator, args]]) => {
                    const request = condition.request[field];
                    if (!request) return false;

                    if (request.op !== operator) return false;

                    // Handle vocabulary values
                    const requestArgs = request.args.map((arg) =>
                        typeof arg === "object" && arg.$rb ? arg.name.toUpperCase() : String(arg)
                    );

                    const searchArgs = args.map((arg) =>
                        typeof arg === "object" && arg.$rb ? arg.name.toUpperCase() : String(arg)
                    );

                    return JSON.stringify(requestArgs) === JSON.stringify(searchArgs);
                });
                if (matchesAll) {
                    const convertedRequest: Record<string, [string, any[]]> = {};
                    for (const [field, value] of Object.entries(condition.request)) {
                        convertedRequest[field] = [value.op, value.args];
                    }
                    return new Condition(this, convertedRequest, index, condition.settings);
                }
                return null;
            })
            .filter((condition): condition is Condition => condition !== null);
    }

    // Helper method to get proper field instances
    private getField(name: string, type: string): BooleanField | NumberField | StringField | DateField | ListField {
        const field = this.fields[name];
        if (!field) {
            throw new Error(`Field '${name}' not found in request schema`);
        }

        const expectedType = this.getFieldType(
            field as BooleanField | NumberField | StringField | DateField | ListField
        );
        if (expectedType !== type) {
            throw new Error(`Field '${name}' is not a ${type.toLowerCase()} field`);
        }

        return field as BooleanField | NumberField | StringField | DateField | ListField;
    }

    getBooleanField(name: string): BooleanField {
        return this.getField(name, RuleType.BOOLEAN) as BooleanField;
    }

    getNumberField(name: string): NumberField {
        return this.getField(name, RuleType.NUMBER) as NumberField;
    }

    getStringField(name: string): StringField {
        return this.getField(name, RuleType.STRING) as StringField;
    }

    getDateField(name: string): DateField {
        return this.getField(name, RuleType.DATE) as DateField;
    }

    getListField(name: string): ListField {
        return this.getField(name, RuleType.LIST) as ListField;
    }

    when(conditions: Record<string, OperatorResult> = {}): Condition {
        const condition = new Condition(this, conditions);
        return condition;
    }

    any(conditions: Record<string, OperatorResult>): Condition {
        const condition = new Condition(this, conditions, null, { or: true });
        return condition;
    }

    getConditions(): Condition[] {
        return this.conditions;
    }

    getConditionCount(): number {
        return this.conditions.length;
    }

    addTest(test: RuleTest): Rule {
        const existingTest = this.findTestById(test.id);
        if (existingTest) {
            Object.assign(existingTest, {
                name: test.name,
                request: test.request,
                response: test.response,
                critical: test.critical,
            });
        } else {
            this.testSuite.push(test);
        }
        return this;
    }

    removeTest(testId: string): Rule {
        this.testSuite = this.testSuite.filter((t) => t.id !== testId);
        return this;
    }

    findTestById(testId: string): RuleTest | undefined {
        return this.testSuite.find((t) => t.id === testId);
    }

    findTestByName(name: string): RuleTest | undefined {
        return this.testSuite.find((t) => t.name === name);
    }

    async update(requestOptions?: PushRequestOptions): Promise<Rule> {
        if (!this.workspace) {
            throw new Error("Workspace not set. Call setWorkspace() before updating the rule.");
        }
        const ruleData = this.toDict();
        try {
            await this.workspace.assets.rules.push({ rule: ruleData }, requestOptions);
        } catch (error) {
            throw toRulePublishError(error);
        }
        return this;
    }

    async publish(requestOptions?: PushRequestOptions): Promise<Rule> {
        if (!this.workspace) {
            throw new Error("A Rulebricks client is required to publish a rule");
        }
        const ruleData = this.toDict();
        ruleData._publish = true;
        try {
            await this.workspace.assets.rules.push({ rule: ruleData }, requestOptions);
        } catch (error) {
            throw toRulePublishError(error);
        }
        return this;
    }

    async fromWorkspace(ruleId: string): Promise<Rule> {
        if (!this.workspace) {
            throw new Error("A Rulebricks client is required to load a rule from the workspace");
        }
        const workspace = this.workspace;
        const ruleData = await workspace.assets.rules.pull({ id: ruleId });
        const rule = Rule.fromJSON(ruleData);
        Object.assign(this, rule);
        this.workspace = workspace;
        return this;
    }

    toDict(): RuleImportPayload {
        let sampleRequest = this.sampleRequest || {};
        let sampleResponse = this.sampleResponse || {};

        for (const [name, field] of Object.entries(this.fields)) {
            const parts = name.split(".");
            let current = sampleRequest;
            for (const part of parts.slice(0, -1)) {
                current = current[part] = current[part] || {};
            }
            current[parts[parts.length - 1]] = field.defaultValue;
        }
        for (const [name, field] of Object.entries(this.responseFields)) {
            const parts = name.split(".");
            let current = sampleResponse;
            for (const part of parts.slice(0, -1)) {
                current = current[part] = current[part] || {};
            }
            current[parts[parts.length - 1]] = field.defaultValue;
        }

        const caseAndSpace = (str: string) => {
            let titleCase = str.replace(
                /\w\S*/g,
                (text: string) => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
            );
            // Replace underscores and any special characters with spaces
            return titleCase.replace(/_/g, " ").replace(/[^a-zA-Z0-9 ]/g, "");
        };

        const fields = Object.entries(this.fields).map(([name, field]) => ({
            name: field.name === name ? caseAndSpace(name) : field.name,
            key: field.key || name,
            type: field.type,
            description: field.description,
            defaultValue: field.defaultValue,
            show: true,
        }));

        const responseFields = Object.entries(this.responseFields).map(([name, field]) => ({
            name: field.name === name ? caseAndSpace(name) : field.name,
            key: field.key || name,
            type: field.type,
            description: field.description,
            defaultValue: field.defaultValue,
            show: true,
        }));

        const ruleData: RuleImportPayload = {
            id: this.id,
            name: this.name,
            description: this.description,
            tag: this.folderId,
            slug: this.slug,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            updatedBy: this.updatedBy,
            settings: { ...this.settings },
            accessGroups: this.accessGroups,
            requestSchema: fields,
            responseSchema: responseFields,
            conditions: this.conditions,
            testSuite: this.testSuite.map((test) => test.toDict()),
            form: this.form,
            history: this.history,
            published: this.published,
            sampleRequest: sampleRequest,
            sampleResponse: sampleResponse,
            testRequest:
                this.testRequest && Object.keys(this.testRequest).length > 0 ? this.testRequest : sampleRequest,
            groups: this.groups,
            no_conditions: this.conditions.length,
        };

        if (this.publishedRequestSchema !== null) {
            ruleData.published_requestSchema = this.publishedRequestSchema;
        }
        if (this.publishedResponseSchema !== null) {
            ruleData.published_responseSchema = this.publishedResponseSchema;
        }
        if (this.publishedConditions !== null) {
            ruleData.published_conditions = this.publishedConditions;
        }
        if (this.publishedGroups !== null) {
            ruleData.published_groups = this.publishedGroups;
        }

        return ruleData;
    }

    toJSON(): string {
        return JSON.stringify(
            this.toDict(),
            (_, value) => {
                if (value instanceof Date) {
                    return value.toISOString();
                }
                return value;
            },
            2
        );
    }

    static fromJSON(data: string | Record<string, any>): Rule {
        const jsonData = typeof data === "string" ? JSON.parse(data) : data;
        const rule = new Rule();

        rule.id = jsonData.id ?? rule.id;
        rule.name = jsonData.name ?? rule.name;
        rule.description = jsonData.description ?? rule.description;
        rule.folderId = jsonData.tag ?? null;
        rule.slug = jsonData.slug ?? rule.slug;
        rule.createdAt = jsonData.createdAt ?? rule.createdAt;
        rule.updatedAt = jsonData.updatedAt ?? rule.updatedAt;
        rule.updatedBy = jsonData.updatedBy ?? rule.updatedBy;
        rule.settings = jsonData.settings || rule.settings;
        rule.accessGroups = jsonData.accessGroups || [];
        rule.conditions = jsonData.conditions || [];

        const readPublishedSnapshot = (snakeCaseKey: string, camelCaseKey: string): any => {
            if (Object.prototype.hasOwnProperty.call(jsonData, snakeCaseKey)) {
                return jsonData[snakeCaseKey] ?? null;
            }
            if (Object.prototype.hasOwnProperty.call(jsonData, camelCaseKey)) {
                return jsonData[camelCaseKey] ?? null;
            }
            return null;
        };

        rule.publishedRequestSchema = readPublishedSnapshot("published_requestSchema", "publishedRequestSchema");
        rule.publishedResponseSchema = readPublishedSnapshot("published_responseSchema", "publishedResponseSchema");
        rule.publishedConditions = readPublishedSnapshot("published_conditions", "publishedConditions");
        rule.publishedGroups = readPublishedSnapshot("published_groups", "publishedGroups");
        rule.form = jsonData.form ?? null;
        rule.history = jsonData.history || [];
        rule.published = jsonData.published ?? false;
        rule.sampleRequest = jsonData.sampleRequest || {};
        rule.sampleResponse = jsonData.sampleResponse || {};
        rule.testRequest = jsonData.testRequest || {};
        rule.groups = jsonData.groups || {};

        const caseAndSpace = (str: string) => {
            let titleCase = str.replace(
                /\w\S*/g,
                (text: string) => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
            );
            // Replace underscores and any special characters with spaces
            return titleCase.replace(/_/g, " ").replace(/[^a-zA-Z0-9 ]/g, "");
        };

        const hydrateField = (fieldData: any): Field | null => {
            const key = fieldData.key ?? fieldData.name;
            if (typeof key !== "string") {
                return null;
            }

            const name = fieldData.name || caseAndSpace(key);
            const description = fieldData.description || "";
            let field: Field;

            switch (fieldData.type) {
                case RuleType.BOOLEAN:
                    field = new BooleanField(name, description, fieldData.defaultValue);
                    break;
                case RuleType.NUMBER:
                    field = new NumberField(name, description, fieldData.defaultValue);
                    break;
                case RuleType.STRING:
                    field = new StringField(name, description, fieldData.defaultValue);
                    break;
                case RuleType.DATE:
                    field = new DateField(name, description, fieldData.defaultValue);
                    break;
                case RuleType.LIST:
                    field = new ListField(name, description, fieldData.defaultValue);
                    break;
                default:
                    return null;
            }

            return Object.assign(field, { key });
        };

        // Convert request schema to fields
        const requestSchema = Array.isArray(jsonData.requestSchema) ? jsonData.requestSchema : [];
        requestSchema.forEach((fieldData: any) => {
            const field = hydrateField(fieldData);
            if (field) {
                rule.fields[field.key as string] = field;
            }
        });

        // Convert response schema to fields
        const responseSchema = Array.isArray(jsonData.responseSchema) ? jsonData.responseSchema : [];
        responseSchema.forEach((fieldData: any) => {
            const field = hydrateField(fieldData);
            if (field) {
                rule.responseFields[field.key as string] = field;
            }
        });

        // Convert test suite
        rule.testSuite = (jsonData.testSuite || []).map((testData: any) => RuleTest.fromJSON(testData));

        return rule;
    }

    getEditorUrl(): string {
        if (!this.workspace) {
            throw new Error("Workspace not configured. Call setWorkspace() first.");
        }
        return `https://rulebricks.com/dashboard/${this.id}`;
    }

    /**
     * Format a condition argument or response value for table display.
     * Vocabulary value references render as their uppercased name, and lists
     * are formatted item by item so references nested inside list payloads
     * (which may mix literals and references) stay readable.
     */
    private formatTableValue(value: any): string {
        if (Array.isArray(value)) {
            return `[${value.map((item) => this.formatTableValue(item)).join(", ")}]`;
        }
        if (value && typeof value === "object" && "$rb" in value) {
            return String(value.name).toUpperCase();
        }
        return String(value);
    }

    toTable(): string {
        const header = ["Condition", ...Object.keys(this.fields), "Response"];
        const rows: string[][] = [];

        this.conditions.forEach((condition, index) => {
            const row: string[] = [`#${index + 1}`];

            // Add request conditions
            Object.keys(this.fields).forEach((fieldName) => {
                const cond = condition.request[fieldName];
                row.push(cond ? `${cond.op} ${cond.args.map((arg) => this.formatTableValue(arg)).join(", ")}` : "-");
            });

            // Add response
            const responseStr = Object.entries(condition.response)
                .map(([key, value]) => `${key}: ${this.formatTableValue(value.value)}`)
                .join(", ");
            row.push(responseStr || "-");

            rows.push(row);
        });

        // Format as ASCII table
        const maxLengths = header.map((_, colIndex) =>
            Math.max(header[colIndex].length, ...rows.map((row) => row[colIndex].length))
        );

        const separator = maxLengths.map((len) => "-".repeat(len)).join("-+-");
        const formatRow = (row: string[]) => row.map((cell, i) => cell.padEnd(maxLengths[i])).join(" | ");

        return [formatRow(header), separator, ...rows.map(formatRow)].join("\n");
    }

    toString(): string {
        return `Rule(name="${this.name}", id="${this.id}", conditions=${this.conditions.length})`;
    }
}
