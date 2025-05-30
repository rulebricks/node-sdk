/**
 * This file was auto-generated by Fern from our API Definition.
 */

import * as Rulebricks from "../index";

export interface SchemaField {
    /** The unique key for this field. */
    key?: string;
    /** Whether this field is visible in the UI. */
    show?: boolean;
    /** Display name for this field. */
    name?: string;
    /** Description of this field. */
    description?: string;
    /** Data type of this field. */
    type?: Rulebricks.SchemaFieldType;
    /** Default value for this field. */
    defaultValue?: Rulebricks.SchemaFieldDefaultValue;
    /** Computed default value for this field. */
    defaultComputedValue?: string;
    /** Transformation expression to apply to this field. */
    transform?: string;
}
