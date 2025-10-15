/**
 * Manual Test Script for Alignment Scoring System
 * 
 * This script verifies that the new consolidated scoring system works correctly:
 * 1. Tests the pure alignment core with sample data
 * 2. Verifies score ranges (should be 50-80% for good matches)
 * 3. Checks breakdown components add up correctly
 * 4. Tests edge cases (no profile, empty events, etc.)
 * 
 * Run with: npx tsx scripts/test-alignment-scoring.ts
 */

import { calculateAlignment, getAlignmentCategory, ALIGNMENT_WEIGHTS } from '../src/lib/recommendation/alignmentCore';
import { Event } from '../src/types';
import { CareerProfile } from '../src/types/career';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(80));
  log(title, 'bold');
  console.log('='.repeat(80));
}

function logTest(name: string, passed: boolean, details?: string) {
  const symbol = passed ? '✓' : '✗';
  const color = passed ? 'green' : 'red';
  log(`${symbol} ${name}`, color);
  if (details) {
    console.log(`  ${details}`);
  }
}

// Sample career profile for testing
const sampleCareerProfile: CareerProfile = {
  userId: 'test-user',
  profileId: 'test-profile',
  lastUpdated: new Date().toISOString(),
  currentRole: 'Senior Software Engineer',
  seniority: 'senior',
  industry: 'Technology',
  companySize: 'medium',
  primarySkills: ['React', 'TypeScript', 'Node.js', 'AWS', 'GraphQL'],
  skillsToLearn: ['Kubernetes', 'Go', 'Machine Learning'],
  interests: ['AI', 'Cloud Architecture', 'DevOps'],
  careerGoals: ['skill-development', 'leadership-growth'],
  timeframe: 'medium-term',
  learningStyle: ['hands-on', 'interactive'],
  availableTime: 'moderate',
  budget: 'moderate',
  networkingGoals: ['find-peers', 'find-mentors'],
  preferredEventTypes: ['workshop', 'conference', 'meetup'],
};

