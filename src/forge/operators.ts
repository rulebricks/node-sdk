import { Field, RuleType, OperatorDef, DynamicValueType, TypeMismatchError } from "./types.js";
import { DynamicValue } from "./values.js";

export type OperatorResult = [string, any[]];

export class Argument<T> {
    constructor(private value: T | DynamicValue, private expectedType: DynamicValueType) {
        this.validateType();
    }

    private validateType(): void {
        if (this.value instanceof DynamicValue) {
            if (this.value.valueType !== this.expectedType) {
                throw new TypeMismatchError(
                    `Dynamic value '${this.value.name}' has type ${this.value.valueType}, ` +
                        `but ${this.expectedType} was expected`
                );
            }
        } else {
            const expectedJsType = this.getExpectedJsType();
            if (!(typeof this.value === expectedJsType || (expectedJsType === "object" && Array.isArray(this.value)))) {
                const actualType = typeof this.value;
                throw new TypeMismatchError(
                    `Value ${this.value} has type ${actualType}, ` + `but ${this.expectedType} was expected`
                );
            }
        }
    }

    private getExpectedJsType(): string {
        switch (this.expectedType) {
            case DynamicValueType.STRING:
                return "string";
            case DynamicValueType.NUMBER:
                return "number";
            case DynamicValueType.BOOLEAN:
                return "boolean";
            case DynamicValueType.DATE:
                return "object";
            case DynamicValueType.LIST:
            case DynamicValueType.OBJECT:
                return "object";
            default:
                throw new Error(`Unknown type: ${this.expectedType}`);
        }
    }

    toDict(): any {
        if (this.value instanceof DynamicValue) {
            return this.value.toDict();
        }
        return this.value;
    }

    static process(arg: any, expectedType: DynamicValueType): any {
        if (arg instanceof Argument) {
            return arg.toDict();
        } else if (arg instanceof DynamicValue) {
            return arg.toDict();
        } else if (Array.isArray(arg)) {
            return arg.map((item) => this.process(item, expectedType));
        } else if (typeof arg === "object" && arg !== null) {
            const result: Record<string, any> = {};
            for (const [key, value] of Object.entries(arg)) {
                result[key] = this.process(value, expectedType);
            }
            return result;
        }
        return arg;
    }

    toString(): string {
        if (this.value instanceof DynamicValue) {
            return `<${this.value.name.toUpperCase()}>`;
        }
        return `${this.value}`;
    }
}

export class BooleanField implements Field {
    public readonly type = RuleType.BOOLEAN;
    public readonly operators: Record<string, OperatorDef>;
    public readonly defaultValue: boolean;
    public readonly name: string;
    public readonly description: string;

    constructor(name: string, description: string = "", defaultValue: boolean = false) {
        this.name = name;
        this.description = description;
        this.defaultValue = defaultValue;
        this.operators = {
            any: { name: "any", args: [], description: "Match any boolean value", skipTypecheck: true },
            is_true: { name: "is true", args: [], description: "Check if value is true" },
            is_false: { name: "is false", args: [], description: "Check if value is false" },
        };
    }

    equals(value: boolean | DynamicValue): OperatorResult {
        const opName = value ? "is true" : "is false";
        return [opName, []];
    }
}

export class NumberField implements Field {
    public readonly type = RuleType.NUMBER;
    public readonly operators: Record<string, OperatorDef>;
    public readonly defaultValue: number;
    public readonly name: string;
    public readonly description: string;

