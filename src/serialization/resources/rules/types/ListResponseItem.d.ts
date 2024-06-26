/**
 * This file was auto-generated by Fern from our API Definition.
 */
import * as serializers from "../../..";
import * as RulebricksApi from "../../../../api";
import * as core from "../../../../core";
export declare const ListResponseItem: core.serialization.ObjectSchema<serializers.ListResponseItem.Raw, RulebricksApi.ListResponseItem>;
export declare namespace ListResponseItem {
    interface Raw {
        id?: string | null;
        name?: string | null;
        description?: string | null;
        created_at?: string | null;
        slug?: string | null;
        request_schema?: serializers.ListResponseItemRequestSchemaItem.Raw[] | null;
        response_schema?: serializers.ListResponseItemResponseSchemaItem.Raw[] | null;
    }
}
