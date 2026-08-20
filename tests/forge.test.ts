jest.mock("../src/forge/types.js", () => jest.requireActual("../src/forge/types"), { virtual: true });
jest.mock("../src/forge/values.js", () => jest.requireActual("../src/forge/values"), { virtual: true });
jest.mock("../src/forge/operators.js", () => jest.requireActual("../src/forge/operators"), { virtual: true });
jest.mock(
    "../src/errors/index.js",
    () => ({
        RulebricksError: class RulebricksError extends Error {},
    }),
    { virtual: true }
);

import { BooleanField, DateField, ListField, NumberField, StringField, Argument } from "../src/forge/operators";
import { Rule } from "../src/forge/rule";
import { TypeMismatchError, VocabularyValueType } from "../src/forge/types";
import { Vocabulary, VocabularyValue } from "../src/forge/values";

describe("Forge rule compatibility", () => {
    it("round-trips application published snapshots and omits absent overrides", () => {
        const publishedRequestSchema = [{ key: "score", name: "Score", type: "number", defaultValue: 0 }];
        const publishedResponseSchema = [{ key: "approved", name: "Approved", type: "boolean", defaultValue: false }];
        const publishedConditions = [{ request: { score: { op: "greater than", args: [10] } } }];
        const publishedGroups = { primary: { name: "Primary" } };

        const hydrated = Rule.fromJSON({
            requestSchema: [],
            responseSchema: [],
            published_requestSchema: publishedRequestSchema,
            published_responseSchema: publishedResponseSchema,
            published_conditions: publishedConditions,
            published_groups: publishedGroups,
        }).toDict();

        expect(hydrated.published_requestSchema).toEqual(publishedRequestSchema);
        expect(hydrated.published_responseSchema).toEqual(publishedResponseSchema);
        expect(hydrated.published_conditions).toEqual(publishedConditions);
        expect(hydrated.published_groups).toEqual(publishedGroups);

        const camelCaseFallback = Rule.fromJSON({
            requestSchema: [],
            responseSchema: [],
            publishedRequestSchema,
        }).toDict();
        expect(camelCaseFallback.published_requestSchema).toEqual(publishedRequestSchema);

        const newRule = new Rule().toDict();
        for (const key of [
            "published_requestSchema",
            "published_responseSchema",
            "published_conditions",
            "published_groups",
        ]) {
            expect(Object.prototype.hasOwnProperty.call(newRule, key)).toBe(false);
        }
    });

    it("hydrates concrete fields by schema key and tolerates missing schemas", () => {
        const rule = Rule.fromJSON({
            requestSchema: [
                { key: "active", name: "Is Active", type: "boolean", defaultValue: true },
                { key: "score", name: "Display Score", type: "number", defaultValue: 12 },
                { key: "country", name: "Country Name", type: "string", defaultValue: "US" },
                { key: "started_at", name: "Started At", type: "date", defaultValue: "2026-08-19" },
                { key: "tags", name: "Tag List", type: "list", defaultValue: ["new"] },
            ],
            responseSchema: [
                { key: "approved", name: "Approval Result", type: "boolean", defaultValue: false },
                { key: "reason", name: "Reason", type: "string", defaultValue: "" },
            ],
        });

        expect(Object.keys(rule.fields)).toEqual(["active", "score", "country", "started_at", "tags"]);
        expect(rule.fields.active).toBeInstanceOf(BooleanField);
        expect(rule.getNumberField("score")).toBeInstanceOf(NumberField);
        expect(rule.getStringField("country")).toBeInstanceOf(StringField);
        expect(rule.getDateField("started_at")).toBeInstanceOf(DateField);
        expect(rule.getListField("tags")).toBeInstanceOf(ListField);
        expect(rule.getNumberField("score").key).toBe("score");
        expect(rule.fields["Display Score"]).toBeUndefined();
        expect(rule.responseFields.approved).toBeInstanceOf(BooleanField);
        expect(rule.responseFields.reason).toBeInstanceOf(StringField);
        expect(rule.responseFields.approved.key).toBe("approved");
        expect(rule.toDict().requestSchema?.find((field) => field.key === "score")?.name).toBe("Display Score");
        expect(rule.toDict().responseSchema?.find((field) => field.key === "approved")?.name).toBe("Approval Result");

        const withoutSchemas = Rule.fromJSON({});
        expect(withoutSchemas.fields).toEqual({});
        expect(withoutSchemas.responseFields).toEqual({});
    });

    it("uses the sample request when no meaningful test request exists", () => {
        const newRule = new Rule();
        newRule.addNumberField("score", "", 42);
        expect(newRule.toDict().testRequest).toEqual({ score: 42 });

        const hydrated = Rule.fromJSON({
            requestSchema: [],
            responseSchema: [],
            sampleRequest: { source: "saved sample" },
            testRequest: {},
        });
        expect(hydrated.toDict().testRequest).toEqual({ source: "saved sample" });

        hydrated.testRequest = { source: "explicit test" };
        expect(hydrated.toDict().testRequest).toEqual({ source: "explicit test" });
    });

    it("keeps its configured workspace after hydration", async () => {
        const pull = jest.fn().mockResolvedValue({
            id: "hydrated-rule",
            requestSchema: [],
            responseSchema: [],
        });
        const push = jest.fn().mockResolvedValue(undefined);
        const workspace = { assets: { rules: { pull, push } } };
        const rule = new Rule().setWorkspace(workspace as any);

        await rule.fromWorkspace("hydrated-rule");
        await rule.update();

        expect(pull).toHaveBeenCalledWith({ id: "hydrated-rule" });
        expect(push).toHaveBeenCalledTimes(1);
    });
});

