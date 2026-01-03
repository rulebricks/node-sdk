import { RulebricksClient } from "../Client.js";
import { DynamicValue as DynamicValueModel } from "../api/types";
import { DynamicValueType, DynamicValueNotFoundError } from "./types.js";

export class DynamicValue {
    private _rb_type = "globalValue";

    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly valueType: DynamicValueType
    ) {}

    toDict(): Record<string, any> {
        return {
            id: this.id,
            $rb: this._rb_type,
            name: this.name,
        };
    }

    static getExpectedType(valueType: DynamicValueType): any {
        const typeMapping: Record<DynamicValueType, any> = {
            [DynamicValueType.STRING]: String,
            [DynamicValueType.NUMBER]: Number,
            [DynamicValueType.BOOLEAN]: Boolean,
            [DynamicValueType.DATE]: Date,
            [DynamicValueType.LIST]: Array,
            [DynamicValueType.OBJECT]: Object,
            [DynamicValueType.FUNCTION]: Function,
        };
        return typeMapping[valueType];
    }

    toString(): string {
        return `<${this.name.toUpperCase()}>`;
    }
}

export class DynamicValues {
    private static workspace?: RulebricksClient;
    private static cache: Map<string, DynamicValue> = new Map();

    static configure(client: RulebricksClient): void {
        this.workspace = client;
        this.cache.clear();
    }

    static async get(name: string): Promise<DynamicValue> {
        if (!this.workspace) {
            throw new Error("DynamicValues not configured. Call DynamicValues.configure(workspace) first");
        }

        const cachedValue = this.cache.get(name);
        if (cachedValue) {
            return cachedValue;
        }

        const values = await this.workspace.values.list();
        const value = values.find((v: DynamicValueModel) => v.name === name);

        if (!value) {
            throw new DynamicValueNotFoundError(`Dynamic value '${name}' not found`);
        }

        try {
            const valueType = value.type || "string";
            const dynamicValue = new DynamicValue(value.id || "", name, valueType as DynamicValueType);
            this.cache.set(name, dynamicValue);
            return dynamicValue;
        } catch (error) {
            throw new Error(`Invalid type '${value.type}' for dynamic value '${name}'`);
        }
    }

    static async set(dynamicValues: Record<string, any>, user_groups: string[] = []): Promise<void> {
        if (!this.workspace) {
            throw new Error("Workspace not configured. Call configure() first.");
        }

        await this.workspace.values.update({ values: dynamicValues, user_groups });
        this.cache.clear();
    }

    static clearCache(): void {
        this.cache.clear();
    }
}
