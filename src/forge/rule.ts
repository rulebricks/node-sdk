import { RulebricksApiClient } from "../Client.js";
import { RuleType, Field, RuleTest, RuleSettings, OperatorResult } from "./types.js";
import { BooleanField, NumberField, StringField, DateField, ListField } from "./operators.js";

export class Condition {
    request: Record<string, { op: string; args: any[] }> = {};
    response: Record<string, { value: any }> = {};
    settings: {
        enabled: boolean;
        groupId?: string | null;
        priority: number;
        schedule: any[];
        or?: boolean;
    } = {
        enabled: true,
        groupId: null,
        priority: 0,
        schedule: [],
        or: false,
    };

    constructor(private rule: Rule) {}

    setRequest(conditions: Record<string, OperatorResult>): Condition {
        this.request = Object.entries(conditions).reduce((acc, [key, value]) => {
            const [op, args] = value;
            acc[key] = { op, args };
            return acc;
        }, {} as Record<string, { op: string; args: any[] }>);
        return this;
    }

    then(responses: Record<string, any>): Rule {
        this.response = Object.entries(responses).reduce((acc, [key, value]) => {
            acc[key] = { value };
            return acc;
        }, {} as Record<string, { value: any }>);
        return this.rule;
    }

    setPriority(priority: number): Condition {
        this.settings.priority = priority;
        return this;
    }

    enable(): Condition {
        this.settings.enabled = true;
        return this;
    }

