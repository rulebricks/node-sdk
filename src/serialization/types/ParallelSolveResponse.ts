/**
 * This file was auto-generated by Fern from our API Definition.
 */

import * as serializers from "../index";
import * as Rulebricks from "../../api/index";
import * as core from "../../core";
import { DynamicResponsePayload } from "./DynamicResponsePayload";

export const ParallelSolveResponse: core.serialization.Schema<
    serializers.ParallelSolveResponse.Raw,
    Rulebricks.ParallelSolveResponse
> = core.serialization.record(core.serialization.string(), DynamicResponsePayload);

export declare namespace ParallelSolveResponse {
    export type Raw = Record<string, DynamicResponsePayload.Raw>;
}
