/**
 * This file was auto-generated by Fern from our API Definition.
 */
import * as serializers from "../../..";
import * as RulebricksApi from "../../../../api";
import * as core from "../../../../core";
export declare const UpsertFolderResponse: core.serialization.ObjectSchema<serializers.UpsertFolderResponse.Raw, RulebricksApi.UpsertFolderResponse>;
export declare namespace UpsertFolderResponse {
    interface Raw {
        id?: string | null;
        name?: string | null;
        description?: string | null;
        updatedAt?: string | null;
    }
}