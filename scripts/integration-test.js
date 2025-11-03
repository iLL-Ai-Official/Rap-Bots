#!/usr/bin/env node
// Simple integration test to poll the leaderboard endpoint and print the response.

const fetch = globalThis.fetch || require('node-fetch');

const url = process.env.TEST_LEADERBOARD_URL || 'http://127.0.0.1:5000/api/tournaments/leaderboard';

async function waitForServer(retries = 20, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { timeout: 2000 });
      if (res.ok) {
        const json = await res.json();
        console.log('SUCCESS: received leaderboard:');
        console.log(JSON.stringify(json, null, 2));
        return 0;
      } else {
        console.error('Server responded with', res.status);
      }
    } catch (err) {
      // console.error('Waiting for server...', err.message);
    }
    await new Promise(r => setTimeout(r, delay));
  }
  console.error('Timed out waiting for server at', url);
  return 1;
}

waitForServer().then(code => process.exit(code));