    constructor(name: string, description: string = "", defaultValue: number = 0) {
        this.name = name;
        this.description = description;
        this.defaultValue = defaultValue;
        this.operators = {
            any: { name: "any", args: [], description: "Match any numeric value", skipTypecheck: true },
            equals: {
                name: "equals",
                args: [{ name: "value", type: "number", description: "Number that value must equal" }],
            },
            does_not_equal: {
                name: "does not equal",
                args: [{ name: "value", type: "number", description: "Number that value must not equal" }],
            },
            greater_than: {
                name: "greater than",
                args: [{ name: "bound", type: "number", description: "Number that value must be greater than" }],
            },
            less_than: {
                name: "less than",
                args: [{ name: "bound", type: "number", description: "Number that value must be less than" }],
            },
            greater_than_or_equal: {
                name: "greater than or equal to",
                args: [
                    {
                        name: "bound",
                        type: "number",
                        description: "Number that value must be greater than or equal to",
                    },
                ],
            },
            less_than_or_equal: {
                name: "less than or equal to",
                args: [
                    { name: "bound", type: "number", description: "Number that value must be less than or equal to" },
                ],
            },
            between: {
                name: "between",
                args: [
                    {
                        name: "start",
                        type: "number",
                        description: "Number that value must be greater than or equal to",
                        placeholder: "Start",
                    },
                    {
                        name: "end",
                        type: "number",
                        description: "Number that value must be less than or equal to",
                        placeholder: "End",
                    },
                ],
                validate: (args: any[]) => args[0] < args[1],
            },
            not_between: {
                name: "not between",
                args: [
                    {
                        name: "start",
                        type: "number",
                        description: "Number that value must be less than",
                        placeholder: "Start",
                    },
                    {
                        name: "end",
                        type: "number",
                        description: "Number that value must be greater than",
                        placeholder: "End",
                    },
                ],
                validate: (args: any[]) => args[0] < args[1],
            },
            is_even: { name: "is even", args: [], description: "Check if value is even" },
            is_odd: { name: "is odd", args: [], description: "Check if value is odd" },
            is_positive: { name: "is positive", args: [], description: "Check if value is greater than zero" },
            is_negative: { name: "is negative", args: [], description: "Check if value is less than zero" },
            is_zero: { name: "is zero", args: [], description: "Check if value equals zero" },
            is_not_zero: { name: "is not zero", args: [], description: "Check if value does not equal zero" },
            is_multiple_of: {
                name: "is a multiple of",
                args: [{ name: "multiple", type: "number", description: "Number that value must be a multiple of" }],
            },
            is_not_multiple_of: {
                name: "is not a multiple of",
                args: [
                    { name: "multiple", type: "number", description: "Number that value must not be a multiple of" },
                ],
            },
            is_power_of: {
                name: "is a power of",
                args: [{ name: "base", type: "number", description: "The base number" }],
                validate: (args: any[]) => args[0] > 0,
            },
        };
    }

    equals(value: number | DynamicValue): OperatorResult {
        return ["equals", [new Argument(value, DynamicValueType.NUMBER).toDict()]];
    }

    not_equals(value: number | DynamicValue): OperatorResult {
        return ["does not equal", [new Argument(value, DynamicValueType.NUMBER).toDict()]];
    }

    greater_than(value: number | DynamicValue): OperatorResult {
        return ["greater than", [new Argument(value, DynamicValueType.NUMBER).toDict()]];
    }

    less_than(value: number | DynamicValue): OperatorResult {
        return ["less than", [new Argument(value, DynamicValueType.NUMBER).toDict()]];
    }

    greater_than_or_equal(value: number | DynamicValue): OperatorResult {
        return ["greater than or equal to", [new Argument(value, DynamicValueType.NUMBER).toDict()]];
    }

    less_than_or_equal(value: number | DynamicValue): OperatorResult {
        return ["less than or equal to", [new Argument(value, DynamicValueType.NUMBER).toDict()]];
    }

    between(start: number | DynamicValue, end: number | DynamicValue): OperatorResult {
        const startArg = new Argument(start, DynamicValueType.NUMBER);
        const endArg = new Argument(end, DynamicValueType.NUMBER);
        if (!(start instanceof DynamicValue) && !(end instanceof DynamicValue)) {
            const op = this.operators["between"];
            if (op.validate && !op.validate([start, end])) {
                throw new Error(`Invalid range for between: start (${start}) must be less than end (${end})`);
            }
        }
        return ["between", [startArg.toDict(), endArg.toDict()]];
    }

    not_between(start: number | DynamicValue, end: number | DynamicValue): OperatorResult {
        const startArg = new Argument(start, DynamicValueType.NUMBER);
        const endArg = new Argument(end, DynamicValueType.NUMBER);
        if (!(start instanceof DynamicValue) && !(end instanceof DynamicValue)) {
            const op = this.operators["not_between"];
            if (op.validate && !op.validate([start, end])) {
                throw new Error(`Invalid range for not between: start (${start}) must be less than end (${end})`);
            }
        }
        return ["not between", [startArg.toDict(), endArg.toDict()]];
    }

