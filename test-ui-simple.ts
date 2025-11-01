/**
 * RapBots UI & API Test Suite
 * Tests all major pages and API endpoints
 */

const APP_URL = 'http://localhost:5000';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

const results: TestResult[] = [];

async function testEndpoint(name: string, url: string, expectedStatus: number = 200): Promise<void> {
  const start = Date.now();
  try {
    const response = await fetch(url);
    const duration = Date.now() - start;
    
    if (response.status === expectedStatus) {
      results.push({
        name,
        passed: true,
        message: `✅ Status ${response.status} (${duration}ms)`,
        duration
      });
    } else {
      results.push({
        name,
        passed: false,
        message: `❌ Expected ${expectedStatus}, got ${response.status}`,
        duration
      });
    }
  } catch (error: any) {
    results.push({
      name,
      passed: false,
      message: `❌ ${error.message}`,
      duration: Date.now() - start
    });
  }
}

async function testAPIEndpoint(name: string, endpoint: string, expectedStatus: number = 401): Promise<void> {
  // Most API endpoints require auth, so 401 is expected for unauthenticated requests
  await testEndpoint(name, `${APP_URL}${endpoint}`, expectedStatus);
}

async function runTests() {
  console.log('🚀 RapBots UI & API Test Suite\n');
  console.log('=' .repeat(70));
  console.log('Testing Application: ' + APP_URL);
  console.log('=' .repeat(70) + '\n');

  console.log('📄 Testing Frontend Routes...\n');
  
  // Test frontend routes (should all return 200)
  await testEndpoint('Home Page', `${APP_URL}/`);
  await testEndpoint('Character Selection', `${APP_URL}/character-select`);
  await testEndpoint('Settings Page', `${APP_URL}/settings`);
  await testEndpoint('Wallet Page', `${APP_URL}/wallet`);
  await testEndpoint('Profile Page', `${APP_URL}/profile`);
  await testEndpoint('PvP Lobby', `${APP_URL}/pvp`);
  await testEndpoint('Clone Manager', `${APP_URL}/clone-manager`);
  await testEndpoint('Tournaments', `${APP_URL}/tournaments`);
  await testEndpoint('Tournament Brackets', `${APP_URL}/tournament-brackets`);
  await testEndpoint('Tournament History', `${APP_URL}/tournament-history`);
  await testEndpoint('Subscribe Page', `${APP_URL}/subscribe`);
  await testEndpoint('API Settings', `${APP_URL}/api-settings`);
  
  console.log('\n🔌 Testing API Endpoints...\n');
  
  // Test API endpoints (these require auth, so 401 is expected)
  await testAPIEndpoint('User Auth Check', '/api/auth/user', 401);
  await testAPIEndpoint('User Wallet', '/api/wallet', 401);
  await testAPIEndpoint('User Stats', '/api/user/stats', 401);
  await testAPIEndpoint('Battle History', '/api/battles/history', 401);
  await testAPIEndpoint('Profile Pictures', '/api/profile-pictures', 401);
  await testAPIEndpoint('User Clone', '/api/user/clone', 401);
  await testAPIEndpoint('PvP Challenges', '/api/pvp/challenges', 401);
  await testAPIEndpoint('Arc Wallet', '/api/arc/wallet', 401);
  await testAPIEndpoint('Transactions', '/api/transactions', 401);
  
  // Test public endpoints (should return 200)
  await testAPIEndpoint('Health Check', '/api/health', 200);
  
  console.log('\n' + '=' .repeat(70));
  console.log('📊 TEST RESULTS SUMMARY\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const avgDuration = Math.round(results.reduce((acc, r) => acc + r.duration, 0) / results.length);
  
  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.name.padEnd(40)} ${result.message}`);
  });
  
  console.log('\n' + '=' .repeat(70));
  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚡ Avg Response Time: ${avgDuration}ms`);
  console.log(`🎯 Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);
  console.log('=' .repeat(70));
  
  // Group results by category
  const frontendTests = results.slice(0, 12);
  const apiTests = results.slice(12);
  
  const frontendPassed = frontendTests.filter(r => r.passed).length;
  const apiPassed = apiTests.filter(r => r.passed).length;
  
  console.log('\n📈 Category Breakdown:');
  console.log(`   Frontend Routes: ${frontendPassed}/${frontendTests.length} passed`);
  console.log(`   API Endpoints: ${apiPassed}/${apiTests.length} passed`);
  
  // Check if app is ready for hackathon
  if (passed === results.length) {
    console.log('\n🎉 ALL TESTS PASSED! App is ready for hackathon demo!');
  } else if (failed <= 2) {
    console.log('\n⚠️  Minor issues found, but app is mostly functional');
  } else {
    console.log('\n❌ Critical issues found, needs attention');
  }
  
  console.log('\n✨ Test suite completed!\n');
  
  return failed === 0 ? 0 : 1;
}

// Run tests
runTests()
  .then(exitCode => process.exit(exitCode))
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