describe("Forge vocabulary compatibility", () => {
    afterEach(() => {
        Vocabulary.clearCache();
    });

    it("searches paginated responses with a bounded page size and caches the match", async () => {
        const list = jest
            .fn()
            .mockResolvedValueOnce({
                data: [{ id: "other-id", name: "Target.Other", type: "string" }],
                next_cursor: "page-2",
            })
            .mockResolvedValueOnce({
                data: [{ id: "target-id", name: "Target", type: "number" }],
                next_cursor: null,
            });
        Vocabulary.configure({ values: { list } } as any);

        const value = await Vocabulary.get("Target");
        const cachedValue = await Vocabulary.get("Target");

        expect(value).toBe(cachedValue);
        expect(value.toDict()).toEqual({ id: "target-id", $rb: "globalValue", name: "Target" });
        expect(list).toHaveBeenNthCalledWith(1, { name: "Target", limit: 1000 });
        expect(list).toHaveBeenNthCalledWith(2, { name: "Target", limit: 1000, cursor: "page-2" });
        expect(list).toHaveBeenCalledTimes(2);
    });

    it("normalizes legacy array responses", async () => {
        const list = jest.fn().mockResolvedValue([{ id: "legacy-id", name: "Legacy", type: "string" }]);
        Vocabulary.configure({ values: { list } } as any);

        await expect(Vocabulary.get("Legacy")).resolves.toMatchObject({
            id: "legacy-id",
            name: "Legacy",
            valueType: VocabularyValueType.STRING,
        });
        expect(list).toHaveBeenCalledWith({ name: "Legacy", limit: 1000 });
    });

    it("rejects unknown vocabulary value types", async () => {
        const list = jest.fn().mockResolvedValue([{ id: "invalid-id", name: "Invalid", type: "unknown" }]);
        Vocabulary.configure({ values: { list } } as any);

        await expect(Vocabulary.get("Invalid")).rejects.toThrow(
            "Invalid type 'unknown' for vocabulary value 'Invalid'"
        );
    });
});