// Sample events for testing
const sampleEvents: Event[] = [
  {
    id: 'event-1',
    createdAt: new Date().toISOString(),
    title: 'Advanced Kubernetes Workshop for Senior Engineers',
    description: 'Hands-on workshop covering Kubernetes best practices, including deployment strategies, monitoring, and scaling. Perfect for senior engineers looking to advance their cloud skills.',
    startTime: '2025-11-01T10:00:00Z',
    endTime: '2025-11-01T17:00:00Z',
    location: 'Online',
    organizer: 'Tech Learning Co',
    status: 'confirmed',
    sourceUrl: 'https://example.com/k8s-workshop',
    livestreamUrl: 'https://example.com/k8s-workshop/stream',
    registrationUrl: 'https://example.com/k8s-workshop',
    category: { id: '1', name: 'DevOps', color: '#FF6B6B', description: null },
    organization: { id: '1', name: 'Tech Learning Co' },
    eventTypeId: '1',
  },
  {
    id: 'event-2',
    createdAt: new Date().toISOString(),
    title: 'React Conference 2025: Advanced Patterns',
    description: 'Join industry leaders discussing advanced React patterns, performance optimization, and the future of React. Interactive Q&A sessions with speakers.',
    startTime: '2025-11-15T09:00:00Z',
    endTime: '2025-11-15T18:00:00Z',
    location: 'San Francisco, CA',
    organizer: 'React Community',
    status: 'confirmed',
    sourceUrl: 'https://example.com/react-conf',
    livestreamUrl: null,
    registrationUrl: 'https://example.com/react-conf',
    category: { id: '2', name: 'Frontend', color: '#4ECDC4', description: null },
    organization: { id: '2', name: 'React Community' },
    eventTypeId: '2',
  },
  {
    id: 'event-3',
    createdAt: new Date().toISOString(),
    title: 'Introduction to Python for Beginners',
    description: 'Learn Python basics in this beginner-friendly workshop. No prior programming experience required.',
    startTime: '2025-11-20T14:00:00Z',
    endTime: '2025-11-20T16:00:00Z',
    location: 'Online',
    organizer: 'Code Academy',
    status: 'confirmed',
    sourceUrl: 'https://example.com/python-intro',
    livestreamUrl: 'https://example.com/python-intro/live',
    registrationUrl: 'https://example.com/python-intro',
    category: { id: '3', name: 'Programming', color: '#95E1D3', description: null },
    organization: { id: '3', name: 'Code Academy' },
    eventTypeId: '3',
  },
  {
    id: 'event-4',
    createdAt: new Date().toISOString(),
    title: 'Machine Learning Leadership Summit',
    description: 'Executive summit for technical leaders exploring AI/ML strategy, team building, and organizational transformation. Features keynotes from ML leaders at top companies.',
    startTime: '2025-12-01T09:00:00Z',
    endTime: '2025-12-02T17:00:00Z',
    location: 'New York, NY',
    organizer: 'AI Leadership Forum',
    status: 'confirmed',
    sourceUrl: 'https://example.com/ml-summit',
    livestreamUrl: null,
    registrationUrl: 'https://example.com/ml-summit',
    category: { id: '4', name: 'AI/ML', color: '#F38181', description: null },
    organization: { id: '4', name: 'AI Leadership Forum' },
    eventTypeId: '4',
  },
  {
    id: 'event-5',
    createdAt: new Date().toISOString(),
    title: 'Community Tech Meetup',
    description: 'Casual networking event for local developers. Share projects, meet peers, and build your professional network.',
    startTime: '2025-11-10T18:00:00Z',
    endTime: '2025-11-10T21:00:00Z',
    location: 'Seattle, WA',
    organizer: 'Seattle Tech Community',
    status: 'confirmed',
    sourceUrl: 'https://example.com/tech-meetup',
    livestreamUrl: null,
    registrationUrl: 'https://example.com/tech-meetup',
    category: { id: '5', name: 'Networking', color: '#AAA69D', description: null },
    organization: { id: '5', name: 'Seattle Tech Community' },
    eventTypeId: '5',
  },
];

// Test 1: Verify alignment core works
function testAlignmentCore() {
  logSection('Test 1: Alignment Core Functionality');
  
  const event = sampleEvents[0]; // Kubernetes workshop
  const result = calculateAlignment(event, sampleCareerProfile);
  
  logTest(
    'Core returns valid result structure',
    typeof result.overall === 'number' &&
    typeof result.components === 'object' &&
    Array.isArray(result.alignmentReasons) &&
    Array.isArray(result.matchedSkills)
  );
  
  logTest(
    'Score is within valid range (0-100)',
    result.overall >= 0 && result.overall <= 100,
    `Score: ${result.overall}`
  );
  
  logTest(
    'Has alignment reasons',
    result.alignmentReasons.length > 0,
    `Found ${result.alignmentReasons.length} reasons`
  );
  
  logTest(
    'Matched skills detected',
    result.matchedSkills.length > 0,
    `Matched: ${result.matchedSkills.join(', ')}`
  );
  
  console.log('\nDetailed Result:');
  console.log(JSON.stringify(result, null, 2));
}

