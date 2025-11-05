<!-- 3ea9f034-62f3-4974-95c7-899f273359ac 3630749a-5664-4309-b41a-47bb71e9ab0c -->
# Event Update Management System

## Overview

When the ingestion pipeline detects a duplicate event (same event being re-ingested), instead of skipping it, we'll:

1. Compare field-by-field to detect changes
2. Respect field-level protection rules (auto-update vs protected)
3. Track which fields have been manually edited
4. Queue updates requiring approval while auto-applying safe updates
5. Provide admin UI to review and approve pending updates

## Database Schema Changes

### Migration 1: Manual Edit Tracking

**File**: `supabase/migrations/20250101000010_add_manual_edit_tracking.sql`

Create `event_field_edits` table to track which fields were manually edited:

- `id` (UUID, primary key)
- `event_id` (UUID, FK to events)
- `field_name` (TEXT, e.g., 'title', 'description', 'start_time', 'tags', 'audiences', 'prerequisites')
- `edited_at` (TIMESTAMPTZ)
- `edited_by` (UUID, FK to profiles, nullable)
- `previous_value` (JSONB, nullable - for rollback capability)
  - For scalar fields: stores the old value
  - For relationship fields (tags, audiences, prerequisites): stores array of IDs/names before deletion
  - For agenda: stores array of agenda item objects before deletion
- `new_value` (JSONB, nullable - snapshot after edit)
  - For relationship fields: stores array of IDs/names after edit
- `edit_source` (TEXT, enum: 'manual_enrichment', 'admin_ui', 'api')
- **Unique constraint on `(event_id, field_name)`** - keeps only latest edit per field (upsert pattern)
- Indexes on `event_id`, `field_name`, `edited_at`

**Decision**: Keep only latest edit per field (no history). If history is needed later, create separate `event_field_edits_history` table with timestamp-based retention.

### Migration 2: Field Protection Configuration

**File**: `supabase/migrations/20250101000011_add_field_protection_config.sql`

Create `event_field_protection_config` table for global field protection rules:

- `id` (UUID, primary key)
- `field_name` (TEXT, unique)
- `protection_mode` (TEXT, enum: 'auto_update', 'protected', 'review_required')
- `default_mode` (TEXT, for new fields)
- `updated_at` (TIMESTAMPTZ)
- `updated_by` (UUID, FK to profiles)

Seed initial config with sensible defaults:

- `auto_update`: `start_time`, `end_time`, `source_url`, `registration_url`, `livestream_url`
- `protected`: Fields with manual enrichments (detected via `event_field_edits`)
- `review_required`: `description`, `speaker_lineup`, `title`, `event_format`

### Migration 3: Update Review Queue

**File**: `supabase/migrations/20250101000012_add_update_review_queue.sql`

Create `event_update_queue` table for pending updates:

- `id` (UUID, primary key)
- `event_id` (UUID, FK to events)
- `source_event_id` (UUID, FK to source_events)
- `proposed_changes` (JSONB) - `{ field_name: { old_value, new_value, confidence } }`
- `status` (TEXT, enum: 'pending', 'approved', 'rejected', 'auto_applied')
- `auto_applied_fields` (JSONB, array of field names that were auto-updated)
- `requires_review_reason` (TEXT, why it needs review)
- `reviewed_by` (UUID, FK to profiles, nullable)
- `reviewed_at` (TIMESTAMPTZ, nullable)
- `created_at` (TIMESTAMPTZ)
- Indexes on `event_id`, `status`, `created_at`

## Service Layer Changes

### EventUpdateService (New)

**File**: `src/services/ingestion/EventUpdateService.ts`

Core service for handling event updates:

1. **`compareEventFields(record, existingEvent)`**

   - Compares `EventSourceRecord` with existing `events` row
   - Returns `FieldDiff[]` with `fieldName`, `oldValue`, `newValue`, `hasChanged`
   - Handles JSONB fields (speaker_lineup, etc.) with deep comparison
   - Uses semantic similarity for text fields (description, title)

