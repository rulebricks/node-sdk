import { Rule, RuleCondition, OperatorResult } from "./types";

export class Condition {
    private condition: RuleCondition;

    constructor(private rule: Rule) {
        this.condition = {
            request: {},
            response: {},
            settings: {
                enabled: true,
                groupId: null,
                priority: 0,
                schedule: [],
            },
        };
    }

    setRequest(conditions: Record<string, OperatorResult>): void {
        this.condition.request = Object.entries(conditions).reduce((acc, [key, value]) => {
            const [op, args] = value;
            acc[key] = { op, args };
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
        if (this.condition.settings) {
            this.condition.settings.priority = priority;
        }
        return this;
    }

    enable(): Condition {
        if (this.condition.settings) {
            this.condition.settings.enabled = true;
        }
        return this;
    }

    disable(): Condition {
        if (this.condition.settings) {
            this.condition.settings.enabled = false;
        }
        return this;
    }

    getCondition(): RuleCondition {
        return this.condition;
    }
}