    is_even(): OperatorResult {
        return ["is even", []];
    }

    is_odd(): OperatorResult {
        return ["is odd", []];
    }

    is_positive(): OperatorResult {
        return ["is positive", []];
    }

    is_negative(): OperatorResult {
        return ["is negative", []];
    }

    is_zero(): OperatorResult {
        return ["is zero", []];
    }

    is_not_zero(): OperatorResult {
        return ["is not zero", []];
    }

    is_multiple_of(value: number | DynamicValue): OperatorResult {
        return ["is a multiple of", [new Argument(value, DynamicValueType.NUMBER).toDict()]];
    }

    is_not_multiple_of(value: number | DynamicValue): OperatorResult {
        return ["is not a multiple of", [new Argument(value, DynamicValueType.NUMBER).toDict()]];
    }

    is_power_of(base: number | DynamicValue): OperatorResult {
        if (!(base instanceof DynamicValue)) {
            const op = this.operators["is_power_of"];
            if (op.validate && !op.validate([base])) {
                throw new Error(`Invalid base for is power of: ${base}. Base must be positive.`);
            }
        }
        return ["is a power of", [new Argument(base, DynamicValueType.NUMBER).toDict()]];
    }
}

export class DateField implements Field {
    public readonly type = RuleType.DATE;
    public readonly operators: Record<string, OperatorDef>;
    public readonly defaultValue: Date;
    public readonly name: string;
    public readonly description: string;

    constructor(name: string, description: string = "", defaultValue: Date | null = null) {
        this.name = name;
        this.description = description;
        this.defaultValue = defaultValue || new Date();
        this.operators = {
            any: { name: "any", args: [], description: "Match any date value", skipTypecheck: true },
            is_past: { name: "is in the past", args: [], description: "Date is in the past" },
            is_future: { name: "is in the future", args: [], description: "Date is in the future" },
            days_ago: {
                name: "days ago",
                args: [{ name: "days", type: "number", description: "Number of days ago that the date is equal to" }],
            },
            less_than_days_ago: {
                name: "is less than N days ago",
                args: [
                    {
                        name: "days",
                        type: "number",
                        description: "Number of days ago that the date is less than or equal to",
                    },
                ],
            },
            more_than_days_ago: {
                name: "is more than N days ago",
                args: [
                    {
                        name: "days",
                        type: "number",
                        description: "Number of days ago that the date is more than or equal to",
                    },
                ],
            },
            days_from_now: {
                name: "days from now",
                args: [
                    { name: "days", type: "number", description: "Number of days from now that the date is equal to" },
                ],
            },
            less_than_days_from_now: {
                name: "is less than N days from now",
                args: [
                    {
                        name: "days",
                        type: "number",
                        description: "Number of days from now that the date is less than or equal to",
                    },
                ],
            },
            more_than_days_from_now: {
                name: "is more than N days from now",
                args: [
                    {
                        name: "days",
                        type: "number",
                        description: "Number of days from now that the date is more than or equal to",
                    },
                ],
            },
            is_today: { name: "is today", args: [], description: "Date is today" },
            is_this_week: { name: "is this week", args: [], description: "Date is in the current week" },
            is_this_month: { name: "is this month", args: [], description: "Date is in the current month" },
            is_this_year: { name: "is this year", args: [], description: "Date is in the current year" },
            is_next_week: { name: "is next week", args: [], description: "Date is in the next week" },
            is_next_month: { name: "is next month", args: [], description: "Date is in the next month" },
            is_next_year: { name: "is next year", args: [], description: "Date is in the next year" },
            is_last_week: { name: "is last week", args: [], description: "Date is in the previous week" },
            is_last_month: { name: "is last month", args: [], description: "Date is in the previous month" },
            is_last_year: { name: "is last year", args: [], description: "Date is in the previous year" },
            after: {
                name: "after",
                args: [{ name: "date", type: "date", description: "Date that value must be after" }],
            },
            on_or_after: {
                name: "on or after",
                args: [{ name: "date", type: "date", description: "Date that value must be on or after" }],
            },
            before: {
                name: "before",
                args: [{ name: "date", type: "date", description: "Date that value must be before" }],
            },
            on_or_before: {
                name: "on or before",
                args: [{ name: "date", type: "date", description: "Date that value must be on or before" }],
            },
            between: {
                name: "between",
                args: [
                    { name: "start", type: "date", description: "Date that value must be after", placeholder: "From" },
                    { name: "end", type: "date", description: "Date that value must be before", placeholder: "To" },
                ],
            },
            not_between: {
                name: "not between",
                args: [
                    { name: "start", type: "date", description: "Date that value must be before", placeholder: "From" },
                    { name: "end", type: "date", description: "Date that value must be after", placeholder: "To" },
                ],
            },
        };
    }

