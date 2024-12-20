import { Field, RuleType, OperatorDef, DynamicValueType, TypeMismatchError } from './types.js';
import { DynamicValue } from './values.js';

export type OperatorResult = [string, any[]];

export class Argument<T> {
  constructor(
    private value: T | DynamicValue,
    private expectedType: DynamicValueType
  ) {
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
      if (!(typeof this.value === expectedJsType ||
           (expectedJsType === 'object' && Array.isArray(this.value)))) {
        const actualType = typeof this.value;
        throw new TypeMismatchError(
          `Value ${this.value} has type ${actualType}, ` +
          `but ${this.expectedType} was expected`
        );
      }
    }
  }

  private getExpectedJsType(): string {
    switch (this.expectedType) {
      case DynamicValueType.STRING:
        return 'string';
      case DynamicValueType.NUMBER:
        return 'number';
      case DynamicValueType.BOOLEAN:
        return 'boolean';
      case DynamicValueType.DATE:
        return 'object';
      case DynamicValueType.LIST:
      case DynamicValueType.OBJECT:
        return 'object';
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
      return arg.map(item => this.process(item, expectedType));
    } else if (typeof arg === 'object' && arg !== null) {
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

  constructor(
    name: string,
    description: string = '',
    defaultValue: boolean = false
  ) {
    this.name = name;
    this.description = description;
    this.defaultValue = defaultValue;
    this.operators = {
      any: { name: 'any', args: [], description: 'Match any boolean value', skipTypecheck: true },
      is_true: { name: 'is true', args: [], description: 'Check if value is true' },
      is_false: { name: 'is false', args: [], description: 'Check if value is false' }
    };
  }

  equals(value: boolean | DynamicValue): [string, any[]] {
    const opName = value ? 'is true' : 'is false';
    return [opName, []];
  }
}

export class NumberField implements Field {
  public readonly type = RuleType.NUMBER;
  public readonly operators: Record<string, OperatorDef>;
  public readonly defaultValue: number;
  public readonly name: string;
  public readonly description: string;

  constructor(
    name: string,
    description: string = '',
    defaultValue: number = 0
  ) {
    this.name = name;
    this.description = description;
    this.defaultValue = defaultValue;
    this.operators = {
      any: { name: 'any', args: [], description: 'Match any numeric value', skipTypecheck: true },
      equals: { name: 'equals', args: [{ name: 'value', type: 'number', description: 'Number that value must equal' }] },
      does_not_equal: { name: 'does not equal', args: [{ name: 'value', type: 'number', description: 'Number that value must not equal' }] },
      greater_than: { name: 'greater than', args: [{ name: 'bound', type: 'number', description: 'Number that value must be greater than' }] },
      less_than: { name: 'less than', args: [{ name: 'bound', type: 'number', description: 'Number that value must be less than' }] },
      greater_than_or_equal: { name: 'greater than or equal to', args: [{ name: 'bound', type: 'number', description: 'Number that value must be greater than or equal to' }] },
      less_than_or_equal: { name: 'less than or equal to', args: [{ name: 'bound', type: 'number', description: 'Number that value must be less than or equal to' }] },
      between: {
        name: 'between',
        args: [
          { name: 'start', type: 'number', description: 'Number that value must be greater than or equal to', placeholder: 'Start' },
          { name: 'end', type: 'number', description: 'Number that value must be less than or equal to', placeholder: 'End' }
        ],
        validate: (args: any[]) => args[0] < args[1]
      },
      not_between: {
        name: 'not between',
        args: [
          { name: 'start', type: 'number', description: 'Number that value must be less than', placeholder: 'Start' },
          { name: 'end', type: 'number', description: 'Number that value must be greater than', placeholder: 'End' }
        ],
        validate: (args: any[]) => args[0] < args[1]
      },
      is_even: { name: 'is even', args: [], description: 'Check if value is even' },
      is_odd: { name: 'is odd', args: [], description: 'Check if value is odd' },
      is_positive: { name: 'is positive', args: [], description: 'Check if value is greater than zero' },
      is_negative: { name: 'is negative', args: [], description: 'Check if value is less than zero' },
      is_zero: { name: 'is zero', args: [], description: 'Check if value equals zero' },
      is_not_zero: { name: 'is not zero', args: [], description: 'Check if value does not equal zero' },
      is_multiple_of: { name: 'is a multiple of', args: [{ name: 'multiple', type: 'number', description: 'Number that value must be a multiple of' }] },
      is_not_multiple_of: { name: 'is not a multiple of', args: [{ name: 'multiple', type: 'number', description: 'Number that value must not be a multiple of' }] },
      is_power_of: {
        name: 'is a power of',
        args: [{ name: 'base', type: 'number', description: 'The base number' }],
        validate: (args: any[]) => args[0] > 0
      }
    };
  }

  equals(value: number | DynamicValue): [string, any[]] {
    return ["equals", [new Argument(value, DynamicValueType.NUMBER).toDict()]];
  }

  not_equals(value: number | DynamicValue): [string, any[]] {
    return ["does not equal", [new Argument(value, DynamicValueType.NUMBER).toDict()]];
  }

  greater_than(value: number | DynamicValue): [string, any[]] {
    return ["greater than", [new Argument(value, DynamicValueType.NUMBER).toDict()]];
  }

  less_than(value: number | DynamicValue): [string, any[]] {
    return ["less than", [new Argument(value, DynamicValueType.NUMBER).toDict()]];
  }

  greater_than_or_equal(value: number | DynamicValue): [string, any[]] {
    return ["greater than or equal to", [new Argument(value, DynamicValueType.NUMBER).toDict()]];
  }

  less_than_or_equal(value: number | DynamicValue): [string, any[]] {
    return ["less than or equal to", [new Argument(value, DynamicValueType.NUMBER).toDict()]];
  }

  between(start: number | DynamicValue, end: number | DynamicValue): [string, any[]] {
    const startArg = new Argument(start, DynamicValueType.NUMBER);
    const endArg = new Argument(end, DynamicValueType.NUMBER);
    if (!(start instanceof DynamicValue) && !(end instanceof DynamicValue)) {
      const op = this.operators['between'];
      if (op.validate && !op.validate([start, end])) {
        throw new Error(`Invalid range for between: start (${start}) must be less than end (${end})`);
      }
    }
    return ["between", [startArg.toDict(), endArg.toDict()]];
  }

  not_between(start: number | DynamicValue, end: number | DynamicValue): [string, any[]] {
    const startArg = new Argument(start, DynamicValueType.NUMBER);
    const endArg = new Argument(end, DynamicValueType.NUMBER);
    if (!(start instanceof DynamicValue) && !(end instanceof DynamicValue)) {
      const op = this.operators['not between'];
      if (op.validate && !op.validate([start, end])) {
        throw new Error(`Invalid range for not between: start (${start}) must be less than end (${end})`);
      }
    }
    return ["not between", [startArg.toDict(), endArg.toDict()]];
  }

  is_even(): [string, any[]] {
    return ["is even", []];
  }

  is_odd(): [string, any[]] {
    return ["is odd", []];
  }

  is_positive(): [string, any[]] {
    return ["is positive", []];
  }

  is_negative(): [string, any[]] {
    return ["is negative", []];
  }

  is_zero(): [string, any[]] {
    return ["is zero", []];
  }

  is_not_zero(): [string, any[]] {
    return ["is not zero", []];
  }

  is_multiple_of(value: number | DynamicValue): [string, any[]] {
    return ["is a multiple of", [new Argument(value, DynamicValueType.NUMBER).toDict()]];
  }

  is_not_multiple_of(value: number | DynamicValue): [string, any[]] {
    return ["is not a multiple of", [new Argument(value, DynamicValueType.NUMBER).toDict()]];
  }

  is_power_of(base: number | DynamicValue): [string, any[]] {
    const baseArg = new Argument(base, DynamicValueType.NUMBER);
    if (!(base instanceof DynamicValue)) {
      const op = this.operators['is a power of'];
      if (op.validate && !op.validate([base])) {
        throw new Error(`Invalid base for is power of: ${base}. Base must be positive.`);
      }
    }
    return ["is a power of", [baseArg.toDict()]];
  }
}

export class StringField implements Field {
  public readonly type = RuleType.STRING;
  public readonly operators: Record<string, OperatorDef>;
  public readonly defaultValue: string;
  public readonly name: string;
  public readonly description: string;

  constructor(
    name: string,
    description: string = '',
    defaultValue: string = ''
  ) {
    this.name = name;
    this.description = description;
    this.defaultValue = defaultValue;
    this.operators = {
      any: { name: 'any', args: [], description: 'Match any string value', skipTypecheck: true },
      contains: {
        name: 'contains',
        args: [{ name: 'value', type: 'string', description: 'The value to search for within the string', validate: (x: string) => x.length > 0 }]
      },
      does_not_contain: {
        name: 'does not contain',
        args: [{ name: 'value', type: 'string', description: 'The value to search for within the string', validate: (x: string) => x.length > 0 }]
      },
      equals: { name: 'equals', args: [{ name: 'value', type: 'string', description: 'The value to compare against' }] },
      does_not_equal: { name: 'does not equal', args: [{ name: 'value', type: 'string', description: 'The value to compare against' }] },
      is_empty: { name: 'is empty', args: [], description: 'Check if string is empty' },
      is_not_empty: { name: 'is not empty', args: [], description: 'Check if string is not empty' },
      starts_with: {
        name: 'starts with',
        args: [{ name: 'value', type: 'string', description: 'The value the string should start with', validate: (v: string) => v.length > 0 }]
      },
      ends_with: {
        name: 'ends with',
        args: [{ name: 'value', type: 'string', description: 'The value the string should end with', validate: (v: string) => v.length > 0 }]
      },
      is_included_in: {
        name: 'is included in',
        args: [{ name: 'value', type: 'list', description: 'A list of values the string should be in', validate: (v: any[]) => v.length > 0 }]
      },
      is_not_included_in: {
        name: 'is not included in',
        args: [{ name: 'value', type: 'list', description: 'A list of values the string should not be in', validate: (v: any[]) => v.length > 0 }]
      },
      matches_regex: {
        name: 'matches RegEx',
        args: [{ name: 'regex', type: 'string', description: 'The regex the string should match', validate: (v: string) => v.length > 0 }]
      },
      does_not_match_regex: {
        name: 'does not match RegEx',
        args: [{ name: 'regex', type: 'string', description: 'The regex the string should not match', validate: (v: string) => v.length > 0 }]
      },
      is_valid_email: { name: 'is a valid email address', args: [], description: 'Check if string is a valid email address' },
      is_not_valid_email: { name: 'is not a valid email address', args: [], description: 'Check if string is not a valid email address' },
      is_valid_url: { name: 'is a valid URL', args: [], description: 'Check if string is a valid URL' },
      is_not_valid_url: { name: 'is not a valid URL', args: [], description: 'Check if string is not a valid URL' },
      is_valid_ip: { name: 'is a valid IP address', args: [], description: 'Check if string is a valid IP address' },
      is_not_valid_ip: { name: 'is not a valid IP address', args: [], description: 'Check if string is not a valid IP address' },
      is_uppercase: { name: 'is uppercase', args: [], description: 'Check if string is all uppercase' },
      is_lowercase: { name: 'is lowercase', args: [], description: 'Check if string is all lowercase' },
      is_numeric: { name: 'is numeric', args: [], description: 'Check if string contains only numeric characters' },
      contains_only_digits: { name: 'contains only digits', args: [], description: 'Check if string contains only digits' },
      contains_only_letters: { name: 'contains only letters', args: [], description: 'Check if string contains only letters' },
      contains_only_digits_and_letters: { name: 'contains only digits and letters', args: [], description: 'Check if string contains only digits and letters' },
      starts_with_case_insensitive: {
        name: 'starts with (case-insensitive)',
        args: [{ name: 'prefix', type: 'string', description: 'The string that the value should start with (case-insensitive)' }]
      },
      ends_with_case_insensitive: {
        name: 'ends with (case-insensitive)',
        args: [{ name: 'suffix', type: 'string', description: 'The string that the value should end with (case-insensitive)' }]
      },
      contains_case_insensitive: {
        name: 'contains (case-insensitive)',
        args: [{ name: 'substring', type: 'string', description: 'The string that should be contained within the value (case-insensitive)' }]
      },
      is_work_email: { name: 'is a work email address', args: [], description: 'Check if string is a work email address' },
      is_personal_email: { name: 'is a personal email address', args: [], description: 'Check if string is a personal email address' },
      is_valid_ipv6: { name: 'is a valid IPV6 address', args: [], description: 'Check if string is a valid IPv6 address' },
      is_not_valid_ipv6: { name: 'is not a valid IPV6 address', args: [], description: 'Check if string is not a valid IPv6 address' },
      is_valid_phone: { name: 'is a valid phone number', args: [], description: 'Check if string is a valid phone number' },
      is_valid_zip: { name: 'is a valid zip code', args: [], description: 'Check if string is a valid zip code' },
      contains_profanity: { name: 'contains profanity', args: [], description: 'Check if string contains profanity' },
      does_not_contain_profanity: { name: 'does not contain profanity', args: [], description: 'Check if string does not contain profanity' }
    };
  }

  contains(value: string | DynamicValue): [string, any[]] {
    return ["contains", [new Argument(value, DynamicValueType.STRING).toDict()]];
  }

  not_contains(value: string | DynamicValue): [string, any[]] {
    return ["does not contain", [new Argument(value, DynamicValueType.STRING).toDict()]];
  }

  equals(value: string | DynamicValue): [string, any[]] {
    return ["equals", [new Argument(value, DynamicValueType.STRING).toDict()]];
  }

  not_equals(value: string | DynamicValue): [string, any[]] {
    return ["does not equal", [new Argument(value, DynamicValueType.STRING).toDict()]];
  }

  is_empty(): [string, any[]] {
    return ["is empty", []];
  }

  is_not_empty(): [string, any[]] {
    return ["is not empty", []];
  }

  starts_with(value: string | DynamicValue): [string, any[]] {
    return ["starts with", [new Argument(value, DynamicValueType.STRING).toDict()]];
  }

  ends_with(value: string | DynamicValue): [string, any[]] {
    return ["ends with", [new Argument(value, DynamicValueType.STRING).toDict()]];
  }

  is_included_in(values: string[] | DynamicValue): [string, any[]] {
    if (values instanceof DynamicValue) {
      return ["is included in", [new Argument(values, DynamicValueType.LIST).toDict()]];
    }
    const args = values.map(value => new Argument(value, DynamicValueType.STRING).toDict());
    return ["is included in", args];
  }

  matches_regex(pattern: string | DynamicValue): [string, any[]] {
    return ["matches regex", [new Argument(pattern, DynamicValueType.STRING).toDict()]];
  }

  not_matches_regex(pattern: string | DynamicValue): [string, any[]] {
    return ["does not match regex", [new Argument(pattern, DynamicValueType.STRING).toDict()]];
  }

  is_email(): [string, any[]] {
    return ["is email", []];
  }

  is_not_email(): [string, any[]] {
    return ["is not email", []];
  }

  is_url(): [string, any[]] {
    return ["is url", []];
  }

  is_not_url(): [string, any[]] {
    return ["is not url", []];
  }

  is_ip(): [string, any[]] {
    return ["is ip", []];
  }

  is_not_ip(): [string, any[]] {
    return ["is not ip", []];
  }

  is_uppercase(): [string, any[]] {
    return ["is uppercase", []];
  }

  is_lowercase(): [string, any[]] {
    return ["is lowercase", []];
  }

  is_numeric(): [string, any[]] {
    return ["is numeric", []];
  }

  contains_only_digits(): [string, any[]] {
    return ["contains only digits", []];
  }

  contains_only_letters(): [string, any[]] {
    return ["contains only letters", []];
  }

  contains_only_digits_and_letters(): [string, any[]] {
    return ["contains only digits and letters", []];
  }

  starts_with_case_insensitive(prefix: string | DynamicValue): [string, any[]] {
    return ["starts with case insensitive", [new Argument(prefix, DynamicValueType.STRING).toDict()]];
  }

  ends_with_case_insensitive(suffix: string | DynamicValue): [string, any[]] {
    return ["ends with case insensitive", [new Argument(suffix, DynamicValueType.STRING).toDict()]];
  }

  contains_case_insensitive(substring: string | DynamicValue): [string, any[]] {
    return ["contains case insensitive", [new Argument(substring, DynamicValueType.STRING).toDict()]];
  }

  is_work_email(): [string, any[]] {
    return ["is work email", []];
  }

  is_personal_email(): [string, any[]] {
    return ["is personal email", []];
  }

  is_valid_ipv6(): [string, any[]] {
    return ["is valid ipv6", []];
  }

  is_not_valid_ipv6(): [string, any[]] {
    return ["is not valid ipv6", []];
  }

  is_valid_phone(): [string, any[]] {
    return ["is valid phone", []];
  }

  is_valid_zip(): [string, any[]] {
    return ["is valid zip", []];
  }

  contains_profanity(): [string, any[]] {
    return ["contains profanity", []];
  }

  does_not_contain_profanity(): [string, any[]] {
    return ["does not contain profanity", []];
  }
}

export class DateField implements Field {
  public readonly type = RuleType.DATE;
  public readonly operators: Record<string, OperatorDef>;
  public readonly name: string;
  public readonly description: string;
  public readonly defaultValue: Date;

  constructor(name: string, description: string = "", defaultValue?: Date) {
    this.name = name;
    this.description = description;
    this.defaultValue = defaultValue || new Date();
    this.operators = {
      equals: {
        name: 'equals',
        args: [{ name: 'value', type: 'date', description: 'Value to compare with' }],
        description: 'Check if the field equals the given value'
      },
      before: {
        name: 'before',
        args: [{ name: 'value', type: 'date', description: 'Value to compare with' }],
        description: 'Check if the field is before the given value'
      },
      after: {
        name: 'after',
        args: [{ name: 'value', type: 'date', description: 'Value to compare with' }],
        description: 'Check if the field is after the given value'
      },
      is_past: { name: 'is in the past', args: [] },
      is_future: { name: 'is in the future', args: [] },
      is_today: { name: 'is today', args: [] },
      is_this_week: { name: 'is this week', args: [] },
      is_this_month: { name: 'is this month', args: [] },
      is_this_year: { name: 'is this year', args: [] },
      is_next_week: { name: 'is next week', args: [] },
      is_next_month: { name: 'is next month', args: [] },
      is_next_year: { name: 'is next year', args: [] },
      is_last_week: { name: 'is last week', args: [] },
      is_last_month: { name: 'is last month', args: [] },
      is_last_year: { name: 'is last year', args: [] }
    };
  }

  equals(value: Date | DynamicValue): [string, any[]] {
    return ["equals", [new Argument(value, DynamicValueType.DATE).toDict()]];
  }

  before(value: Date | DynamicValue): [string, any[]] {
    return ["before", [new Argument(value, DynamicValueType.DATE).toDict()]];
  }

  after(value: Date | DynamicValue): [string, any[]] {
    return ["after", [new Argument(value, DynamicValueType.DATE).toDict()]];
  }

  is_past(): [string, any[]] {
    return ["is in the past", []];
  }

  is_future(): [string, any[]] {
    return ["is in the future", []];
  }

  is_today(): [string, any[]] {
    return ["is today", []];
  }

  is_this_week(): [string, any[]] {
    return ["is this week", []];
  }

  is_this_month(): [string, any[]] {
    return ["is this month", []];
  }

  is_this_year(): [string, any[]] {
    return ["is this year", []];
  }

  is_next_week(): [string, any[]] {
    return ["is next week", []];
  }

  is_next_month(): [string, any[]] {
    return ["is next month", []];
  }

  is_next_year(): [string, any[]] {
    return ["is next year", []];
  }

  is_last_week(): [string, any[]] {
    return ["is last week", []];
  }

  is_last_month(): [string, any[]] {
    return ["is last month", []];
  }

  is_last_year(): [string, any[]] {
    return ["is last year", []];
  }
}

export class ListField implements Field {
  public readonly type = RuleType.LIST;
  public readonly operators: Record<string, OperatorDef>;
  public readonly defaultValue: any[];
  public readonly name: string;
  public readonly description: string;

  constructor(
    name: string,
    description: string = '',
    defaultValue: any[] = []
  ) {
    this.name = name;
    this.description = description;
    this.defaultValue = defaultValue;
    this.operators = {
      contains: {
        name: 'contains',
        args: [{ name: 'value', type: 'any', description: 'Value to check for' }],
        description: 'Check if the list contains the given value'
      },
      is_empty: {
        name: 'is empty',
        args: [],
        description: 'Check if list is empty'
      },
      length_equals: {
        name: 'length equals',
        args: [{ name: 'length', type: 'number', description: 'Length to compare with' }],
        description: 'Check if list length equals the given value'
      },
      contains_all: {
        name: 'contains all',
        args: [{ name: 'values', type: 'list', description: 'List of values that must be contained' }],
        description: 'Check if list contains all specified values'
      }
    };
  }

  contains(value: any | DynamicValue): [string, any[]] {
    return ["contains", [new Argument(value, DynamicValueType.LIST).toDict()]];
  }

  is_empty(): [string, any[]] {
    return ["is empty", []];
  }

  length_equals(length: number | DynamicValue): [string, any[]] {
    return ["length equals", [new Argument(length, DynamicValueType.NUMBER).toDict()]];
  }

  contains_all(values: any[] | DynamicValue): [string, any[]] {
    if (values instanceof DynamicValue) {
      return ["contains all", [values.toDict()]];
    }
    const args = values.map(v => new Argument(v, DynamicValueType.LIST).toDict());
    return ["contains all", args];
  }
}
