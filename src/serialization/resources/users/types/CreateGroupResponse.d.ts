/**
 * This file was auto-generated by Fern from our API Definition.
 */
import * as serializers from "../../..";
import * as RulebricksApi from "../../../../api";
import * as core from "../../../../core";
export declare const CreateGroupResponse: core.serialization.ObjectSchema<serializers.CreateGroupResponse.Raw, RulebricksApi.CreateGroupResponse>;
export declare namespace CreateGroupResponse {
    interface Raw {
        id?: string | null;
        name?: string | null;
        description?: string | null;
        members?: string[] | null;
    }
}