    is_past(): OperatorResult {
        return ["is in the past", []];
    }

    is_future(): OperatorResult {
        return ["is in the future", []];
    }

    days_ago(days: number | DynamicValue): OperatorResult {
        return ["days ago", [new Argument(days, DynamicValueType.NUMBER).toDict()]];
    }

    less_than_days_ago(days: number | DynamicValue): OperatorResult {
        return ["is less than N days ago", [new Argument(days, DynamicValueType.NUMBER).toDict()]];
    }

    more_than_days_ago(days: number | DynamicValue): OperatorResult {
        return ["is more than N days ago", [new Argument(days, DynamicValueType.NUMBER).toDict()]];
    }

    days_from_now(days: number | DynamicValue): OperatorResult {
        return ["days from now", [new Argument(days, DynamicValueType.NUMBER).toDict()]];
    }

    less_than_days_from_now(days: number | DynamicValue): OperatorResult {
        return ["is less than N days from now", [new Argument(days, DynamicValueType.NUMBER).toDict()]];
    }

    more_than_days_from_now(days: number | DynamicValue): OperatorResult {
        return ["is more than N days from now", [new Argument(days, DynamicValueType.NUMBER).toDict()]];
    }

    is_today(): OperatorResult {
        return ["is today", []];
    }

    is_this_week(): OperatorResult {
        return ["is this week", []];
    }

    is_this_month(): OperatorResult {
        return ["is this month", []];
    }

    is_this_year(): OperatorResult {
        return ["is this year", []];
    }

    is_next_week(): OperatorResult {
        return ["is next week", []];
    }

    is_next_month(): OperatorResult {
        return ["is next month", []];
    }

    is_next_year(): OperatorResult {
        return ["is next year", []];
    }

    is_last_week(): OperatorResult {
        return ["is last week", []];
    }

    is_last_month(): OperatorResult {
        return ["is last month", []];
    }

    is_last_year(): OperatorResult {
        return ["is last year", []];
    }

    after(date: Date | string | DynamicValue): OperatorResult {
        return ["after", [new Argument(date, DynamicValueType.DATE).toDict()]];
    }

    on_or_after(date: Date | string | DynamicValue): OperatorResult {
        return ["on or after", [new Argument(date, DynamicValueType.DATE).toDict()]];
    }

    before(date: Date | string | DynamicValue): OperatorResult {
        return ["before", [new Argument(date, DynamicValueType.DATE).toDict()]];
    }

    on_or_before(date: Date | string | DynamicValue): OperatorResult {
        return ["on or before", [new Argument(date, DynamicValueType.DATE).toDict()]];
    }

    between(start: Date | string | DynamicValue, end: Date | string | DynamicValue): OperatorResult {
        return [
            "between",
            [new Argument(start, DynamicValueType.DATE).toDict(), new Argument(end, DynamicValueType.DATE).toDict()],
        ];
    }
}

export class StringField implements Field {
    public readonly type = RuleType.STRING;
    public readonly operators: Record<string, OperatorDef>;
    public readonly defaultValue: string;
    public readonly name: string;
    public readonly description: string;

