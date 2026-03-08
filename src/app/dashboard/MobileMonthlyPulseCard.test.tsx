import { describe, expect, it } from 'vitest';
import { render, screen } from '@/utils/test-utils';
import { MobileMonthlyPulseCard } from './MobileMonthlyPulseCard';

describe('MobileMonthlyPulseCard', () => {
    it('renders inside the shared mobile dashboard card shell', () => {
        const { container } = render(
            <MobileMonthlyPulseCard
                currentMonthAttendance={3}
                deltaLabel="+1 vs prev 30d"
                trendData={[
                    { name: 'W1', value: 0 },
                    { name: 'W2', value: 1 },
                    { name: 'W3', value: 1 },
                    { name: 'W4', value: 1 },
                ]}
                trendMaxValue={1}
                formatCount={(value) => value.toString()}
            />
        );

        expect(screen.getByText('Monthly Pulse')).toBeInTheDocument();
        expect(container.querySelector('[data-mobile-dashboard-card="true"]')).toBeTruthy();
        expect(screen.getByText('events attended in the last 30 days')).toBeInTheDocument();
    });
});
