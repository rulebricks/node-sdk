/**
 * This file was auto-generated by Fern from our API Definition.
 */

/**
 * Error response when flow execution fails
 */
export interface FlowExecutionError {
    /** Error message describing what went wrong during flow execution */
    error?: string;
    /** Identifier of the node where the error occurred (if applicable) */
    node?: string;
    /** Additional error details */
    details?: Record<string, unknown>;
}