    constructor(name: string, description: string = "", defaultValue: string = "") {
        this.name = name;
        this.description = description;
        this.defaultValue = defaultValue;
        this.operators = {
            any: { name: "any", args: [], description: "Match any string value", skipTypecheck: true },
            contains: {
                name: "contains",
                args: [
                    {
                        name: "value",
                        type: "string",
                        description: "The value to search for within the string",
                        validate: (x: string) => x.length > 0,
                    },
                ],
            },
            does_not_contain: {
                name: "does not contain",
                args: [
                    {
                        name: "value",
                        type: "string",
                        description: "The value to search for within the string",
                        validate: (x: string) => x.length > 0,
                    },
                ],
            },
            equals: {
                name: "equals",
                args: [{ name: "value", type: "string", description: "The value to compare against" }],
            },
            does_not_equal: {
                name: "does not equal",
                args: [{ name: "value", type: "string", description: "The value to compare against" }],
            },
            is_empty: { name: "is empty", args: [], description: "Check if string is empty" },
            is_not_empty: { name: "is not empty", args: [], description: "Check if string is not empty" },
            starts_with: {
                name: "starts with",
                args: [
                    {
                        name: "value",
                        type: "string",
                        description: "The value the string should start with",
                        validate: (v: string) => v.length > 0,
                    },
                ],
            },
            ends_with: {
                name: "ends with",
                args: [
                    {
                        name: "value",
                        type: "string",
                        description: "The value the string should end with",
                        validate: (v: string) => v.length > 0,
                    },
                ],
            },
            is_included_in: {
                name: "is included in",
                args: [
                    {
                        name: "value",
                        type: "list",
                        description: "A list of values the string should be in",
                        validate: (v: any[]) => v.length > 0,
                    },
                ],
            },
            is_not_included_in: {
                name: "is not included in",
                args: [
                    {
                        name: "value",
                        type: "list",
                        description: "A list of values the string should not be in",
                        validate: (v: any[]) => v.length > 0,
                    },
                ],
            },
            matches_regex: {
                name: "matches RegEx",
                args: [
                    {
                        name: "regex",
                        type: "string",
                        description: "The regex the string should match",
                        validate: (v: string) => v.length > 0,
                    },
                ],
            },
            does_not_match_regex: {
                name: "does not match RegEx",
                args: [
                    {
                        name: "regex",
                        type: "string",
                        description: "The regex the string should not match",
                        validate: (v: string) => v.length > 0,
                    },
                ],
            },
            is_valid_email: {
                name: "is a valid email address",
                args: [],
                description: "Check if string is a valid email address",
            },
            is_not_valid_email: {
                name: "is not a valid email address",
                args: [],
                description: "Check if string is not a valid email address",
            },
            is_valid_url: {
                name: "is a valid URL",
                args: [],
                description: "Check if string is a valid URL",
            },
            is_not_valid_url: {
                name: "is not a valid URL",
                args: [],
                description: "Check if string is not a valid URL",
            },
            is_valid_ip: {
                name: "is a valid IP address",
                args: [],
                description: "Check if string is a valid IP address",
            },
            is_not_valid_ip: {
                name: "is not a valid IP address",
                args: [],
                description: "Check if string is not a valid IP address",
            },
            is_uppercase: {
                name: "is uppercase",
                args: [],
                description: "Check if string is all uppercase",
            },
            is_lowercase: {
                name: "is lowercase",
                args: [],
                description: "Check if string is all lowercase",
            },
            is_numeric: {
                name: "is numeric",
                args: [],
                description: "Check if string contains only numeric characters",
            },
            contains_only_digits: {
                name: "contains only digits",
                args: [],
                description: "Check if string contains only digits",
            },
            contains_only_letters: {
                name: "contains only letters",
                args: [],
                description: "Check if string contains only letters",
            },
            contains_only_digits_and_letters: {
                name: "contains only digits and letters",
                args: [],
                description: "Check if string contains only digits and letters",
            },
        };
    }

    contains(value: string | DynamicValue): OperatorResult {
        const arg = new Argument(value, DynamicValueType.STRING);
        if (!(value instanceof DynamicValue)) {
            const op = this.operators["contains"];
            if (op.args[0].validate && !op.args[0].validate(value)) {
                throw new Error(`Invalid value for contains: ${value}`);
            }
        }
        return ["contains", [arg.toDict()]];
    }

    not_contains(value: string | DynamicValue): OperatorResult {
        const arg = new Argument(value, DynamicValueType.STRING);
        if (!(value instanceof DynamicValue)) {
            const op = this.operators["does_not_contain"];
            if (op.args[0].validate && !op.args[0].validate(value)) {
                throw new Error(`Invalid value for does not contain: ${value}`);
            }
        }
        return ["does not contain", [arg.toDict()]];
    }

