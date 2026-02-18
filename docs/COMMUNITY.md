# Community & Social Features

A comprehensive social networking system that enables users to:
- Follow/unfollow other users with trust level requirements
- Block users for safety with mutual invisibility
- Discover public profiles at clean `/u/username` URLs
- View who's attending events with network context
- Build professional networks with follower/following relationships

**Key Features:**
- Trust & Safety: Progressive feature unlocking via trust levels
- Privacy Controls: Granular visibility settings (profile + attendance)
- Performance: Counter isolation, cursor-based pagination, optimistic UI
- Analytics: Comprehensive telemetry for engagement tracking

---

## Quick Start

### 1. Review the Database Schema

Start here to understand the data model:
- [`supabase/migrations/20260217_phase_a_social_foundation.sql`](../supabase/migrations/20260217_phase_a_social_foundation.sql) - Core tables (profiles extension, blocks, stats, trust_levels)
- [`supabase/migrations/20260217_phase_b_follow_system.sql`](../supabase/migrations/20260217_phase_b_follow_system.sql) - Follow system with triggers

### 2. Explore Key Services (Business Logic)

Services handle all business logic and data access:
- [`src/services/followService.ts`](../src/services/followService.ts) - Follow/unfollow, status checks, paginated lists
- [`src/services/blockService.ts`](../src/services/blockService.ts) - Block operations and filtering
- [`src/services/publicProfileService.ts`](../src/services/publicProfileService.ts) - Profile visibility enforcement
- [`src/services/whosGoingService.ts`](../src/services/whosGoingService.ts) - Event attendees with network context
- [`src/services/trustLevelService.ts`](../src/services/trustLevelService.ts) - Progressive feature unlocking

### 3. Try the Features

Navigate to these pages to see everything in action:
- **Community Directory:** `/community` - Searchable user directory
- **Public Profile:** `/u/[username]` - User profile pages
- **Social Settings:** `/dashboard/settings` → Social tab
- **Who's Going:** View any event detail page

### 4. Review Key Components

Main UI components:
- [`src/components/social/FollowButton.tsx`](../src/components/social/FollowButton.tsx) - Stateful follow button with optimistic updates
- [`src/components/social/CommunityDirectory.tsx`](../src/components/social/CommunityDirectory.tsx) - User search and discovery
- [`src/components/events/WhosGoingSection.tsx`](../src/components/events/WhosGoingSection.tsx) - Event attendee list
- [`src/components/social/NetworkAttendingBadge.tsx`](../src/components/social/NetworkAttendingBadge.tsx) - Network context on events

---

## Architecture

### Service-Oriented Design

All business logic lives in services under `src/services/`:
- Enforces consistent patterns (pagination, filtering, error handling)
- Services are testable units independent of API routes
- Reusable across different API endpoints and components

### Key Architectural Patterns

#### 1. Dual Supabase Client Pattern

Critical for balancing security with performance:

**Viewer-scoped client (RLS-enforced):**
```typescript
const userSupabase = await createClient(); // Uses user's JWT
// Can only read/write what RLS policies allow for this user
```

**Service client (bypasses RLS):**
```typescript
const readSupabase = createServiceClient(url, key); // Admin privileges
// Used for read-only operations like hydrating profile data
```

**When to use which:**
- **Viewer-scoped:** For all write operations and permission-sensitive reads
- **Service client:** For stats aggregation, profile hydration (after permission checks)

**Example from `publicProfileService.ts`:**
```typescript
// Step 1: Check permissions with RLS-enforced client
const hasBlocks = await userScopedSupabase
  .from('blocks')
  .select('blocker_id')
  .or(`blocker_id.eq.${viewerId},blocked_id.eq.${viewerId}`);

if (hasBlocks.length > 0) return null; // Enforce block

// Step 2: Fetch profile data with service client (faster, no RLS overhead)
const profile = await readSupabase
  .from('profiles')
  .select('*')
  .eq('username', username)
  .single();
```

#### 2. Client-Side Event System

Global event synchronization for consistent UI across all components:

**Implementation:** [`src/components/social/followEvents.ts`](../src/components/social/followEvents.ts)

**Pattern:**
```typescript
// 1. Dispatch event after follow action
dispatchFollowStatusChanged({
  actorUserId: viewerId,
  targetUserId: userId,
  isFollowing: true
});

// 2. Components listen and update counts
useEffect(() => {
  const handler = (e: CustomEvent) => {
    setCounts(applyFollowDelta(counts, userId, e.detail));
  };
  window.addEventListener('social:follow-status-changed', handler);
  return () => window.removeEventListener('social:follow-status-changed', handler);
}, [userId]);
```

**Benefits:**
- No prop drilling required
- Consistent counts across tabs and components
- Optimistic UI updates

#### 3. Multi-Layer Block Filtering

Blocks are enforced at three levels for complete invisibility:

- **Layer 1:** Database RLS (prevents follow relationships)
- **Layer 2:** Service layer (filters from query results)
- **Layer 3:** Component layer (final UI filtering)

**Example pattern:**
```typescript
// Service layer (followService.ts)
const blockedIds = await BlockService.getBlockedUserIdsForViewer(
  viewerId,
  candidateUserIds,
  supabaseClient
);

// Filter blocked users from results
const visibleUsers = users.filter(u => !blockedIds.has(u.id));
```

#### 4. Cursor-Based Pagination

All lists use timestamp + ID cursors for consistent pagination:

**Pattern:**
```typescript
// Endpoint: /api/follows/followers?limit=20&cursor=2026-02-17T12:34:56.789Z

let query = supabase
  .from('follows')
  .select('following_id, created_at')
  .eq('follower_id', userId)
  .order('created_at', { ascending: false })
  .limit(limit + 1); // Fetch one extra to detect hasMore

if (cursor) {
  query = query.lt('created_at', cursor);
}

const results = await query;
const hasMore = results.length > limit;
const items = hasMore ? results.slice(0, -1) : results;
const nextCursor = hasMore ? items[items.length - 1].created_at : null;
```

