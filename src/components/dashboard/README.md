# Dashboard Components - Data Availability Notes

## Data Audit Findings (Phase 0)

### EventStatus Values
The `TrackedEventRecord.status` field uses these values:
- `'bookmarked'`: User saved/bookmarked the event
- `'attending'`: User RSVP'd / plans to attend
- `'attended'`: User attended the event
- `'cancelled'`: User cancelled their RSVP

**Finding**: There is NO "recommendation seen" status. The adoption funnel (seen → saved → RSVP'd → attended) cannot be derived from `trackedEvents` alone. Requires telemetry changes to track recommendation impressions.

### Career Impact Data Availability

#### Expected Structure
Events may include:
- `event.careerImpact` (full): Contains `overall`, `components`, `explanation`, `metadata`
- `event.careerImpactLite` (lightweight): Contains only `overall` score

#### Components Availability
- `careerImpact.components` provides: `skillRelevance`, `careerStageMatch`, `networkingValue`, `industryRelevance`, `timingBonus`
- **Status**: Need to verify if this is populated in actual dashboard data flow
- **Fallback**: If missing, aggregate `careerImpact.overall` scores by goal-matched events

#### Explanation Availability
- `careerImpact.explanation.reasons`: Array of human-readable recommendation reasons
- `careerImpact.explanation.matchedSkills`: Array of matched skill names
- `careerImpact.explanation.matchedGoals`: Implied from goal matching logic

**Note**: If `careerImpact` is missing entirely, components use `calculateEventAlignment()` from `uiScoringAdapter.ts` with caching.

### Post-Event Data

#### Notes Field
- `TrackedEventRecord.notes`: Available, may contain user reflections
- **Usage**: Can enrich Recent Wins card if populated

#### RSVP → Attend Delta
- `trackedAt`: When the tracking record was created
- Can calculate days between status change to 'attending' and event date
- **Limitation**: Only accurate if status was updated when RSVP occurred

## Shared Thresholds

See `src/config/recommendationThresholds.ts` for centralized thresholds:
- Recommended: ≥50
- Buckets: High ≥80, Moderate ≥50, Low ≥20, Minimal ≥1

## Fallback Scoring Strategy

When `careerImpact` is missing:
1. Check cache (keyed by `eventId + profileHash`)
2. Compute via `calculateEventAlignment()` if not cached
3. Log/emit telemetry for observability
4. Cache result for future use

**Performance**: Only compute for visible events, not all upcoming events.

