/**
 * This file was auto-generated by Fern from our API Definition.
 */
export interface ListFlowsResponseItem {
    /** The unique identifier for the flow. */
    id?: string;
    /** The name of the flow. */
    name?: string;
    /** The description of the flow. */
    description?: string;
    /** Whether the flow is published. */
    published?: boolean;
    /** The unique slug for the flow used in API requests. */
    slug?: string;
    /** The date this flow was last updated. */
    updatedAt?: string;
}