**Benefits:**
- Consistent results even with new insertions
- Handles same-timestamp edge cases
- Scalable to large datasets

---

## Database Schema

### Core Tables

#### Extended `profiles` Table

Existing table with new social columns:

```sql
username TEXT UNIQUE -- 3-30 chars, starts with letter, alphanumeric + _ -
headline TEXT CHECK (char_length(headline) <= 120)
profile_visibility TEXT CHECK (profile_visibility IN ('private', 'connections', 'public'))
  DEFAULT 'private'
show_attendance BOOLEAN DEFAULT false -- Controls "Who's Going" visibility
```

**Key Points:**
- `username` is case-insensitive unique (managed by unique index)
- `profile_visibility` controls profile page access
- `show_attendance` is separate from profile visibility (granular control)

#### `follows` Table

Core follow relationship tracking:

```sql
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(follower_id, following_id),
  CHECK (follower_id <> following_id) -- Prevents self-follows
);

-- Indexes for pagination
CREATE INDEX idx_follows_follower_created_at
  ON follows(follower_id, created_at DESC);
CREATE INDEX idx_follows_following_created_at
  ON follows(following_id, created_at DESC);
```

#### `blocks` Table

Block relationships with mutual enforcement:

```sql
CREATE TABLE blocks (
  blocker_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),

  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

-- Bidirectional lookup index
CREATE INDEX idx_blocks_blocked_id ON blocks(blocked_id);
```

**Block Behavior:**
- Mutual invisibility (both directions enforced)
- Automatically deletes existing follow relationships
- Prevents new follows between blocked users (via RLS)

#### `user_social_stats` Table

Counter isolation for performance:

```sql
CREATE TABLE user_social_stats (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  follower_count INTEGER DEFAULT 0 CHECK (follower_count >= 0),
  following_count INTEGER DEFAULT 0 CHECK (following_count >= 0),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Maintained by database triggers:**
- Automatically increments/decrements on follow/unfollow
- Prevents negative counts with `GREATEST(0, count)`
- Enables fast count queries without aggregation

#### `trust_levels` Table

Progressive feature unlocking:

```sql
CREATE TABLE trust_levels (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  level INTEGER DEFAULT 0 CHECK (level BETWEEN 0 AND 4),
  last_evaluated_at TIMESTAMPTZ DEFAULT now()
);
```

**Trust Level Requirements:**
- **Level 0 (New):** Default state, cannot follow users
- **Level 1 (Basic):** 7+ days + completed onboarding → Can follow
- **Level 2 (Member):** 30+ days + onboarding + 3+ bookmarked events → Reserved for future features
- **Level 3-4:** Reserved for advanced features

**Calculated by:** [`trustLevelService.ts`](../src/services/trustLevelService.ts)

### Row Level Security (RLS)

All tables have RLS enabled. Key policies:

**`follows` table:**
```sql
-- Anyone authenticated can read follows
CREATE POLICY "follows_read" ON follows FOR SELECT
  TO authenticated USING (true);

-- Users can only insert their own follows (and not if blocked)
CREATE POLICY "follows_insert" ON follows FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = follower_id
    AND NOT EXISTS (
      SELECT 1 FROM blocks
      WHERE (blocker_id = follower_id AND blocked_id = following_id)
         OR (blocker_id = following_id AND blocked_id = follower_id)
    )
  );

-- Users can only delete their own follows
CREATE POLICY "follows_delete" ON follows FOR DELETE
  TO authenticated USING (auth.uid() = follower_id);
```

**`blocks` table:**
```sql
-- Users can read blocks where they're either party
CREATE POLICY "blocks_read" ON blocks FOR SELECT
  TO authenticated
  USING (auth.uid() IN (blocker_id, blocked_id));

-- Users can manage their own blocks
CREATE POLICY "blocks_manage" ON blocks
  TO authenticated
  USING (auth.uid() = blocker_id);
```

---

## API Endpoints

### Follow System

#### `POST /api/follows`

**Purpose:** Follow a user

**Request:**
```json
{
  "userId": "uuid-of-user-to-follow"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "User followed successfully."
}
```

**Error Cases:**
- `400`: Missing userId
- `403`: Trust level too low (requires Level 1+)
- `409`: Already following
- `400`: Cannot follow yourself
- `400`: Cannot follow blocked user
- `429`: Rate limit exceeded

**Rate Limit:** `FOLLOW_ACTIONS_DAILY` (default: 100 per day)

---

#### `DELETE /api/follows/[userId]`

**Purpose:** Unfollow a user

**Response (Success):**
```json
{
  "success": true
}
```

---

#### `GET /api/follows/status/[userId]`

**Purpose:** Check follow and block status with another user

**Response:**
```json
{
  "success": true,
  "data": {
    "isFollowing": true,
    "isFollowedBy": false,
    "isBlockedByUser": false,
    "hasBlockedUser": false
  }
}
```

**Use Case:** Initialize follow button state, show relationship badges

---

#### `GET /api/follows/followers?limit=20&cursor=timestamp`

**Purpose:** Get paginated list of followers

**Query Parameters:**
- `limit` (optional): Number of results (default: 20, max: 50)
- `cursor` (optional): Pagination cursor (ISO timestamp)

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "fullName": "Jane Doe",
        "avatarUrl": "https://...",
        "username": "janedoe",
        "headline": "Software Engineer at Tech Corp",
        "followerCount": 150,
        "followingCount": 89,
        "followedAt": "2026-02-15T10:30:00Z"
      }
    ],
    "nextCursor": "2026-02-14T09:20:00Z" // null if no more results
  }
}
```

**Note:** Blocked users are automatically filtered out

---

#### `GET /api/follows/following?limit=20&cursor=timestamp`

**Purpose:** Get paginated list of users you're following

**Same structure as followers endpoint**

---

### Block System

#### `POST /api/blocks`

**Purpose:** Block a user (mutual invisibility + unfollows both directions)

**Request:**
```json
{
  "userId": "uuid-of-user-to-block"
}
```

