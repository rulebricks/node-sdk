/**
 * This file was auto-generated by Fern from our API Definition.
 */

export interface UsageStatistics {
    /** The current plan of the organization. */
    plan?: string;
    /** The start date of the current monthly period. */
    monthlyPeriodStart?: string;
    /** The end date of the current monthly period. */
    monthlyPeriodEnd?: string;
    /** The number of rule executions used this month. */
    monthlyExecutionsUsage?: number;
    /** The total number of rule executions allowed this month. */
    monthlyExecutionsLimit?: number;
    /** The number of rule executions remaining this month. */
    monthlyExecutionsRemaining?: number;
}
