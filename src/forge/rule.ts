import { RulebricksApi } from '@rulebricks/api';
import { RuleCondition, RuleType, Field, RuleTest, RuleSettings, Rule as RuleInterface, OperatorResult } from './types.js';
import { BooleanField, NumberField, StringField, DateField, ListField } from './operators.js';
import { Condition } from './condition.js';

export class Rule implements RuleInterface {
  private _id: string;
  private name: string = '';
  private description: string = '';
  private folder: string = '';
  private folderId: string = '';
  private alias: string = '';
  public slug: string = '';
  private settings: RuleSettings = {
    testing: false,
    schemaValidation: false,
    requireAllProperties: false,
    schemaLocked: false,
    published: false
  };
  private accessGroups: string[] = [];
  private workspace?: RulebricksApi;
  private conditions: RuleCondition[] = [];
  private fields: Record<string, Field> = {};
  private responseFields: Record<string, Field> = {};
  private testSuite: RuleTest[] = [];
  private publishedRequestSchema: any[] = [];
  private publishedResponseSchema: any[] = [];
  private publishedGroups: Record<string, any> = {};
  private createdAt: string;
  private updatedAt: string;
  private updatedBy: string = 'Rulebricks Forge SDK';

  constructor(rulebricksClient?: RulebricksApi) {
    this._id = this.generateUUID();
    this.workspace = rulebricksClient;
    this.createdAt = new Date().toISOString();
    this.updatedAt = this.createdAt;
    this.slug = this.generateSlug();
  }

