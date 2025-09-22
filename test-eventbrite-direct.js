// Direct Eventbrite API test to see what events are available
const EVENTBRITE_TOKEN = process.env.EVENTBRITE_API_TOKEN;

async function testEventbriteAPI() {
  if (!EVENTBRITE_TOKEN) {
    console.error('❌ EVENTBRITE_API_TOKEN not found');
    console.log('Set it with: export EVENTBRITE_API_TOKEN=your_token');
    return;
  }

  try {
    console.log('🔍 Testing Eventbrite API access...');
    
    // Step 1: Get user info
    const userResponse = await fetch('https://www.eventbriteapi.com/v3/users/me/', {
      headers: {
        'Authorization': `Bearer ${EVENTBRITE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!userResponse.ok) {
      console.error('❌ User API failed:', userResponse.status);
      const error = await userResponse.text();
      console.error('Error:', error);
      return;
    }

    const userData = await userResponse.json();
    console.log('✅ Authenticated as:', userData.email);

    // Step 2: Get organizations
    console.log('\n🏢 Fetching organizations...');
    const orgsResponse = await fetch('https://www.eventbriteapi.com/v3/users/me/organizations/', {
      headers: {
        'Authorization': `Bearer ${EVENTBRITE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!orgsResponse.ok) {
      console.error('❌ Organizations API failed:', orgsResponse.status);
      return;
    }

    const orgsData = await orgsResponse.json();
    console.log(`✅ Found ${orgsData.organizations?.length || 0} organizations:`);
    
    orgsData.organizations?.forEach((org, i) => {
      console.log(`  ${i + 1}. ${org.name} (ID: ${org.id})`);
    });

    if (!orgsData.organizations?.length) {
      console.log('\n⚠️  No organizations found. This is why import returned 0 events.');
      console.log('💡 Solution: Create an organization in your Eventbrite account first.');
      return;
    }

    // Step 3: Get events from first organization
    const org = orgsData.organizations[0];
    console.log(`\n📅 Fetching events from "${org.name}"...`);
    
    const eventsUrl = `https://www.eventbriteapi.com/v3/organizations/${org.id}/events/?` +
      `status=live&expand=organizer,venue&order_by=start_asc&page_size=20`;

    console.log('🔗 Events URL:', eventsUrl);

    const eventsResponse = await fetch(eventsUrl, {
      headers: {
        'Authorization': `Bearer ${EVENTBRITE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!eventsResponse.ok) {
      console.error('❌ Events API failed:', eventsResponse.status);
      const error = await eventsResponse.text();
      console.error('Error:', error);
      return;
    }

    const eventsData = await eventsResponse.json();
    const events = eventsData.events || [];
    
    console.log(`✅ Found ${events.length} events in organization`);

    if (events.length === 0) {
      console.log('\n⚠️  No events found in your organization.');
      console.log('💡 Solutions:');
      console.log('   1. Create some events in your Eventbrite organization');
      console.log('   2. Try different event status (draft, live, ended)');
      console.log('   3. Check if events are in other organizations');
      return;
    }

    // Step 4: Test tech filtering
    console.log('\n🔍 Testing tech filtering on found events...');
    
    const techKeywords = [
      'javascript', 'python', 'react', 'vue', 'angular', 'node.js', 'typescript',
      'software', 'developer', 'programming', 'coding', 'tech', 'ai', 'ml',
      'devops', 'cloud', 'aws', 'docker', 'kubernetes', 'conference', 'meetup'
    ];

    events.forEach((event, i) => {
      const content = `${event.name?.text || ''} ${event.description?.text || ''}`.toLowerCase();
      const hasTechKeywords = techKeywords.some(keyword => content.includes(keyword));
      const hasGoodDescription = content.length > 100;
      const passesTechFilter = hasTechKeywords && hasGoodDescription;
      
      console.log(`\n📋 Event ${i + 1}: ${event.name?.text || 'Untitled'}`);
      console.log(`   📝 Description length: ${content.length} chars`);
      console.log(`   🔧 Has tech keywords: ${hasTechKeywords}`);
      console.log(`   ✅ Passes filter: ${passesTechFilter}`);
      
      if (hasTechKeywords) {
        const matchedKeywords = techKeywords.filter(keyword => content.includes(keyword));
        console.log(`   🎯 Matched keywords: ${matchedKeywords.join(', ')}`);
      }
    });

    const techEvents = events.filter(event => {
      const content = `${event.name?.text || ''} ${event.description?.text || ''}`.toLowerCase();
      const hasTechKeywords = techKeywords.some(keyword => content.includes(keyword));
      const hasGoodDescription = content.length > 100;
      return hasTechKeywords && hasGoodDescription;
    });

    console.log(`\n📊 Summary:`);
    console.log(`   Total events: ${events.length}`);
    console.log(`   Tech events: ${techEvents.length}`);
    console.log(`   Filter rate: ${((techEvents.length / events.length) * 100).toFixed(1)}%`);

    if (techEvents.length === 0) {
      console.log('\n⚠️  No events passed tech filtering!');
      console.log('💡 Solutions:');
      console.log('   1. Create tech-focused events with keywords like "javascript", "python", "software"');
      console.log('   2. Add longer descriptions (150+ characters)');
      console.log('   3. Lower the filtering criteria temporarily');
    } else {
      console.log('\n🎉 Tech events found! These should import successfully.');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testEventbriteAPI();
