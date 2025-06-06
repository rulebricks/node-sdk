/**
 * This file was auto-generated by Fern from our API Definition.
 */

import * as serializers from "../index";
import * as Rulebricks from "../../api/index";
import * as core from "../../core";

export const SchemaFieldType: core.serialization.Schema<serializers.SchemaFieldType.Raw, Rulebricks.SchemaFieldType> =
    core.serialization.enum_(["string", "number", "boolean", "object", "array"]);

export declare namespace SchemaFieldType {
    export type Raw = "string" | "number" | "boolean" | "object" | "array";
}
