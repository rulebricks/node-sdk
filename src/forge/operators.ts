import { Field, RuleType, OperatorDef, VocabularyValueType, TypeMismatchError } from "./types.js";
import { VocabularyValue } from "./values.js";

export type OperatorResult = [string, any[]];

type ArgumentExpectedType = VocabularyValueType | "generic";

export class Argument<T> {
    constructor(private value: T | VocabularyValue, private expectedType: ArgumentExpectedType) {
        this.validateType();
    }

    private validateType(): void {
        if (this.value instanceof VocabularyValue) {
            if (this.expectedType !== "generic" && this.value.valueType !== this.expectedType) {
                throw new TypeMismatchError(
                    `Vocabulary value '${this.value.name}' has type ${this.value.valueType}, ` +
                        `but ${this.expectedType} was expected`
                );
            }
            return;
        }

        if (this.expectedType === "generic") {
            if (!Argument.isValidGenericLiteral(this.value)) {
                throw new TypeMismatchError(`Value ${String(this.value)} is not a valid generic literal`);
            }
            return;
        }

        let isValid = false;
        switch (this.expectedType) {
            case VocabularyValueType.STRING:
                isValid = typeof this.value === "string";
                break;
            case VocabularyValueType.NUMBER:
                isValid = typeof this.value === "number" && Number.isFinite(this.value);
                break;
            case VocabularyValueType.BOOLEAN:
                isValid = typeof this.value === "boolean";
                break;
            case VocabularyValueType.DATE:
                isValid = this.value instanceof Date || typeof this.value === "string";
                break;
            case VocabularyValueType.LIST:
                isValid = Array.isArray(this.value) && Argument.isValidGenericLiteral(this.value);
                break;
            case VocabularyValueType.OBJECT:
                isValid =
                    this.value !== null &&
                    typeof this.value === "object" &&
                    !Array.isArray(this.value) &&
                    Argument.isValidGenericLiteral(this.value);
                break;
            case VocabularyValueType.FUNCTION:
                isValid = typeof this.value === "function";
                break;
            default:
                isValid = false;
        }

        if (!isValid) {
            const actualType =
                this.value === null
                    ? "null"
                    : Array.isArray(this.value)
                    ? "list"
                    : this.value instanceof Date
                    ? "date"
                    : typeof this.value;
            throw new TypeMismatchError(
                `Value ${String(this.value)} has type ${actualType}, ` + `but ${this.expectedType} was expected`
            );
        }
    }

    private static isValidGenericLiteral(value: any, seen: Set<object> = new Set()): boolean {
        if (value instanceof VocabularyValue || value === null) {
            return true;
        }

        if (typeof value === "string" || typeof value === "boolean") {
            return true;
        }

        if (typeof value === "number") {
            return Number.isFinite(value);
        }

        if (Array.isArray(value)) {
            if (seen.has(value)) {
                return false;
            }
            seen.add(value);
            const isValid = value.every((item) => Argument.isValidGenericLiteral(item, seen));
            seen.delete(value);
            return isValid;
        }

        if (typeof value === "object") {
            const prototype = Object.getPrototypeOf(value);
            if ((prototype !== Object.prototype && prototype !== null) || seen.has(value)) {
                return false;
            }
            seen.add(value);
            const isValid = Object.values(value).every((item) => Argument.isValidGenericLiteral(item, seen));
            seen.delete(value);
            return isValid;
        }

        return false;
    }

    private static serialize(value: any): any {
        if (value instanceof VocabularyValue) {
            return value.toDict();
        }
        if (value instanceof Date) {
            return value;
        }
        if (Array.isArray(value)) {
            return value.map((item) => Argument.serialize(item));
        }
        if (value !== null && typeof value === "object") {
            return Object.entries(value).reduce((result, [key, nestedValue]) => {
                result[key] = Argument.serialize(nestedValue);
                return result;
            }, {} as Record<string, any>);
        }
        return value;
    }

    toDict(): any {
        return Argument.serialize(this.value);
    }

    static process(arg: any, expectedType: ArgumentExpectedType): any {
        if (arg instanceof Argument) {
            return arg.toDict();
        } else if (arg instanceof VocabularyValue) {
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
        if (this.value instanceof VocabularyValue) {
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
    public readonly key?: string;
    public readonly description: string;

    constructor(name: string, description: string = "", defaultValue: boolean = false) {
        this.name = name;
        this.description = description;
        this.defaultValue = defaultValue;
        this.operators = {
            any: { name: "any", args: [], description: "Match any boolean value", skipTypecheck: true },
            is_true: { name: "is true", args: [], description: "Check if value is true" },
            is_false: { name: "is false", args: [], description: "Check if value is false" },
            is_null: { name: "is null", args: [], description: "Check if value is null" },
        };
    }

    equals(value: boolean): OperatorResult {
        if (typeof value !== "boolean") {
            const invalidValue = value as unknown;
            const received =
                invalidValue instanceof VocabularyValue
                    ? `vocabulary value '${invalidValue.name}'`
                    : `value of type ${typeof invalidValue}`;
            throw new TypeMismatchError(`BooleanField.equals expects a literal boolean, but received ${received}`);
        }
        const opName = value ? "is true" : "is false";
        return [opName, []];
    }

    is_null(): OperatorResult {
        return ["is null", []];
    }
}

export class NumberField implements Field {
    public readonly type = RuleType.NUMBER;
    public readonly operators: Record<string, OperatorDef>;
    public readonly defaultValue: number;
    public readonly name: string;
    public readonly key?: string;
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
            },
            is_null: { name: "is null", args: [], description: "Check if value is null" },
        };
    }

    equals(value: number | VocabularyValue): OperatorResult {
        return ["equals", [new Argument(value, VocabularyValueType.NUMBER).toDict()]];
    }

    not_equals(value: number | VocabularyValue): OperatorResult {
        return ["does not equal", [new Argument(value, VocabularyValueType.NUMBER).toDict()]];
    }

    greater_than(value: number | VocabularyValue): OperatorResult {
        return ["greater than", [new Argument(value, VocabularyValueType.NUMBER).toDict()]];
    }

    less_than(value: number | VocabularyValue): OperatorResult {
        return ["less than", [new Argument(value, VocabularyValueType.NUMBER).toDict()]];
    }

    greater_than_or_equal(value: number | VocabularyValue): OperatorResult {
        return ["greater than or equal to", [new Argument(value, VocabularyValueType.NUMBER).toDict()]];
    }

    less_than_or_equal(value: number | VocabularyValue): OperatorResult {
        return ["less than or equal to", [new Argument(value, VocabularyValueType.NUMBER).toDict()]];
    }

    between(start: number | VocabularyValue, end: number | VocabularyValue): OperatorResult {
        const startArg = new Argument(start, VocabularyValueType.NUMBER);
        const endArg = new Argument(end, VocabularyValueType.NUMBER);
        if (!(start instanceof VocabularyValue) && !(end instanceof VocabularyValue)) {
            const op = this.operators["between"];
            if (op.validate && !op.validate([start, end])) {
                throw new Error(`Invalid range for between: start (${start}) must be less than end (${end})`);
            }
        }
        return ["between", [startArg.toDict(), endArg.toDict()]];
    }

