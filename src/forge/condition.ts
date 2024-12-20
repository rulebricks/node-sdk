import type { Rule } from './rule';
import { RuleCondition } from './types';
import { OperatorResult } from './operators';

export class Condition {
  private condition: RuleCondition;

  constructor(private rule: Rule) {
    this.condition = {
      request: {},
      response: {},
      enabled: true
    };
  }

  setRequest(conditions: Record<string, OperatorResult>): void {
    this.condition.request = Object.entries(conditions).reduce((acc, [key, value]) => {
      acc[key] = { op: value.operator, args: value.args };
      return acc;
    }, {} as Record<string, { op: string; args: any[] }>);
  }

  then(responses: Record<string, any>): Rule {
    this.condition.response = Object.entries(responses).reduce((acc, [key, value]) => {
      acc[key] = { value };
      return acc;
    }, {} as Record<string, { value: any }>);
    return this.rule;
  }

  setPriority(priority: number): Condition {
    this.condition.priority = priority;
    return this;
  }

  enable(): Condition {
    this.condition.enabled = true;
    return this;
  }

  disable(): Condition {
    this.condition.enabled = false;
    return this;
  }

  getCondition(): RuleCondition {
    return this.condition;
  }
}