describe("Forge operator compatibility", () => {
    it("accepts and serializes generic list literals and vocabulary references", () => {
        const field = new ListField("items");
        const literals = ["value", 7, true, null, { nested: "value" }, ["nested", 1]];

        for (const literal of literals) {
            expect(field.contains(literal)).toEqual(["contains", [literal]]);
        }

        const reference = new VocabularyValue("value-id", "Shared.Value", VocabularyValueType.STRING);
        const serializedReference = { id: "value-id", $rb: "globalValue", name: "Shared.Value" };
        expect(field.contains(reference)).toEqual(["contains", [serializedReference]]);
        expect(field.contains({ nested: reference })).toEqual(["contains", [{ nested: serializedReference }]]);
        expect(field.contains_all(["literal", reference, null])).toEqual([
            "contains all of",
            [["literal", serializedReference, null]],
        ]);
        expect(field.contains_object_with_key_value("status", false)).toEqual([
            "contains object with key & value",
            ["status", false],
        ]);
        expect(() => field.contains(undefined)).toThrow(TypeMismatchError);
        expect(() => field.contains_all("not-a-list" as any)).toThrow(TypeMismatchError);
    });

    it("accepts Date and string date arguments while preserving typed validation", () => {
        const field = new DateField("created_at");
        const date = new Date("2026-08-19T12:00:00.000Z");

        expect(field.after(date)).toEqual(["after", [date]]);
        expect(field.on_or_before("2026-08-20")).toEqual(["on or before", ["2026-08-20"]]);
        expect(() => field.equals(123 as any)).toThrow(TypeMismatchError);

        expect(new Argument([1], VocabularyValueType.LIST).toDict()).toEqual([1]);
        expect(new Argument({ value: 1 }, VocabularyValueType.OBJECT).toDict()).toEqual({ value: 1 });
        const fn = () => "value";
        expect(new Argument(fn, VocabularyValueType.FUNCTION).toDict()).toBe(fn);
        expect(() => new Argument({}, VocabularyValueType.LIST)).toThrow(TypeMismatchError);
        expect(() => new Argument([], VocabularyValueType.OBJECT)).toThrow(TypeMismatchError);
        expect(() => new Argument({}, VocabularyValueType.FUNCTION)).toThrow(TypeMismatchError);
    });

    it("rejects vocabulary values in BooleanField.equals", () => {
        const field = new BooleanField("enabled");
        const vocabularyBoolean = new VocabularyValue("boolean-id", "Shared.Enabled", VocabularyValueType.BOOLEAN);

        expect(field.equals(true)).toEqual(["is true", []]);
        expect(field.equals(false)).toEqual(["is false", []]);
        expect(() => field.equals(vocabularyBoolean as unknown as boolean)).toThrow(TypeMismatchError);
        expect(() => field.equals(vocabularyBoolean as unknown as boolean)).toThrow("expects a literal boolean");
    });
});

type OperatorEmissionCase = {
    method: string;
    args: any[];
    expected: [string, any[]];
};

function invokeOperator(field: object, method: string, args: any[]): unknown {
    return (field as Record<string, (...methodArgs: any[]) => unknown>)[method](...args);
}

