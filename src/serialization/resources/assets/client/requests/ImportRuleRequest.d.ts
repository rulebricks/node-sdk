/**
 * This file was auto-generated by Fern from our API Definition.
 */
import * as serializers from "../../../..";
import * as RulebricksApi from "../../../../../api";
import * as core from "../../../../../core";
export declare const ImportRuleRequest: core.serialization.Schema<serializers.ImportRuleRequest.Raw, RulebricksApi.ImportRuleRequest>;
export declare namespace ImportRuleRequest {
    interface Raw {
        id: string;
        createdAt: string;
        slug: string;
        updatedAt: string;
        testRequest: Record<string, unknown>;
        name: string;
        description: string;
        requestSchema: unknown[];
        responseSchema: unknown[];
        sampleRequest: Record<string, unknown>;
        sampleResponse: Record<string, unknown>;
        conditions: unknown[];
        published: boolean;
        history: unknown[];
    }
}