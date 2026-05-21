/**
 * Testing & Examples for Instagram Scraping API
 *
 * Run dengan:
 * npx ts-node scripts/test-instagram-scraping.ts
 *
 * Atau copy-paste ke browser console untuk testing HTTP calls
 */

import { getApifyService } from '@/lib/medsos/apify';
import { extractInstagramUsername } from '@/lib/medsos/instagram-helpers';

/**
 * Test 1: Extract username dari berbagai format
 */
export async function testExtractUsername() {
  console.log('\n=== Test 1: Extract Username ===');

  const testCases = [
    'kompascom',
    'https://instagram.com/kompascom',
    'https://www.instagram.com/kompascom/',
    'https://www.instagram.com/kompascom/posts/',
    'kumparan',
    'detik.com_official',
    'invalid_format',
  ];

  testCases.forEach((testCase) => {
    const result = extractInstagramUsername(testCase);
    console.log(`${testCase} → ${result || '❌ INVALID'}`);
  });
}

/**
 * Test 2: Direct service scraping (local)
 */
export async function testDirectScraping() {
  console.log('\n=== Test 2: Direct Service Scraping ===');

  const service = getApifyService();

  try {
    console.log('Scraping @kompascom...');
    const result = await service.scrapeProfile('kompascom');

    if (result.success) {
      console.log('✅ Success');
      console.log(`Username: ${result.data?.username}`);
      console.log(`Followers: ${result.data?.followerCount}`);
      console.log(`Posts: ${result.data?.posts.length}`);
      console.log(`First post: ${result.data?.posts[0]?.caption?.substring(0, 50)}`);
    } else {
      console.log(`❌ Error: ${result.error} (${result.errorCode})`);
    }
  } catch (error) {
    console.error('Test error:', error);
  }
}

/**
 * Test 3: Cache functionality
 */
export async function testCache() {
  console.log('\n=== Test 3: Cache Functionality ===');

  const service = getApifyService();

  // First call (should hit Apify)
  console.log('First call - kompascom (hits Apify)...');
  const start1 = Date.now();
  const result1 = await service.scrapeProfile('kompascom');
  const time1 = Date.now() - start1;
  console.log(`Time: ${time1}ms, Success: ${result1.success}`);

  // Second call (should be cached)
  console.log('Second call - kompascom (should be cached)...');
  const start2 = Date.now();
  const result2 = await service.scrapeProfile('kompascom');
  const time2 = Date.now() - start2;
  console.log(`Time: ${time2}ms, Success: ${result2.success}`);

  console.log(`Cache speed improvement: ${Math.round((time1 / time2 - 1) * 100)}% faster`);

  // Check cache stats
  const stats = service.getCacheStats();
  console.log(`Cache entries: ${stats.entries}, TTL: ${stats.ttl}s`);
}

/**
 * Test 4: Error handling
 */
export async function testErrorHandling() {
  console.log('\n=== Test 4: Error Handling ===');

  const service = getApifyService();

  const testCases = [
    { username: 'invalid_@_username', name: 'Invalid format' },
    { username: 'nonexistentprofile123456789', name: 'Non-existent profile' },
    { username: '', name: 'Empty username' },
  ];

  for (const testCase of testCases) {
    console.log(`\nTest: ${testCase.name} ("${testCase.username}")`);
    const result = await service.scrapeProfile(testCase.username);
    console.log(`Result: ${result.success ? '✅ Success' : `❌ ${result.errorCode}`}`);
    if (!result.success) {
      console.log(`Error: ${result.error}`);
    }
  }
}

/**
 * Test 5: API endpoint via HTTP (for browser/curl)
 */
export const apiTestExamples = {
  sync_call: {
    description: 'Synchronous call - wait for result',
    curl: `curl -X POST http://localhost:3000/api/medsos/scrape-instagram \\
  -H "Content-Type: application/json" \\
  -d '{
    "username": "kompascom",
    "request_id": "test_123"
  }'`,
    
    javascript: `fetch('/api/medsos/scrape-instagram', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'kompascom',
    request_id: 'test_123'
  })
}).then(r => r.json()).then(data => console.log(data));`,
  },

  async_call: {
    description: 'Asynchronous call - use callback',
    curl: `curl -X POST http://localhost:3000/api/medsos/scrape-instagram \\
  -H "Content-Type: application/json" \\
  -d '{
    "username": "kompascom",
    "request_id": "test_123",
    "callback_url": "https://your-domain.com/api/callback/result"
  }'`,
    
    javascript: `fetch('/api/medsos/scrape-instagram', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'kompascom',
    request_id: 'test_123',
    callback_url: 'https://your-domain.com/api/callback/result'
  })
}).then(r => r.json()).then(data => console.log(data));`,
  },

  get_status: {
    description: 'Get service status',
    curl: 'curl http://localhost:3000/api/medsos/scrape-instagram',
    
    javascript: `fetch('/api/medsos/scrape-instagram')
  .then(r => r.json())
  .then(data => console.log(data));`,
  },
};

/**
 * Test 6: Batch scraping
 */
export async function testBatchScraping() {
  console.log('\n=== Test 6: Batch Scraping ===');

  const service = getApifyService();

  const usernames = ['kompascom', 'detikcom', 'kumparan'];

  console.log(`Scraping ${usernames.length} profiles...`);
  const start = Date.now();

  const results = await service.scrapeMultiple(usernames);

  const time = Date.now() - start;
  const successCount = Object.values(results).filter((r) => r.success).length;

  console.log(`\nResults:`);
  Object.entries(results).forEach(([username, result]) => {
    if (result.success) {
      console.log(
        `✅ ${username}: ${result.data?.followerCount} followers, ${result.data?.posts.length} posts`
      );
    } else {
      console.log(`❌ ${username}: ${result.errorCode} - ${result.error}`);
    }
  });

  console.log(`\nSummary: ${successCount}/${usernames.length} success, ${time}ms total`);
}

/**
 * Main test runner
 */
export async function runAllTests() {
  console.log('🧪 Instagram Scraping Test Suite\n');
  console.log('='.repeat(50));

  try {
    await testExtractUsername();
    await testCache();
    await testErrorHandling();
    await testBatchScraping();

    console.log('\n' + '='.repeat(50));
    console.log('✅ All tests completed!\n');

    // Print API examples
    console.log('📡 API Examples:\n');
    Object.entries(apiTestExamples).forEach(([key, example]) => {
      console.log(`\n${example.description}:`);
      console.log('CURL:');
      console.log(example.curl);
      console.log('\nJavaScript:');
      console.log(example.javascript);
    });
  } catch (error) {
    console.error('❌ Test suite error:', error);
  }
}

/**
 * Export untuk browser console testing
 */
if (typeof window !== 'undefined') {
  (window as any).instagramTestApi = {
    sync: () => apiTestExamples.sync_call.javascript,
    async: () => apiTestExamples.async_call.javascript,
    status: () => apiTestExamples.get_status.javascript,
  };
  console.log('Instagram API test functions loaded in window.instagramTestApi');
}

// Run tests jika file dijalankan langsung
if (require.main === module) {
  runAllTests().catch(console.error);
}