describe("Forge operator wire-name parity", () => {
    const catalogs: Array<{
        label: string;
        field: BooleanField | NumberField | StringField | DateField | ListField;
        expected: string[];
    }> = [
        {
            label: "Boolean",
            field: new BooleanField("value"),
            expected: ["any", "is true", "is false", "is null"],
        },
        {
            label: "Number",
            field: new NumberField("value"),
            expected: [
                "any",
                "equals",
                "does not equal",
                "greater than",
                "less than",
                "greater than or equal to",
                "less than or equal to",
                "between",
                "not between",
                "is even",
                "is odd",
                "is positive",
                "is negative",
                "is zero",
                "is not zero",
                "is a multiple of",
                "is not a multiple of",
                "is a power of",
                "is null",
            ],
        },
        {
            label: "String",
            field: new StringField("value"),
            expected: [
                "any",
                "contains",
                "does not contain",
                "equals",
                "equals (case-insensitive)",
                "does not equal",
                "does not equal (case-insensitive)",
                "is empty",
                "is not empty",
                "is null",
                "starts with",
                "ends with",
                "is included in",
                "is not included in",
                "contains any of",
                "does not contain any of",
                "is of length",
                "is not of length",
                "is longer than",
                "is shorter than",
                "is longer than or equal to",
                "is shorter than or equal to",
                "starts with (case-insensitive)",
                "ends with (case-insensitive)",
                "contains (case-insensitive)",
                "is uppercase",
                "is lowercase",
                "is numeric",
                "contains only digits",
                "contains only letters",
                "contains only digits and letters",
                "is a valid phone number",
                "is a valid zip code",
                "matches RegEx",
                "does not match RegEx",
                "is a work email address",
                "is a personal email address",
                "is a valid email address",
                "is not a valid email address",
                "is a valid URL",
                "is not a valid URL",
                "is a valid IP address",
                "is not a valid IP address",
                "is a valid IPV6 address",
                "is not a valid IPV6 address",
                "is a valid credit card number",
                "is not a valid credit card number",
                "is a valid country code",
                "is not a valid country code",
                "contains profanity",
                "does not contain profanity",
                "version is greater than",
                "version is less than",
                "version is equal to",
                "version is greater than or equal to",
                "version is less than or equal to",
                "version is between",
                "is valid semantic version",
                "satisfies version range",
            ],
        },
        {
            label: "Date",
            field: new DateField("value"),
            expected: [
                "any",
                "is in the past",
                "is in the future",
                "days ago",
                "is less than N days ago",
                "is more than N days ago",
                "is between N and M days ago",
                "days from now",
                "is less than N days from now",
                "is more than N days from now",
                "months ago",
                "is less than N months ago",
                "is more than N months ago",
                "is between N and M months ago",
                "months from now",
                "is less than N months from now",
                "is more than N months from now",
                "is today",
                "is this week",
                "is this month",
                "is this year",
                "is next week",
                "is next month",
                "is next year",
                "is last week",
                "is last month",
                "is last year",
                "after",
                "on or after",
                "before",
                "on or before",
                "between",
                "not between",
                "equals",
                "does not equal",
                "is before time",
                "is after time",
                "hours ago",
                "is less than N hours ago",
                "is more than N hours ago",
                "is between N and M hours ago",
                "hours from now",
                "is less than N hours from now",
                "is more than N hours from now",
                "minutes ago",
                "is less than N minutes ago",
                "is more than N minutes ago",
                "is between N and M minutes ago",
                "minutes from now",
                "is less than N minutes from now",
                "is more than N minutes from now",
                "is null",
            ],
        },
        {
            label: "List",
            field: new ListField("value"),
            expected: [
                "any",
                "contains",
                "contains (case-insensitive)",
                "is empty",
                "is not empty",
                "is of length",
                "is not of length",
                "is longer than",
                "is shorter than",
                "is longer than or equal to",
                "is shorter than or equal to",
                "contains all of",
                "contains all of (case-insensitive)",
                "contains N occurrences of",
                "contains at least N occurrences of",
                "contains at most N occurrences of",
                "contains any of",
                "contains any of (case-insensitive)",
                "contains none of",
                "contains none of (case-insensitive)",
                "does not contain",
                "does not contain (case-insensitive)",
                "is equal to",
                "is not equal to",
                "contains duplicates",
                "does not contain duplicates",
                "contains numbers in range (inclusive)",
                "contains object with key & value",
                "contains object with key & value (case-insensitive)",
                "does not contain object with key & value",
                "does not contain object with key & value (case-insensitive)",
                "contains object with key",
                "does not contain object with key",
                "contains only objects with keys",
                "does not contain only objects with keys",
                "contains object with data",
                "contains all objects with data",
                "does not contain object with data",
                "contains all elements in order",
                "contains all elements in order (case-insensitive)",
                "contains duplicates of value",
                "contains duplicates of value (case-insensitive)",
                "has unique elements",
                "is a sublist of",
                "is a superlist of",
                "has item at index",
                "has item at index (case-insensitive)",
                "does not have item at index",
                "does not have item at index (case-insensitive)",
                "has object with key & value at index",
                "has object with key & value at index (case-insensitive)",
                "object at index has keys",
                "contains any object with key",
                "is null",
            ],
        },
    ];

    it.each(catalogs)("$label exposes exactly the application wire-name catalog", ({ field, expected }) => {
        const actual = Object.values(field.operators).map((operator) => operator.name);

        expect(actual).toHaveLength(expected.length);
        expect(new Set(actual).size).toBe(actual.length);
        expect([...actual].sort()).toEqual([...expected].sort());
    });
});

