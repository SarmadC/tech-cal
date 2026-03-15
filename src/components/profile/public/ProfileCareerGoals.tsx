'use client';

import { Briefcase, Building, Target, Clock, GraduationCap } from '@phosphor-icons/react';

interface ProfileCareerGoalsProps {
  currentRole: string | null;
  seniority: string | null;
  industry: string | null;
  companySize: string | null;
  careerGoals: string[];
  timeframe: string | null;
  targetPath: string | null;
}

function formatLabel(value: string | null): string {
  if (!value) return '';
  return value
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCompanySize(size: string | null): string {
  if (!size) return '';
  const labels: Record<string, string> = {
    startup: 'Startup (< 50)',
    small: 'Small (50-200)',
    medium: 'Medium (200-1000)',
    large: 'Large (1000-10000)',
    enterprise: 'Enterprise (10000+)',
    freelance: 'Freelance/Independent',
  };
  return labels[size] || formatLabel(size);
}

function formatTimeframe(timeframe: string | null): string {
  if (!timeframe) return '';
  const labels: Record<string, string> = {
    immediate: '0-6 months',
    'short-term': '6-18 months',
    'medium-term': '1-3 years',
    'long-term': '3+ years',
  };
  return labels[timeframe] || formatLabel(timeframe);
}

export default function ProfileCareerGoals({
  currentRole,
  seniority,
  industry,
  companySize,
  careerGoals,
  timeframe,
  targetPath,
}: ProfileCareerGoalsProps) {
  const hasCareerInfo = currentRole || seniority || industry || companySize;
  const hasGoals = careerGoals.length > 0 || targetPath;

  if (!hasCareerInfo && !hasGoals) {
    return (
      <section className="rounded-xl border border-[var(--border-default)] bg-[var(--background-secondary)] p-5">
        <h2 className="text-base font-semibold text-[var(--foreground-primary)]">Career</h2>
        <p className="mt-2 text-sm text-[var(--foreground-secondary)]">
          No career information added yet.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-[var(--border-default)] bg-[var(--background-secondary)] p-5">
      <h2 className="text-base font-semibold text-[var(--foreground-primary)]">Career</h2>

      {hasCareerInfo && (
        <div className="mt-4 space-y-3">
          {currentRole && (
            <div className="flex items-start gap-3">
              <Briefcase className="w-4 h-4 text-[var(--foreground-tertiary)] mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-[var(--foreground-tertiary)] uppercase tracking-wide">Current Role</p>
                <p className="text-sm text-[var(--foreground-primary)]">
                  {formatLabel(currentRole)}
                  {seniority && (
                    <span className="text-[var(--foreground-secondary)]">
                      {' '}· {formatLabel(seniority)}
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          {industry && (
            <div className="flex items-start gap-3">
              <Building className="w-4 h-4 text-[var(--foreground-tertiary)] mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-[var(--foreground-tertiary)] uppercase tracking-wide">Industry</p>
                <p className="text-sm text-[var(--foreground-primary)]">{industry}</p>
              </div>
            </div>
          )}

          {companySize && (
            <div className="flex items-start gap-3">
              <Building className="w-4 h-4 text-[var(--foreground-tertiary)] mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-[var(--foreground-tertiary)] uppercase tracking-wide">Company Size</p>
                <p className="text-sm text-[var(--foreground-primary)]">{formatCompanySize(companySize)}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {hasGoals && (
        <div className="mt-5 pt-4 border-t border-[var(--border-default)]">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-[var(--foreground-tertiary)]" />
            <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--foreground-tertiary)]">
              Goals
            </h3>
          </div>

          {targetPath && (
            <div className="mb-3">
              <p className="text-xs text-[var(--foreground-tertiary)]">Target Path</p>
              <p className="text-sm text-[var(--foreground-primary)] font-medium">{targetPath}</p>
            </div>
          )}

          {careerGoals.length > 0 && (
            <div>
              <p className="text-xs text-[var(--foreground-tertiary)] mb-2">Career Objectives</p>
              <ul className="space-y-1">
                {careerGoals.slice(0, 4).map((goal) => (
                  <li key={goal} className="text-sm text-[var(--foreground-primary)] flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-[var(--foreground-secondary)]" />
                    {formatLabel(goal)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {timeframe && (
            <div className="mt-3 flex items-center gap-2 text-xs text-[var(--foreground-secondary)]">
              <Clock className="w-3.5 h-3.5" />
              <span>Timeframe: {formatTimeframe(timeframe)}</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
