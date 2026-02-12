import type { AlignmentReason, CareerImpactScore, Event } from '@/types';

type AlignmentReasonType = AlignmentReason['type'];

const GOAL_LABELS: Record<string, string> = {
  'skill-development': 'Skill Development',
  'role-transition': 'Role Transition',
  'leadership-growth': 'Leadership Growth',
  networking: 'Networking',
};

const REASON_TEXT_OVERRIDES: Record<string, string> = {
  'Build in-demand skills': 'Practical skill-building content',
  'Support your role transition': 'Supports your role transition plan',
  'Grow leadership capabilities': 'Supports your leadership growth plan',
  'Build industry relationships': 'Builds relevant industry relationships',
  'High-value community access': 'High-value community access',
};

function toGoalLabel(goal: string): string {
  if (GOAL_LABELS[goal]) {
    return GOAL_LABELS[goal];
  }

  return goal
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function toCompactList(values: string[], maxItems: number): string {
  if (values.length <= maxItems) {
    return values.join(', ');
  }
  const head = values.slice(0, maxItems).join(', ');
  return `${head} +${values.length - maxItems} more`;
}

function normalizeReasonText(reason: string): string {
  const trimmed = reason.trim();
  const overridden = REASON_TEXT_OVERRIDES[trimmed];
  if (overridden) {
    return overridden;
  }

  const interestMatch = trimmed.match(/^Matches interest:\s*(.+)$/i);
  if (interestMatch) {
    return `Focuses on ${interestMatch[1].trim()}`;
  }

  const roleMatch = trimmed.match(/^Aligns with your\s+(.+?)\s+role$/i);
  if (roleMatch) {
    return `Relevant to your ${roleMatch[1].trim()} role`;
  }

  return trimmed;
}

function parseSkillFromReason(reason: string): string | null {
  const learnMatch = reason.match(/^Learn\s+(.+)$/i);
  if (learnMatch) {
    return learnMatch[1].trim();
  }

  const advanceMatch = reason.match(/^Advance\s+(.+?)\s+skills$/i);
  if (advanceMatch) {
    return advanceMatch[1].trim();
  }

  return null;
}

function formatAttendeeCount(attendeeCount: number): string {
  if (attendeeCount >= 1000) {
    return `${(attendeeCount / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return `${attendeeCount}`;
}

function pickStrongestReasonByType(
  alignmentReasons: AlignmentReason[]
): Partial<Record<AlignmentReasonType, AlignmentReason>> {
  const result: Partial<Record<AlignmentReasonType, AlignmentReason>> = {};

  alignmentReasons.forEach((reason) => {
    const current = result[reason.type];
    if (!current || reason.contribution > current.contribution) {
      result[reason.type] = reason;
    }
  });

  return result;
}

function pushUniqueLine(lines: string[], line: string, maxItems: number): void {
  if (!line || lines.length >= maxItems) {
    return;
  }

  const normalizedCandidate = line.trim().toLowerCase();
  const alreadyExists = lines.some((existing) => existing.trim().toLowerCase() === normalizedCandidate);
  if (!alreadyExists) {
    lines.push(line);
  }
}

interface RecommendationHighlightsInput {
  careerImpact: CareerImpactScore | null | undefined;
  event?: Pick<Event, 'attendeeCount'> | null;
  maxItems?: number;
}

export function buildRecommendationHighlights({
  careerImpact,
  event,
  maxItems = 3,
}: RecommendationHighlightsInput): string[] {
  if (!careerImpact) {
    return [];
  }

  const explanation = careerImpact.explanation;
  const alignmentReasons = explanation?.alignmentReasons ?? [];
  const strongestReasons = pickStrongestReasonByType(alignmentReasons);
  const lines: string[] = [];

  const matchedSkills = [...new Set((explanation?.matchedSkills ?? []).filter(Boolean))];
  if (matchedSkills.length > 0) {
    pushUniqueLine(
      lines,
      `Skill match: ${toCompactList(matchedSkills, 2)}`,
      maxItems
    );
  } else {
    const skillReason = strongestReasons.skill;
    if (skillReason?.reason) {
      const normalizedReason = normalizeReasonText(skillReason.reason);
      const parsedSkill = parseSkillFromReason(normalizedReason);
      pushUniqueLine(
        lines,
        parsedSkill ? `Skill match: ${parsedSkill}` : `Skill match: ${normalizedReason}`,
        maxItems
      );
    }
  }

  const matchedGoals = [...new Set((explanation?.matchedGoals ?? []).filter(Boolean))];
  const strongestGoalReason = strongestReasons.goal?.reason
    ? normalizeReasonText(strongestReasons.goal.reason)
    : null;

  if (strongestGoalReason) {
    pushUniqueLine(
      lines,
      `Goal fit: ${strongestGoalReason}`,
      maxItems
    );
  } else if (matchedGoals.length > 0) {
    const goalLabels = matchedGoals.map(toGoalLabel);
    pushUniqueLine(
      lines,
      `Goal fit: ${toCompactList(goalLabels, 2)}`,
      maxItems
    );
  }

  const supportingReasonTypes: AlignmentReasonType[] = ['learning-style', 'role', 'networking', 'interest'];
  const supportingReasons = supportingReasonTypes
    .map((type) => strongestReasons[type])
    .filter((reason): reason is AlignmentReason => Boolean(reason))
    .sort((a, b) => b.contribution - a.contribution);

  supportingReasons.forEach((reason) => {
    if (lines.length >= maxItems) {
      return;
    }

    if (reason.type === 'learning-style') {
      pushUniqueLine(
        lines,
        `Learning fit: ${normalizeReasonText(reason.reason)}`,
        maxItems
      );
      return;
    }

    if (reason.type === 'role') {
      pushUniqueLine(
        lines,
        `Role fit: ${normalizeReasonText(reason.reason)}`,
        maxItems
      );
      return;
    }

    if (reason.type === 'networking') {
      const attendeeCount = event?.attendeeCount ?? null;
      if (typeof attendeeCount === 'number' && attendeeCount > 0) {
        pushUniqueLine(
          lines,
          `Networking value: ~${formatAttendeeCount(attendeeCount)} attendees`,
          maxItems
        );
      } else {
        pushUniqueLine(
          lines,
          `Networking value: ${normalizeReasonText(reason.reason)}`,
          maxItems
        );
      }
      return;
    }

    pushUniqueLine(
      lines,
      `Interest fit: ${normalizeReasonText(reason.reason)}`,
      maxItems
    );
  });

  if (lines.length < maxItems) {
    const fallbackReasons = explanation?.reasons ?? [];
    fallbackReasons.forEach((reason) => {
      if (lines.length >= maxItems) {
        return;
      }

      const normalizedReason = normalizeReasonText(reason);
      const skill = parseSkillFromReason(normalizedReason);
      if (skill) {
        pushUniqueLine(lines, `Skill match: ${skill}`, maxItems);
      } else {
        pushUniqueLine(lines, normalizedReason, maxItems);
      }
    });
  }

  if (lines.length < maxItems) {
    pushUniqueLine(
      lines,
      `Strong overall alignment (${Math.round(careerImpact.overall)} score)`,
      maxItems
    );
  }

  return lines.slice(0, maxItems);
}

export function getPrimaryRecommendationReason(
  careerImpact: CareerImpactScore | null | undefined
): string | null {
  return buildRecommendationHighlights({ careerImpact, maxItems: 1 })[0] ?? null;
}
