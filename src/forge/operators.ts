import { Field, RuleType, OperatorDef, DynamicValueType, TypeMismatchError } from './types';
import { DynamicValue } from './values';

export interface OperatorResult {
  operator: string;
  args: any[];
}

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

  equals(value: number | DynamicValue): OperatorResult {
    return { operator: 'equals', args: [new Argument(value, DynamicValueType.NUMBER).toDict()] };
  }

  not_equals(value: number | DynamicValue): OperatorResult {
    return { operator: 'does not equal', args: [new Argument(value, DynamicValueType.NUMBER).toDict()] };
  }

  greater_than(value: number | DynamicValue): OperatorResult {
    return { operator: 'greater than', args: [new Argument(value, DynamicValueType.NUMBER).toDict()] };
  }

  less_than(value: number | DynamicValue): OperatorResult {
    return { operator: 'less than', args: [new Argument(value, DynamicValueType.NUMBER).toDict()] };
  }

  greater_than_or_equal(value: number | DynamicValue): OperatorResult {
    return { operator: 'greater than or equal to', args: [new Argument(value, DynamicValueType.NUMBER).toDict()] };
  }

  less_than_or_equal(value: number | DynamicValue): OperatorResult {
    return { operator: 'less than or equal to', args: [new Argument(value, DynamicValueType.NUMBER).toDict()] };
  }

  between(start: number | DynamicValue, end: number | DynamicValue): OperatorResult {
    const startArg = new Argument(start, DynamicValueType.NUMBER);
    const endArg = new Argument(end, DynamicValueType.NUMBER);
    if (!(start instanceof DynamicValue) && !(end instanceof DynamicValue)) {
      const op = this.operators['between'];
      if (op.validate && !op.validate([start, end])) {
        throw new Error(`Invalid range for between: start (${start}) must be less than end (${end})`);
      }
    }
    return { operator: 'between', args: [startArg.toDict(), endArg.toDict()] };
  }

  not_between(start: number | DynamicValue, end: number | DynamicValue): OperatorResult {
    const startArg = new Argument(start, DynamicValueType.NUMBER);
    const endArg = new Argument(end, DynamicValueType.NUMBER);
    if (!(start instanceof DynamicValue) && !(end instanceof DynamicValue)) {
      const op = this.operators['not between'];
      if (op.validate && !op.validate([start, end])) {
        throw new Error(`Invalid range for not between: start (${start}) must be less than end (${end})`);
      }
    }
    return { operator: 'not between', args: [startArg.toDict(), endArg.toDict()] };
  }

  is_even(): OperatorResult {
    return { operator: 'is even', args: [] };
  }

  is_odd(): OperatorResult {
    return { operator: 'is odd', args: [] };
  }

  is_positive(): OperatorResult {
    return { operator: 'is positive', args: [] };
  }

  is_negative(): OperatorResult {
    return { operator: 'is negative', args: [] };
  }

  is_zero(): OperatorResult {
    return { operator: 'is zero', args: [] };
  }

  is_not_zero(): OperatorResult {
    return { operator: 'is not zero', args: [] };
  }

  is_multiple_of(value: number | DynamicValue): OperatorResult {
    return { operator: 'is a multiple of', args: [new Argument(value, DynamicValueType.NUMBER).toDict()] };
  }

  is_not_multiple_of(value: number | DynamicValue): OperatorResult {
    return { operator: 'is not a multiple of', args: [new Argument(value, DynamicValueType.NUMBER).toDict()] };
  }

  is_power_of(base: number | DynamicValue): OperatorResult {
    if (!(base instanceof DynamicValue)) {
      const op = this.operators['is a power of'];
      if (op.validate && !op.validate([base])) {
        throw new Error(`Invalid base for is power of: ${base}. Base must be positive.`);
      }
    }
    return { operator: 'is a power of', args: [new Argument(base, DynamicValueType.NUMBER).toDict()] };
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
    const arg = new Argument(value, DynamicValueType.STRING);
    if (!(value instanceof DynamicValue)) {
      const op = this.operators['contains'];
      if (op.args[0].validate && !op.args[0].validate(value)) {
        throw new Error(`Invalid value for contains: ${value}`);
      }
    }
    return ['contains', [arg]];
  }

  not_contains(value: string | DynamicValue): [string, any[]] {
    const arg = new Argument(value, DynamicValueType.STRING);
    if (!(value instanceof DynamicValue)) {
      const op = this.operators['does_not_contain'];
      if (op.args[0].validate && !op.args[0].validate(value)) {
        throw new Error(`Invalid value for does not contain: ${value}`);
      }
    }
    return ['does not contain', [arg]];
  }

  equals(value: string | DynamicValue): [string, any[]] {
    return ['equals', [new Argument(value, DynamicValueType.STRING)]];
  }

  not_equals(value: string | DynamicValue): [string, any[]] {
    return ['does not equal', [new Argument(value, DynamicValueType.STRING)]];
  }

  is_empty(): [string, any[]] {
    return ['is empty', []];
  }

  is_not_empty(): [string, any[]] {
    return ['is not empty', []];
  }

  starts_with(value: string | DynamicValue): [string, any[]] {
    const arg = new Argument(value, DynamicValueType.STRING);
    if (!(value instanceof DynamicValue)) {
      const op = this.operators['starts_with'];
      if (op.args[0].validate && !op.args[0].validate(value)) {
        throw new Error(`Invalid value for starts with: ${value}`);
      }
    }
    return ['starts with', [arg]];
  }

  ends_with(value: string | DynamicValue): [string, any[]] {
    const arg = new Argument(value, DynamicValueType.STRING);
    if (!(value instanceof DynamicValue)) {
      const op = this.operators['ends_with'];
      if (op.args[0].validate && !op.args[0].validate(value)) {
        throw new Error(`Invalid value for ends with: ${value}`);
      }
    }
    return ['ends with', [arg]];
  }

  is_included_in(values: string[] | DynamicValue): [string, any[]] {
    if (values instanceof DynamicValue) {
      if (values.valueType !== DynamicValueType.LIST) {
        throw new TypeMismatchError(
          `Dynamic value '${values.name}' has type ${values.valueType}, ` +
          `but list was expected`
        );
      }
      return ['is included in', [new Argument(values, DynamicValueType.LIST)]];
    }

    const op = this.operators['is_included_in'];
    if (op.args[0].validate && !op.args[0].validate(values)) {
      throw new Error('List must not be empty');
    }

    return ['is included in', [values.map(v => new Argument(v, DynamicValueType.STRING))]];
  }

  matches_regex(pattern: string | DynamicValue): [string, any[]] {
    const arg = new Argument(pattern, DynamicValueType.STRING);
    if (!(pattern instanceof DynamicValue)) {
      const op = this.operators['matches_regex'];
      if (op.args[0].validate && !op.args[0].validate(pattern)) {
        throw new Error(`Invalid regex pattern: ${pattern}`);
      }
    }
    return ['matches RegEx', [arg]];
  }

  not_matches_regex(pattern: string | DynamicValue): [string, any[]] {
    const arg = new Argument(pattern, DynamicValueType.STRING);
    if (!(pattern instanceof DynamicValue)) {
      const op = this.operators['does_not_match_regex'];
      if (op.args[0].validate && !op.args[0].validate(pattern)) {
        throw new Error(`Invalid regex pattern: ${pattern}`);
      }
    }
    return ['does not match RegEx', [arg]];
  }

  is_email(): [string, any[]] {
    return ['is a valid email address', []];
  }

  is_not_email(): [string, any[]] {
    return ['is not a valid email address', []];
  }

  is_url(): [string, any[]] {
    return ['is a valid URL', []];
  }

  is_not_url(): [string, any[]] {
    return ['is not a valid URL', []];
  }

  is_ip(): [string, any[]] {
    return ['is a valid IP address', []];
  }

  is_not_ip(): [string, any[]] {
    return ['is not a valid IP address', []];
  }

  is_uppercase(): [string, any[]] {
    return ['is uppercase', []];
  }

  is_lowercase(): [string, any[]] {
    return ['is lowercase', []];
  }

  is_numeric(): [string, any[]] {
    return ['is numeric', []];
  }

  contains_only_digits(): [string, any[]] {
    return ['contains only digits', []];
  }

  contains_only_letters(): [string, any[]] {
    return ['contains only letters', []];
  }

  contains_only_digits_and_letters(): [string, any[]] {
    return ['contains only digits and letters', []];
  }

  starts_with_case_insensitive(prefix: string | DynamicValue): [string, any[]] {
    const arg = new Argument(prefix, DynamicValueType.STRING);
    if (!(prefix instanceof DynamicValue)) {
      const op = this.operators['starts_with_case_insensitive'];
      if (op.args[0].validate && !op.args[0].validate(prefix)) {
        throw new Error(`Invalid prefix: ${prefix}`);
      }
    }
    return ['starts with (case-insensitive)', [arg]];
  }

  ends_with_case_insensitive(suffix: string | DynamicValue): [string, any[]] {
    const arg = new Argument(suffix, DynamicValueType.STRING);
    if (!(suffix instanceof DynamicValue)) {
      const op = this.operators['ends_with_case_insensitive'];
      if (op.args[0].validate && !op.args[0].validate(suffix)) {
        throw new Error(`Invalid suffix: ${suffix}`);
      }
    }
    return ['ends with (case-insensitive)', [arg]];
  }

  contains_case_insensitive(substring: string | DynamicValue): [string, any[]] {
    const arg = new Argument(substring, DynamicValueType.STRING);
    if (!(substring instanceof DynamicValue)) {
      const op = this.operators['contains_case_insensitive'];
      if (op.args[0].validate && !op.args[0].validate(substring)) {
        throw new Error(`Invalid substring: ${substring}`);
      }
    }
    return ['contains (case-insensitive)', [arg]];
  }

  is_work_email(): [string, any[]] {
    return ['is a work email address', []];
  }

  is_personal_email(): [string, any[]] {
    return ['is a personal email address', []];
  }

  is_valid_ipv6(): [string, any[]] {
    return ['is a valid IPV6 address', []];
  }

  is_not_valid_ipv6(): [string, any[]] {
    return ['is not a valid IPV6 address', []];
  }

  is_valid_phone(): [string, any[]] {
    return ['is a valid phone number', []];
  }

  is_valid_zip(): [string, any[]] {
    return ['is a valid zip code', []];
  }

  contains_profanity(): [string, any[]] {
    return ['contains profanity', []];
  }

  does_not_contain_profanity(): [string, any[]] {
    return ['does not contain profanity', []];
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

  equals(value: Date | DynamicValue): OperatorResult {
    return { operator: 'equals', args: [new Argument(value, DynamicValueType.DATE).toDict()] };
  }

  before(value: Date | DynamicValue): OperatorResult {
    return { operator: 'before', args: [new Argument(value, DynamicValueType.DATE).toDict()] };
  }

  after(value: Date | DynamicValue): OperatorResult {
    return { operator: 'after', args: [new Argument(value, DynamicValueType.DATE).toDict()] };
  }

  is_past(): OperatorResult {
    return { operator: 'is in the past', args: [] };
  }

  is_future(): OperatorResult {
    return { operator: 'is in the future', args: [] };
  }

  is_today(): OperatorResult {
    return { operator: 'is today', args: [] };
  }

  is_this_week(): OperatorResult {
    return { operator: 'is this week', args: [] };
  }

  is_this_month(): OperatorResult {
    return { operator: 'is this month', args: [] };
  }

  is_this_year(): OperatorResult {
    return { operator: 'is this year', args: [] };
  }

  is_next_week(): OperatorResult {
    return { operator: 'is next week', args: [] };
  }

  is_next_month(): OperatorResult {
    return { operator: 'is next month', args: [] };
  }

  is_next_year(): OperatorResult {
    return { operator: 'is next year', args: [] };
  }

  is_last_week(): OperatorResult {
    return { operator: 'is last week', args: [] };
  }

  is_last_month(): OperatorResult {
    return { operator: 'is last month', args: [] };
  }

  is_last_year(): OperatorResult {
    return { operator: 'is last year', args: [] };
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

  contains(value: any | DynamicValue): OperatorResult {
    return { operator: 'contains', args: [new Argument(value, DynamicValueType.LIST).toDict()] };
  }

  is_empty(): OperatorResult {
    return { operator: 'is_empty', args: [] };
  }

  length_equals(length: number | DynamicValue): OperatorResult {
    return { operator: 'length_equals', args: [new Argument(length, DynamicValueType.NUMBER).toDict()] };
  }

  contains_all(values: any[] | DynamicValue): OperatorResult {
    if (values instanceof DynamicValue) {
      return { operator: 'contains_all', args: [values.toDict()] };
    }
    return {
      operator: 'contains_all',
      args: [values.map(v => new Argument(v, DynamicValueType.LIST).toDict())]
    };
  }
}
