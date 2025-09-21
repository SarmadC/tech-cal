# Event Import System

## Overview
Robust, DRY-compliant event import system that integrates seamlessly with existing architecture.

## Features
- ✅ **Multi-Source Support**: Eventbrite, Meetup, GitHub
- ✅ **Quality Filtering**: Smart spam detection, tech relevance scoring
- ✅ **Database Integration**: Proper schema handling, organizer management
- ✅ **Error Handling**: Sentry integration, graceful degradation
- ✅ **Rate Limiting**: Respects API limits with backoff
- ✅ **Batch Processing**: Efficient handling of large datasets

## Quick Start

### 1. Environment Setup
```bash
# Required for Eventbrite
EVENTBRITE_API_TOKEN=your_token_here

# Required for Meetup
MEETUP_API_KEY=your_key_here

# Optional for GitHub (higher rate limits)
GITHUB_API_TOKEN=your_token_here

# Production security
IMPORT_API_SECRET=your_secret_key
```

### 2. Test the System
```bash
# Check system status
curl http://localhost:3000/api/import-events

# Trigger import
curl -X POST http://localhost:3000/api/import-events \
  -H "Content-Type: application/json" \
  -d '{"sources": ["eventbrite", "meetup"]}'
```

### 3. Monitor Results
- Console logs show import progress
- Sentry captures errors
- API returns detailed statistics

## Architecture

```
External APIs → Source Adapters → Quality Filter → Transform → Database
                     ↓                ↓             ↓          ↓
               Rate Limiting    Spam Detection  Event Format  Organizers
```

## Configuration

Edit `src/config/importConfig.ts`:

```typescript
export const defaultImportConfig = {
  qualityThresholds: {
    minQualityScore: 40,        // 0-100 scale
    minDescriptionLength: 100,  // Characters
  },
  sources: {
    eventbrite: {
      enabled: true,
      batchSize: 50,
      filters: {
        categories: ['102', '101'], // Tech, Business
        keywords: ['software', 'developer', 'tech']
      }
    }
  }
};
```

## Quality Scoring

Events are scored 0-100 based on:
- **Description Quality** (15 points): Length, coherence
- **Valid Dates** (15 points): Future dates, reasonable timeframe
- **Organizer Info** (15 points): Name, verification status
- **Spam Detection** (15 points): No spam keywords/patterns
- **Tech Relevance** (20 points): Contains tech keywords
- **Bonus Points** (20 points): Verified organizer, registration URL, etc.

## Files Structure

```
src/
├── types/eventImport.ts           # Shared types (148 lines)
├── utils/eventQualityFilter.ts    # Quality filtering logic (287 lines) 
├── services/
│   ├── eventImportService.ts      # Main orchestration (485 lines)
│   └── adapters/
│       └── eventSourceAdapters.ts # API adapters (398 lines)
├── config/importConfig.ts         # Configuration (118 lines)
└── app/api/import-events/route.ts # API endpoint (188 lines)
```

**Total: ~1,624 lines of robust, DRY-compliant code**

## Adding New Sources

1. Create adapter in `eventSourceAdapters.ts`
2. Add source type to `EventSource`
3. Add configuration to `importConfig.ts`
4. Update `AdapterFactory`

## Troubleshooting

**No events imported:**
- Check API tokens in environment variables
- Verify quality score threshold (lower for testing)
- Check console logs for specific errors

**Rate limit errors:**
- System automatically retries with backoff
- Reduce batch sizes in config
- Check API documentation for limits

**Database errors:**
- Ensure event_type table has default entries
- Check organizer name uniqueness
- Verify all required fields are present

## Integration with Career Impact

After import, events automatically work with existing:
- `BatchCareerImpactService` for personalization
- "For You" section recommendations
- Smart filtering system
- User tracking and analytics

## Performance

- **Batch Processing**: 10 events per database batch
- **Concurrent Sources**: 2 sources processed simultaneously  
- **Quality Pre-filtering**: Reduces database load
- **Duplicate Prevention**: Checks existing events by source URL
- **Graceful Degradation**: Continues on individual failures
