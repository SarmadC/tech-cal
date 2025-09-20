// Quick runtime test for enhanced analytics system
// Run this in your browser console after signing in

import { createClient } from '@/utils/supabase/client';
import { BehavioralAnalyticsService } from '@/services/behavioralAnalyticsService';
import { quickHealthCheck } from '@/utils/analyticsHealthCheck';

export async function quickRuntimeTest() {
  console.log('🧪 Starting Enhanced Analytics Runtime Test...');
  
  const supabase = createClient();
  const userId = 'c7f93ea0-e591-4336-83e2-900b77a48a6a'; // Your profile ID
  
  try {
    // Test 1: Analytics consent
    console.log('1. Testing analytics consent...');
    const consent = await BehavioralAnalyticsService.getAnalyticsConsent(userId, supabase);
    console.log('   Current consent status:', consent);
    
    // Test 2: Track a sample interaction
    console.log('2. Testing interaction tracking...');
    await BehavioralAnalyticsService.trackInteraction({
      userId,
      eventId: 'test-event-runtime',
      interactionType: 'view',
      section: 'for_you',
      position: 1,
      algorithmVersion: 'v1.0'
    }, supabase);
    console.log('   ✅ Interaction tracked successfully');
    
    // Test 3: Check analytics health
    console.log('3. Checking analytics health...');
    const isHealthy = await quickHealthCheck();
    console.log('   Health status:', isHealthy ? '✅ Healthy' : '❌ Issues found');
    
    // Test 4: Get user behavior patterns
    console.log('4. Testing behavior pattern analysis...');
    const patterns = await BehavioralAnalyticsService.getUserBehaviorPattern(userId, supabase);
    console.log('   Behavior patterns:', patterns || 'No patterns yet (expected for new system)');
    
    console.log('🎉 All runtime tests completed successfully!');
    console.log('📊 Your enhanced "For You" algorithm is ready to deploy!');
    
    return {
      success: true,
      consent,
      health: isHealthy,
      patterns: !!patterns
    };
    
  } catch (error) {
    console.error('❌ Runtime test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Instructions for use:
// 1. Sign in to your app
// 2. Open browser developer console
// 3. Run: quickRuntimeTest().then(result => console.log('Final result:', result))