**Response:**
```json
{
  "success": true
}
```

**Side Effects:**
- Deletes any existing follow relationships (both directions)
- User becomes invisible in all social contexts

---

#### `DELETE /api/blocks/[userId]`

**Purpose:** Unblock a user

**Response:**
```json
{
  "success": true
}
```

**Note:** Does NOT restore previous follow relationships

---

#### `GET /api/blocks`

**Purpose:** Get list of blocked users

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "fullName": "Blocked User",
      "avatarUrl": "https://...",
      "username": "blocked_user",
      "headline": "...",
      "blockedAt": "2026-02-10T14:00:00Z"
    }
  ]
}
```

---

### User Discovery

#### `GET /api/users/search?q=term&hasHeadline=true&limit=20&cursor=id`

**Purpose:** Search public profiles

**Query Parameters:**
- `q` (required): Search term (matches username, full name, headline)
- `hasHeadline` (optional): Filter to users with headlines only
- `limit` (optional): Results per page (default: 20, max: 50)
- `cursor` (optional): Pagination cursor (user ID)

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "fullName": "John Smith",
        "avatarUrl": null,
        "username": "johnsmith",
        "headline": "Product Manager",
        "followerCount": 45,
        "followingCount": 67
      }
    ],
    "nextCursor": "uuid" // null if no more
  }
}
```

**Filtering:**
- Only returns public profiles (`profile_visibility = 'public'`)
- Excludes blocked users (both directions)
- Text search uses `ILIKE` for case-insensitive matching

---

### Social Profile Management

#### `GET /api/profile/social`

**Purpose:** Get current user's social settings

**Response:**
```json
{
  "success": true,
  "data": {
    "username": "johndoe",
    "headline": "Full-stack developer",
    "profileVisibility": "public",
    "showAttendance": true,
    "trustLevel": 1
  }
}
```

---

#### `PATCH /api/profile/social`

**Purpose:** Update social settings

**Request:**
```json
{
  "username": "newusername",
  "headline": "Updated headline",
  "profileVisibility": "public",
  "showAttendance": true
}
```

**Validation:**
- **Username:** 3-30 chars, starts with letter, alphanumeric + `_` or `-`
- **Headline:** Max 120 characters
- **Profile Visibility:** `'private'` or `'public'`
- **Show Attendance:** Boolean

**Response:**
```json
{
  "success": true,
  "data": { "...updated settings..." }
}
```

---

#### `GET /api/profile/username-check?q=username`

**Purpose:** Check if username is available

**Response (Available):**
```json
{
  "success": true,
  "data": {
    "username": "newusername",
    "available": true
  }
}
```

**Response (Taken):**
```json
{
  "success": true,
  "data": {
    "username": "taken",
    "available": false,
    "reason": "taken",
    "message": "Username is already taken."
  }
}
```

**Response (Invalid):**
```json
{
  "success": true,
  "data": {
    "username": "123invalid",
    "available": false,
    "reason": "invalid",
    "message": "Username must start with a letter and contain only letters, numbers, underscores, or hyphens (3-30 characters)."
  }
}
```

**Response (Reserved):**
```json
{
  "success": true,
  "data": {
    "username": "admin",
    "available": false,
    "reason": "reserved",
    "message": "This username is reserved."
  }
}
```

**Reserved Usernames:** `admin`, `support`, `help`, `kure`, `kurecal`, `system`, `moderator`, `official`

---

### Event Attendees

#### `GET /api/events/[id]/attendees?limit=6`

**Purpose:** Get who's going to an event with network context

**Query Parameters:**
- `limit` (optional): Max attendees to return (default: 6)

**Response:**
```json
{
  "success": true,
  "data": {
    "eventId": "uuid",
    "totalAttending": 15,
    "visibleAttendeeCount": 12,
    "networkAttendingCount": 3,
    "viewerIsAttending": true,
    "attendees": [
      {
        "id": "uuid",
        "fullName": "Alice Johnson",
        "avatarUrl": "https://...",
        "username": "alice",
        "headline": "Designer",
        "isInNetwork": true,
        "followsViewer": false,
        "isMutualFollow": true
      }
    ]
  }
}
```

**Visibility Rules:**
- Only shows users with `show_attendance: true`
- Only shows users with `profile_visibility: 'public'`
- Filters out blocked users
- `networkAttendingCount`: Number of users you follow who are attending
- `visibleAttendeeCount`: May be less than `totalAttending` due to privacy settings

---

#### `GET /api/events/network-counts?eventIds=id1,id2,id3`

**Purpose:** Batch fetch network attending counts for multiple events

**Query Parameters:**
- `eventIds` (required): Comma-separated event IDs (max 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "event-uuid-1": 5,
    "event-uuid-2": 0,
    "event-uuid-3": 12
  }
}
```

**Use Case:** Efficiently show network badges on event lists and calendar views

---

## Key Components

### `<FollowButton>`

**Location:** [`src/components/social/FollowButton.tsx`](../src/components/social/FollowButton.tsx)

**Purpose:** Reusable stateful button for following/unfollowing users

**Props:**
```typescript
interface FollowButtonProps {
  userId: string;                    // Target user ID
  compact?: boolean;                 // Smaller variant
  initialIsFollowing?: boolean;      // Skip initial status fetch if known
  onStatusChange?: (isFollowing: boolean) => void; // Callback for status changes
  telemetrySurface?: string;         // Analytics context (e.g., 'community_directory_card')
}
```

**Features:**
- Optimistic UI updates (immediate feedback)
- Global event synchronization (updates counts across all components)
- Loading states during API calls
- Hover state: "Following" → "Unfollow"
- Automatic telemetry tracking
- Trust level enforcement (shows disabled state if Level 0)

**Usage Example:**
```typescript
import FollowButton from '@/components/social/FollowButton';

<FollowButton
  userId={user.id}
  compact
  telemetrySurface="community_directory_card"