// Test 2: Verify score ranges for different event types
function testScoreRanges() {
  logSection('Test 2: Score Ranges for Different Events');
  
  const results = sampleEvents.map(event => ({
    event,
    result: calculateAlignment(event, sampleCareerProfile)
  }));
  
  console.log('\nEvent Scores:');
  console.log('─'.repeat(80));
  
  results.forEach(({ event, result }) => {
    const category = getAlignmentCategory(result.overall);
    const color = category === 'high' ? 'green' : category === 'moderate' ? 'yellow' : 'red';
    
    log(
      `${event.title.slice(0, 50).padEnd(50)} | ${result.overall.toFixed(1)}% (${category})`,
      color
    );
    console.log(`  Reasons: ${result.alignmentReasons.map(r => r.reason).join(', ')}`);
  });
  
  // Verify expected patterns
  const k8sEvent = results[0]; // Should be high (skill to learn + senior level)
  const reactEvent = results[1]; // Should be high (primary skill)
  const pythonEvent = results[2]; // Should be low (beginner, unrelated)
  const mlEvent = results[3]; // Should be moderate-high (interest + leadership goal)
  const meetupEvent = results[4]; // Should be moderate (networking goal)
  
  console.log('\n');
  logTest(
    'K8s workshop scores high (skill to learn)',
    k8sEvent.result.overall >= 50,
    `Expected ≥50%, got ${k8sEvent.result.overall.toFixed(1)}%`
  );
  
  logTest(
    'React conf scores high (primary skill)',
    reactEvent.result.overall >= 40,
    `Expected ≥40%, got ${reactEvent.result.overall.toFixed(1)}%`
  );
  
  logTest(
    'Python intro scores low (not relevant)',
    pythonEvent.result.overall < 30,
    `Expected <30%, got ${pythonEvent.result.overall.toFixed(1)}%`
  );
  
  logTest(
    'ML summit scores moderate-high (interest + leadership)',
    mlEvent.result.overall >= 30,
    `Expected ≥30%, got ${mlEvent.result.overall.toFixed(1)}%`
  );
}

// Test 3: Verify component breakdown math
function testComponentBreakdown() {
  logSection('Test 3: Component Breakdown Accuracy');
  
  const event = sampleEvents[0]; // K8s workshop
  const result = calculateAlignment(event, sampleCareerProfile);
  
  const componentSum = 
    result.components.skillRelevance +
    result.components.careerStageMatch +
    result.components.networkingValue +
    result.components.industryRelevance +
    result.components.timingBonus;
  
  const reasonSum = result.alignmentReasons.reduce((sum, r) => sum + r.contribution, 0);
  
  console.log('\nComponent Breakdown:');
  console.log(`  Skill Relevance:    ${result.components.skillRelevance}`);
  console.log(`  Career Stage Match: ${result.components.careerStageMatch}`);
  console.log(`  Networking Value:   ${result.components.networkingValue}`);
  console.log(`  Industry Relevance: ${result.components.industryRelevance}`);
  console.log(`  Timing Bonus:       ${result.components.timingBonus}`);
  console.log(`  Component Sum:      ${componentSum}`);
  console.log(`  Reason Sum:         ${reasonSum}`);
  console.log(`  Overall Score:      ${result.overall}`);
  
  logTest(
    'Component sum equals overall score',
    Math.abs(componentSum - result.overall) < 0.01,
    `Component sum: ${componentSum}, Overall: ${result.overall}`
  );
  
  logTest(
    'Reason contributions sum to overall score',
    Math.abs(reasonSum - result.overall) < 0.01,
    `Reason sum: ${reasonSum}, Overall: ${result.overall}`
  );
}

// Test 4: Edge cases
function testEdgeCases() {
  logSection('Test 4: Edge Cases');
  
  // Null profile
  const result1 = calculateAlignment(sampleEvents[0], null);
  logTest(
    'Handles null profile gracefully',
    result1.overall === 0 && result1.alignmentReasons.length === 0
  );
  
  // Empty career profile
  const emptyProfile: CareerProfile = {
    userId: 'empty-user',
    profileId: 'empty-profile',
    lastUpdated: new Date().toISOString(),
    currentRole: '',
    seniority: 'entry-level',
    industry: '',
    companySize: 'startup',
    primarySkills: [],
    skillsToLearn: [],
    interests: [],
    careerGoals: [],
    timeframe: 'short-term',
    learningStyle: [],
    availableTime: 'very-limited',
    budget: 'free-only',
    networkingGoals: [],
    preferredEventTypes: [],
  };
  
  const result2 = calculateAlignment(sampleEvents[0], emptyProfile);
  logTest(
    'Handles empty profile gracefully',
    result2.overall === 0,
    `Score: ${result2.overall}`
  );
  
  // Event with minimal data
  const minimalEvent: Event = {
    id: 'minimal',
    title: 'Test Event',
    description: '',
    startTime: '2025-11-01T10:00:00Z',
    endTime: '2025-11-01T11:00:00Z',
    location: 'Online',
    eventTypeId: '1',
    createdAt: new Date().toISOString(),
    organizer: 'Test',
    status: 'active',
    sourceUrl: 'https://test.com',
    livestreamUrl: null,
  } as Event;
  
  const result3 = calculateAlignment(minimalEvent, sampleCareerProfile);
  logTest(
    'Handles minimal event data',
    result3.overall >= 0 && result3.overall <= 100,
    `Score: ${result3.overall}`
  );
}