2. **`getFieldProtectionStatus(eventId, fieldName)`**

   - Checks if field is protected (exists in `event_field_edits`)
   - Checks global protection config
   - Returns `'auto_update' | 'protected' | 'review_required'`

3. **`partitionFieldsByProtection(fieldDiffs, eventId)`**

   - Splits diffs into: `autoUpdate`, `protected`, `reviewRequired`
   - Returns decision for each field

4. **`applyAutoUpdates(eventId, autoUpdateFields, supabaseClient)`**

   - Updates only fields marked for auto-update
   - Logs changes to audit trail
   - Updates `last_synced_at` timestamp

5. **`queueForReview(eventId, sourceEventId, reviewRequiredFields, supabaseClient)`**

   - Creates `event_update_queue` entry
   - Includes all proposed changes with old/new values
   - Marks status as 'pending'

6. **`trackManualEdit(eventId, fieldName, previousValue, editedBy, supabaseClient)`**

   - Records manual edit in `event_field_edits`
   - Called from enrichment API endpoints

### EventDeduplicationService Updates

**File**: `src/services/ingestion/EventDeduplicationService.ts`

Modify `checkDuplicate` to return update metadata:

- Add `shouldUpdate: boolean` to `DuplicateCheckResult`
- Add `existingEvent` (full event data) when duplicate found
- Change behavior: don't just skip, return enough info for update decision

### NormalizationProcessor Updates

**File**: `src/services/ingestion/NormalizationProcessor.ts`

Replace skip logic (lines 208-218) with update flow:

```typescript
if (duplicateCheck.isDuplicate && duplicateCheck.existingEventId) {
    // Get existing event data
    const existingEvent = await fetchEvent(duplicateCheck.existingEventId);
    
    // Compare fields and determine update strategy
    const fieldDiffs = await EventUpdateService.compareEventFields(record, existingEvent);
    const protectionStatus = await EventUpdateService.partitionFieldsByProtection(
        fieldDiffs,
        duplicateCheck.existingEventId
    );
    
    // Apply auto-updates immediately
    if (protectionStatus.autoUpdate.length > 0) {
        await EventUpdateService.applyAutoUpdates(
            duplicateCheck.existingEventId,
            protectionStatus.autoUpdate,
            supabaseClient
        );
    }
    
    // Queue fields requiring review
    if (protectionStatus.reviewRequired.length > 0 || protectionStatus.protected.length > 0) {
        await EventUpdateService.queueForReview(
            duplicateCheck.existingEventId,
            sourceEvent.id,
            [...protectionStatus.reviewRequired, ...protectionStatus.protected],
            supabaseClient
        );
    }
    
    // Mark source_event as 'updated' (new status)
    await markSourceEventAsUpdated(sourceEvent.id, duplicateCheck.existingEventId);
    
    continue;
}
```

### EventEnrichmentService Updates

**File**: `src/services/ingestion/EventEnrichmentService.ts`

Add manual edit tracking to all enrichment methods:

- `updateEventCoreFields`: Track edits for each updated field
- `createOrUpdateAgendaItems`: Track 'agenda' field edit
- `createOrUpdateSpeakers`: Track 'speaker_lineup' field edit
- `manageEventRelationships`: Track relationship field edits (tags, audiences, etc.)

Create `trackFieldEdit` helper method that calls `EventUpdateService.trackManualEdit`.

## API Endpoints

### Field Protection Configuration

**File**: `src/app/api/admin/ingestion/field-protection/route.ts`

- `GET`: Fetch all field protection rules
- `PUT`: Update protection mode for a field
- Bulk update endpoint for batch changes

### Update Review Queue

**File**: `src/app/api/admin/ingestion/update-queue/route.ts`

- `GET`: List pending updates (with pagination, filtering)
- `GET /[id]`: Get single update queue item with full diff
- `POST /[id]/approve`: Approve and apply update
- `POST /[id]/reject`: Reject update
- `POST /[id]/approve-selective`: Approve only specific fields

### Manual Edit History

**File**: `src/app/api/admin/ingestion/event-edits/[eventId]/route.ts`

