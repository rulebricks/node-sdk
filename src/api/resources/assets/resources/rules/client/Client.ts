/**
 * This file was auto-generated by Fern from our API Definition.
 */

import * as environments from "../../../../../../environments";
import * as core from "../../../../../../core";
import * as Rulebricks from "../../../../../index";
import * as serializers from "../../../../../../serialization/index";
import urlJoin from "url-join";
import * as errors from "../../../../../../errors/index";

export declare namespace Rules {
    export interface Options {
        environment?: core.Supplier<environments.RulebricksEnvironment | string>;
        /** Specify a custom URL to connect the client to. */
        baseUrl?: core.Supplier<string>;
        apiKey: core.Supplier<string>;
    }

    export interface RequestOptions {
        /** The maximum time to wait for a response in seconds. */
        timeoutInSeconds?: number;
        /** The number of times to retry the request. Defaults to 2. */
        maxRetries?: number;
        /** A hook to abort the request. */
        abortSignal?: AbortSignal;
        /** Additional headers to include in the request. */
        headers?: Record<string, string>;
    }
}

export class Rules {
    constructor(protected readonly _options: Rules.Options) {}

    /**
     * Delete a specific rule by its ID.
     *
     * @param {Rulebricks.assets.DeleteRuleRequest} request
     * @param {Rules.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link Rulebricks.BadRequestError}
     * @throws {@link Rulebricks.NotFoundError}
     * @throws {@link Rulebricks.InternalServerError}
     *
     * @example
     *     await client.assets.rules.delete({
     *         id: "id"
     *     })
     */
    public async delete(
        request: Rulebricks.assets.DeleteRuleRequest,
        requestOptions?: Rules.RequestOptions,
    ): Promise<Rulebricks.SuccessMessage> {
        const _response = await core.fetcher({
            url: urlJoin(
                (await core.Supplier.get(this._options.baseUrl)) ??
                    (await core.Supplier.get(this._options.environment)) ??
                    environments.RulebricksEnvironment.Default,
                "admin/rules/delete",
            ),
            method: "DELETE",
            headers: {
                "X-Fern-Language": "JavaScript",
                "X-Fern-Runtime": core.RUNTIME.type,
                "X-Fern-Runtime-Version": core.RUNTIME.version,
                ...(await this._getCustomAuthorizationHeaders()),
                ...requestOptions?.headers,
            },
            contentType: "application/json",
            requestType: "json",
            body: serializers.assets.DeleteRuleRequest.jsonOrThrow(request, { unrecognizedObjectKeys: "strip" }),
            timeoutMs: requestOptions?.timeoutInSeconds != null ? requestOptions.timeoutInSeconds * 1000 : 60000,
            maxRetries: requestOptions?.maxRetries,
            abortSignal: requestOptions?.abortSignal,
        });
        if (_response.ok) {
            return serializers.SuccessMessage.parseOrThrow(_response.body, {
                unrecognizedObjectKeys: "passthrough",
                allowUnrecognizedUnionMembers: true,
                allowUnrecognizedEnumValues: true,
                breadcrumbsPrefix: ["response"],
            });
        }

        if (_response.error.reason === "status-code") {
            switch (_response.error.statusCode) {
                case 400:
                    throw new Rulebricks.BadRequestError(_response.error.body);
                case 404:
                    throw new Rulebricks.NotFoundError(_response.error.body);
                case 500:
                    throw new Rulebricks.InternalServerError(_response.error.body);
                default:
                    throw new errors.RulebricksError({
                        statusCode: _response.error.statusCode,
                        body: _response.error.body,
                    });
            }
        }

        switch (_response.error.reason) {
            case "non-json":
                throw new errors.RulebricksError({
                    statusCode: _response.error.statusCode,
                    body: _response.error.rawBody,
                });
            case "timeout":
                throw new errors.RulebricksTimeoutError("Timeout exceeded when calling DELETE /admin/rules/delete.");
            case "unknown":
                throw new errors.RulebricksError({
                    message: _response.error.errorMessage,
                });
        }
    }

