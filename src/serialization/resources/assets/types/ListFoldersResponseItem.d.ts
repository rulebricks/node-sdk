/**
 * This file was auto-generated by Fern from our API Definition.
 */
import * as serializers from "../../..";
import * as RulebricksApi from "../../../../api";
import * as core from "../../../../core";
export declare const ListFoldersResponseItem: core.serialization.ObjectSchema<serializers.ListFoldersResponseItem.Raw, RulebricksApi.ListFoldersResponseItem>;
export declare namespace ListFoldersResponseItem {
    interface Raw {
        id?: string | null;
        name?: string | null;
        description?: string | null;
        updatedAt?: string | null;
    }
}