    not_between(start: number | VocabularyValue, end: number | VocabularyValue): OperatorResult {
        const startArg = new Argument(start, VocabularyValueType.NUMBER);
        const endArg = new Argument(end, VocabularyValueType.NUMBER);
        if (!(start instanceof VocabularyValue) && !(end instanceof VocabularyValue)) {
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

    is_multiple_of(value: number | VocabularyValue): OperatorResult {
        return ["is a multiple of", [new Argument(value, VocabularyValueType.NUMBER).toDict()]];
    }

    is_not_multiple_of(value: number | VocabularyValue): OperatorResult {
        return ["is not a multiple of", [new Argument(value, VocabularyValueType.NUMBER).toDict()]];
    }

    is_power_of(base: number | VocabularyValue): OperatorResult {
        return ["is a power of", [new Argument(base, VocabularyValueType.NUMBER).toDict()]];
    }

    is_null(): OperatorResult {
        return ["is null", []];
    }
}

export class DateField implements Field {
    public readonly type = RuleType.DATE;
    public readonly operators: Record<string, OperatorDef>;
    public readonly defaultValue: Date;
    public readonly name: string;
    public readonly key?: string;
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
                args: [{ name: "value", type: "number", description: "Number of days ago that the date is equal to" }],
            },
            less_than_days_ago: {
                name: "is less than N days ago",
                args: [
                    {
                        name: "value",
                        type: "number",
                        description: "Number of days ago that the date is less than or equal to",
                    },
                ],
            },
            more_than_days_ago: {
                name: "is more than N days ago",
                args: [
                    {
                        name: "value",
                        type: "number",
                        description: "Number of days ago that the date is more than or equal to",
                    },
                ],
            },
            between_n_and_m_days_ago: {
                name: "is between N and M days ago",
                args: [
                    {
                        name: "minDays",
                        type: "number",
                        description: "Minimum number of days ago",
                        placeholder: "Min days",
                    },
                    {
                        name: "maxDays",
                        type: "number",
                        description: "Maximum number of days ago",
                        placeholder: "Max days",
                    },
                ],
            },
            days_from_now: {
                name: "days from now",
                args: [
                    { name: "value", type: "number", description: "Number of days from now that the date is equal to" },
                ],
            },
            less_than_days_from_now: {
                name: "is less than N days from now",
                args: [
                    {
                        name: "value",
                        type: "number",
                        description: "Number of days from now that the date is less than or equal to",
                    },
                ],
            },
            more_than_days_from_now: {
                name: "is more than N days from now",
                args: [
                    {
                        name: "value",
                        type: "number",
                        description: "Number of days from now that the date is more than or equal to",
                    },
                ],
            },
            months_ago: {
                name: "months ago",
                args: [
                    { name: "value", type: "number", description: "Number of months ago that the date is equal to" },
                ],
            },
            less_than_months_ago: {
                name: "is less than N months ago",
                args: [
                    {
                        name: "value",
                        type: "number",
                        description: "Number of months ago that the date is less than or equal to",
                    },
                ],
            },
            more_than_months_ago: {
                name: "is more than N months ago",
                args: [
                    {
                        name: "value",
                        type: "number",
                        description: "Number of months ago that the date is more than or equal to",
                    },
                ],
            },
            between_n_and_m_months_ago: {
                name: "is between N and M months ago",
                args: [
                    {
                        name: "minMonths",
                        type: "number",
                        description: "Minimum number of months ago",
                        placeholder: "Min months",
                    },
                    {
                        name: "maxMonths",
                        type: "number",
                        description: "Maximum number of months ago",
                        placeholder: "Max months",
                    },
                ],
            },
            months_from_now: {
                name: "months from now",
                args: [
                    {
                        name: "value",
                        type: "number",
                        description: "Number of months from now that the date is equal to",
                    },
                ],
            },
            less_than_months_from_now: {
                name: "is less than N months from now",
                args: [
                    {
                        name: "value",
                        type: "number",
                        description: "Number of months from now that the date is less than or equal to",
                    },
                ],
            },
            more_than_months_from_now: {
                name: "is more than N months from now",
                args: [
                    {
                        name: "value",
                        type: "number",
                        description: "Number of months from now that the date is more than or equal to",
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
                args: [{ name: "value", type: "date", description: "Date that value must be after" }],
            },
            on_or_after: {
                name: "on or after",
                args: [{ name: "value", type: "date", description: "Date that value must be on or after" }],
            },
            before: {
                name: "before",
                args: [{ name: "value", type: "date", description: "Date that value must be before" }],
            },
            on_or_before: {
                name: "on or before",
                args: [{ name: "value", type: "date", description: "Date that value must be on or before" }],
            },
            equals: {
                name: "equals",
                args: [{ name: "value", type: "date", description: "Date that value must be equal to" }],
            },
            does_not_equal: {
                name: "does not equal",
                args: [{ name: "value", type: "date", description: "Date that value must not be equal to" }],
            },
            between: {
                name: "between",
                args: [
                    { name: "lower", type: "date", description: "Date that value must be after", placeholder: "From" },
                    { name: "upper", type: "date", description: "Date that value must be before", placeholder: "To" },
                ],
            },
            not_between: {
                name: "not between",
                args: [
                    { name: "lower", type: "date", description: "Date that value must be before", placeholder: "From" },
                    { name: "upper", type: "date", description: "Date that value must be after", placeholder: "To" },
                ],
            },
            is_before_time: {
                name: "is before time",
                args: [
                    {
                        name: "time",
                        type: "string",
                        description: "Time of day that date must be before",
                        placeholder: "Enter time (e.g., 2:30 PM)",
                    },
                ],
            },
            is_after_time: {
                name: "is after time",
                args: [
                    {
                        name: "time",
                        type: "string",
                        description: "Time of day that date must be after",
                        placeholder: "Enter time (e.g., 2:30 PM)",
                    },
                ],
            },
            hours_ago: {
                name: "hours ago",
                args: [{ name: "value", type: "number", description: "Number of hours ago that the date is equal to" }],
            },
            less_than_hours_ago: {
                name: "is less than N hours ago",
                args: [
                    { name: "value", type: "number", description: "Number of hours ago that the date is less than" },
                ],
            },
            more_than_hours_ago: {
                name: "is more than N hours ago",
                args: [
                    { name: "value", type: "number", description: "Number of hours ago that the date is more than" },
                ],
            },
            between_n_and_m_hours_ago: {
                name: "is between N and M hours ago",
                args: [
                    {
                        name: "minHours",
                        type: "number",
                        description: "Minimum number of hours ago",
                        placeholder: "Min hours",
                    },
                    {
                        name: "maxHours",
                        type: "number",
                        description: "Maximum number of hours ago",
                        placeholder: "Max hours",
                    },
                ],
            },
            hours_from_now: {
                name: "hours from now",
                args: [
                    {
                        name: "value",
                        type: "number",
                        description: "Number of hours from now that the date is equal to",
                    },
                ],
            },
            less_than_hours_from_now: {
                name: "is less than N hours from now",
                args: [
                    {
                        name: "value",
                        type: "number",
                        description: "Number of hours from now that the date is less than",
                    },
                ],
            },
            more_than_hours_from_now: {
                name: "is more than N hours from now",
                args: [
                    {
                        name: "value",
                        type: "number",
                        description: "Number of hours from now that the date is more than",
                    },
                ],
            },
            minutes_ago: {
                name: "minutes ago",
                args: [
                    { name: "value", type: "number", description: "Number of minutes ago that the date is equal to" },
                ],
            },
            less_than_minutes_ago: {
                name: "is less than N minutes ago",
                args: [
                    { name: "value", type: "number", description: "Number of minutes ago that the date is less than" },
                ],
            },
            more_than_minutes_ago: {
                name: "is more than N minutes ago",
                args: [
                    { name: "value", type: "number", description: "Number of minutes ago that the date is more than" },
                ],
            },
            between_n_and_m_minutes_ago: {
                name: "is between N and M minutes ago",
                args: [
                    {
                        name: "minMinutes",
                        type: "number",
                        description: "Minimum number of minutes ago",
                        placeholder: "Min minutes",
                    },
                    {
                        name: "maxMinutes",
                        type: "number",
                        description: "Maximum number of minutes ago",
                        placeholder: "Max minutes",
                    },
                ],
            },
            minutes_from_now: {
                name: "minutes from now",
                args: [
                    {
                        name: "value",
                        type: "number",
                        description: "Number of minutes from now that the date is equal to",
                    },
                ],
            },
            less_than_minutes_from_now: {
                name: "is less than N minutes from now",
                args: [
                    {
                        name: "value",
                        type: "number",
                        description: "Number of minutes from now that the date is less than",
                    },
                ],
            },
            more_than_minutes_from_now: {
                name: "is more than N minutes from now",
                args: [
                    {
                        name: "value",
                        type: "number",
                        description: "Number of minutes from now that the date is more than",
                    },
                ],
            },
            is_null: { name: "is null", args: [], description: "Check if value is null" },
        };
    }

    is_past(): OperatorResult {
        return ["is in the past", []];
    }

    is_future(): OperatorResult {
        return ["is in the future", []];
    }

    days_ago(days: number | VocabularyValue): OperatorResult {
        return ["days ago", [new Argument(days, VocabularyValueType.NUMBER).toDict()]];
    }

    less_than_days_ago(days: number | VocabularyValue): OperatorResult {
        return ["is less than N days ago", [new Argument(days, VocabularyValueType.NUMBER).toDict()]];
    }

    more_than_days_ago(days: number | VocabularyValue): OperatorResult {
        return ["is more than N days ago", [new Argument(days, VocabularyValueType.NUMBER).toDict()]];
    }

    between_n_and_m_days_ago(minDays: number | VocabularyValue, maxDays: number | VocabularyValue): OperatorResult {
        return [
            "is between N and M days ago",
            [
                new Argument(minDays, VocabularyValueType.NUMBER).toDict(),
                new Argument(maxDays, VocabularyValueType.NUMBER).toDict(),
            ],
        ];
    }

    days_from_now(days: number | VocabularyValue): OperatorResult {
        return ["days from now", [new Argument(days, VocabularyValueType.NUMBER).toDict()]];
    }

    less_than_days_from_now(days: number | VocabularyValue): OperatorResult {
        return ["is less than N days from now", [new Argument(days, VocabularyValueType.NUMBER).toDict()]];
    }

    more_than_days_from_now(days: number | VocabularyValue): OperatorResult {
        return ["is more than N days from now", [new Argument(days, VocabularyValueType.NUMBER).toDict()]];
    }

    months_ago(months: number | VocabularyValue): OperatorResult {
        return ["months ago", [new Argument(months, VocabularyValueType.NUMBER).toDict()]];
    }

    less_than_months_ago(months: number | VocabularyValue): OperatorResult {
        return ["is less than N months ago", [new Argument(months, VocabularyValueType.NUMBER).toDict()]];
    }

    more_than_months_ago(months: number | VocabularyValue): OperatorResult {
        return ["is more than N months ago", [new Argument(months, VocabularyValueType.NUMBER).toDict()]];
    }

    between_n_and_m_months_ago(
        minMonths: number | VocabularyValue,
        maxMonths: number | VocabularyValue
    ): OperatorResult {
        return [
            "is between N and M months ago",
            [
                new Argument(minMonths, VocabularyValueType.NUMBER).toDict(),
                new Argument(maxMonths, VocabularyValueType.NUMBER).toDict(),
            ],
        ];
    }

    months_from_now(months: number | VocabularyValue): OperatorResult {
        return ["months from now", [new Argument(months, VocabularyValueType.NUMBER).toDict()]];
    }

    less_than_months_from_now(months: number | VocabularyValue): OperatorResult {
        return ["is less than N months from now", [new Argument(months, VocabularyValueType.NUMBER).toDict()]];
    }

    more_than_months_from_now(months: number | VocabularyValue): OperatorResult {
        return ["is more than N months from now", [new Argument(months, VocabularyValueType.NUMBER).toDict()]];
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

    after(date: Date | string | VocabularyValue): OperatorResult {
        return ["after", [new Argument(date, VocabularyValueType.DATE).toDict()]];
    }

    on_or_after(date: Date | string | VocabularyValue): OperatorResult {
        return ["on or after", [new Argument(date, VocabularyValueType.DATE).toDict()]];
    }

    before(date: Date | string | VocabularyValue): OperatorResult {
        return ["before", [new Argument(date, VocabularyValueType.DATE).toDict()]];
    }

    on_or_before(date: Date | string | VocabularyValue): OperatorResult {
        return ["on or before", [new Argument(date, VocabularyValueType.DATE).toDict()]];
    }

    equals(date: Date | string | VocabularyValue): OperatorResult {
        return ["equals", [new Argument(date, VocabularyValueType.DATE).toDict()]];
    }

    not_equals(date: Date | string | VocabularyValue): OperatorResult {
        return ["does not equal", [new Argument(date, VocabularyValueType.DATE).toDict()]];
    }

    between(start: Date | string | VocabularyValue, end: Date | string | VocabularyValue): OperatorResult {
        return [
            "between",
            [
                new Argument(start, VocabularyValueType.DATE).toDict(),
                new Argument(end, VocabularyValueType.DATE).toDict(),
            ],
        ];
    }

    not_between(start: Date | string | VocabularyValue, end: Date | string | VocabularyValue): OperatorResult {
        return [
            "not between",
            [
                new Argument(start, VocabularyValueType.DATE).toDict(),
                new Argument(end, VocabularyValueType.DATE).toDict(),
            ],
        ];
    }

    is_before_time(time: string | VocabularyValue): OperatorResult {
        return ["is before time", [new Argument(time, VocabularyValueType.STRING).toDict()]];
    }

    is_after_time(time: string | VocabularyValue): OperatorResult {
        return ["is after time", [new Argument(time, VocabularyValueType.STRING).toDict()]];
    }

    hours_ago(value: number | VocabularyValue): OperatorResult {
        return ["hours ago", [new Argument(value, VocabularyValueType.NUMBER).toDict()]];
    }

    less_than_hours_ago(value: number | VocabularyValue): OperatorResult {
        return ["is less than N hours ago", [new Argument(value, VocabularyValueType.NUMBER).toDict()]];
    }

    more_than_hours_ago(value: number | VocabularyValue): OperatorResult {
        return ["is more than N hours ago", [new Argument(value, VocabularyValueType.NUMBER).toDict()]];
    }

    between_n_and_m_hours_ago(minHours: number | VocabularyValue, maxHours: number | VocabularyValue): OperatorResult {
        return [
            "is between N and M hours ago",
            [
                new Argument(minHours, VocabularyValueType.NUMBER).toDict(),
                new Argument(maxHours, VocabularyValueType.NUMBER).toDict(),
            ],
        ];
    }

    hours_from_now(value: number | VocabularyValue): OperatorResult {
        return ["hours from now", [new Argument(value, VocabularyValueType.NUMBER).toDict()]];
    }

    less_than_hours_from_now(value: number | VocabularyValue): OperatorResult {
        return ["is less than N hours from now", [new Argument(value, VocabularyValueType.NUMBER).toDict()]];
    }

    more_than_hours_from_now(value: number | VocabularyValue): OperatorResult {
        return ["is more than N hours from now", [new Argument(value, VocabularyValueType.NUMBER).toDict()]];
    }

    minutes_ago(value: number | VocabularyValue): OperatorResult {
        return ["minutes ago", [new Argument(value, VocabularyValueType.NUMBER).toDict()]];
    }

    less_than_minutes_ago(value: number | VocabularyValue): OperatorResult {
        return ["is less than N minutes ago", [new Argument(value, VocabularyValueType.NUMBER).toDict()]];
    }

    more_than_minutes_ago(value: number | VocabularyValue): OperatorResult {
        return ["is more than N minutes ago", [new Argument(value, VocabularyValueType.NUMBER).toDict()]];
    }

    between_n_and_m_minutes_ago(
        minMinutes: number | VocabularyValue,
        maxMinutes: number | VocabularyValue
    ): OperatorResult {
        return [
            "is between N and M minutes ago",
            [
                new Argument(minMinutes, VocabularyValueType.NUMBER).toDict(),
                new Argument(maxMinutes, VocabularyValueType.NUMBER).toDict(),
            ],
        ];
    }

    minutes_from_now(value: number | VocabularyValue): OperatorResult {
        return ["minutes from now", [new Argument(value, VocabularyValueType.NUMBER).toDict()]];
    }

    less_than_minutes_from_now(value: number | VocabularyValue): OperatorResult {
        return ["is less than N minutes from now", [new Argument(value, VocabularyValueType.NUMBER).toDict()]];
    }

    more_than_minutes_from_now(value: number | VocabularyValue): OperatorResult {
        return ["is more than N minutes from now", [new Argument(value, VocabularyValueType.NUMBER).toDict()]];
    }

    is_null(): OperatorResult {
        return ["is null", []];
    }
}

export class StringField implements Field {
    public readonly type = RuleType.STRING;
    public readonly operators: Record<string, OperatorDef>;
    public readonly defaultValue: string;
    public readonly name: string;
    public readonly key?: string;
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
            equals_case_insensitive: {
                name: "equals (case-insensitive)",
                args: [{ name: "value", type: "string", description: "The value to compare against" }],
            },
            does_not_equal: {
                name: "does not equal",
                args: [{ name: "value", type: "string", description: "The value to compare against" }],
            },
            does_not_equal_case_insensitive: {
                name: "does not equal (case-insensitive)",
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
            contains_any_of: {
                name: "contains any of",
                args: [
                    {
                        name: "value",
                        type: "list",
                        description: "A list of values the string should contain at least one of",
                        validate: (v: any[]) => v.length > 0,
                    },
                ],
            },
            does_not_contain_any_of: {
                name: "does not contain any of",
                args: [
                    {
                        name: "value",
                        type: "list",
                        description: "A list of values the string should not contain",
                        validate: (v: any[]) => v.length > 0,
                    },
                ],
            },
            is_of_length: {
                name: "is of length",
                args: [
                    {
                        name: "length",
                        type: "number",
                        description: "The length the string should be",
                        validate: (v: number) => v > 0,
                    },
                ],
            },
            is_not_of_length: {
                name: "is not of length",
                args: [
                    {
                        name: "length",
                        type: "number",
                        description: "The length the string should not be",
                        validate: (v: number) => v > 0,
                    },
                ],
            },
            is_longer_than: {
                name: "is longer than",
                args: [
                    {
                        name: "length",
                        type: "number",
                        description: "The length the string should be longer than",
                        validate: (v: number) => v > 0,
                    },
                ],
            },
            is_shorter_than: {
                name: "is shorter than",
                args: [
                    {
                        name: "length",
                        type: "number",
                        description: "The length the string should be shorter than",
                        validate: (v: number) => v > 0,
                    },
                ],
            },
            is_longer_than_or_equal: {
                name: "is longer than or equal to",
                args: [
                    {
                        name: "length",
                        type: "number",
                        description: "The length the string should be longer than or equal to",
                        validate: (v: number) => v > 0,
                    },
                ],
            },
            is_shorter_than_or_equal: {
                name: "is shorter than or equal to",
                args: [
                    {
                        name: "length",
                        type: "number",
                        description: "The length the string should be shorter than or equal to",
                        validate: (v: number) => v > 0,
                    },
                ],
            },
            starts_with_case_insensitive: {
                name: "starts with (case-insensitive)",
                args: [
                    {
                        name: "prefix",
                        type: "string",
                        description: "The string that the value should start with (case-insensitive)",
                    },
                ],
            },
            ends_with_case_insensitive: {
                name: "ends with (case-insensitive)",
                args: [
                    {
                        name: "suffix",
                        type: "string",
                        description: "The string that the value should end with (case-insensitive)",
                    },
                ],
            },
            contains_case_insensitive: {
                name: "contains (case-insensitive)",
                args: [
                    {
                        name: "substring",
                        type: "string",
                        description: "The string that should be contained within the value (case-insensitive)",
                    },
                ],
            },
            is_phone: {
                name: "is a valid phone number",
                args: [],
            },
            is_zip_code: {
                name: "is a valid zip code",
                args: [],
            },
            matches_regex: {
                name: "matches RegEx",
                args: [
                    {
                        name: "regex",
                        type: "string",
                        description: "The regex the string should match",
                        placeholder: "^[a-z]+$",
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
                        description: "The regex the string should match",
                        placeholder: "^[a-z]+$",
                        validate: (v: string) => v.length > 0,
                    },
                ],
            },
            is_work_email: {
                name: "is a work email address",
                args: [],
            },
            is_personal_email: {
                name: "is a personal email address",
                args: [],
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
            is_ipv6: {
                name: "is a valid IPV6 address",
                args: [],
            },
            is_not_ipv6: {
                name: "is not a valid IPV6 address",
                args: [],
            },
            is_credit_card: {
                name: "is a valid credit card number",
                args: [],
            },
            is_not_credit_card: {
                name: "is not a valid credit card number",
                args: [],
            },
            is_country_code: {
                name: "is a valid country code",
                args: [],
            },
            is_not_country_code: {
                name: "is not a valid country code",
                args: [],
            },
            contains_profanity: {
                name: "contains profanity",
                args: [],
            },
            does_not_contain_profanity: {
                name: "does not contain profanity",
                args: [],
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
            version_greater_than: {
                name: "version is greater than",
                args: [
                    {
                        name: "version",
                        type: "string",
                        description: "The version to compare against (e.g., 1.2.3)",
                        validate: (v: string) => v.length > 0,
                    },
                ],
            },
            version_less_than: {
                name: "version is less than",
                args: [
                    {
                        name: "version",
                        type: "string",
                        description: "The version to compare against (e.g., 1.2.3)",
                        validate: (v: string) => v.length > 0,
                    },
                ],
            },
            version_equals: {
                name: "version is equal to",
                args: [
                    {
                        name: "version",
                        type: "string",
                        description: "The version to compare against (e.g., 1.2.3)",
                        validate: (v: string) => v.length > 0,
                    },
                ],
            },
            version_greater_than_or_equal: {
                name: "version is greater than or equal to",
                args: [
                    {
                        name: "version",
                        type: "string",
                        description: "The version to compare against (e.g., 1.2.3)",
                        validate: (v: string) => v.length > 0,
                    },
                ],
            },
            version_less_than_or_equal: {
                name: "version is less than or equal to",
                args: [
                    {
                        name: "version",
                        type: "string",
                        description: "The version to compare against (e.g., 1.2.3)",
                        validate: (v: string) => v.length > 0,
                    },
                ],
            },
            version_between: {
                name: "version is between",
                args: [
                    {
                        name: "minVersion",
                        type: "string",
                        description: "The minimum version (inclusive, e.g., 1.2.3)",
                        validate: (v: string) => v.length > 0,
                    },
                    {
                        name: "maxVersion",
                        type: "string",
                        description: "The maximum version (inclusive, e.g., 2.0.0)",
                        validate: (v: string) => v.length > 0,
                    },
                ],
            },
            is_valid_semantic_version: {
                name: "is valid semantic version",
                args: [],
            },
            satisfies_version_range: {
                name: "satisfies version range",
                args: [
                    {
                        name: "range",
                        type: "string",
                        description: "The version range (e.g., >=1.2.3 <2.0.0 or ^1.2.3)",
                        validate: (v: string) => v.length > 0,
                    },
                ],
            },
            is_null: { name: "is null", args: [], description: "Check if value is null" },
        };
    }

    private validateAndSerialize<T>(
        operatorKey: string,
        value: T | VocabularyValue,
        expectedType: ArgumentExpectedType,
        argIndex: number = 0
    ): any {
        const arg = new Argument(value, expectedType);
        if (!(value instanceof VocabularyValue)) {
            const validate = this.operators[operatorKey].args[argIndex].validate;
            if (validate && !validate(value)) {
                throw new Error(`Invalid value for ${this.operators[operatorKey].name}: ${String(value)}`);
            }
        }
        return arg.toDict();
    }

    contains(value: string | VocabularyValue): OperatorResult {
        const arg = new Argument(value, VocabularyValueType.STRING);
        if (!(value instanceof VocabularyValue)) {
            const op = this.operators["contains"];
            if (op.args[0].validate && !op.args[0].validate(value)) {
                throw new Error(`Invalid value for contains: ${value}`);
            }
        }
        return ["contains", [arg.toDict()]];
    }

    not_contains(value: string | VocabularyValue): OperatorResult {
        const arg = new Argument(value, VocabularyValueType.STRING);
        if (!(value instanceof VocabularyValue)) {
            const op = this.operators["does_not_contain"];
            if (op.args[0].validate && !op.args[0].validate(value)) {
                throw new Error(`Invalid value for does not contain: ${value}`);
            }
        }
        return ["does not contain", [arg.toDict()]];
    }

    equals(value: string | VocabularyValue): OperatorResult {
        return ["equals", [new Argument(value, VocabularyValueType.STRING).toDict()]];
    }

    equals_case_insensitive(value: string | VocabularyValue): OperatorResult {
        return ["equals (case-insensitive)", [new Argument(value, VocabularyValueType.STRING).toDict()]];
    }

    not_equals(value: string | VocabularyValue): OperatorResult {
        return ["does not equal", [new Argument(value, VocabularyValueType.STRING).toDict()]];
    }

    not_equals_case_insensitive(value: string | VocabularyValue): OperatorResult {
        return ["does not equal (case-insensitive)", [new Argument(value, VocabularyValueType.STRING).toDict()]];
    }

    is_empty(): OperatorResult {
        return ["is empty", []];
    }

    is_not_empty(): OperatorResult {
        return ["is not empty", []];
    }

    starts_with(value: string | VocabularyValue): OperatorResult {
        const arg = new Argument(value, VocabularyValueType.STRING);
        if (!(value instanceof VocabularyValue)) {
            const op = this.operators["starts_with"];
            if (op.args[0].validate && !op.args[0].validate(value)) {
                throw new Error(`Invalid value for starts with: ${value}`);
            }
        }
        return ["starts with", [arg.toDict()]];
    }

    ends_with(value: string | VocabularyValue): OperatorResult {
        const arg = new Argument(value, VocabularyValueType.STRING);
        if (!(value instanceof VocabularyValue)) {
            const op = this.operators["ends_with"];
            if (op.args[0].validate && !op.args[0].validate(value)) {
                throw new Error(`Invalid value for ends with: ${value}`);
            }
        }
        return ["ends with", [arg.toDict()]];
    }

    contains_case_insensitive(value: string | VocabularyValue): OperatorResult {
        return ["contains (case-insensitive)", [new Argument(value, VocabularyValueType.STRING).toDict()]];
    }

    starts_with_case_insensitive(value: string | VocabularyValue): OperatorResult {
        return ["starts with (case-insensitive)", [new Argument(value, VocabularyValueType.STRING).toDict()]];
    }

    ends_with_case_insensitive(value: string | VocabularyValue): OperatorResult {
        return ["ends with (case-insensitive)", [new Argument(value, VocabularyValueType.STRING).toDict()]];
    }

    is_included_in(values: (string | VocabularyValue)[] | VocabularyValue): OperatorResult {
        if (values instanceof VocabularyValue) {
            if (values.valueType !== VocabularyValueType.LIST) {
                throw new TypeMismatchError(
                    `Vocabulary value '${values.name}' has type ${values.valueType}, but list was expected`
                );
            }
            return ["is included in", [new Argument(values, VocabularyValueType.LIST).toDict()]];
        }

        const op = this.operators["is_included_in"];
        if (op.args[0].validate && !op.args[0].validate(values)) {
            throw new Error("List must not be empty");
        }

        return ["is included in", [values.map((v) => new Argument(v, VocabularyValueType.STRING).toDict())]];
    }

    is_not_included_in(values: (string | VocabularyValue)[] | VocabularyValue): OperatorResult {
        if (values instanceof VocabularyValue) {
            if (values.valueType !== VocabularyValueType.LIST) {
                throw new TypeMismatchError(
                    `Vocabulary value '${values.name}' has type ${values.valueType}, but list was expected`
                );
            }
            return ["is not included in", [new Argument(values, VocabularyValueType.LIST).toDict()]];
        }

        const op = this.operators["is_not_included_in"];
        if (op.args[0].validate && !op.args[0].validate(values)) {
            throw new Error("List must not be empty");
        }

        return ["is not included in", [values.map((v) => new Argument(v, VocabularyValueType.STRING).toDict())]];
    }

    contains_any_of(values: (string | VocabularyValue)[] | VocabularyValue): OperatorResult {
        if (values instanceof VocabularyValue) {
            if (values.valueType !== VocabularyValueType.LIST) {
                throw new TypeMismatchError(
                    `Vocabulary value '${values.name}' has type ${values.valueType}, but list was expected`
                );
            }
            return ["contains any of", [new Argument(values, VocabularyValueType.LIST).toDict()]];
        }

        const op = this.operators["contains_any_of"];
        if (op.args[0].validate && !op.args[0].validate(values)) {
            throw new Error("List must not be empty");
        }

        return ["contains any of", [values.map((v) => new Argument(v, VocabularyValueType.STRING).toDict())]];
    }

    does_not_contain_any_of(values: (string | VocabularyValue)[] | VocabularyValue): OperatorResult {
        if (values instanceof VocabularyValue) {
            if (values.valueType !== VocabularyValueType.LIST) {
                throw new TypeMismatchError(
                    `Vocabulary value '${values.name}' has type ${values.valueType}, but list was expected`
                );
            }
            return ["does not contain any of", [new Argument(values, VocabularyValueType.LIST).toDict()]];
        }

        const op = this.operators["does_not_contain_any_of"];
        if (op.args[0].validate && !op.args[0].validate(values)) {
            throw new Error("List must not be empty");
        }

        return ["does not contain any of", [values.map((v) => new Argument(v, VocabularyValueType.STRING).toDict())]];
    }

    length_equals(length: number | VocabularyValue): OperatorResult {
        return ["is of length", [this.validateAndSerialize("is_of_length", length, VocabularyValueType.NUMBER)]];
    }

    is_of_length(length: number | VocabularyValue): OperatorResult {
        return this.length_equals(length);
    }

    length_not_equals(length: number | VocabularyValue): OperatorResult {
        return [
            "is not of length",
            [this.validateAndSerialize("is_not_of_length", length, VocabularyValueType.NUMBER)],
        ];
    }

    is_not_of_length(length: number | VocabularyValue): OperatorResult {
        return this.length_not_equals(length);
    }

    longer_than(length: number | VocabularyValue): OperatorResult {
        return ["is longer than", [this.validateAndSerialize("is_longer_than", length, VocabularyValueType.NUMBER)]];
    }

    is_longer_than(length: number | VocabularyValue): OperatorResult {
        return this.longer_than(length);
    }

    shorter_than(length: number | VocabularyValue): OperatorResult {
        return ["is shorter than", [this.validateAndSerialize("is_shorter_than", length, VocabularyValueType.NUMBER)]];
    }

    is_shorter_than(length: number | VocabularyValue): OperatorResult {
        return this.shorter_than(length);
    }

    longer_than_or_equal(length: number | VocabularyValue): OperatorResult {
        return [
            "is longer than or equal to",
            [this.validateAndSerialize("is_longer_than_or_equal", length, VocabularyValueType.NUMBER)],
        ];
    }

    is_longer_than_or_equal(length: number | VocabularyValue): OperatorResult {
        return this.longer_than_or_equal(length);
    }

    shorter_than_or_equal(length: number | VocabularyValue): OperatorResult {
        return [
            "is shorter than or equal to",
            [this.validateAndSerialize("is_shorter_than_or_equal", length, VocabularyValueType.NUMBER)],
        ];
    }

    is_shorter_than_or_equal(length: number | VocabularyValue): OperatorResult {
        return this.shorter_than_or_equal(length);
    }

    matches_regex(pattern: string | VocabularyValue): OperatorResult {
        const arg = new Argument(pattern, VocabularyValueType.STRING);
        if (!(pattern instanceof VocabularyValue)) {
            const op = this.operators["matches_regex"];
            if (op.args[0].validate && !op.args[0].validate(pattern)) {
                throw new Error(`Invalid regex pattern: ${pattern}`);
            }
        }
        return ["matches RegEx", [arg.toDict()]];
    }

    not_matches_regex(pattern: string | VocabularyValue): OperatorResult {
        const arg = new Argument(pattern, VocabularyValueType.STRING);
        if (!(pattern instanceof VocabularyValue)) {
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

    is_phone(): OperatorResult {
        return ["is a valid phone number", []];
    }

    is_zip_code(): OperatorResult {
        return ["is a valid zip code", []];
    }

    is_work_email(): OperatorResult {
        return ["is a work email address", []];
    }

    is_personal_email(): OperatorResult {
        return ["is a personal email address", []];
    }

    is_ipv6(): OperatorResult {
        return ["is a valid IPV6 address", []];
    }

    is_not_ipv6(): OperatorResult {
        return ["is not a valid IPV6 address", []];
    }

    is_credit_card(): OperatorResult {
        return ["is a valid credit card number", []];
    }

    is_not_credit_card(): OperatorResult {
        return ["is not a valid credit card number", []];
    }

    is_country_code(): OperatorResult {
        return ["is a valid country code", []];
    }

    is_not_country_code(): OperatorResult {
        return ["is not a valid country code", []];
    }

    contains_profanity(): OperatorResult {
        return ["contains profanity", []];
    }

    does_not_contain_profanity(): OperatorResult {
        return ["does not contain profanity", []];
    }

    version_greater_than(version: string | VocabularyValue): OperatorResult {
        return [
            "version is greater than",
            [this.validateAndSerialize("version_greater_than", version, VocabularyValueType.STRING)],
        ];
    }

    version_less_than(version: string | VocabularyValue): OperatorResult {
        return [
            "version is less than",
            [this.validateAndSerialize("version_less_than", version, VocabularyValueType.STRING)],
        ];
    }

    version_equals(version: string | VocabularyValue): OperatorResult {
        return [
            "version is equal to",
            [this.validateAndSerialize("version_equals", version, VocabularyValueType.STRING)],
        ];
    }

    version_greater_than_or_equal(version: string | VocabularyValue): OperatorResult {
        return [
            "version is greater than or equal to",
            [this.validateAndSerialize("version_greater_than_or_equal", version, VocabularyValueType.STRING)],
        ];
    }

    version_less_than_or_equal(version: string | VocabularyValue): OperatorResult {
        return [
            "version is less than or equal to",
            [this.validateAndSerialize("version_less_than_or_equal", version, VocabularyValueType.STRING)],
        ];
    }

    version_between(minVersion: string | VocabularyValue, maxVersion: string | VocabularyValue): OperatorResult {
        return [
            "version is between",
            [
                this.validateAndSerialize("version_between", minVersion, VocabularyValueType.STRING),
                this.validateAndSerialize("version_between", maxVersion, VocabularyValueType.STRING, 1),
            ],
        ];
    }

    is_valid_semantic_version(): OperatorResult {
        return ["is valid semantic version", []];
    }

    satisfies_version_range(range: string | VocabularyValue): OperatorResult {
        return [
            "satisfies version range",
            [this.validateAndSerialize("satisfies_version_range", range, VocabularyValueType.STRING)],
        ];
    }

    is_null(): OperatorResult {
        return ["is null", []];
    }
}

export class ListField implements Field {
    public readonly type = RuleType.LIST;
    public readonly operators: Record<string, OperatorDef>;
    public readonly defaultValue: any[];
    public readonly name: string;
    public readonly key?: string;
    public readonly description: string;

    constructor(name: string, description: string = "", defaultValue: any[] = []) {
        this.name = name;
        this.description = description;
        this.defaultValue = defaultValue;
        this.operators = {
            any: { name: "any", args: [], description: "Match any list value", skipTypecheck: true },
            contains: {
                name: "contains",
                args: [
                    {
                        name: "value",
                        type: "generic",
                        description: "Value that must be contained in the list",
                        placeholder: "Enter any value to search for",
                    },
                ],
            },
            contains_case_insensitive: {
                name: "contains (case-insensitive)",
                args: [
                    {
                        name: "value",
                        type: "generic",
                        description: "Value that must be contained in the list (case-insensitive for strings)",
                        placeholder: "Enter any value to search for",
                    },
                ],
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
            is_longer_than_or_equal: {
                name: "is longer than or equal to",
                args: [
                    {
                        name: "length",
                        type: "number",
                        description: "Length that the list must be longer than or equal to",
                    },
                ],
            },
            is_shorter_than_or_equal: {
                name: "is shorter than or equal to",
                args: [
                    {
                        name: "length",
                        type: "number",
                        description: "Length that the list must be shorter than or equal to",
                    },
                ],
            },
            contains_all_of: {
                name: "contains all of",
                args: [
                    { name: "values", type: "list", description: "List of values that must be contained in the list" },
                ],
            },
            contains_all_of_case_insensitive: {
                name: "contains all of (case-insensitive)",
                args: [
                    {
                        name: "values",
                        type: "list",
                        description: "List of values that must be contained in the list (case-insensitive for strings)",
                    },
                ],
            },
            contains_n_occurrences_of: {
                name: "contains N occurrences of",
                args: [
                    {
                        name: "value",
                        type: "generic",
                        description: "Value that must be contained in the list",
                        placeholder: "Enter any value to search for",
                    },
                    {
                        name: "occurrences",
                        type: "number",
                        description: "Number of occurrences that must be present",
                    },
                ],
            },
            contains_at_least_n_occurrences_of: {
                name: "contains at least N occurrences of",
                args: [
                    {
                        name: "value",
                        type: "generic",
                        description: "Value that must be contained in the list",
                        placeholder: "Enter any value to search for",
                    },
                    {
                        name: "occurrences",
                        type: "number",
                        description: "Number of occurrences that must be present",
                    },
                ],
            },
            contains_at_most_n_occurrences_of: {
                name: "contains at most N occurrences of",
                args: [
                    {
                        name: "value",
                        type: "generic",
                        description: "Value that must be contained in the list",
                        placeholder: "Enter any value to search for",
                    },
                    {
                        name: "occurrences",
                        type: "number",
                        description: "Number of occurrences that must be present",
                    },
                ],
            },
            contains_any_of: {
                name: "contains any of",
                args: [
                    { name: "values", type: "list", description: "List of values that might be contained in the list" },
                ],
            },
            contains_any_of_case_insensitive: {
                name: "contains any of (case-insensitive)",
                args: [
                    {
                        name: "values",
                        type: "list",
                        description:
                            "List of values that might be contained in the list (case-insensitive for strings)",
                    },
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
            contains_none_of_case_insensitive: {
                name: "contains none of (case-insensitive)",
                args: [
                    {
                        name: "values",
                        type: "list",
                        description:
                            "List of values that must not be contained in the list (case-insensitive for strings)",
                    },
                ],
            },
            does_not_contain: {
                name: "does not contain",
                args: [
                    {
                        name: "value",
                        type: "generic",
                        description: "Value that must not be contained in the list",
                        placeholder: "Enter any value to search for",
                    },
                ],
            },
            does_not_contain_case_insensitive: {
                name: "does not contain (case-insensitive)",
                args: [
                    {
                        name: "value",
                        type: "generic",
                        description: "Value that must not be contained in the list (case-insensitive for strings)",
                        placeholder: "Enter any value to search for",
                    },
                ],
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
            contains_numbers_in_range: {
                name: "contains numbers in range (inclusive)",
                args: [
                    {
                        name: "min",
                        type: "number",
                        description: "Minimum value in the range (inclusive)",
                    },
                    {
                        name: "max",
                        type: "number",
                        description: "Maximum value in the range (inclusive)",
                    },
                ],
            },
            contains_object_with_key_value: {
                name: "contains object with key & value",
                args: [
                    { name: "key", type: "string", description: "Key of any object contained in the list" },
                    { name: "value", type: "generic", description: "Value that the key must be equal to" },
                ],
            },
            contains_object_with_key_value_case_insensitive: {
                name: "contains object with key & value (case-insensitive)",
                args: [
                    { name: "key", type: "string", description: "Key of any object contained in the list" },
                    {
                        name: "value",
                        type: "generic",
                        description: "Value that the key must be equal to (case-insensitive for strings)",
                    },
                ],
            },
            does_not_contain_object_with_key_value: {
                name: "does not contain object with key & value",
                args: [
                    { name: "key", type: "string", description: "Key of any object contained in the list" },
                    { name: "value", type: "generic", description: "Value that the key must not be equal to" },
                ],
            },
            does_not_contain_object_with_key_value_case_insensitive: {
                name: "does not contain object with key & value (case-insensitive)",
                args: [
                    { name: "key", type: "string", description: "Key of any object contained in the list" },
                    {
                        name: "value",
                        type: "generic",
                        description: "Value that the key must not be equal to (case-insensitive for strings)",
                    },
                ],
            },
            contains_object_with_key: {
                name: "contains object with key",
                args: [{ name: "key", type: "string", description: "Key of any object contained in the list" }],
            },
            does_not_contain_object_with_key: {
                name: "does not contain object with key",
                args: [{ name: "key", type: "string", description: "Key of any object contained in the list" }],
            },
            contains_only_objects_with_keys: {
                name: "contains only objects with keys",
                args: [
                    {
                        name: "keys",
                        type: "list",
                        description: "List of keys to look for within all objects in the list",
                    },
                ],
            },
            does_not_contain_only_objects_with_keys: {
                name: "does not contain only objects with keys",
                args: [
                    {
                        name: "keys",
                        type: "list",
                        description: "List of keys to look for within all objects in the list",
                    },
                ],
            },
            contains_object_with_data: {
                name: "contains object with data",
                args: [
                    {
                        name: "data",
                        type: "object",
                        description: "Data that may be present within any object in the list",
                    },
                ],
            },
            contains_all_objects_with_data: {
                name: "contains all objects with data",
                args: [
                    {
                        name: "data",
                        type: "object",
                        description: "Data that must be present within all objects in the list",
                    },
                ],
            },
            does_not_contain_object_with_data: {
                name: "does not contain object with data",
                args: [
                    {
                        name: "data",
                        type: "object",
                        description: "Data that must not be present within any object in the list",
                    },
                ],
            },
            contains_all_elements_in_order: {
                name: "contains all elements in order",
                args: [
                    {
                        name: "sublist",
                        type: "list",
                        description: "List that must be contained in order within the list",
                    },
                ],
            },
            contains_all_elements_in_order_case_insensitive: {
                name: "contains all elements in order (case-insensitive)",
                args: [
                    {
                        name: "sublist",
                        type: "list",
                        description:
                            "List that must be contained in order within the list (case-insensitive for strings)",
                    },
                ],
            },
            contains_duplicates_of_value: {
                name: "contains duplicates of value",
                args: [
                    {
                        name: "value",
                        type: "generic",
                        description: "Value that must appear more than once in the list",
                    },
                ],
            },
            contains_duplicates_of_value_case_insensitive: {
                name: "contains duplicates of value (case-insensitive)",
                args: [
                    {
                        name: "value",
                        type: "generic",
                        description: "Value that must appear more than once in the list (case-insensitive for strings)",
                    },
                ],
            },
            has_unique_elements: {
                name: "has unique elements",
                args: [],
                description: "Check if all elements in the list are unique",
            },
            is_sublist_of: {
                name: "is a sublist of",
                args: [
                    {
                        name: "superlist",
                        type: "list",
                        description: "List that must contain this list as a sublist",
                    },
                ],
            },
            is_superlist_of: {
                name: "is a superlist of",
                args: [
                    {
                        name: "sublist",
                        type: "list",
                        description: "List that must be contained as a sublist within this list",
                    },
                ],
            },
            has_item_at_index: {
                name: "has item at index",
                args: [
                    {
                        name: "index",
                        type: "number",
                        description: "Index in the list (negative indices count from the end)",
                    },
                    {
                        name: "value",
                        type: "generic",
                        description: "Value that must be at the specified index",
                    },
                ],
            },
            has_item_at_index_case_insensitive: {
                name: "has item at index (case-insensitive)",
                args: [
                    {
                        name: "index",
                        type: "number",
                        description: "Index in the list (negative indices count from the end)",
                    },
                    {
                        name: "value",
                        type: "generic",
                        description: "Value that must be at the specified index (case-insensitive for strings)",
                    },
                ],
            },
            does_not_have_item_at_index: {
                name: "does not have item at index",
                args: [
                    {
                        name: "index",
                        type: "number",
                        description: "Index in the list (negative indices count from the end)",
                    },
                    {
                        name: "value",
                        type: "generic",
                        description: "Value that must not be at the specified index",
                    },
                ],
            },
            does_not_have_item_at_index_case_insensitive: {
                name: "does not have item at index (case-insensitive)",
                args: [
                    {
                        name: "index",
                        type: "number",
                        description: "Index in the list (negative indices count from the end)",
                    },
                    {
                        name: "value",
                        type: "generic",
                        description: "Value that must not be at the specified index (case-insensitive for strings)",
                    },
                ],
            },
            has_object_with_key_value_at_index: {
                name: "has object with key & value at index",
                args: [
                    {
                        name: "index",
                        type: "number",
                        description: "Index in the list (negative indices count from the end)",
                    },
                    {
                        name: "key",
                        type: "string",
                        description: "Key to check in the object at the specified index",
                    },
                    {
                        name: "value",
                        type: "generic",
                        description: "Value that the key must equal",
                    },
                ],
            },
            has_object_with_key_value_at_index_case_insensitive: {
                name: "has object with key & value at index (case-insensitive)",
                args: [
                    {
                        name: "index",
                        type: "number",
                        description: "Index in the list (negative indices count from the end)",
                    },
                    {
                        name: "key",
                        type: "string",
                        description: "Key to check in the object at the specified index",
                    },
                    {
                        name: "value",
                        type: "generic",
                        description: "Value that the key must equal (case-insensitive for strings)",
                    },
                ],
            },
            object_at_index_has_keys: {
                name: "object at index has keys",
                args: [
                    {
                        name: "index",
                        type: "number",
                        description: "Index in the list (negative indices count from the end)",
                    },
                    {
                        name: "keys",
                        type: "list",
                        description: "List of keys that must be present in the object",
                    },
                ],
            },
            contains_any_object_with_key: {
                name: "contains any object with key",
                args: [{ name: "key", type: "string", description: "Key that the object must contain" }],
            },
            is_null: { name: "is null", args: [], description: "Check if value is null" },
        };
    }

    contains(value: any | VocabularyValue): OperatorResult {
        return ["contains", [new Argument(value, "generic").toDict()]];
    }

    is_empty(): OperatorResult {
        return ["is empty", []];
    }

    is_not_empty(): OperatorResult {
        return ["is not empty", []];
    }

    length_equals(length: number | VocabularyValue): OperatorResult {
        return ["is of length", [new Argument(length, VocabularyValueType.NUMBER).toDict()]];
    }

    length_not_equals(length: number | VocabularyValue): OperatorResult {
        return ["is not of length", [new Argument(length, VocabularyValueType.NUMBER).toDict()]];
    }

    longer_than(length: number | VocabularyValue): OperatorResult {
        return ["is longer than", [new Argument(length, VocabularyValueType.NUMBER).toDict()]];
    }

    shorter_than(length: number | VocabularyValue): OperatorResult {
        return ["is shorter than", [new Argument(length, VocabularyValueType.NUMBER).toDict()]];
    }

    contains_all(values: any[] | VocabularyValue): OperatorResult {
        return ["contains all of", [new Argument(values, VocabularyValueType.LIST).toDict()]];
    }

    contains_any(values: any[] | VocabularyValue): OperatorResult {
        return ["contains any of", [new Argument(values, VocabularyValueType.LIST).toDict()]];
    }

    contains_none(values: any[] | VocabularyValue): OperatorResult {
        return ["contains none of", [new Argument(values, VocabularyValueType.LIST).toDict()]];
    }

    not_contains(value: any | VocabularyValue): OperatorResult {
        return ["does not contain", [new Argument(value, "generic").toDict()]];
    }

    equals(other: any[] | VocabularyValue): OperatorResult {
        return ["is equal to", [new Argument(other, VocabularyValueType.LIST).toDict()]];
    }

    not_equals(other: any[] | VocabularyValue): OperatorResult {
        return ["is not equal to", [new Argument(other, VocabularyValueType.LIST).toDict()]];
    }

    has_duplicates(): OperatorResult {
        return ["contains duplicates", []];
    }

    no_duplicates(): OperatorResult {
        return ["does not contain duplicates", []];
    }

    contains_object_with_key_value(key: string | VocabularyValue, value: any | VocabularyValue): OperatorResult {
        return [
            "contains object with key & value",
            [new Argument(key, VocabularyValueType.STRING).toDict(), new Argument(value, "generic").toDict()],
        ];
    }

    does_not_contain_object_with_key_value(
        key: string | VocabularyValue,
        value: any | VocabularyValue
    ): OperatorResult {
        return [
            "does not contain object with key & value",
            [new Argument(key, VocabularyValueType.STRING).toDict(), new Argument(value, "generic").toDict()],
        ];
    }

    contains_object_with_key(key: string | VocabularyValue): OperatorResult {
        return ["contains object with key", [new Argument(key, VocabularyValueType.STRING).toDict()]];
    }

    does_not_contain_object_with_key(key: string | VocabularyValue): OperatorResult {
        return ["does not contain object with key", [new Argument(key, VocabularyValueType.STRING).toDict()]];
    }

    has_unique_elements(): OperatorResult {
        return ["has unique elements", []];
    }

    is_sublist_of(superlist: any[] | VocabularyValue): OperatorResult {
        return ["is a sublist of", [new Argument(superlist, VocabularyValueType.LIST).toDict()]];
    }

    is_superlist_of(sublist: any[] | VocabularyValue): OperatorResult {
        return ["is a superlist of", [new Argument(sublist, VocabularyValueType.LIST).toDict()]];
    }

    contains_case_insensitive(value: any | VocabularyValue): OperatorResult {
        return ["contains (case-insensitive)", [new Argument(value, "generic").toDict()]];
    }

    longer_than_or_equal(length: number | VocabularyValue): OperatorResult {
        return ["is longer than or equal to", [new Argument(length, VocabularyValueType.NUMBER).toDict()]];
    }

    shorter_than_or_equal(length: number | VocabularyValue): OperatorResult {
        return ["is shorter than or equal to", [new Argument(length, VocabularyValueType.NUMBER).toDict()]];
    }

    contains_all_case_insensitive(values: any[] | VocabularyValue): OperatorResult {
        return ["contains all of (case-insensitive)", [new Argument(values, VocabularyValueType.LIST).toDict()]];
    }

    contains_n_occurrences_of(value: any | VocabularyValue, occurrences: number | VocabularyValue): OperatorResult {
        return [
            "contains N occurrences of",
            [new Argument(value, "generic").toDict(), new Argument(occurrences, VocabularyValueType.NUMBER).toDict()],
        ];
    }

    contains_at_least_n_occurrences_of(
        value: any | VocabularyValue,
        occurrences: number | VocabularyValue
    ): OperatorResult {
        return [
            "contains at least N occurrences of",
            [new Argument(value, "generic").toDict(), new Argument(occurrences, VocabularyValueType.NUMBER).toDict()],
        ];
    }

    contains_at_most_n_occurrences_of(
        value: any | VocabularyValue,
        occurrences: number | VocabularyValue
    ): OperatorResult {
        return [
            "contains at most N occurrences of",
            [new Argument(value, "generic").toDict(), new Argument(occurrences, VocabularyValueType.NUMBER).toDict()],
        ];
    }

    contains_any_case_insensitive(values: any[] | VocabularyValue): OperatorResult {
        return ["contains any of (case-insensitive)", [new Argument(values, VocabularyValueType.LIST).toDict()]];
    }

    contains_none_case_insensitive(values: any[] | VocabularyValue): OperatorResult {
        return ["contains none of (case-insensitive)", [new Argument(values, VocabularyValueType.LIST).toDict()]];
    }

    not_contains_case_insensitive(value: any | VocabularyValue): OperatorResult {
        return ["does not contain (case-insensitive)", [new Argument(value, "generic").toDict()]];
    }

    contains_numbers_in_range(min: number | VocabularyValue, max: number | VocabularyValue): OperatorResult {
        return [
            "contains numbers in range (inclusive)",
            [
                new Argument(min, VocabularyValueType.NUMBER).toDict(),
                new Argument(max, VocabularyValueType.NUMBER).toDict(),
            ],
        ];
    }

    contains_object_with_key_value_case_insensitive(
        key: string | VocabularyValue,
        value: any | VocabularyValue
    ): OperatorResult {
        return [
            "contains object with key & value (case-insensitive)",
            [new Argument(key, VocabularyValueType.STRING).toDict(), new Argument(value, "generic").toDict()],
        ];
    }

    does_not_contain_object_with_key_value_case_insensitive(
        key: string | VocabularyValue,
        value: any | VocabularyValue
    ): OperatorResult {
        return [
            "does not contain object with key & value (case-insensitive)",
            [new Argument(key, VocabularyValueType.STRING).toDict(), new Argument(value, "generic").toDict()],
        ];
    }

    contains_only_objects_with_keys(keys: any[] | VocabularyValue): OperatorResult {
        return ["contains only objects with keys", [new Argument(keys, VocabularyValueType.LIST).toDict()]];
    }

    does_not_contain_only_objects_with_keys(keys: any[] | VocabularyValue): OperatorResult {
        return ["does not contain only objects with keys", [new Argument(keys, VocabularyValueType.LIST).toDict()]];
    }

    contains_object_with_data(data: Record<string, any> | VocabularyValue): OperatorResult {
        return ["contains object with data", [new Argument(data, VocabularyValueType.OBJECT).toDict()]];
    }

    contains_all_objects_with_data(data: Record<string, any> | VocabularyValue): OperatorResult {
        return ["contains all objects with data", [new Argument(data, VocabularyValueType.OBJECT).toDict()]];
    }

    does_not_contain_object_with_data(data: Record<string, any> | VocabularyValue): OperatorResult {
        return ["does not contain object with data", [new Argument(data, VocabularyValueType.OBJECT).toDict()]];
    }

    contains_all_elements_in_order(sublist: any[] | VocabularyValue): OperatorResult {
        return ["contains all elements in order", [new Argument(sublist, VocabularyValueType.LIST).toDict()]];
    }

    contains_all_elements_in_order_case_insensitive(sublist: any[] | VocabularyValue): OperatorResult {
        return [
            "contains all elements in order (case-insensitive)",
            [new Argument(sublist, VocabularyValueType.LIST).toDict()],
        ];
    }

    contains_duplicates_of_value(value: any | VocabularyValue): OperatorResult {
        return ["contains duplicates of value", [new Argument(value, "generic").toDict()]];
    }

    contains_duplicates_of_value_case_insensitive(value: any | VocabularyValue): OperatorResult {
        return ["contains duplicates of value (case-insensitive)", [new Argument(value, "generic").toDict()]];
    }

    has_item_at_index(index: number | VocabularyValue, value: any | VocabularyValue): OperatorResult {
        return [
            "has item at index",
            [new Argument(index, VocabularyValueType.NUMBER).toDict(), new Argument(value, "generic").toDict()],
        ];
    }

    has_item_at_index_case_insensitive(index: number | VocabularyValue, value: any | VocabularyValue): OperatorResult {
        return [
            "has item at index (case-insensitive)",
            [new Argument(index, VocabularyValueType.NUMBER).toDict(), new Argument(value, "generic").toDict()],
        ];
    }

    does_not_have_item_at_index(index: number | VocabularyValue, value: any | VocabularyValue): OperatorResult {
        return [
            "does not have item at index",
            [new Argument(index, VocabularyValueType.NUMBER).toDict(), new Argument(value, "generic").toDict()],
        ];
    }

    does_not_have_item_at_index_case_insensitive(
        index: number | VocabularyValue,
        value: any | VocabularyValue
    ): OperatorResult {
        return [
            "does not have item at index (case-insensitive)",
            [new Argument(index, VocabularyValueType.NUMBER).toDict(), new Argument(value, "generic").toDict()],
        ];
    }

    has_object_with_key_value_at_index(
        index: number | VocabularyValue,
        key: string | VocabularyValue,
        value: any | VocabularyValue
    ): OperatorResult {
        return [
            "has object with key & value at index",
            [
                new Argument(index, VocabularyValueType.NUMBER).toDict(),
                new Argument(key, VocabularyValueType.STRING).toDict(),
                new Argument(value, "generic").toDict(),
            ],
        ];
    }

    has_object_with_key_value_at_index_case_insensitive(
        index: number | VocabularyValue,
        key: string | VocabularyValue,
        value: any | VocabularyValue
    ): OperatorResult {
        return [
            "has object with key & value at index (case-insensitive)",
            [
                new Argument(index, VocabularyValueType.NUMBER).toDict(),
                new Argument(key, VocabularyValueType.STRING).toDict(),
                new Argument(value, "generic").toDict(),
            ],
        ];
    }

    object_at_index_has_keys(index: number | VocabularyValue, keys: any[] | VocabularyValue): OperatorResult {
        return [
            "object at index has keys",
            [
                new Argument(index, VocabularyValueType.NUMBER).toDict(),
                new Argument(keys, VocabularyValueType.LIST).toDict(),
            ],
        ];
    }

    contains_any_object_with_key(key: string | VocabularyValue): OperatorResult {
        return ["contains any object with key", [new Argument(key, VocabularyValueType.STRING).toDict()]];
    }

    is_null(): OperatorResult {
        return ["is null", []];
    }
}