- `GET`: Get edit history for an event (which fields edited, when, by whom)

## Admin UI Components

### Field Protection Settings Page

**File**: `src/app/(protected)/admin/ingestion/field-protection/page.tsx`

- Table of all event fields with protection mode dropdowns
- Bulk actions (mark all as auto-update, etc.)
- Show which fields are currently protected (have manual edits)

### Update Review Queue Dashboard

**File**: `src/app/(protected)/admin/ingestion/update-queue/page.tsx`

- List of pending updates with:
  - Event title, organizer, proposed changes count
  - Auto-applied fields (already updated)
  - Fields requiring review (with diff view)
  - Actions: Approve All, Reject, Review Individual

### Update Review Detail Page

**File**: `src/app/(protected)/admin/ingestion/update-queue/[updateId]/page.tsx`

- Side-by-side diff view for each changed field
- Field-level approve/reject buttons
- Show protection status and manual edit history
- Bulk approve/reject actions

### Event Edit History Component

**File**: `src/app/(protected)/admin/ingestion/enrichment/[eventId]/EnrichmentEditorClient.tsx`

- Add "Edit History" section showing:
  - Which fields were manually edited
  - When and by whom
  - Option to "unprotect" a field (allow auto-updates)

## Integration Points

### Enrichment API Updates

Update all enrichment endpoints to track manual edits:

- `PUT /api/admin/ingestion/enrichment/event` - Track core field edits
- `POST /api/admin/ingestion/enrichment/agenda` - Track agenda edit
- `POST /api/admin/ingestion/enrichment/speakers` - Track speaker edit

### Source Events Status

Add new status to `source_events.fetch_status` enum:

- `'updated'` - Event was updated (duplicate detected and updated)

Update migration to include this status.

## Testing Strategy

1. **Unit Tests**: Field comparison logic, protection status checks
2. **Integration Tests**: Full update flow from duplicate detection to queue
3. **E2E Tests**: Admin approval workflow in UI

## Migration Order

1. Run migration 1 (manual edit tracking)
2. Run migration 2 (field protection config)
3. Run migration 3 (update queue)
4. Deploy service layer changes
5. Deploy API endpoints
6. Deploy UI components

## Configuration Defaults

Initial field protection modes:

- **Auto-update**: `start_time`, `end_time`, `source_url`, `registration_url`, `livestream_url`, `timezone`
- **Review required**: `title`, `description`, `speaker_lineup`, `event_format`, `location`, `organizer_id`
- **Protected** (when manually edited): All fields with entries in `event_field_edits`

### To-dos

- [ ] Create migration for event_field_edits table to track manual edits per field
- [ ] Create migration for event_field_protection_config table with initial protection rules
- [ ] Create migration for event_update_queue table and add updated status to source_events
- [ ] Create EventUpdateService with compareEventFields, getFieldProtectionStatus, partitionFieldsByProtection, applyAutoUpdates, queueForReview, and trackManualEdit methods
- [ ] Update EventDeduplicationService.checkDuplicate to return existingEvent data for update comparison
- [ ] Replace skip logic in NormalizationProcessor with update flow (compare, auto-update, queue for review)
- [ ] Add manual edit tracking to all EventEnrichmentService methods (updateEventCoreFields, createOrUpdateAgendaItems, createOrUpdateSpeakers, manageEventRelationships)
- [ ] Create /api/admin/ingestion/field-protection GET and PUT endpoints for configuration management
- [ ] Create /api/admin/ingestion/update-queue endpoints (list, detail, approve, reject, approve-selective)
- [ ] Create /api/admin/ingestion/event-edits/[eventId] GET endpoint for edit history
- [ ] Create admin UI page for field protection configuration settings
- [ ] Create admin UI dashboard for listing and managing pending updates
- [ ] Create admin UI detail page for reviewing individual updates with side-by-side diff view
- [ ] Add edit history section to enrichment editor showing manual edits per field
- [ ] Update all enrichment API endpoints to call EventUpdateService.trackManualEdit when fields are updated