    /**
     * Export a specific rule by its ID.
     *
     * @param {Rulebricks.assets.RulesPullRequest} request
     * @param {Rules.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link Rulebricks.BadRequestError}
     * @throws {@link Rulebricks.NotFoundError}
     * @throws {@link Rulebricks.InternalServerError}
     *
     * @example
     *     await client.assets.rules.pull({
     *         id: "id"
     *     })
     */
    public async pull(
        request: Rulebricks.assets.RulesPullRequest,
        requestOptions?: Rules.RequestOptions,
    ): Promise<Rulebricks.RuleExport> {
        const { id } = request;
        const _queryParams: Record<string, string | string[] | object | object[] | null> = {};
        _queryParams["id"] = id;
        const _response = await core.fetcher({
            url: urlJoin(
                (await core.Supplier.get(this._options.baseUrl)) ??
                    (await core.Supplier.get(this._options.environment)) ??
                    environments.RulebricksEnvironment.Default,
                "admin/rules/export",
            ),
            method: "GET",
            headers: {
                "X-Fern-Language": "JavaScript",
                "X-Fern-Runtime": core.RUNTIME.type,
                "X-Fern-Runtime-Version": core.RUNTIME.version,
                ...(await this._getCustomAuthorizationHeaders()),
                ...requestOptions?.headers,
            },
            contentType: "application/json",
            queryParameters: _queryParams,
            requestType: "json",
            timeoutMs: requestOptions?.timeoutInSeconds != null ? requestOptions.timeoutInSeconds * 1000 : 60000,
            maxRetries: requestOptions?.maxRetries,
            abortSignal: requestOptions?.abortSignal,
        });
        if (_response.ok) {
            return serializers.RuleExport.parseOrThrow(_response.body, {
                unrecognizedObjectKeys: "passthrough",
                allowUnrecognizedUnionMembers: true,
                allowUnrecognizedEnumValues: true,
                breadcrumbsPrefix: ["response"],
            });
        }

        if (_response.error.reason === "status-code") {
            switch (_response.error.statusCode) {
                case 400:
                    throw new Rulebricks.BadRequestError(_response.error.body);
                case 404:
                    throw new Rulebricks.NotFoundError(_response.error.body);
                case 500:
                    throw new Rulebricks.InternalServerError(_response.error.body);
                default:
                    throw new errors.RulebricksError({
                        statusCode: _response.error.statusCode,
                        body: _response.error.body,
                    });
            }
        }

        switch (_response.error.reason) {
            case "non-json":
                throw new errors.RulebricksError({
                    statusCode: _response.error.statusCode,
                    body: _response.error.rawBody,
                });
            case "timeout":
                throw new errors.RulebricksTimeoutError("Timeout exceeded when calling GET /admin/rules/export.");
            case "unknown":
                throw new errors.RulebricksError({
                    message: _response.error.errorMessage,
                });
        }
    }

    /**
     * Import a rule into the user's account.
     *
     * @param {Rulebricks.assets.ImportRuleRequest} request
     * @param {Rules.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link Rulebricks.BadRequestError}
     * @throws {@link Rulebricks.ForbiddenError}
     * @throws {@link Rulebricks.InternalServerError}
     *
     * @example
     *     await client.assets.rules.push({
     *         rule: {
     *             "key": "value"
     *         }
     *     })
     */
    public async push(
        request: Rulebricks.assets.ImportRuleRequest,
        requestOptions?: Rules.RequestOptions,
    ): Promise<Rulebricks.RuleExport> {
        const _response = await core.fetcher({
            url: urlJoin(
                (await core.Supplier.get(this._options.baseUrl)) ??
                    (await core.Supplier.get(this._options.environment)) ??
                    environments.RulebricksEnvironment.Default,
                "admin/rules/import",
            ),
            method: "POST",
            headers: {
                "X-Fern-Language": "JavaScript",
                "X-Fern-Runtime": core.RUNTIME.type,
                "X-Fern-Runtime-Version": core.RUNTIME.version,
                ...(await this._getCustomAuthorizationHeaders()),
                ...requestOptions?.headers,
            },
            contentType: "application/json",
            requestType: "json",
            body: serializers.assets.ImportRuleRequest.jsonOrThrow(request, { unrecognizedObjectKeys: "strip" }),
            timeoutMs: requestOptions?.timeoutInSeconds != null ? requestOptions.timeoutInSeconds * 1000 : 60000,
            maxRetries: requestOptions?.maxRetries,
            abortSignal: requestOptions?.abortSignal,
        });
        if (_response.ok) {
            return serializers.RuleExport.parseOrThrow(_response.body, {
                unrecognizedObjectKeys: "passthrough",
                allowUnrecognizedUnionMembers: true,
                allowUnrecognizedEnumValues: true,
                breadcrumbsPrefix: ["response"],
            });
        }

        if (_response.error.reason === "status-code") {
            switch (_response.error.statusCode) {
                case 400:
                    throw new Rulebricks.BadRequestError(_response.error.body);
                case 403:
                    throw new Rulebricks.ForbiddenError(_response.error.body);
                case 500:
                    throw new Rulebricks.InternalServerError(_response.error.body);
                default:
                    throw new errors.RulebricksError({
                        statusCode: _response.error.statusCode,
                        body: _response.error.body,
                    });
            }
        }

        switch (_response.error.reason) {
            case "non-json":
                throw new errors.RulebricksError({
                    statusCode: _response.error.statusCode,
                    body: _response.error.rawBody,
                });
            case "timeout":
                throw new errors.RulebricksTimeoutError("Timeout exceeded when calling POST /admin/rules/import.");
            case "unknown":
                throw new errors.RulebricksError({
                    message: _response.error.errorMessage,
                });
        }
    }