/>
```

---

### `<CommunityDirectory>`

**Location:** [`src/components/social/CommunityDirectory.tsx`](../src/components/social/CommunityDirectory.tsx)

**Purpose:** Searchable user directory for discovering other users

**Features:**
- Real-time search with 250ms debounce
- "Has headline only" filter toggle
- Cursor-based pagination ("Load more" button)
- User cards showing:
  - Avatar (initials placeholder)
  - Full name and @username
  - Headline
  - Follower/following counts
  - Follow button

**Search Behavior:**
- Searches across username, full name, and headline
- Case-insensitive matching
- Only returns public profiles
- Excludes blocked users

---

### `<PublicProfileHeader>`

**Location:** [`src/components/social/PublicProfileHeader.tsx`](../src/components/social/PublicProfileHeader.tsx)

**Purpose:** Profile header with social stats and follow button

**Props:**
```typescript
interface PublicProfileHeaderProps {
  profile: {
    id: string;
    username: string;
    fullName: string;
    headline?: string;
    followerCount: number;
    followingCount: number;
  };
  isOwnProfile: boolean;
  initialIsFollowing?: boolean;
}
```

**Features:**
- Real-time count updates via event listeners
- Avatar placeholder (initials-based)
- Clickable follower/following counts (opens lists)
- Follow button integration
- "Edit Settings" link for profile owners

---

### `<WhosGoingSection>`

**Location:** [`src/components/events/WhosGoingSection.tsx`](../src/components/events/WhosGoingSection.tsx)

**Purpose:** Shows attendees for an event with network context

**Features:**
- Summary line: "You + 5 attending" or "12 attending"
- Avatar circles for quick visual scan (up to 5)
- Expandable attendee list with:
  - User profiles (avatar, name, @username, headline)
  - Relationship badges ("Mutual follow", "You follow", "Follows you")
  - Follow buttons
  - Profile links to `/u/username`
  - Block action in dropdown menu
- Network attending count badge

**Telemetry:**
- Impression tracking when component loads
- Click tracking on expand/collapse
- Profile view tracking when clicking usernames

**Privacy:**
- Requires authentication to view
- Only shows users with `show_attendance: true` AND `profile_visibility: 'public'`
- Respects block relationships

---

### `<NetworkAttendingBadge>`

**Location:** [`src/components/social/NetworkAttendingBadge.tsx`](../src/components/social/NetworkAttendingBadge.tsx)

**Purpose:** Highlight events where people you follow are attending

**Props:**
```typescript
interface NetworkAttendingBadgeProps {
  eventId: string;
  count: number;                     // Number of followed users attending
  sampleAvatars?: string[];          // Avatar URLs (up to 3)
  telemetrySurface: string;          // Analytics context
  compact?: boolean;                 // Smaller variant
}
```

**Visual Design:**
- Shows avatar stack (up to 3 overlapping circles)
- Text: "5 in your network"
- Click tracking for engagement metrics

**Usage Example:**
```typescript
import NetworkAttendingBadge from '@/components/social/NetworkAttendingBadge';

{networkCount > 0 && (
  <NetworkAttendingBadge
    eventId={event.id}
    count={networkCount}
    sampleAvatars={sampleAvatars}
    telemetrySurface="discovery_event_card"
  />
)}
```

---

### `<SocialSettingsPanel>`

**Location:** [`src/app/dashboard/settings/SocialSettingsPanel.tsx`](../src/app/dashboard/settings/SocialSettingsPanel.tsx)

**Purpose:** Complete social configuration interface

**Settings:**
1. **Username**
   - Real-time availability checking (350ms debounce)
   - Pattern: 3-30 chars, starts with letter, alphanumeric + `_` or `-`
   - Reserved username protection
   - Case-insensitive uniqueness

2. **Headline**
   - Max 120 characters
   - Textarea with character counter

3. **Profile Visibility**
   - Radio buttons: Private or Public
   - Help text explaining each option

4. **Show Attendance**
   - Toggle switch
   - Controls visibility in "Who's Going" sections

5. **Trust Level Display**
   - Read-only badge showing current level
   - Explains requirements for next level

6. **Blocked Users Management**
   - List of blocked users with avatars
   - "Unblock" button for each
   - Empty state when no blocks

---

## Common Development Patterns

### Adding Follow/Block Context to a Component

**Step 1:** Import the hook/service
```typescript
import { useState, useEffect } from 'react';
```

**Step 2:** Fetch relationship status
```typescript
const [isFollowing, setIsFollowing] = useState(false);

useEffect(() => {
  const fetchStatus = async () => {
    const response = await fetch(`/api/follows/status/${userId}`);
    const { data } = await response.json();
    setIsFollowing(data.isFollowing);
  };
  fetchStatus();
}, [userId]);
```

**Step 3:** Add follow button
```typescript
<FollowButton
  userId={userId}
  initialIsFollowing={isFollowing}
  telemetrySurface="your_component_name"
/>
```

---

### Implementing Block Filtering in a Service

**Pattern (from `followService.ts`):**
```typescript
import { BlockService } from './blockService';

export async function getFollowersList(userId: string, viewerId: string) {
  // 1. Fetch followers
  const followers = await supabase
    .from('follows')
    .select('follower_id, profiles(*)')
    .eq('following_id', userId);

  // 2. Get blocked user IDs
  const blockedIds = await BlockService.getBlockedUserIdsForViewer(
    viewerId,
    followers.map(f => f.follower_id),
    supabase
  );

  // 3. Filter out blocked users
  const visibleFollowers = followers.filter(
    f => !blockedIds.has(f.follower_id)
  );

  return visibleFollowers;
}
```

**Key Principle:** Always filter at service layer before returning to API/component

---

### Adding Network Context to Events

**Step 1:** Use the network counts hook
```typescript
import { useNetworkEventCounts } from '@/hooks/useNetworkEventCounts';

