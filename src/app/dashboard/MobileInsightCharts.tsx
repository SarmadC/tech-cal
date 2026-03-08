import { ComparisonChart } from '@/components/dashboard/charts/index';
import { MobileDashboardCard } from './MobileDashboardCard';
import carouselStyles from './MobileDashboardInsightCarousel.module.css';
import recommendationStyles from './MobileDashboardRecommendationChart.module.css';
import conversionStyles from './MobileDashboardConversionChart.module.css';

interface ChartDatum {
    name: string;
    value: number;
}

interface MobileInsightChartsProps {
    funnelData: ChartDatum[];
    funnelAttendedCount: number;
    funnelTotal: number;
    pipelineAvgScore: number;
    pipelineTrackedCount: number;
    pipelineScoredCount: number;
    pipelineHighQualityCount: number;
    pipelineData: ChartDatum[];
}

export function MobileInsightCharts({
    funnelData,
    funnelAttendedCount,
    funnelTotal,
    pipelineAvgScore,
    pipelineTrackedCount,
    pipelineScoredCount,
    pipelineHighQualityCount,
    pipelineData,
}: MobileInsightChartsProps) {
    return (
        <section className={carouselStyles.insightStudioSection}>
            <div className={carouselStyles.sliderContainer}>
                <div className={carouselStyles.slider}>
                    <MobileDashboardCard className={`${carouselStyles.card} ${recommendationStyles.recommendationCard}`}>
                        <div className={carouselStyles.cardHeaderFlex}>
                            <p className={recommendationStyles.recommendationLabel}>Pipeline Health</p>
                            <h4 className={recommendationStyles.recommendationValue}>{pipelineScoredCount > 0 ? pipelineAvgScore : '—'}</h4>
                        </div>
                        <p className={recommendationStyles.recommendationSubtext ?? ''} style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: 2 }}>
                            {pipelineTrackedCount === 0
                                ? 'Save or RSVP to upcoming events to score your pipeline'
                                : `${pipelineHighQualityCount} high-fit of ${pipelineTrackedCount} upcoming commitments`}
                        </p>
                        {pipelineData.length > 0 && (
                            <ComparisonChart
                                data={pipelineData}
                                height={150}
                                showValueLabels={true}
                                valueLabelColor="var(--chart-text)"
                                color="var(--chart-color)"
                            />
                        )}
                    </MobileDashboardCard>

                    <MobileDashboardCard className={`${carouselStyles.card} ${conversionStyles.conversionCard}`}>
                        <div className={carouselStyles.cardHeaderFlex}>
                            <p className={conversionStyles.conversionLabel}>Follow-through Funnel</p>
                            <h4 className={conversionStyles.conversionValue}>{funnelTotal > 0 ? funnelAttendedCount : '—'}</h4>
                        </div>
                        {funnelTotal > 0 ? (
                            <>
                                <p style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: 2 }}>
                                    Last 90 days · {funnelAttendedCount} attended from saved and RSVP activity
                                </p>
                                <ComparisonChart
                                    data={funnelData}
                                    height={150}
                                    showValueLabels={true}
                                    valueLabelColor="var(--chart-text)"
                                    color="var(--chart-color)"
                                />
                            </>
                        ) : (
                            <p style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: 2 }}>
                                Save, RSVP, and attend events to build a follow-through story
                            </p>
                        )}
                    </MobileDashboardCard>
                </div>
            </div>
        </section>
    );
}