    /**
     * List all rules in the organization. Optionally filter by folder name or ID.
     *
     * @param {Rulebricks.assets.RulesListRequest} request
     * @param {Rules.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link Rulebricks.BadRequestError}
     * @throws {@link Rulebricks.InternalServerError}
     *
     * @example
     *     await client.assets.rules.list()
     */
    public async list(
        request: Rulebricks.assets.RulesListRequest = {},
        requestOptions?: Rules.RequestOptions,
    ): Promise<Rulebricks.RuleListResponse> {
        const { folder } = request;
        const _queryParams: Record<string, string | string[] | object | object[] | null> = {};
        if (folder != null) {
            _queryParams["folder"] = folder;
        }

        const _response = await core.fetcher({
            url: urlJoin(
                (await core.Supplier.get(this._options.baseUrl)) ??
                    (await core.Supplier.get(this._options.environment)) ??
                    environments.RulebricksEnvironment.Default,
                "admin/rules/list",
            ),
            method: "GET",
            headers: {
                "X-Fern-Language": "JavaScript",
                "X-Fern-Runtime": core.RUNTIME.type,
                "X-Fern-Runtime-Version": core.RUNTIME.version,
                ...(await this._getCustomAuthorizationHeaders()),
                ...requestOptions?.headers,
            },
            contentType: "application/json",
            queryParameters: _queryParams,
            requestType: "json",
            timeoutMs: requestOptions?.timeoutInSeconds != null ? requestOptions.timeoutInSeconds * 1000 : 60000,
            maxRetries: requestOptions?.maxRetries,
            abortSignal: requestOptions?.abortSignal,
        });
        if (_response.ok) {
            return serializers.RuleListResponse.parseOrThrow(_response.body, {
                unrecognizedObjectKeys: "passthrough",
                allowUnrecognizedUnionMembers: true,
                allowUnrecognizedEnumValues: true,
                breadcrumbsPrefix: ["response"],
            });
        }

        if (_response.error.reason === "status-code") {
            switch (_response.error.statusCode) {
                case 400:
                    throw new Rulebricks.BadRequestError(_response.error.body);
                case 500:
                    throw new Rulebricks.InternalServerError(_response.error.body);
                default:
                    throw new errors.RulebricksError({
                        statusCode: _response.error.statusCode,
                        body: _response.error.body,
                    });
            }
        }

        switch (_response.error.reason) {
            case "non-json":
                throw new errors.RulebricksError({
                    statusCode: _response.error.statusCode,
                    body: _response.error.rawBody,
                });
            case "timeout":
                throw new errors.RulebricksTimeoutError("Timeout exceeded when calling GET /admin/rules/list.");
            case "unknown":
                throw new errors.RulebricksError({
                    message: _response.error.errorMessage,
                });
        }
    }

    protected async _getCustomAuthorizationHeaders() {
        const apiKeyValue = await core.Supplier.get(this._options.apiKey);
        return { "x-api-key": apiKeyValue };
    }
}