const eventIds = events.map(e => e.id);
const { counts, loading } = useNetworkEventCounts(eventIds);
```

**Step 2:** Render badges for events with network attendance
```typescript
{events.map(event => (
  <EventCard key={event.id}>
    {/* ...event details... */}

    {counts[event.id] > 0 && (
      <NetworkAttendingBadge
        eventId={event.id}
        count={counts[event.id]}
        telemetrySurface="event_list_card"
      />
    )}
  </EventCard>
))}
```

---

### Listening to Follow Events for Real-Time Updates

**Pattern (from `PublicProfileHeader.tsx`):**
```typescript
import { FOLLOW_STATUS_CHANGED_EVENT, applyFollowDelta } from '@/components/social/followEvents';

const [counts, setCounts] = useState({
  followerCount: initialFollowerCount,
  followingCount: initialFollowingCount
});

useEffect(() => {
  const handleFollowChange = (e: CustomEvent) => {
    const { actorUserId, targetUserId, isFollowing } = e.detail;

    // Update counts if relevant to this profile
    setCounts(prev => applyFollowDelta(prev, profileUserId, e.detail));
  };

  window.addEventListener(FOLLOW_STATUS_CHANGED_EVENT, handleFollowChange);
  return () => window.removeEventListener(FOLLOW_STATUS_CHANGED_EVENT, handleFollowChange);
}, [profileUserId]);
```

**When to use:**
- Profile headers (follower/following counts)
- User cards in lists (counts change when following/unfollowing)
- Any component displaying social stats

---

### Privacy Decision Logic

**Decision Tree:**
- Check 1: Is there a block relationship? → Deny
- Check 2: Is profile visibility 'public'? → Deny if not (and not owner)
- Check 3: For attendance, is show_attendance true? → Deny if not (and not owner)
- Result: Allow access

**Reference Implementation:** [`publicProfileService.ts`](../src/services/publicProfileService.ts)

```typescript
export async function canViewProfile(
  viewerId: string | null,
  profileOwnerId: string,
  supabase: any
): Promise<boolean> {
  // Owner can always view
  if (viewerId === profileOwnerId) return true;

  // Check blocks (if viewer is authenticated)
  if (viewerId) {
    const blocks = await supabase
      .from('blocks')
      .select('blocker_id')
      .or(`blocker_id.eq.${viewerId},blocked_id.eq.${viewerId}`);

    if (blocks.length > 0) return false;
  }

  // Check profile visibility
  const profile = await supabase
    .from('profiles')
    .select('profile_visibility')
    .eq('id', profileOwnerId)
    .single();

  return profile.profile_visibility === 'public';
}
```

---

## Testing

### Running Tests

**All social feature tests:**
```bash
npm test -- --testPathPattern=social
```

**Specific component:**
```bash
npm test -- FollowButton.test.tsx
npm test -- PublicProfileHeader.test.tsx
```

**API endpoints:**
```bash
npm test -- route.test.ts
```

**Services:**
```bash
npm test -- telemetryAnalyticsService.test.ts
```

---

### Test Files

- **Components:**
  - `src/components/social/FollowButton.test.tsx`
  - `src/components/social/PublicProfileHeader.test.tsx`
  - `src/components/social/FollowListsPanel.test.tsx`
  - `src/components/social/NetworkAttendingBadge.test.tsx`
  - `src/components/events/WhosGoingSection.test.tsx`

- **Services:**
  - `src/services/__tests__/telemetryAnalyticsService.test.ts`

- **Hooks:**
  - `src/hooks/__tests__/useRecommendationTracking.test.tsx`

- **API Routes:**
  - `src/app/api/monitoring/telemetry/route.test.ts`

---

### Manual Testing Checklist

**Follow System:**
- [ ] Follow a user from community directory
- [ ] Verify optimistic update (button changes immediately)
- [ ] Verify counts update on profile pages
- [ ] Unfollow from public profile
- [ ] Verify counts decrement correctly
- [ ] Try following with trust level 0 (should show "Available after 7 days and onboarding completion")
- [ ] Try following a user who blocked you (should fail silently)

**Block System:**
- [ ] Block a user from their profile
- [ ] Verify they disappear from search results
- [ ] Verify they disappear from follower/following lists
- [ ] Verify existing follow relationship is deleted
- [ ] Try to follow after blocking (should be prevented)
- [ ] Unblock from settings panel
- [ ] Verify visibility is restored

**Public Profiles:**
- [ ] Visit `/u/username` for various users
- [ ] Test private profile (should 404 for non-owners)
- [ ] Verify recent events section shows correctly
- [ ] Test follower/following lists
- [ ] Click "Load more" for pagination
- [ ] Verify relationship badges ("Mutual follow", etc.)

**Community Directory:**
- [ ] Search for users by name
- [ ] Search by username
- [ ] Search by headline
- [ ] Toggle "Has headline only" filter
- [ ] Test pagination with "Load more"
- [ ] Verify blocked users are hidden

**Who's Going:**
- [ ] Mark attendance on an event
- [ ] Verify you appear in "Who's Going" section
- [ ] Enable "Show attendance" in settings
- [ ] Verify you appear
- [ ] Disable "Show attendance"
- [ ] Verify you disappear from lists (but still attending)
- [ ] Follow another attendee
- [ ] Verify network count increases

**Network Badges:**
- [ ] Follow users and mark events as attending
- [ ] Verify network badges appear on event cards
- [ ] Verify badges show correct count
- [ ] Verify badges appear in multiple surfaces (discovery, calendar, list view)

---

### Integration Test Scenarios

**Scenario 1: New User Onboarding**
1. New user signs up → Trust level 0
2. User tries to follow someone → Sees "Available after 7 days and onboarding"
3. User completes onboarding + waits 7 days → Trust level 1
4. User can now follow others

**Scenario 2: Block Flow**
1. User A follows User B
2. User B blocks User A
3. Verify: Follow relationship is deleted
4. Verify: User A can't see User B in search
5. Verify: User B can't see User A in search
6. User B unblocks User A
7. Verify: Both can see each other again (but not following)

**Scenario 3: Privacy Controls**
1. User sets profile to private
2. Verify: `/u/username` returns 404 for others
3. User enables "Show attendance" (still private profile)
4. Verify: Profile still private, but user appears in "Who's Going"
5. User sets profile to public
6. Verify: Profile page is accessible, attendance visible

---

## Telemetry & Analytics

All social interactions are tracked via [`telemetryAnalyticsService.ts`](../src/services/telemetryAnalyticsService.ts)

### Key Events

#### Follow Action
```typescript
{
  eventType: 'follow_action',
  context: {
    surface: 'community_directory_card' // Where action occurred
  },
  metadata: {
    action: 'follow' | 'unfollow',
    targetUserId: string
  }
}
```

**Surfaces:**
- `community_directory_card`
- `public_profile_header`
- `event_detail_attendee_list`

---

#### Network Badge Impression/Click
```typescript
// Impression (when badge is rendered)
{
  eventType: 'network_badge_impression',
  context: { surface: 'discovery_event_card' },
  metadata: {
    eventId: string,
    networkAttendingCount: number
  }
}

