/**
 * This file was auto-generated by Fern from our API Definition.
 */
import * as serializers from "../../..";
import * as RulebricksApi from "../../../../api";
import * as core from "../../../../core";
export declare const DeleteFolderResponse: core.serialization.ObjectSchema<serializers.DeleteFolderResponse.Raw, RulebricksApi.DeleteFolderResponse>;
export declare namespace DeleteFolderResponse {
    interface Raw {
        id?: string | null;
        name?: string | null;
        description?: string | null;
        updatedAt?: string | null;
    }
}
