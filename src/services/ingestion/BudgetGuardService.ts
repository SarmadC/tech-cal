import { FIRECRAWL_CONFIG } from '@/config/ingestionConstants';
import type { SupabaseClientType } from '@/types';

interface CreditUsageSummary {
    daily: number;
    monthly: number;
    domainDaily: number;
}

export interface BudgetCheckResult {
    allow: boolean;
    reason?: string;
    usage?: CreditUsageSummary;
}

const DAILY_SOFT_CAP_RATIO = 0.8;

function sumCredits(rows: Array<{ firecrawl_credits_spent: number | null } | null | undefined>): number {
    if (!rows || rows.length === 0) return 0;
    return rows.reduce((total, row) => {
        const value = row?.firecrawl_credits_spent;
        return total + (typeof value === 'number' && !Number.isNaN(value) ? value : 0);
    }, 0);
}

function calcDateRange(offsetDays: number): string {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + offsetDays);
    date.setUTCHours(0, 0, 0, 0);
    return date.toISOString();
}

function calcMonthStart(): string {
    const date = new Date();
    date.setUTCDate(1);
    date.setUTCHours(0, 0, 0, 0);
    return date.toISOString();
}

export class BudgetGuardService {
    static async summarizeUsage(
        supabaseClient: SupabaseClientType,
        sourceDomain: string | undefined
    ): Promise<CreditUsageSummary> {
        const dailyStart = calcDateRange(0);
        const monthStart = calcMonthStart();

        const { data: dailyRows } = await supabaseClient
            .from('extraction_job_log')
            .select('firecrawl_credits_spent')
            .gte('started_at', dailyStart)
            .eq('firecrawl_used', true);

        const { data: monthlyRows } = await supabaseClient
            .from('extraction_job_log')
            .select('firecrawl_credits_spent')
            .gte('started_at', monthStart)
            .eq('firecrawl_used', true);

        let domainDailyRows: Array<{ firecrawl_credits_spent: number | null }> | null = null;
        if (sourceDomain) {
            const { data } = await supabaseClient
                .from('extraction_job_log')
                .select('firecrawl_credits_spent')
                .gte('started_at', dailyStart)
                .eq('firecrawl_used', true)
                .eq('source_domain', sourceDomain);
            domainDailyRows = data;
        }

        return {
            daily: sumCredits(dailyRows ?? []),
            monthly: sumCredits(monthlyRows ?? []),
            domainDaily: sumCredits(domainDailyRows ?? []),
        };
    }

    static async check(
        supabaseClient: SupabaseClientType,
        params: { sourceDomain?: string; creditsRequested?: number }
    ): Promise<BudgetCheckResult> {
        const creditsRequested = Math.max(params.creditsRequested ?? 1, 0);
        const usage = await this.summarizeUsage(supabaseClient, params.sourceDomain);

        const dailyCap = FIRECRAWL_CONFIG.DAILY_CREDIT_CAP ?? 0;
        if (dailyCap > 0 && usage.daily + creditsRequested > dailyCap * DAILY_SOFT_CAP_RATIO) {
            return {
                allow: false,
                reason: 'daily_soft_cap_exceeded',
                usage,
            };
        }

        if (dailyCap > 0 && usage.daily + creditsRequested > dailyCap) {
            return {
                allow: false,
                reason: 'daily_cap_exceeded',
                usage,
            };
        }

        const monthlyCap = FIRECRAWL_CONFIG.MONTHLY_CREDIT_CAP ?? 0;
        if (monthlyCap > 0 && usage.monthly + creditsRequested > monthlyCap) {
            return {
                allow: false,
                reason: 'monthly_cap_exceeded',
                usage,
            };
        }

        const perDomainCap = FIRECRAWL_CONFIG.PER_DOMAIN_DAILY_CAP ?? 0;
        if (
            perDomainCap > 0 &&
            params.sourceDomain &&
            usage.domainDaily + creditsRequested > perDomainCap
        ) {
            return {
                allow: false,
                reason: 'domain_daily_cap_exceeded',
                usage,
            };
        }

        return {
            allow: true,
            usage,
        };
    }
}






