/**
 * This file was auto-generated by Fern from our API Definition.
 */
export interface CreateGroupResponse {
    /** Unique identifier of the user group. */
    id?: string;
    /** Name of the user group. */
    name?: string;
    /** Description of the user group. */
    description?: string;
    /** List of member emails in the user group. */
    members?: string[];
}