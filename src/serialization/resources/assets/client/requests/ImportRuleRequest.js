"use strict";
/**
 * This file was auto-generated by Fern from our API Definition.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportRuleRequest = void 0;
const core = __importStar(require("../../../../../core"));
exports.ImportRuleRequest = core.serialization.object({
    id: core.serialization.string(),
    createdAt: core.serialization.date(),
    slug: core.serialization.string(),
    updatedAt: core.serialization.date(),
    testRequest: core.serialization.record(core.serialization.string(), core.serialization.unknown()),
    name: core.serialization.string(),
    description: core.serialization.string(),
    requestSchema: core.serialization.list(core.serialization.unknown()),
    responseSchema: core.serialization.list(core.serialization.unknown()),
    sampleRequest: core.serialization.record(core.serialization.string(), core.serialization.unknown()),
    sampleResponse: core.serialization.record(core.serialization.string(), core.serialization.unknown()),
    conditions: core.serialization.list(core.serialization.unknown()),
    published: core.serialization.boolean(),
    history: core.serialization.list(core.serialization.unknown()),
});