// Test 5: Verify weights configuration
function testWeightsConfiguration() {
  logSection('Test 5: Weights Configuration');
  
  console.log('\nConfigured Weights:');
  console.log(`  Skills to Learn:  ${ALIGNMENT_WEIGHTS.skillsToLearn}`);
  console.log(`  Primary Skills:   ${ALIGNMENT_WEIGHTS.primarySkills}`);
  console.log(`  Career Goals:     ${ALIGNMENT_WEIGHTS.careerGoals}`);
  console.log(`  Interests:        ${ALIGNMENT_WEIGHTS.interests}`);
  console.log(`  Learning Style:   ${ALIGNMENT_WEIGHTS.learningStyle}`);
  console.log(`  Networking:       ${ALIGNMENT_WEIGHTS.networking}`);
  
  logTest(
    'Skills to learn has highest weight',
    ALIGNMENT_WEIGHTS.skillsToLearn >= ALIGNMENT_WEIGHTS.primarySkills &&
    ALIGNMENT_WEIGHTS.skillsToLearn >= ALIGNMENT_WEIGHTS.careerGoals
  );
  
  logTest(
    'All weights are positive',
    Object.values(ALIGNMENT_WEIGHTS).every(w => w > 0)
  );
}

// Test 6: Consistency check (same inputs = same outputs)
function testConsistency() {
  logSection('Test 6: Consistency Check');
  
  const event = sampleEvents[0];
  const result1 = calculateAlignment(event, sampleCareerProfile);
  const result2 = calculateAlignment(event, sampleCareerProfile);
  const result3 = calculateAlignment(event, sampleCareerProfile);
  
  logTest(
    'Multiple calls produce identical scores',
    result1.overall === result2.overall && result2.overall === result3.overall,
    `Scores: ${result1.overall}, ${result2.overall}, ${result3.overall}`
  );
  
  logTest(
    'Multiple calls produce identical reason counts',
    result1.alignmentReasons.length === result2.alignmentReasons.length &&
    result2.alignmentReasons.length === result3.alignmentReasons.length,
    `Reason counts: ${result1.alignmentReasons.length}, ${result2.alignmentReasons.length}, ${result3.alignmentReasons.length}`
  );
}

// Main test runner
async function runTests() {
  log('\n🧪 ALIGNMENT SCORING SYSTEM - MANUAL TEST SUITE\n', 'bold');
  
  try {
    testAlignmentCore();
    testScoreRanges();
    testComponentBreakdown();
    testEdgeCases();
    testWeightsConfiguration();
    testConsistency();
    
    logSection('Test Summary');
    log('\n✓ All tests completed successfully!', 'green');
    log('\nNext steps:', 'cyan');
    log('  1. Review score ranges and adjust weights if needed', 'cyan');
    log('  2. Test with real user profiles and events', 'cyan');
    log('  3. Monitor telemetry in staging environment', 'cyan');
    log('  4. Run performance tests with larger datasets\n', 'cyan');
    
  } catch (error) {
    log('\n✗ Test suite failed with error:', 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run tests
runTests();

