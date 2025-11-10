/**
 * Test script to verify if "The AI Summit New York" event is returned by the API
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3000/api/events/filtered';
const EVENT_ID = '87bf871e-b7a2-4e62-8552-9c91d07399c1';

async function testEventInAPI() {
  try {
    console.log('🔍 Testing if "The AI Summit New York" event is returned by API...\n');

    // Make a POST request to the filtered events endpoint
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        searchTerm: '',
        categories: [],
        dateRange: {},
        budget: 'all',
        format: 'all',
        cost: 'all',
        difficulty: 'all',
        availability: 'all',
        popularity: 'all',
        duration: 'all',
        myTracked: false,
        myNetwork: false,
        recommended: false,
        sortBy: 'default',
        page: 1,
        pageSize: 100,
        surface: 'calendar'
      })
    });

    const data = await response.json();

    if (!data.success) {
      console.error('❌ API returned error:', data.error);
      return;
    }

    const { events, pagination, stats } = data.data;

    console.log(`📊 API Response Summary:`);
    console.log(`   Total events in DB: ${stats.totalCount}`);
    console.log(`   Filtered count: ${stats.filteredCount}`);
    console.log(`   Events returned on page 1: ${events.length}`);
    console.log(`   Total pages: ${Math.ceil(stats.totalCount / 100)}\n`);

    // Search for the specific event
    const aiSummitEvent = events.find((event: any) => event.id === EVENT_ID);

    if (aiSummitEvent) {
      console.log('✅ Event FOUND in API response!');
      console.log(`\nEvent details:`);
      console.log(`   Title: ${aiSummitEvent.title}`);
      console.log(`   Start: ${aiSummitEvent.startTime}`);
      console.log(`   End: ${aiSummitEvent.endTime}`);
      console.log(`   Status: ${aiSummitEvent.status}`);
      console.log(`   Is Multi-day: ${aiSummitEvent.is_multi_day}`);
      console.log(`   Enrichment Status: ${aiSummitEvent.firecrawl_enrichment_status}`);
      console.log(`   Quality Score: ${aiSummitEvent.ingestion_quality_score}`);
    } else {
      console.log('❌ Event NOT found in API response!');
      console.log(`\nSearching through all ${events.length} events...\n`);

      // Log all events to help debug
      console.log('Events returned by API:');
      events.forEach((event: any, index: number) => {
        console.log(`  ${index + 1}. ${event.title} (${event.startTime})`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testEventInAPI();
