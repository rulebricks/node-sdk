import { DynamicValueType, DynamicValueNotFoundError, TypeMismatchError } from './types';

export class DynamicValue {
  constructor(
    public readonly name: string,
    public readonly valueType: DynamicValueType
  ) {}

  toDict(): Record<string, any> {
    return {
      type: 'dynamic',
      name: this.name,
      valueType: this.valueType
    };
  }

  static getExpectedType(type: DynamicValueType): any {
    switch (type) {
      case DynamicValueType.STRING:
        return String;
      case DynamicValueType.NUMBER:
        return Number;
      case DynamicValueType.BOOLEAN:
        return Boolean;
      case DynamicValueType.DATE:
        return Date;
      case DynamicValueType.LIST:
      case DynamicValueType.OBJECT:
        return Object;
      default:
        throw new Error(`Unknown type: ${type}`);
    }
  }
}
