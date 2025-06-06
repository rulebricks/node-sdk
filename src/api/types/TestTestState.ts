/**
 * This file was auto-generated by Fern from our API Definition.
 */

import * as Rulebricks from "../index";

/**
 * The state of the test after execution.
 */
export interface TestTestState {
    /** Execution time in seconds */
    duration?: number;
    /** Actual response returned */
    response?: Record<string, unknown>;
    conditions?: Record<string, Rulebricks.TestTestStateConditionsItemValue>[];
    /** HTTP status code returned */
    httpStatus?: number;
    successIdxs?: number[];
    /** Error message or flag indicating if evaluation error occurred */
    evaluationError?: Rulebricks.TestTestStateEvaluationError;
}
