import { RulebricksClient } from "../Client.js";
import { DynamicValue as DynamicValueModel } from "../api/types";
import { VocabularyValueType, VocabularyValueNotFoundError } from "./types.js";

export class VocabularyValue {
    private _rb_type = "globalValue";

    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly valueType: VocabularyValueType
    ) {}

    toDict(): Record<string, any> {
        return {
            id: this.id,
            $rb: this._rb_type,
            name: this.name,
        };
    }

    static getExpectedType(valueType: VocabularyValueType): any {
        const typeMapping: Record<VocabularyValueType, any> = {
            [VocabularyValueType.STRING]: String,
            [VocabularyValueType.NUMBER]: Number,
            [VocabularyValueType.BOOLEAN]: Boolean,
            [VocabularyValueType.DATE]: Date,
            [VocabularyValueType.LIST]: Array,
            [VocabularyValueType.OBJECT]: Object,
            [VocabularyValueType.FUNCTION]: Function,
        };
        return typeMapping[valueType];
    }

    toString(): string {
        return `<${this.name.toUpperCase()}>`;
    }
}

export class Vocabulary {
    private static workspace?: RulebricksClient;
    private static cache: Map<string, VocabularyValue> = new Map();

    static configure(client: RulebricksClient): void {
        this.workspace = client;
        this.cache.clear();
    }

    static async get(name: string): Promise<VocabularyValue> {
        if (!this.workspace) {
            throw new Error("Vocabulary not configured. Call Vocabulary.configure(workspace) first");
        }

        const cachedValue = this.cache.get(name);
        if (cachedValue) {
            return cachedValue;
        }

        let cursor: string | undefined;
        let value: DynamicValueModel | undefined;
        const seenCursors = new Set<string>();

        while (true) {
            const response = await this.workspace.values.list({
                name,
                limit: 1000,
                ...(cursor ? { cursor } : {}),
            });
            const values = Array.isArray(response) ? response : Array.isArray(response.data) ? response.data : [];

            value = values.find((candidate: DynamicValueModel) => candidate.name === name);
            if (value || Array.isArray(response)) {
                break;
            }

            const nextCursor = response.next_cursor || undefined;
            if (!nextCursor || seenCursors.has(nextCursor)) {
                break;
            }

            seenCursors.add(nextCursor);
            cursor = nextCursor;
        }

        if (!value) {
            throw new VocabularyValueNotFoundError(`Vocabulary value '${name}' not found`);
        }

        const valueType = value.type || "string";
        if (!Object.values(VocabularyValueType).includes(valueType as VocabularyValueType)) {
            throw new Error(`Invalid type '${value.type}' for vocabulary value '${name}'`);
        }

        const vocabularyValue = new VocabularyValue(value.id || "", name, valueType as VocabularyValueType);
        this.cache.set(name, vocabularyValue);
        return vocabularyValue;
    }

    static async set(
        vocabularyValues: Record<string, any>,
        user_groups: string[] = [],
        metadata_by_name?: Record<string, Record<string, any>>
    ): Promise<void> {
        if (!this.workspace) {
            throw new Error("Vocabulary not configured. Call Vocabulary.configure(workspace) first.");
        }

        const request: any = { values: vocabularyValues, user_groups };
        if (metadata_by_name) {
            request.metadata_by_name = metadata_by_name;
        }

        await this.workspace.values.update(request);
        this.cache.clear();
    }

    static clearCache(): void {
        this.cache.clear();
    }
}