  get id(): string {
    return this._id;
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private generateSlug(length: number = 10): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  private getFieldType(field: BooleanField | NumberField | StringField | DateField | ListField): RuleType {
    if (field instanceof BooleanField) return RuleType.BOOLEAN;
    if (field instanceof NumberField) return RuleType.NUMBER;
    if (field instanceof StringField) return RuleType.STRING;
    if (field instanceof DateField) return RuleType.DATE;
    if (field instanceof ListField) return RuleType.LIST;
    return RuleType.STRING; // Default fallback
  }

  setWorkspace(client: RulebricksApi): Rule {
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

  setFolderId(folderId: string): Rule {
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
    if (alias.includes('/') || alias.includes('\\') || alias.includes(' ')) {
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
    this.settings.requireAllProperties = enabled;
    return this;
  }

  lockSchema(enabled: boolean = true): Rule {
    this.settings.schemaLocked = enabled;
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
    this.conditions.push(condition.getCondition());
    return condition;
  }

  any(conditions: Record<string, OperatorResult>): Condition {
    const condition = new Condition(this);
    condition.setRequest(conditions);
    const ruleCondition = condition.getCondition();
    ruleCondition.any = true;
    this.conditions.push(ruleCondition);
    return condition;
  }

  getConditions(): RuleCondition[] {
    return this.conditions;
  }

  getConditionCount(): number {
    return this.conditions.length;
  }

  addTest(test: RuleTest): Rule {
    const existingTest = this.findTestById(test.id);
    if (existingTest) {
      Object.assign(existingTest, test);
    } else {
      this.testSuite.push(test);
    }
    return this;
  }

  removeTest(testId: string): void {
    const test = this.findTestById(testId);
    if (test) {
      this.testSuite = this.testSuite.filter(t => t.id !== testId);
    }
  }

  findTestById(testId: string): RuleTest | undefined {
    return this.testSuite.find(t => t.id === testId);
  }

  findTestByName(name: string): RuleTest | undefined {
    return this.testSuite.find(t => t.name === name);
  }

  async update(): Promise<void> {
    if (!this.workspace) {
      throw new Error('Workspace not set. Call setWorkspace() before updating the rule.');
    }

    const ruleData = this.toDict();
    console.log('Rule data being sent:', JSON.stringify(ruleData, null, 2));
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
    const ruleData = await this.workspace.assets.exportRule(ruleId);
    return Rule.fromJSON(ruleData);
  }

  toDict(): Record<string, any> {
    const fields = Object.entries(this.fields).map(([name, field]) => ({
      name,
      type: field.type,
      description: field.description,
      defaultValue: field.defaultValue,
      show: true,
    }));

    const responseFields = Object.entries(this.responseFields).map(([name, field]) => ({
      name,
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
      testSuite: this.testSuite.map(test => ({
        ...test,
        id: test.id || this.generateUUID()
      })),
      publishedRequestSchema: this.publishedRequestSchema,
      publishedResponseSchema: this.publishedResponseSchema,
      publishedGroups: this.publishedGroups
    };
  }

  toJSON(): string {
    return JSON.stringify(this.toDict(), (_, value) => {
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    }, 2);
  }

  static fromJSON(data: string | Record<string, any>): Rule {
    const jsonData = typeof data === 'string' ? JSON.parse(data) : data;
    const rule = new Rule();

    rule._id = jsonData.id;
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
    rule.publishedRequestSchema = jsonData.publishedRequestSchema;
    rule.publishedResponseSchema = jsonData.publishedResponseSchema;
    rule.publishedGroups = jsonData.publishedGroups;

    // Convert request schema to fields
    jsonData.requestSchema.forEach((fieldData: any) => {
      const field = {
        name: fieldData.name,
        type: fieldData.type,
        description: fieldData.description,
        defaultValue: fieldData.defaultValue,
        operators: {}
      } as Field;
      rule.fields[fieldData.name] = field;
    });

    // Convert response schema to fields
    jsonData.responseSchema.forEach((fieldData: any) => {
      const field = {
        name: fieldData.name,
        type: fieldData.type,
        description: fieldData.description,
        defaultValue: fieldData.defaultValue,
        operators: {}
      } as Field;
      rule.responseFields[fieldData.name] = field;
    });

    // Convert test suite
    rule.testSuite = jsonData.testSuite.map((test: any) => ({
      id: test.id || rule.generateUUID(),
      name: test.name,
      description: test.description,
      request: test.request,
      expectedResponse: test.expectedResponse,
      enabled: test.enabled !== false
    }));

    return rule;
  }

  getEditorUrl(): string {
    if (!this.workspace) {
      throw new Error('Workspace not configured. Call setWorkspace() first.');
    }
    return `https://app.rulebricks.com/rules/${this.id}`;
  }

  async solve(request: Record<string, any>): Promise<Record<string, any>> {
    if (!this.workspace) {
      throw new Error('Workspace not configured. Call setWorkspace() first.');
    }
    return this.workspace.rules.solve({ slug: this.slug, request });
  }

  toTable(): string {
    const header = ['Condition', ...Object.keys(this.fields), 'Response'];
    const rows: string[][] = [];

    this.conditions.forEach((condition, index) => {
      const row: string[] = [`#${index + 1}`];

      // Add request conditions
      Object.keys(this.fields).forEach(fieldName => {
        const cond = condition.request[fieldName];
        row.push(cond ? `${cond.op} ${cond.args.join(', ')}` : '-');
      });

      // Add response
      const responseStr = Object.entries(condition.response)
        .map(([key, value]) => `${key}: ${value.value}`)
        .join('\n');
      row.push(responseStr || '-');

      rows.push(row);
    });

    // Format as ASCII table
    const maxLengths = header.map((_, colIndex) =>
      Math.max(
        header[colIndex].length,
        ...rows.map(row => row[colIndex].length)
      )
    );

    const separator = maxLengths.map(len => '-'.repeat(len)).join('-+-');
    const formatRow = (row: string[]) =>
      row.map((cell, i) => cell.padEnd(maxLengths[i])).join(' | ');

    return [
      formatRow(header),
      separator,
      ...rows.map(formatRow)
    ].join('\n');
  }

  toString(): string {
    return `Rule(name="${this.name}", id="${this.id}", conditions=${this.conditions.length})`;
  }
}