describe("Forge newly added operator emissions", () => {
    const stringField = new StringField("text");
    const dateField = new DateField("created_at");
    const listField = new ListField("items");

    const stringCases: OperatorEmissionCase[] = [
        { method: "is_phone", args: [], expected: ["is a valid phone number", []] },
        { method: "is_zip_code", args: [], expected: ["is a valid zip code", []] },
        { method: "is_work_email", args: [], expected: ["is a work email address", []] },
        { method: "is_personal_email", args: [], expected: ["is a personal email address", []] },
        { method: "is_ipv6", args: [], expected: ["is a valid IPV6 address", []] },
        { method: "is_not_ipv6", args: [], expected: ["is not a valid IPV6 address", []] },
        { method: "is_credit_card", args: [], expected: ["is a valid credit card number", []] },
        { method: "is_not_credit_card", args: [], expected: ["is not a valid credit card number", []] },
        { method: "is_country_code", args: [], expected: ["is a valid country code", []] },
        { method: "is_not_country_code", args: [], expected: ["is not a valid country code", []] },
        { method: "contains_profanity", args: [], expected: ["contains profanity", []] },
        { method: "does_not_contain_profanity", args: [], expected: ["does not contain profanity", []] },
        {
            method: "version_greater_than",
            args: ["1.2.3"],
            expected: ["version is greater than", ["1.2.3"]],
        },
        {
            method: "version_less_than",
            args: ["2.0.0"],
            expected: ["version is less than", ["2.0.0"]],
        },
        {
            method: "version_equals",
            args: ["1.4.0"],
            expected: ["version is equal to", ["1.4.0"]],
        },
        {
            method: "version_greater_than_or_equal",
            args: ["1.0.0"],
            expected: ["version is greater than or equal to", ["1.0.0"]],
        },
        {
            method: "version_less_than_or_equal",
            args: ["3.0.0"],
            expected: ["version is less than or equal to", ["3.0.0"]],
        },
        {
            method: "version_between",
            args: ["1.0.0", "2.0.0"],
            expected: ["version is between", ["1.0.0", "2.0.0"]],
        },
        { method: "is_valid_semantic_version", args: [], expected: ["is valid semantic version", []] },
        {
            method: "satisfies_version_range",
            args: ["^1.2.3"],
            expected: ["satisfies version range", ["^1.2.3"]],
        },
    ];

    const dateCases: OperatorEmissionCase[] = [
        { method: "is_before_time", args: ["2:30 PM"], expected: ["is before time", ["2:30 PM"]] },
        { method: "is_after_time", args: ["8:45 AM"], expected: ["is after time", ["8:45 AM"]] },
        { method: "hours_ago", args: [1], expected: ["hours ago", [1]] },
        {
            method: "less_than_hours_ago",
            args: [2],
            expected: ["is less than N hours ago", [2]],
        },
        {
            method: "more_than_hours_ago",
            args: [3],
            expected: ["is more than N hours ago", [3]],
        },
        {
            method: "between_n_and_m_hours_ago",
            args: [2, 6],
            expected: ["is between N and M hours ago", [2, 6]],
        },
        { method: "hours_from_now", args: [4], expected: ["hours from now", [4]] },
        {
            method: "less_than_hours_from_now",
            args: [5],
            expected: ["is less than N hours from now", [5]],
        },
        {
            method: "more_than_hours_from_now",
            args: [7],
            expected: ["is more than N hours from now", [7]],
        },
        { method: "minutes_ago", args: [10], expected: ["minutes ago", [10]] },
        {
            method: "less_than_minutes_ago",
            args: [11],
            expected: ["is less than N minutes ago", [11]],
        },
        {
            method: "more_than_minutes_ago",
            args: [12],
            expected: ["is more than N minutes ago", [12]],
        },
        {
            method: "between_n_and_m_minutes_ago",
            args: [5, 15],
            expected: ["is between N and M minutes ago", [5, 15]],
        },
        { method: "minutes_from_now", args: [20], expected: ["minutes from now", [20]] },
        {
            method: "less_than_minutes_from_now",
            args: [21],
            expected: ["is less than N minutes from now", [21]],
        },
        {
            method: "more_than_minutes_from_now",
            args: [22],
            expected: ["is more than N minutes from now", [22]],
        },
    ];

    const listCases: OperatorEmissionCase[] = [
        {
            method: "contains_case_insensitive",
            args: ["Alpha"],
            expected: ["contains (case-insensitive)", ["Alpha"]],
        },
        {
            method: "longer_than_or_equal",
            args: [0],
            expected: ["is longer than or equal to", [0]],
        },
        {
            method: "shorter_than_or_equal",
            args: [3],
            expected: ["is shorter than or equal to", [3]],
        },
        {
            method: "contains_all_case_insensitive",
            args: [["Alpha", 2, false]],
            expected: ["contains all of (case-insensitive)", [["Alpha", 2, false]]],
        },
        {
            method: "contains_n_occurrences_of",
            args: [{ nested: ["x", 1] }, 2],
            expected: ["contains N occurrences of", [{ nested: ["x", 1] }, 2]],
        },
        {
            method: "contains_at_least_n_occurrences_of",
            args: [null, 1],
            expected: ["contains at least N occurrences of", [null, 1]],
        },
        {
            method: "contains_at_most_n_occurrences_of",
            args: [true, 4],
            expected: ["contains at most N occurrences of", [true, 4]],
        },
        {
            method: "contains_any_case_insensitive",
            args: [["Beta", 5]],
            expected: ["contains any of (case-insensitive)", [["Beta", 5]]],
        },
        {
            method: "contains_none_case_insensitive",
            args: [["Gamma", null]],
            expected: ["contains none of (case-insensitive)", [["Gamma", null]]],
        },
        {
            method: "not_contains_case_insensitive",
            args: ["Delta"],
            expected: ["does not contain (case-insensitive)", ["Delta"]],
        },
        {
            method: "contains_numbers_in_range",
            args: [-1, 3],
            expected: ["contains numbers in range (inclusive)", [-1, 3]],
        },
        {
            method: "contains_object_with_key_value_case_insensitive",
            args: ["status", "Ready"],
            expected: ["contains object with key & value (case-insensitive)", ["status", "Ready"]],
        },
        {
            method: "does_not_contain_object_with_key_value_case_insensitive",
            args: ["status", "Blocked"],
            expected: ["does not contain object with key & value (case-insensitive)", ["status", "Blocked"]],
        },
        {
            method: "contains_only_objects_with_keys",
            args: [["id", "name"]],
            expected: ["contains only objects with keys", [["id", "name"]]],
        },
        {
            method: "does_not_contain_only_objects_with_keys",
            args: [["archived"]],
            expected: ["does not contain only objects with keys", [["archived"]]],
        },
        {
            method: "contains_object_with_data",
            args: [{ status: "ready", nested: { count: 2 } }],
            expected: ["contains object with data", [{ status: "ready", nested: { count: 2 } }]],
        },
        {
            method: "contains_all_objects_with_data",
            args: [{ enabled: true }],
            expected: ["contains all objects with data", [{ enabled: true }]],
        },
        {
            method: "does_not_contain_object_with_data",
            args: [{ deleted: null }],
            expected: ["does not contain object with data", [{ deleted: null }]],
        },
        {
            method: "contains_all_elements_in_order",
            args: [["first", 2]],
            expected: ["contains all elements in order", [["first", 2]]],
        },
        {
            method: "contains_all_elements_in_order_case_insensitive",
            args: [["First", "SECOND"]],
            expected: ["contains all elements in order (case-insensitive)", [["First", "SECOND"]]],
        },
        {
            method: "contains_duplicates_of_value",
            args: [{ code: "x" }],
            expected: ["contains duplicates of value", [{ code: "x" }]],
        },
        {
            method: "contains_duplicates_of_value_case_insensitive",
            args: ["Echo"],
            expected: ["contains duplicates of value (case-insensitive)", ["Echo"]],
        },
        {
            method: "has_item_at_index",
            args: [-1, "last"],
            expected: ["has item at index", [-1, "last"]],
        },
        {
            method: "has_item_at_index_case_insensitive",
            args: [0, "First"],
            expected: ["has item at index (case-insensitive)", [0, "First"]],
        },
        {
            method: "does_not_have_item_at_index",
            args: [2, false],
            expected: ["does not have item at index", [2, false]],
        },
        {
            method: "does_not_have_item_at_index_case_insensitive",
            args: [3, { deep: "value" }],
            expected: ["does not have item at index (case-insensitive)", [3, { deep: "value" }]],
        },
        {
            method: "has_object_with_key_value_at_index",
            args: [0, "status", "ready"],
            expected: ["has object with key & value at index", [0, "status", "ready"]],
        },
        {
            method: "has_object_with_key_value_at_index_case_insensitive",
            args: [-1, "status", "READY"],
            expected: ["has object with key & value at index (case-insensitive)", [-1, "status", "READY"]],
        },
        {
            method: "object_at_index_has_keys",
            args: [1, ["id", "name"]],
            expected: ["object at index has keys", [1, ["id", "name"]]],
        },
        {
            method: "contains_any_object_with_key",
            args: ["status"],
            expected: ["contains any object with key", ["status"]],
        },
    ];

    it.each(stringCases)("StringField.$method emits the exact wire payload", ({ method, args, expected }) => {
        expect(invokeOperator(stringField, method, args)).toEqual(expected);
    });

    it.each(dateCases)("DateField.$method emits the exact wire payload", ({ method, args, expected }) => {
        expect(invokeOperator(dateField, method, args)).toEqual(expected);
    });

    it.each(listCases)("ListField.$method emits the exact wire payload", ({ method, args, expected }) => {
        expect(invokeOperator(listField, method, args)).toEqual(expected);
    });
});