// Click (when user clicks badge)
{
  eventType: 'network_badge_click',
  context: { surface: 'discovery_event_card' },
  metadata: {
    eventId: string,
    networkAttendingCount: number
  }
}
```

---

#### Who's Going Interaction
```typescript
// Impression (when section loads)
{
  eventType: 'whos_going_impression',
  context: { surface: 'event_detail' },
  metadata: {
    eventId: string,
    visibleAttendeeCount: number,
    totalAttending: number,
    viewerIsAttending: boolean
  }
}

// Click (when user expands/collapses)
{
  eventType: 'whos_going_click',
  context: { surface: 'event_detail' },
  metadata: {
    eventId: string,
    action: 'expand' | 'collapse'
  }
}

// Profile click (when clicking attendee profile)
{
  eventType: 'whos_going_profile_click',
  context: { surface: 'event_detail' },
  metadata: {
    eventId: string,
    clickedUserId: string
  }
}
```

---

#### Public Profile View
```typescript
{
  eventType: 'public_profile_view',
  context: {
    surface: 'navigation_click' // How user arrived
  },
  metadata: {
    profileUserId: string,
    username: string,
    referrer: string
  }
}
```

**Tracked by:** [`PublicProfileTelemetry.tsx`](../src/components/social/PublicProfileTelemetry.tsx)

---

### Adding Telemetry to New Features

**Pattern:**
```typescript
import { telemetryAnalyticsService } from '@/services/telemetryAnalyticsService';

// Track user action
await telemetryAnalyticsService.track({
  eventType: 'your_custom_event',
  context: {
    surface: 'your_component_name'
  },
  metadata: {
    // Any relevant data
    actionType: 'click',
    targetId: '...'
  }
});
```

**Best Practices:**
- Always include `surface` to track where the action occurred
- Use consistent event type naming conventions
- Include relevant IDs for analysis (userId, eventId, etc.)
- Track both impressions and interactions for conversion analysis

---

## Troubleshooting

### "Following is available after 7 days and onboarding completion"

**Cause:** User's trust level is 0.

**Check:**
```sql
-- Check trust level
SELECT level, last_evaluated_at
FROM trust_levels
WHERE user_id = 'user-uuid';

-- Check account age
SELECT created_at
FROM profiles
WHERE id = 'user-uuid';

-- Check onboarding status
SELECT preferences->>'careerOnboardingCompleted'
FROM profiles
WHERE id = 'user-uuid';
```

**Solution:**
- Wait until account is 7+ days old AND onboarding is completed
- Or manually update trust level (testing only):
```sql
UPDATE trust_levels
SET level = 1, last_evaluated_at = now()
WHERE user_id = 'user-uuid';
```

---

### Follow Counts Out of Sync

**Cause:** Race condition in trigger or failed update.

**Diagnosis:**
```sql
-- Check actual vs. stored counts
SELECT
  p.id,
  p.full_name,
  s.follower_count AS stored_follower_count,
  (SELECT COUNT(*) FROM follows WHERE following_id = p.id) AS actual_follower_count,
  s.following_count AS stored_following_count,
  (SELECT COUNT(*) FROM follows WHERE follower_id = p.id) AS actual_following_count
FROM profiles p
LEFT JOIN user_social_stats s ON s.user_id = p.id
WHERE s.follower_count <> (SELECT COUNT(*) FROM follows WHERE following_id = p.id)
   OR s.following_count <> (SELECT COUNT(*) FROM follows WHERE follower_id = p.id);
```

**Solution - Recalculate all counts:**
```sql
-- Reset follower counts
WITH follower_counts AS (
  SELECT following_id AS user_id, COUNT(*)::INTEGER AS count
  FROM follows
  GROUP BY following_id
)
UPDATE user_social_stats stats
SET follower_count = COALESCE(counts.count, 0), updated_at = now()
FROM follower_counts counts
WHERE stats.user_id = counts.user_id;

-- Reset following counts
WITH following_counts AS (
  SELECT follower_id AS user_id, COUNT(*)::INTEGER AS count
  FROM follows
  GROUP BY follower_id
)
UPDATE user_social_stats stats
SET following_count = COALESCE(counts.count, 0), updated_at = now()
FROM following_counts counts
WHERE stats.user_id = counts.user_id;

-- Reset to zero for users with no follows
UPDATE user_social_stats
SET follower_count = 0, following_count = 0, updated_at = now()
WHERE id NOT IN (SELECT following_id FROM follows)
  AND id NOT IN (SELECT follower_id FROM follows);
```

---

### Username Validation Failing

**Check pattern requirements:**
- Must start with a letter: `^[a-zA-Z]...`
- 3-30 characters total
- Only letters, numbers, underscore, hyphen: `[a-zA-Z0-9_-]`
- Full regex: `^[a-zA-Z][a-zA-Z0-9_-]{2,29}$`

**Reserved usernames (cannot be claimed):**
- `admin`, `support`, `help`, `kure`, `kurecal`, `system`, `moderator`, `official`

**Check implementation:** [`socialProfileService.ts`](../src/services/socialProfileService.ts) → `validateUsername()`

---

### Blocked User Still Visible

**Cause:** Block filtering not applied at all layers.

**Debug checklist:**
1. **Database RLS:** Check policies on `blocks` table
```sql
-- Verify RLS is enabled
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'blocks';