    equals(value: string | DynamicValue): OperatorResult {
        return ["equals", [new Argument(value, DynamicValueType.STRING).toDict()]];
    }

    not_equals(value: string | DynamicValue): OperatorResult {
        return ["does not equal", [new Argument(value, DynamicValueType.STRING).toDict()]];
    }

    is_empty(): OperatorResult {
        return ["is empty", []];
    }

    is_not_empty(): OperatorResult {
        return ["is not empty", []];
    }

    starts_with(value: string | DynamicValue): OperatorResult {
        const arg = new Argument(value, DynamicValueType.STRING);
        if (!(value instanceof DynamicValue)) {
            const op = this.operators["starts_with"];
            if (op.args[0].validate && !op.args[0].validate(value)) {
                throw new Error(`Invalid value for starts with: ${value}`);
            }
        }
        return ["starts with", [arg.toDict()]];
    }

    ends_with(value: string | DynamicValue): OperatorResult {
        const arg = new Argument(value, DynamicValueType.STRING);
        if (!(value instanceof DynamicValue)) {
            const op = this.operators["ends_with"];
            if (op.args[0].validate && !op.args[0].validate(value)) {
                throw new Error(`Invalid value for ends with: ${value}`);
            }
        }
        return ["ends with", [arg.toDict()]];
    }

    is_included_in(values: string[] | DynamicValue): OperatorResult {
        if (values instanceof DynamicValue) {
            if (values.valueType !== DynamicValueType.LIST) {
                throw new TypeMismatchError(
                    `Dynamic value '${values.name}' has type ${values.valueType}, but list was expected`
                );
            }
            return ["is included in", [new Argument(values, DynamicValueType.LIST).toDict()]];
        }

        const op = this.operators["is_included_in"];
        if (op.args[0].validate && !op.args[0].validate(values)) {
            throw new Error("List must not be empty");
        }

        return ["is included in", [values.map((v) => new Argument(v, DynamicValueType.STRING).toDict())]];
    }

    matches_regex(pattern: string | DynamicValue): OperatorResult {
        const arg = new Argument(pattern, DynamicValueType.STRING);
        if (!(pattern instanceof DynamicValue)) {
            const op = this.operators["matches_regex"];
            if (op.args[0].validate && !op.args[0].validate(pattern)) {
                throw new Error(`Invalid regex pattern: ${pattern}`);
            }
        }
        return ["matches RegEx", [arg.toDict()]];
    }

    not_matches_regex(pattern: string | DynamicValue): OperatorResult {
        const arg = new Argument(pattern, DynamicValueType.STRING);
        if (!(pattern instanceof DynamicValue)) {
            const op = this.operators["does_not_match_regex"];
            if (op.args[0].validate && !op.args[0].validate(pattern)) {
                throw new Error(`Invalid regex pattern: ${pattern}`);
            }
        }
        return ["does not match RegEx", [arg.toDict()]];
    }

    is_email(): OperatorResult {
        return ["is a valid email address", []];
    }

    is_not_email(): OperatorResult {
        return ["is not a valid email address", []];
    }

    is_url(): OperatorResult {
        return ["is a valid URL", []];
    }

    is_not_url(): OperatorResult {
        return ["is not a valid URL", []];
    }

    is_ip(): OperatorResult {
        return ["is a valid IP address", []];
    }

    is_not_ip(): OperatorResult {
        return ["is not a valid IP address", []];
    }

    is_uppercase(): OperatorResult {
        return ["is uppercase", []];
    }

    is_lowercase(): OperatorResult {
        return ["is lowercase", []];
    }

    is_numeric(): OperatorResult {
        return ["is numeric", []];
    }

    contains_only_digits(): OperatorResult {
        return ["contains only digits", []];
    }

    contains_only_letters(): OperatorResult {
        return ["contains only letters", []];
    }

    contains_only_digits_and_letters(): OperatorResult {
        return ["contains only digits and letters", []];
    }
}

export class ListField implements Field {
    public readonly type = RuleType.LIST;
    public readonly operators: Record<string, OperatorDef>;
    public readonly defaultValue: any[];
    public readonly name: string;
    public readonly description: string;

