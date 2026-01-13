'use client';

import { MaterialIcon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/button';

export default function SettingsMobileBilling() {
    return (
        <div className="space-y-6">
            {/* Current Plan Section */}
            <div>
                <h3 className="text-[11px] font-semibold text-[var(--mono-text-secondary)] mb-3 px-1 uppercase tracking-[0.05em]">
                    Current Plan
                </h3>
                <div className="rounded-lg overflow-hidden bg-[var(--mono-bg-surface)] border border-[var(--mono-border-default)] p-5">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h4 className="text-[17px] font-semibold text-[var(--mono-text-primary)] mb-1">Free Plan</h4>
                            <p className="text-[13px] text-[var(--mono-text-secondary)]">Active since Jan 2026</p>

                        </div>
                        <span className="px-2.5 py-1 rounded text-[11px] font-medium bg-[var(--mono-bg-hover)] text-[var(--mono-text-primary)] border border-[var(--mono-border-strong)]">
                            CURRENT
                        </span>
                    </div>

                    <div className="space-y-3 mb-6">
                        {[
                            'Unlimited calendar views',
                            'Event tracking & management',
                            'Basic career impact analytics'
                        ].map((feature, i) => (
                            <div key={i} className="flex items-center gap-3 text-[13px] text-[var(--mono-text-secondary)]">
                                <MaterialIcon name="check-circle" size={16} className="text-[var(--mono-text-tertiary)]" />
                                {feature}
                            </div>
                        ))}
                    </div>

                    <Button
                        className="w-full bg-[var(--mono-text-primary)] text-[var(--mono-bg-main)] hover:bg-[var(--mono-text-secondary)] h-10 text-sm font-medium rounded-md transition-colors"
                    >
                        Upgrade to Pro
                    </Button>
                </div>
            </div>

            {/* Payment Method Section */}
            <div>
                <h3 className="text-[11px] font-semibold text-[var(--mono-text-secondary)] mb-3 px-1 uppercase tracking-[0.05em]">
                    Payment Method
                </h3>
                <div className="rounded-lg overflow-hidden bg-[var(--mono-bg-surface)] border border-[var(--mono-border-default)]">
                    <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                        <div className="w-10 h-10 rounded-full bg-[var(--mono-bg-hover)] flex items-center justify-center mb-3">
                            <MaterialIcon name="credit-card" size={20} className="text-[var(--mono-text-tertiary)]" />
                        </div>
                        <p className="text-[13px] text-[var(--mono-text-secondary)] mb-1">No payment method added</p>
                        <p className="text-[11px] text-[var(--mono-text-tertiary)]">Add a card to upgrade your plan</p>
                    </div>

                    <div className="border-t border-[var(--mono-border-default)]">
                        <button className="w-full h-[48px] flex items-center justify-center text-[13px] font-medium text-[var(--mono-text-primary)] hover:bg-[var(--mono-bg-hover)] transition-colors">
                            Add Payment Method
                        </button>
                    </div>
                </div>
            </div>

            {/* Billing History Link */}
            <div className="px-1">
                <button className="flex items-center gap-2 text-[13px] text-[var(--mono-text-secondary)] hover:text-[var(--mono-text-primary)] transition-colors">
                    <MaterialIcon name="time" size={16} />
                    View Billing History
                </button>
            </div>
        </div>
    );
}
