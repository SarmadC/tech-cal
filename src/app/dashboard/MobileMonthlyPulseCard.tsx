import weeklyStyles from './MobileDashboardWeeklyPulse.module.css';
import { MobileDashboardCard } from './MobileDashboardCard';

interface MonthlyTrendDatum {
    name: string;
    value: number;
}

interface MobileMonthlyPulseCardProps {
    currentMonthAttendance: number;
    deltaLabel: string;
    trendData: MonthlyTrendDatum[];
    trendMaxValue: number;
    formatCount: (value: number) => string;
}

export function MobileMonthlyPulseCard({
    currentMonthAttendance,
    deltaLabel,
    trendData,
    trendMaxValue,
    formatCount,
}: MobileMonthlyPulseCardProps) {
    return (
        <MobileDashboardCard className={weeklyStyles.weeklyPulseCard}>
            <div className={weeklyStyles.weeklyPulseHeader}>
                <p className={weeklyStyles.weeklyPulseLabel}>
                    Monthly Pulse
                </p>
                <span className={weeklyStyles.weeklyPulseDelta}>
                    {deltaLabel}
                </span>
            </div>
            <p className={weeklyStyles.weeklyPulseValue}>
                {formatCount(currentMonthAttendance)}
            </p>
            <p className={weeklyStyles.weeklyPulseSubtext}>
                events attended in the last 30 days
            </p>
            <div className={weeklyStyles.weeklyPulseTrendArea}>
                {trendMaxValue === 0 ? (
                    <div className={weeklyStyles.weeklyPulseEmptyState}>
                        <p className={weeklyStyles.weeklyPulseEmptyText}>
                            No attendance activity in the last 30 days
                        </p>
                    </div>
                ) : (
                    <div
                        className={weeklyStyles.weeklyPulseTrendGrid}
                        style={{ gridTemplateColumns: `repeat(${trendData.length}, minmax(0, 1fr))` }}
                    >
                        {trendData.map((item) => {
                            const height = Math.max(8, Math.round((item.value / trendMaxValue) * 44));
                            return (
                                <div key={item.name} className={weeklyStyles.weeklyPulseTrendDay}>
                                    <div className={weeklyStyles.weeklyPulseTrendBarWrap}>
                                        <div
                                            className={weeklyStyles.weeklyPulseTrendBar}
                                            style={{ height: `${height}px` }}
                                        />
                                    </div>
                                    <p className={weeklyStyles.weeklyPulseTrendLabel}>
                                        {item.name}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </MobileDashboardCard>
    );
}