    disable(): Condition {
        this.settings.enabled = false;
        return this;
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

    private workspace?: RulebricksApiClient;
    private sampleRequest: Record<string, any> = {};
    private sampleResponse: Record<string, any> = {};
    public testRequest: Record<string, any> = {};
    private testSuite: RuleTest[] = [];
    private fields: Record<string, Field> = {};
    private responseFields: Record<string, Field> = {};
    public conditions: Condition[] = [];
    private groups: Record<string, any> = {};
    private publishedRequestSchema: any[] | null = null;
    private publishedResponseSchema: any[] | null = null;
    private publishedConditions: any[] | null = null;
    private publishedGroups: Record<string, any> | null = {};

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

    setWorkspace(client: RulebricksApiClient): Rule {
        this.workspace = client;
        return this;
    }

    setName(name: string): Rule {
        this.name = name;
        this.slug = this.generateSlug();
        return this;
    }

    setDescription(description: string): Rule {
        this.description = description;
        return this;
    }

    setFolder(folderName: string, createIfMissing: boolean = false): Rule {
        if (!this.workspace) {
            throw new Error("A Rulebricks client is required to set a folder by name");
        }
        return this;
    }

    setFolderById(folderId: string): Rule {
        this.folderId = folderId;
        return this;
    }

    setAlias(alias: string): Rule {
        if (!this.workspace) {
            throw new Error("A Rulebricks client is required to set an alias");
        }
        if (alias.length < 3) {
            throw new Error("Alias must be at least 3 characters long");
        }
        if (alias.includes("/") || alias.includes("\\") || alias.includes(" ")) {
            throw new Error("Alias cannot contain slashes or spaces");
        }
        if (!/^[a-zA-Z0-9\-_]+$/.test(alias)) {
            throw new Error("Alias cannot contain special characters");
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

    addAccessGroup(groupName: string, createIfMissing: boolean = false): Rule {
        if (!this.workspace) {
            throw new Error("A Rulebricks client is required to manage access groups");
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

    when(conditions: Record<string, OperatorResult> = {}): Condition {
        const condition = new Condition(this);
        condition.setRequest(conditions);
        this.conditions.push(condition);
        return condition;
    }

    any(conditions: Record<string, OperatorResult>): Condition {
        const condition = new Condition(this);
        condition.setRequest(conditions);
        condition.settings.or = true;
        this.conditions.push(condition);
        return condition;
    }

    getConditions(): Condition[] {
        return this.conditions;
    }

    getConditionCount(): number {
        return this.conditions.length;
    }

    addTest(test: RuleTest): void {
        const existingTest = this.findTestById(test.id);
        if (existingTest) {
            Object.assign(existingTest, test);
        } else {
            this.testSuite.push(test);
        }
    }

    removeTest(testId: string): void {
        const test = this.findTestById(testId);
        if (test) {
            this.testSuite = this.testSuite.filter((t) => t.id !== testId);
        }
    }

    findTestById(testId: string): RuleTest | undefined {
        return this.testSuite.find((t) => t.id === testId);
    }

    findTestByName(name: string): RuleTest | undefined {
        return this.testSuite.find((t) => t.name === name);
    }

    async update(): Promise<void> {
        if (!this.workspace) {
            throw new Error("Workspace not set. Call setWorkspace() before updating the rule.");
        }
        const ruleData = this.toDict();
        await this.workspace.assets.importRule({ rule: ruleData });
    }

    async publish(): Promise<Rule> {
        if (!this.workspace) {
            throw new Error("A Rulebricks client is required to publish a rule");
        }
        const ruleDict = this.toDict();
        ruleDict._publish = true;
        await this.workspace.assets.importRule({ rule: ruleDict });
        return this.fromWorkspace(this.id);
    }

    async fromWorkspace(ruleId: string): Promise<Rule> {
        if (!this.workspace) {
            throw new Error("A Rulebricks client is required to load a rule from the workspace");
        }
        const ruleData = await this.workspace.assets.exportRule({
            id: ruleId,
        });
        return Rule.fromJSON(ruleData);
    }

    toDict(): Record<string, any> {
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
            name: caseAndSpace(name),
            key: field.key || name,
            type: field.type,
            description: field.description,
            defaultValue: field.defaultValue,
            show: true,
        }));

        const responseFields = Object.entries(this.responseFields).map(([name, field]) => ({
            name: caseAndSpace(name),
            key: field.key || name,
            type: field.type,
            description: field.description,
            defaultValue: field.defaultValue,
            show: true,
        }));

        return {
            id: this.id,
            name: this.name,
            description: this.description,
            tag: this.folderId,
            slug: this.slug,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            updatedBy: this.updatedBy,
            settings: this.settings,
            accessGroups: this.accessGroups,
            requestSchema: fields,
            responseSchema: responseFields,
            conditions: this.conditions,
            testSuite: this.testSuite.map((test) => ({
                ...test,
                id: test.id || this.generateUUID(),
            })),
            published_requestSchema: this.publishedRequestSchema,
            published_responseSchema: this.publishedResponseSchema,
            published_conditions: this.publishedConditions,
            published_groups: this.publishedGroups,
            form: this.form,
            history: this.history,
            published: this.published,
            sampleRequest: sampleRequest,
            sampleResponse: sampleResponse,
            testRequest: this.testRequest,
            groups: this.groups,
            no_conditions: this.conditions.length,
        };
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

        rule.id = jsonData.id;
        rule.name = jsonData.name;
        rule.description = jsonData.description;
        rule.folderId = jsonData.tag;
        rule.slug = jsonData.slug;
        rule.createdAt = jsonData.createdAt;
        rule.updatedAt = jsonData.updatedAt;
        rule.updatedBy = jsonData.updatedBy;
        rule.settings = jsonData.settings;
        rule.accessGroups = jsonData.accessGroups;
        rule.conditions = jsonData.conditions;
        rule.publishedRequestSchema = jsonData.publishedRequestSchema || null;
        rule.publishedResponseSchema = jsonData.publishedResponseSchema || null;
        rule.publishedConditions = jsonData.publishedConditions || null;
        rule.publishedGroups = jsonData.publishedGroups || {};
        rule.form = jsonData.form || null;
        rule.history = jsonData.history || [];
        rule.published = jsonData.published;
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

        // Convert request schema to fields
        jsonData.requestSchema.forEach((fieldData: any) => {
            const field = {
                key: fieldData.key,
                // start case and replace underscores and any special characters with spaces
                name: fieldData.name || caseAndSpace(fieldData.key),
                type: fieldData.type,
                description: fieldData.description,
                defaultValue: fieldData.defaultValue,
                operators: {},
            } as Field;
            rule.fields[fieldData.name] = field;
        });

        // Convert response schema to fields
        jsonData.responseSchema.forEach((fieldData: any) => {
            const field = {
                key: fieldData.key,
                name: fieldData.name || caseAndSpace(fieldData.key),
                type: fieldData.type,
                description: fieldData.description,
                defaultValue: fieldData.defaultValue,
                operators: {},
            } as Field;
            rule.responseFields[fieldData.name] = field;
        });

        // Convert test suite
        rule.testSuite = jsonData.testSuite.map((test: any) => ({
            id: test.id || rule.generateUUID(),
            name: test.name,
            description: test.description,
            request: test.request,
            response: test.response,
            critical: test.critical,
        }));

        return rule;
    }

    getEditorUrl(): string {
        if (!this.workspace) {
            throw new Error("Workspace not configured. Call setWorkspace() first.");
        }
        return `https://rulebricks.com/dashboard/${this.id}`;
    }

    toTable(): string {
        const header = ["Condition", ...Object.keys(this.fields), "Response"];
        const rows: string[][] = [];

        this.conditions.forEach((condition, index) => {
            const row: string[] = [`#${index + 1}`];

            // Add request conditions
            Object.keys(this.fields).forEach((fieldName) => {
                const cond = condition.request[fieldName];
                row.push(cond ? `${cond.op} ${cond.args.join(", ")}` : "-");
            });

            // Add response
            const responseStr = Object.entries(condition.response)
                .map(([key, value]) => `${key}: ${value.value}`)
                .join("\n");
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
