/**
 * This file was auto-generated by Fern from our API Definition.
 */
import * as serializers from "../../..";
import * as RulebricksApi from "../../../../api";
import * as core from "../../../../core";
export declare const ListFlowsResponseItem: core.serialization.ObjectSchema<serializers.ListFlowsResponseItem.Raw, RulebricksApi.ListFlowsResponseItem>;
export declare namespace ListFlowsResponseItem {
    interface Raw {
        id?: string | null;
        name?: string | null;
        description?: string | null;
        published?: boolean | null;
        slug?: string | null;
        updated_at?: string | null;
    }
}