    constructor(name: string, description: string = "", defaultValue: any[] = []) {
        this.name = name;
        this.description = description;
        this.defaultValue = defaultValue;
        this.operators = {
            any: { name: "any", args: [], description: "Match any list value", skipTypecheck: true },
            contains: {
                name: "contains",
                args: [{ name: "value", type: "generic", description: "Value that must be contained in the list" }],
            },
            is_empty: { name: "is empty", args: [], description: "Check if list is empty" },
            is_not_empty: { name: "is not empty", args: [], description: "Check if list is not empty" },
            is_of_length: {
                name: "is of length",
                args: [{ name: "length", type: "number", description: "Length that the list must be" }],
            },
            is_not_of_length: {
                name: "is not of length",
                args: [{ name: "length", type: "number", description: "Length that the list must not be" }],
            },
            is_longer_than: {
                name: "is longer than",
                args: [{ name: "length", type: "number", description: "Length that the list must be longer than" }],
            },
            is_shorter_than: {
                name: "is shorter than",
                args: [{ name: "length", type: "number", description: "Length that the list must be shorter than" }],
            },
            contains_all_of: {
                name: "contains all of",
                args: [
                    { name: "values", type: "list", description: "List of values that must be contained in the list" },
                ],
            },
            contains_any_of: {
                name: "contains any of",
                args: [
                    { name: "values", type: "list", description: "List of values that might be contained in the list" },
                ],
            },
            contains_none_of: {
                name: "contains none of",
                args: [
                    {
                        name: "values",
                        type: "list",
                        description: "List of values that must not be contained in the list",
                    },
                ],
            },
            does_not_contain: {
                name: "does not contain",
                args: [{ name: "value", type: "generic", description: "Value that must not be contained in the list" }],
            },
            is_equal_to: {
                name: "is equal to",
                args: [{ name: "list", type: "list", description: "Value that the list must be equal to" }],
            },
            is_not_equal_to: {
                name: "is not equal to",
                args: [{ name: "list", type: "list", description: "Value that the list must not be equal to" }],
            },
            contains_duplicates: {
                name: "contains duplicates",
                args: [],
                description: "Check if list contains duplicate values",
            },
            does_not_contain_duplicates: {
                name: "does not contain duplicates",
                args: [],
                description: "Check if list does not contain duplicate values",
            },
            contains_object_with_key_value: {
                name: "contains object with key & value",
                args: [
                    { name: "key", type: "string", description: "Key of any object contained in the list" },
                    { name: "value", type: "generic", description: "Value that the key must be equal to" },
                ],
            },
            has_unique_elements: {
                name: "has unique elements",
                args: [],
                description: "Check if all elements in the list are unique",
            },
            is_sublist_of: {
                name: "is a sublist of",
                args: [{ name: "superlist", type: "list", description: "List that should contain this list" }],
            },
            is_superlist_of: {
                name: "is a superlist of",
                args: [{ name: "sublist", type: "list", description: "List that should be contained in this list" }],
            },
        };
    }

    contains(value: any | DynamicValue): OperatorResult {
        return ["contains", [new Argument(value, DynamicValueType.OBJECT).toDict()]];
    }

    is_empty(): OperatorResult {
        return ["is empty", []];
    }

    is_not_empty(): OperatorResult {
        return ["is not empty", []];
    }

    length_equals(length: number | DynamicValue): OperatorResult {
        return ["is of length", [new Argument(length, DynamicValueType.NUMBER).toDict()]];
    }

    length_not_equals(length: number | DynamicValue): OperatorResult {
        return ["is not of length", [new Argument(length, DynamicValueType.NUMBER).toDict()]];
    }

    longer_than(length: number | DynamicValue): OperatorResult {
        return ["is longer than", [new Argument(length, DynamicValueType.NUMBER).toDict()]];
    }

    shorter_than(length: number | DynamicValue): OperatorResult {
        return ["is shorter than", [new Argument(length, DynamicValueType.NUMBER).toDict()]];
    }

    contains_all(values: any[] | DynamicValue): OperatorResult {
        if (values instanceof DynamicValue) {
            if (values.valueType !== DynamicValueType.LIST) {
                throw new TypeMismatchError(
                    `Dynamic value '${values.name}' has type ${values.valueType}, but list was expected`
                );
            }
            return ["contains all of", [new Argument(values, DynamicValueType.LIST).toDict()]];
        }
        return ["contains all of", [values.map((v) => new Argument(v, DynamicValueType.OBJECT).toDict())]];
    }

