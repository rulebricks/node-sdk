export type OperatorResult = [string, any[]];

export enum DynamicValueType {
    STRING = "string",
    NUMBER = "number",
    BOOLEAN = "boolean",
    DATE = "date",
    LIST = "list",
    FUNCTION = "function",
    OBJECT = "object",
}

export enum RuleType {
    BOOLEAN = "boolean",
    NUMBER = "number",
    STRING = "string",
    DATE = "date",
    LIST = "list",
    FUNCTION = "function",
}

export interface Field {
    name: string;
    key?: string;
    description: string;
    defaultValue: any;
    operators: Record<string, OperatorDef>;
    type: RuleType;
}

export interface OperatorArg {
    name: string;
    type: string;
    description: string;
    placeholder?: string;
    validate?: (value: any) => boolean;
    defaultValue?: any;
}

export interface OperatorDef {
    name: string;
    args: OperatorArg[];
    description?: string;
    validate?: (args: any[]) => boolean;
    skipTypecheck?: boolean;
}

export interface RuleSettings {
    testing?: boolean;
    schemaValidation?: boolean;
    allProperties?: boolean;
    lockSchema?: boolean;
    approver?: string;
    requiresApproval?: boolean;
}

export class TypeMismatchError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "TypeMismatchError";
    }
}

export class DynamicValueNotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "DynamicValueNotFoundError";
    }
}
