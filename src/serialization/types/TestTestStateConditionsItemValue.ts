/**
 * This file was auto-generated by Fern from our API Definition.
 */

import * as serializers from "../index";
import * as Rulebricks from "../../api/index";
import * as core from "../../core";

export const TestTestStateConditionsItemValue: core.serialization.ObjectSchema<
    serializers.TestTestStateConditionsItemValue.Raw,
    Rulebricks.TestTestStateConditionsItemValue
> = core.serialization.object({
    result: core.serialization.boolean().optional(),
    err: core.serialization.string().optional(),
});

export declare namespace TestTestStateConditionsItemValue {
    export interface Raw {
        result?: boolean | null;
        err?: string | null;
    }
}
