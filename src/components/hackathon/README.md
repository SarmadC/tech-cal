# Enhanced Team Cards with Team Matching

This directory contains enhanced team card components that integrate with the team matching system to provide compatibility scores, suggested roles, and skill gap analysis.

## Components

### EnhancedTeamCard

The main enhanced team card component that displays team information with optional compatibility indicators.

**Props:**
- `team`: HackathonTeam - The team data
- `maxTeamSize`: number - Maximum team size for the hackathon
- `onJoin`: (teamId: string) => void - Callback when user joins a team
- `isJoining?`: boolean - Whether the user is currently joining this team
- `canJoin?`: boolean - Whether the user can join this team
- `userId`: string - Current user's ID
- `userProfile?`: AppProfile - User's profile data
- `compatibilityScore?`: number - Compatibility score (0-100)
- `suggestedRole?`: string - Suggested role for the user
- `missingSkills?`: string[] - Skills the team needs that user lacks
- `complementarySkills?`: string[] - Skills the user has that complement the team
- `teamMatch?`: TeamMatch - Complete team match data

**Features:**
- Visual compatibility score with color-coded progress bar
- Suggested role display with role-specific styling
- Missing skills indicator with warning styling
- Complementary skills display with success styling
- Responsive design with dark mode support
- Accessibility features (ARIA labels, keyboard navigation)

### TeamCardWithMatching

A wrapper component that integrates with the team matching service to automatically provide compatibility data.

**Props:**
- All props from `EnhancedTeamCard`
- `userSkills?`: SkillTag[] - User's skills for matching
- `userPreferences?`: TeamPreferences - User's team preferences
- `hackathonId?`: string - Hackathon ID for matching
- `enableMatching?`: boolean - Whether to enable team matching

**Usage:**
```tsx
<TeamCardWithMatching
  team={team}
  maxTeamSize={4}
  onJoin={handleJoin}
  userId={userId}
  userSkills={userSkills}
  userPreferences={userPreferences}
  hackathonId={hackathonId}
  enableMatching={true}
/>
```

### TeamMatchingDemo

A demo component showing how to integrate team matching with enhanced team cards.

**Usage:**
```tsx
<TeamMatchingDemo
  hackathonId={hackathonId}
  userId={userId}
  userProfile={userProfile}
  userSkills={userSkills}
  userPreferences={userPreferences}
/>
```

## Utilities

### teamMatchingUI.ts

Shared utility functions for consistent styling across team matching components:

- `getCompatibilityColor(score)`: Get text color for compatibility score
- `getCompatibilityBgColor(score)`: Get background color for compatibility score
- `getCompatibilityLevel(score)`: Get human-readable compatibility level
- `formatRoleName(role)`: Format role name for display
- `getSkillBadgeColor(type)`: Get badge color for skill type
- `truncateSkills(skills, maxCount)`: Truncate skills list for display
- `getTeamMatchQuality(score)`: Get comprehensive match quality info

## Integration Examples

### Basic Usage (No Matching)
```tsx
<EnhancedTeamCard
  team={team}
  maxTeamSize={4}
  onJoin={handleJoin}
  userId={userId}
/>
```

### With Manual Compatibility Data
```tsx
<EnhancedTeamCard
  team={team}
  maxTeamSize={4}
  onJoin={handleJoin}
  userId={userId}
  compatibilityScore={85}
  suggestedRole="frontend-developer"
  missingSkills={["React", "TypeScript"]}
  complementarySkills={["JavaScript", "CSS"]}
/>
```

### With Team Matching Service
```tsx
<TeamCardWithMatching
  team={team}
  maxTeamSize={4}
  onJoin={handleJoin}
  userId={userId}
  userSkills={userSkills}
  userPreferences={userPreferences}
  hackathonId={hackathonId}
  enableMatching={true}
/>
```

## Styling

The components use Tailwind CSS classes and support both light and dark modes. Key styling features:

- **Compatibility Score**: Color-coded progress bar (green: 80+, yellow: 60-79, orange: 40-59, red: <40)
- **Role Badges**: Role-specific colors using the existing role color system
- **Skill Badges**: Different colors for missing (orange), complementary (green), required (red), optional (blue)
- **Responsive Design**: Adapts to different screen sizes
- **Accessibility**: Proper ARIA labels and keyboard navigation support

## Dependencies

- `@/types/career` - Team matching types
- `@/types/hackathon` - Hackathon types
- `@/hooks/useTeamMatching` - Team matching hook
- `@/utils/teamMatchingUI` - UI utilities
- `@/components/onboarding/shared/OnboardingUI` - Shared UI components