    contains_any(values: any[] | DynamicValue): OperatorResult {
        if (values instanceof DynamicValue) {
            if (values.valueType !== DynamicValueType.LIST) {
                throw new TypeMismatchError(
                    `Dynamic value '${values.name}' has type ${values.valueType}, but list was expected`
                );
            }
            return ["contains any of", [new Argument(values, DynamicValueType.LIST).toDict()]];
        }
        return ["contains any of", [values.map((v) => new Argument(v, DynamicValueType.OBJECT).toDict())]];
    }

    contains_none(values: any[] | DynamicValue): OperatorResult {
        if (values instanceof DynamicValue) {
            if (values.valueType !== DynamicValueType.LIST) {
                throw new TypeMismatchError(
                    `Dynamic value '${values.name}' has type ${values.valueType}, but list was expected`
                );
            }
            return ["contains none of", [new Argument(values, DynamicValueType.LIST).toDict()]];
        }
        return ["contains none of", [values.map((v) => new Argument(v, DynamicValueType.OBJECT).toDict())]];
    }

    not_contains(value: any | DynamicValue): OperatorResult {
        return ["does not contain", [new Argument(value, DynamicValueType.OBJECT).toDict()]];
    }

    equals(other: any[] | DynamicValue): OperatorResult {
        if (other instanceof DynamicValue) {
            if (other.valueType !== DynamicValueType.LIST) {
                throw new TypeMismatchError(
                    `Dynamic value '${other.name}' has type ${other.valueType}, but list was expected`
                );
            }
            return ["is equal to", [new Argument(other, DynamicValueType.LIST).toDict()]];
        }
        return ["is equal to", [other.map((v) => new Argument(v, DynamicValueType.OBJECT).toDict())]];
    }

    not_equals(other: any[] | DynamicValue): OperatorResult {
        if (other instanceof DynamicValue) {
            if (other.valueType !== DynamicValueType.LIST) {
                throw new TypeMismatchError(
                    `Dynamic value '${other.name}' has type ${other.valueType}, but list was expected`
                );
            }
            return ["is not equal to", [new Argument(other, DynamicValueType.LIST).toDict()]];
        }
        return ["is not equal to", [other.map((v) => new Argument(v, DynamicValueType.OBJECT).toDict())]];
    }

    has_duplicates(): OperatorResult {
        return ["contains duplicates", []];
    }

    no_duplicates(): OperatorResult {
        return ["does not contain duplicates", []];
    }

    contains_object_with_key_value(key: string | DynamicValue, value: any | DynamicValue): OperatorResult {
        return [
            "contains object with key & value",
            [
                new Argument(key, DynamicValueType.STRING).toDict(),
                new Argument(value, DynamicValueType.OBJECT).toDict(),
            ],
        ];
    }

    has_unique_elements(): OperatorResult {
        return ["has unique elements", []];
    }

    is_sublist_of(superlist: any[] | DynamicValue): OperatorResult {
        if (superlist instanceof DynamicValue) {
            if (superlist.valueType !== DynamicValueType.LIST) {
                throw new TypeMismatchError(
                    `Dynamic value '${superlist.name}' has type ${superlist.valueType}, but list was expected`
                );
            }
            return ["is a sublist of", [new Argument(superlist, DynamicValueType.LIST).toDict()]];
        }
        return ["is a sublist of", [superlist.map((v) => new Argument(v, DynamicValueType.OBJECT).toDict())]];
    }

    is_superlist_of(sublist: any[] | DynamicValue): OperatorResult {
        if (sublist instanceof DynamicValue) {
            if (sublist.valueType !== DynamicValueType.LIST) {
                throw new TypeMismatchError(
                    `Dynamic value '${sublist.name}' has type ${sublist.valueType}, but list was expected`
                );
            }
            return ["is a superlist of", [new Argument(sublist, DynamicValueType.LIST).toDict()]];
        }
        return ["is a superlist of", [sublist.map((v) => new Argument(v, DynamicValueType.OBJECT).toDict())]];
    }
}