-- Should return: relrowsecurity = true
```

2. **Service Layer:** Verify `BlockService.getBlockedUserIdsForViewer()` is called
   - Check service files: `followService.ts`, `publicProfileService.ts`, `userSearchService.ts`

3. **Component Layer:** Verify results are filtered before rendering
   - Check components that display user lists

**Test blocks manually:**
```sql
-- Check if block exists
SELECT * FROM blocks
WHERE (blocker_id = 'user-a' AND blocked_id = 'user-b')
   OR (blocker_id = 'user-b' AND blocked_id = 'user-a');
```

---

### "Who's Going" Not Showing Users

**Visibility requires BOTH:**
1. `show_attendance: true`
2. `profile_visibility: 'public'`

**Check user settings:**
```sql
SELECT
  id,
  full_name,
  username,
  profile_visibility,
  show_attendance
FROM profiles
WHERE id = 'user-uuid';
```

**Also verify:**
- No block relationships exist
- User is authenticated (anonymous users can't see attendees)
- User is actually marked as attending the event

```sql
-- Check attendance
SELECT * FROM event_attendance
WHERE event_id = 'event-uuid' AND user_id = 'user-uuid' AND status = 'attending';
```

---

### Rate Limit Errors (429)

**Cause:** User exceeded `FOLLOW_ACTIONS_DAILY` limit.

**Check:**
```typescript
// Rate limiter config in /src/utils/rateLimit.ts
export const followActionRateLimiter = createRateLimiter({
  limit: process.env.FOLLOW_ACTIONS_DAILY || 100,
  window: '1d'
});
```

**Solution:**
- Wait for daily reset (UTC midnight)
- Or adjust limit in environment variables (for testing)

**Check user's limit status (requires database access to rate limit store):**
```bash
# If using Upstash Redis
redis-cli GET "rate-limit:follow:user-uuid"
```

---

## Future Enhancements & Extension Points

### Planned Features
- [ ] **Connections-only profile visibility** - Middle tier between private and public
- [ ] **Follow requests** - For private profiles (require approval)
- [ ] **Mutual connection badges** - Show when you and another user have mutual follows
- [ ] **User reporting system** - Report inappropriate profiles/behavior
- [ ] **Follow recommendations** - Suggest users based on events attended, mutual follows

### Architecture Supports

The current implementation is designed to support:

1. **Direct Messaging** - User relationships already exist, can add DM tables
2. **Activity Feed** - Follow graph enables feed of followed users' activities
3. **Notifications** - Event system can be extended for follow/mention notifications
4. **Reputation System** - Trust levels provide foundation for community moderation

---

### Adding a New Relationship Type

**Example: Adding "Connection Requests"**

**Step 1:** Database migration
```sql
CREATE TABLE connection_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(requester_id, recipient_id)
);
```

**Step 2:** Create service (`connectionRequestService.ts`)
- Implement business logic (create, accept, reject)
- Apply block filtering
- Handle edge cases (already following, etc.)

**Step 3:** Create API routes (`src/app/api/connection-requests/`)
- `POST /api/connection-requests` - Send request
- `PATCH /api/connection-requests/[id]` - Accept/reject
- `GET /api/connection-requests` - List pending requests

**Step 4:** Build UI components (`src/components/social/`)
- `<ConnectionRequestButton>`
- `<ConnectionRequestsList>`

**Step 5:** Add telemetry events
- `connection_request_sent`
- `connection_request_accepted`
- `connection_request_rejected`

**Step 6:** Update this README with new patterns and API docs

---

### Extending Network Context to New Features

**Example: "Friends Attending" on Event Registration Flow**

**Step 1:** Import network counts hook
```typescript
import { useNetworkEventCounts } from '@/hooks/useNetworkEventCounts';
```

**Step 2:** Fetch counts for event
```typescript
const { counts } = useNetworkEventCounts([eventId]);
const networkCount = counts[eventId] || 0;
```

**Step 3:** Render badge
```typescript
{networkCount > 0 && (
  <NetworkAttendingBadge
    eventId={eventId}
    count={networkCount}
    telemetrySurface="event_registration_flow"
  />
)}
```

**Step 4:** Track telemetry
- Add surface identifier to tracking
- Track impressions and clicks

---

## Appendix: Critical Files Reference

### Database Schema
- [`supabase/migrations/20260217_phase_a_social_foundation.sql`](../supabase/migrations/20260217_phase_a_social_foundation.sql)
  - Extended profiles table (username, headline, visibility)
  - blocks table (mutual invisibility)
  - user_social_stats table (counter isolation)
  - trust_levels table (progressive unlocking)

- [`supabase/migrations/20260217_phase_b_follow_system.sql`](../supabase/migrations/20260217_phase_b_follow_system.sql)
  - follows table with constraints
  - Database triggers for count synchronization
  - RLS policies for all tables

---

### Service Layer (Business Logic)

**Core Services:**
- [`src/services/followService.ts`](../src/services/followService.ts)
  - `followUser()` - Create follow relationship
  - `unfollowUser()` - Delete follow relationship
  - `getFollowStatus()` - Check relationship between two users
  - `getFollowersList()` - Paginated followers
  - `getFollowingList()` - Paginated following

- [`src/services/blockService.ts`](../src/services/blockService.ts)
  - `blockUser()` - Create block + delete follows
  - `unblockUser()` - Remove block
  - `getBlockedUserIdsForViewer()` - Efficient block filtering
  - `getBlockedUsersList()` - Hydrated blocked users list

- [`src/services/publicProfileService.ts`](../src/services/publicProfileService.ts)
  - `getPublicProfileByUsername()` - Fetch profile with privacy enforcement
  - `getRecentAttendingEvents()` - Recent events respecting attendance privacy

- [`src/services/trustLevelService.ts`](../src/services/trustLevelService.ts)
  - `calculateTrustLevel()` - Determine user's trust level
  - `canFollowUsers()` - Check if user can follow (Level 1+)

- [`src/services/whosGoingService.ts`](../src/services/whosGoingService.ts)
  - `getEventAttendees()` - Fetch attendees with network context
  - Enforces visibility rules (show_attendance + profile_visibility)

- [`src/services/socialProfileService.ts`](../src/services/socialProfileService.ts)
  - `updateSocialProfile()` - Update username/headline/visibility
  - `checkUsernameAvailability()` - Real-time validation
  - `validateUsername()` - Pattern matching + reserved check

- [`src/services/userSearchService.ts`](../src/services/userSearchService.ts)
  - `searchPublicProfiles()` - User discovery with filters
  - Block filtering + public-only enforcement

---

### API Routes

**Follow System:**
- [`src/app/api/follows/route.ts`](../src/app/api/follows/route.ts) - POST follow, GET status
- [`src/app/api/follows/[userId]/route.ts`](../src/app/api/follows/[userId]/route.ts) - DELETE unfollow
- [`src/app/api/follows/status/[userId]/route.ts`](../src/app/api/follows/status/[userId]/route.ts) - GET relationship status
- [`src/app/api/follows/followers/route.ts`](../src/app/api/follows/followers/route.ts) - GET followers list
- [`src/app/api/follows/following/route.ts`](../src/app/api/follows/following/route.ts) - GET following list

**Block System:**
- [`src/app/api/blocks/route.ts`](../src/app/api/blocks/route.ts) - POST block, GET blocked list
- [`src/app/api/blocks/[userId]/route.ts`](../src/app/api/blocks/[userId]/route.ts) - DELETE unblock

**User Discovery:**
- [`src/app/api/users/search/route.ts`](../src/app/api/users/search/route.ts) - GET search profiles

**Social Profile:**
- [`src/app/api/profile/social/route.ts`](../src/app/api/profile/social/route.ts) - GET/PATCH social settings
- [`src/app/api/profile/username-check/route.ts`](../src/app/api/profile/username-check/route.ts) - GET availability

**Event Attendees:**
- [`src/app/api/events/[id]/attendees/route.ts`](../src/app/api/events/[id]/attendees/route.ts) - GET attendee list
- [`src/app/api/events/network-counts/route.ts`](../src/app/api/events/network-counts/route.ts) - GET batch network counts

---

### Pages

- [`src/app/(protected)/community/page.tsx`](../src/app/(protected)/community/page.tsx) - Community directory page
- [`src/app/u/[username]/page.tsx`](../src/app/u/[username]/page.tsx) - Public profile page (with SEO metadata)

---

### Components

**Social Components:**
- [`src/components/social/FollowButton.tsx`](../src/components/social/FollowButton.tsx) - Reusable follow button
- [`src/components/social/CommunityDirectory.tsx`](../src/components/social/CommunityDirectory.tsx) - User search UI
- [`src/components/social/PublicProfileHeader.tsx`](../src/components/social/PublicProfileHeader.tsx) - Profile header with stats
- [`src/components/social/FollowListsPanel.tsx`](../src/components/social/FollowListsPanel.tsx) - Tabbed followers/following lists
- [`src/components/social/UserCard.tsx`](../src/components/social/UserCard.tsx) - Reusable user display card
- [`src/components/social/BlockUserButton.tsx`](../src/components/social/BlockUserButton.tsx) - Block action button
- [`src/components/social/PublicProfileTelemetry.tsx`](../src/components/social/PublicProfileTelemetry.tsx) - Profile view tracking

**Event Components:**
- [`src/components/events/WhosGoingSection.tsx`](../src/components/events/WhosGoingSection.tsx) - Attendee list with network context
- [`src/components/social/NetworkAttendingBadge.tsx`](../src/components/social/NetworkAttendingBadge.tsx) - Network badge for event cards
- [`src/components/events/AttendanceEventButton.tsx`](../src/components/events/AttendanceEventButton.tsx) - RSVP button

**Settings:**
- [`src/app/dashboard/settings/SocialSettingsPanel.tsx`](../src/app/dashboard/settings/SocialSettingsPanel.tsx) - Complete social config UI

---

### Client-Side Infrastructure

- [`src/components/social/followEvents.ts`](../src/components/social/followEvents.ts)
  - Global event system for follow status changes
  - `dispatchFollowStatusChanged()` - Emit event
  - `applyFollowDelta()` - Update counts based on event

---

### Hooks

- [`src/hooks/useNetworkEventCounts.ts`](../src/hooks/useNetworkEventCounts.ts) - Fetch network attending counts for multiple events
- [`src/hooks/useRecommendationTracking.ts`](../src/hooks/useRecommendationTracking.ts) - Track recommendation interactions

---

### Utilities

- [`src/utils/rateLimit.ts`](../src/utils/rateLimit.ts) - Rate limiting for social actions
- [`src/utils/databaseQueryPatterns.ts`](../src/utils/databaseQueryPatterns.ts) - Common query patterns

---

### Analytics

- [`src/services/telemetryAnalyticsService.ts`](../src/services/telemetryAnalyticsService.ts) - Comprehensive telemetry tracking
- [`src/services/behavioralAnalyticsService.ts`](../src/services/behavioralAnalyticsService.ts) - Behavioral event tracking

---

### Type Definitions

- [`src/types/supabase.ts`](../src/types/supabase.ts) - Auto-generated database types
- [`src/types/events.ts`](../src/types/events.ts) - Event and attendance types

---

## Summary

This README provides:
- **Quick onboarding** for new developers
- **Architecture patterns** (dual clients, event sync, block filtering, pagination)
- **Complete API reference** with examples
- **Component documentation** with usage patterns
- **Testing guidance** with manual checklist
- **Troubleshooting** for common issues
- **Extension points** for future features
- **File reference** for navigation

For questions or issues, refer to the troubleshooting section or check the critical files for implementation details.
