import { RulebricksClient } from '../client';

export enum DynamicValueType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  DATE = 'DATE',
  LIST = 'LIST',
  OBJECT = 'OBJECT'
}

export enum RuleType {
  BOOLEAN = 'BOOLEAN',
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  DATE = 'DATE',
  LIST = 'LIST'
}

export interface RuleCondition {
  request: Record<string, { op: string; args: any[] }>;
  response: Record<string, { value: any }>;
  settings?: Record<string, any>;
  enabled?: boolean;
  priority?: number;
  any?: boolean;
}

export interface Field {
  name: string;
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

export interface RuleTest {
  id: string;
  name: string;
  description?: string;
  request: Record<string, any>;
  expectedResponse: Record<string, any>;
  enabled?: boolean;
}

export interface RuleSettings {
  testing?: boolean;
  schemaValidation?: boolean;
  requireAllProperties?: boolean;
  schemaLocked?: boolean;
  or?: boolean;
  published?: boolean;
  publishedAt?: string;
}

export class TypeMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TypeMismatchError';
  }
}

export class DynamicValueNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DynamicValueNotFoundError';
  }
}