describe("Forge operator argument types", () => {
    const stringValue = new VocabularyValue("string-id", "Shared.String", VocabularyValueType.STRING);
    const numberValue = new VocabularyValue("number-id", "Shared.Number", VocabularyValueType.NUMBER);
    const listValue = new VocabularyValue("list-id", "Shared.List", VocabularyValueType.LIST);
    const objectValue = new VocabularyValue("object-id", "Shared.Object", VocabularyValueType.OBJECT);

    const serialized = (value: VocabularyValue) => ({
        id: value.id,
        $rb: "globalValue",
        name: value.name,
    });

    const typedVocabularyCases: Array<{
        shape: string;
        invoke: (value: VocabularyValue) => unknown;
        valid: VocabularyValue;
        invalid: VocabularyValue;
        expected: [string, any[]];
    }> = [
        {
            shape: "STRING",
            invoke: (value) => new StringField("version").version_greater_than(value),
            valid: stringValue,
            invalid: numberValue,
            expected: ["version is greater than", [serialized(stringValue)]],
        },
        {
            shape: "NUMBER",
            invoke: (value) => new DateField("created_at").hours_ago(value),
            valid: numberValue,
            invalid: stringValue,
            expected: ["hours ago", [serialized(numberValue)]],
        },
        {
            shape: "LIST",
            invoke: (value) => new ListField("items").contains_all(value),
            valid: listValue,
            invalid: objectValue,
            expected: ["contains all of", [serialized(listValue)]],
        },
        {
            shape: "OBJECT",
            invoke: (value) => new ListField("items").contains_object_with_data(value),
            valid: objectValue,
            invalid: listValue,
            expected: ["contains object with data", [serialized(objectValue)]],
        },
    ];

    it.each(typedVocabularyCases)(
        "accepts matching and rejects wrong-type VocabularyValue for $shape arguments",
        ({ invoke, valid, invalid, expected }) => {
            expect(invoke(valid)).toEqual(expected);
            expect(() => invoke(invalid)).toThrow(TypeMismatchError);
        }
    );

    it("accepts every representative VocabularyValue type for generic arguments", () => {
        const field = new ListField("items");

        for (const value of [stringValue, numberValue, listValue, objectValue]) {
            expect(field.contains(value)).toEqual(["contains", [serialized(value)]]);
        }
    });

    it.each([
        ["is_included_in", "is included in"],
        ["is_not_included_in", "is not included in"],
        ["contains_any_of", "contains any of"],
        ["does_not_contain_any_of", "does not contain any of"],
    ])("serializes mixed literal and VocabularyValue String collections via %s", (method, wireName) => {
        const field = new StringField("text");
        const values = ["literal", stringValue];

        expect(invokeOperator(field, method, [values])).toEqual([wireName, [["literal", serialized(stringValue)]]]);
    });

    it("rejects wrong-type VocabularyValue entries in String collections", () => {
        expect(() => new StringField("text").contains_any_of(["literal", numberValue])).toThrow(TypeMismatchError);
    });
});

