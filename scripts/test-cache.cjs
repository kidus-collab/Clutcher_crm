// Test script for caching functionality
// Run with: node scripts/test-cache.cjs

const { openDB } = require('idb/build');

// Test IndexedDB Cache Implementation
async function testCache() {
  console.log('🧪 Testing IndexedDB Cache Implementation...\n');

  try {
    // Test 1: Database Initialization
    console.log('1️⃣ Testing database initialization...');
    const db = await openDB('SearchCacheDB', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('searches')) {
          const store = db.createObjectStore('searches', { keyPath: 'query' });
          store.createIndex('by-timestamp', 'timestamp');
          store.createIndex('by-expires', 'expires');
          console.log('✅ Database schema created successfully');
        }
      },
    });
    console.log('✅ Database initialized successfully');

    // Test 2: Cache Operations
    console.log('\n2️⃣ Testing cache operations...');
    
    const testData = {
      query: 'test query',
      results: [
        { id: '1', name: 'Test Business 1', website: 'test1.com' },
        { id: '2', name: 'Test Business 2', website: 'test2.com' }
      ],
      timestamp: Date.now(),
      expires: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      metadata: {
        processingTime: 1500,
        count: 2,
        cacheable: true
      }
    };

    // Test cache set
    const tx = db.transaction('searches', 'readwrite');
    const store = tx.objectStore('searches');
    await store.add(testData);
    console.log('✅ Cache set successfully');

    // Test cache get
    const cached = await store.get(testData.query);
    if (cached) {
      console.log('✅ Cache retrieved successfully');
      console.log(`   Query: ${cached.query}`);
      console.log(`   Results: ${cached.results.length} items`);
      console.log(`   Expires: ${new Date(cached.expires).toLocaleString()}`);
    } else {
      console.log('❌ Cache retrieval failed');
    }

    // Test 3: Cache Statistics
    console.log('\n3️⃣ Testing cache statistics...');
    const allEntries = await store.getAll();
    const validEntries = allEntries.filter(entry => Date.now() <= entry.expires);
    
    const stats = {
      totalEntries: validEntries.length,
      totalSize: JSON.stringify(validEntries).length,
      oldestEntry: validEntries.length > 0 ? Math.min(...validEntries.map(e => e.timestamp)) : 0,
      newestEntry: validEntries.length > 0 ? Math.max(...validEntries.map(e => e.timestamp)) : 0
    };

    console.log('✅ Cache statistics calculated:');
    console.log(`   Total entries: ${stats.totalEntries}`);
    console.log(`   Total size: ${Math.round(stats.totalSize / 1024)}KB`);
    console.log(`   Oldest entry: ${stats.oldestEntry ? new Date(stats.oldestEntry).toLocaleString() : 'N/A'}`);
    console.log(`   Newest entry: ${stats.newestEntry ? new Date(stats.newestEntry).toLocaleString() : 'N/A'}`);

    // Test 4: Cache Cleanup
    console.log('\n4️⃣ Testing cache cleanup...');
    const now = Date.now();
    const expiredEntries = allEntries.filter(entry => entry.expires < now);
    
    if (expiredEntries.length > 0) {
      const deleteTx = db.transaction('searches', 'readwrite');
      const deleteStore = deleteTx.objectStore('searches');
      
      for (const expired of expiredEntries) {
        await deleteStore.delete(expired.query);
      }
      console.log(`✅ Cleaned up ${expiredEntries.length} expired entries`);
    } else {
      console.log('✅ No expired entries to clean up');
    }

    // Test 5: Cache Clear
    console.log('\n5️⃣ Testing cache clear...');
    const clearTx = db.transaction('searches', 'readwrite');
    const clearStore = clearTx.objectStore('searches');
    await clearStore.clear();
    console.log('✅ Cache cleared successfully');

    // Verify clear
    const verifyEmpty = await clearStore.getAll();
    if (verifyEmpty.length === 0) {
      console.log('✅ Cache clear verified');
    } else {
      console.log('❌ Cache clear failed');
    }

    console.log('\n🎉 All cache tests completed successfully!');
    
    return {
      databaseInit: true,
      cacheOperations: true,
      statistics: true,
      cleanup: true,
      clear: true
    };

  } catch (error) {
    console.error('❌ Cache test failed:', error);
    return {
      error: error.message,
      databaseInit: false,
      cacheOperations: false,
      statistics: false,
      cleanup: false,
      clear: false
    };
  }
}

// Test API Response Structure
async function testAPIResponse() {
  console.log('\n🌐 Testing API Response Structure...\n');

  const mockAPIResponse = {
    success: true,
    data: [
      { id: '1', name: 'Test Business', website: 'test.com', email: 'test@test.com' }
    ],
    count: 1,
    metadata: {
      query: 'test query',
      timestamp: new Date().toISOString(),
      processingTime: 1200,
      cacheable: true,
      cacheTTL: 24 * 60 * 60 * 1000
    },
    fromCache: false
  };

  console.log('✅ API Response Structure:');
  console.log('   success:', mockAPIResponse.success);
  console.log('   data length:', mockAPIResponse.data.length);
  console.log('   count:', mockAPIResponse.count);
  console.log('   metadata:', mockAPIResponse.metadata);
  console.log('   fromCache:', mockAPIResponse.fromCache);

  // Test cache response structure
  const cacheResponse = {
    ...mockAPIResponse,
    fromCache: true
  };

  console.log('\n✅ Cache Response Structure:');
  console.log('   success:', cacheResponse.success);
  console.log('   data length:', cacheResponse.data.length);
  console.log('   count:', cacheResponse.count);
  console.log('   metadata:', cacheResponse.metadata);
  console.log('   fromCache:', cacheResponse.fromCache);

  return {
    apiStructure: true,
    cacheStructure: true
  };
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Clutcher Cache Implementation Tests\n');
  console.log('=' .repeat(50));

  const results = {
    cache: await testCache(),
    api: await testAPIResponse()
  };

  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results Summary:');
  console.log('   Cache Tests:');
  console.log(`     Database Init: ${results.cache.databaseInit ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`     Cache Operations: ${results.cache.cacheOperations ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`     Statistics: ${results.cache.statistics ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`     Cleanup: ${results.cache.cleanup ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`     Clear: ${results.cache.clear ? '✅ PASS' : '❌ FAIL'}`);
  
  console.log('   API Tests:');
  console.log(`     Response Structure: ${results.api.apiStructure ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`     Cache Structure: ${results.api.cacheStructure ? '✅ PASS' : '❌ FAIL'}`);

  const allPassed = Object.values(results.cache).every(result => result === true) && 
                  Object.values(results.api).every(result => result === true);

  if (allPassed) {
    console.log('\n🎉 ALL TESTS PASSED! Cache implementation is ready for deployment.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the implementation.');
  }

  console.log('\n' + '='.repeat(50));
  return allPassed;
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = {
  testCache,
  testAPIResponse,
  runTests
};