describe("Forge operator literal validation regressions", () => {
    const stringField = new StringField("text");

    it.each([
        ["version_greater_than", [""]],
        ["version_less_than", [""]],
        ["version_equals", [""]],
        ["version_greater_than_or_equal", [""]],
        ["version_less_than_or_equal", [""]],
        ["version_between", ["", "2.0.0"]],
        ["version_between", ["1.0.0", ""]],
        ["satisfies_version_range", [""]],
    ])("rejects empty version literals via %s", (method, args) => {
        expect(() => invokeOperator(stringField, method, args)).toThrow();
    });

    it("rejects zero for every String length comparison method", () => {
        const methods = [
            "length_equals",
            "is_of_length",
            "length_not_equals",
            "is_not_of_length",
            "longer_than",
            "is_longer_than",
            "shorter_than",
            "is_shorter_than",
            "longer_than_or_equal",
            "is_longer_than_or_equal",
            "shorter_than_or_equal",
            "is_shorter_than_or_equal",
        ];

        for (const method of methods) {
            expect(() => invokeOperator(stringField, method, [0])).toThrow();
        }
    });

    it.each([0, -2])("allows Number is_power_of to serialize nonpositive literal %s", (base) => {
        expect(new NumberField("score").is_power_of(base)).toEqual(["is a power of", [base]]);
    });

    it("retains Number range validation", () => {
        const field = new NumberField("score");

        expect(field.between(1, 2)).toEqual(["between", [1, 2]]);
        expect(field.not_between(1, 2)).toEqual(["not between", [1, 2]]);
        expect(() => field.between(2, 1)).toThrow("must be less than");
        expect(() => field.not_between(2, 2)).toThrow("must be less than");
    });

    it("rejects unsupported generic literals", () => {
        const circular: Record<string, unknown> = {};
        circular.self = circular;

        for (const value of [undefined, () => "value", Symbol("value"), new Date(), circular]) {
            expect(() => new Argument(value, "generic")).toThrow(TypeMismatchError);
        }
    });

    it("rejects malformed list literals", () => {
        const circular: any[] = [];
        circular.push(circular);

        for (const value of [{}, "not-a-list", [undefined], [new Date()], circular]) {
            expect(() => new Argument(value as any, VocabularyValueType.LIST)).toThrow(TypeMismatchError);
        }
    });

    it("rejects malformed object literals", () => {
        const circular: Record<string, unknown> = {};
        circular.self = circular;

        for (const value of [null, [], new Date(), { invalid: undefined }, circular]) {
            expect(() => new Argument(value as any, VocabularyValueType.OBJECT)).toThrow(TypeMismatchError);
        }
    });

    it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
        "rejects nonfinite value %s in numeric and generic containers",
        (value) => {
            expect(() => new Argument(value, VocabularyValueType.NUMBER)).toThrow(TypeMismatchError);
            expect(() => new Argument(value, "generic")).toThrow(TypeMismatchError);
            expect(() => new Argument([value], VocabularyValueType.LIST)).toThrow(TypeMismatchError);
            expect(() => new Argument({ value }, VocabularyValueType.OBJECT)).toThrow(TypeMismatchError);
        }
    );
});

describe("Forge new operator rule integration", () => {
    it("preserves a new operator payload through Rule.when(...).then(...)", () => {
        const rule = new Rule();
        const items = rule.addListField("items");
        rule.addBooleanResponse("approved");

        rule.when({ items: items.contains_object_with_data({ status: "ready" }) }).then({ approved: true });

        expect(rule.conditions[0].request.items).toEqual({
            op: "contains object with data",
            args: [{ status: "ready" }],
        });
    });
});
