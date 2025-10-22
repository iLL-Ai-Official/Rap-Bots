#!/usr/bin/env tsx
/**
 * Test script for character card generation
 * This script tests the characterCardGenerator service
 */

import { characterCardGenerator } from './server/services/characterCardGenerator';
import * as fs from 'fs';
import * as path from 'path';

async function testCharacterCardGeneration() {
  console.log('🧪 Testing Character Card Generation...\n');

  // Test data
  const testUserId = 'test-user-123';
  const testUserName = 'MC Test';
  const testBio = 'A freestyle rapper from the underground scene with clever wordplay';
  const testRapStyle = 'aggressive';
  const testStats = {
    totalBattles: 15,
    totalWins: 10,
  };

  // Create a dummy image buffer (1x1 pixel PNG)
  const dummyImage = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  try {
    console.log('📝 Test Parameters:');
    console.log(`   User ID: ${testUserId}`);
    console.log(`   User Name: ${testUserName}`);
    console.log(`   Bio: ${testBio}`);
    console.log(`   Rap Style: ${testRapStyle}`);
    console.log(`   Stats: ${testStats.totalBattles} battles, ${testStats.totalWins} wins\n`);

    console.log('🎨 Generating character card...');
    const result = await characterCardGenerator.generateCharacterCard(
      testUserId,
      testUserName,
      dummyImage,
      testBio,
      testRapStyle,
      testStats
    );

    console.log('\n✅ Character Card Generated Successfully!\n');
    console.log('📊 Card Data:');
    console.log(`   Name: ${result.cardData.name}`);
    console.log(`   Style: ${result.cardData.rapStyle}`);
    console.log(`   Bio: ${result.cardData.bio}`);
    console.log('\n   Stats:');
    console.log(`   - Flow: ${result.cardData.stats.flow}`);
    console.log(`   - Wordplay: ${result.cardData.stats.wordplay}`);
    console.log(`   - Delivery: ${result.cardData.stats.delivery}`);
    console.log(`   - Stage Presence: ${result.cardData.stats.stage_presence}`);
    console.log('\n   Attacks:');
    result.cardData.attacks.forEach((attack, idx) => {
      console.log(`   ${idx + 1}. ${attack.name} (${attack.power} DMG)`);
      console.log(`      Type: ${attack.type}`);
      console.log(`      Description: ${attack.description}`);
    });
    console.log(`\n   Card URL: ${result.cardUrl}`);

    // Test with different rap styles
    console.log('\n🎭 Testing different rap styles...\n');
    const styles = ['smooth', 'technical', 'default'];
    
    for (const style of styles) {
      console.log(`   Testing ${style} style...`);
      const styleResult = await characterCardGenerator.generateCharacterCard(
        `test-${style}`,
        `MC ${style.charAt(0).toUpperCase() + style.slice(1)}`,
        dummyImage,
        testBio,
        style,
        testStats
      );
      console.log(`   ✓ Attacks for ${style}:`);
      styleResult.cardData.attacks.forEach(a => console.log(`     - ${a.name} (${a.power} DMG)`));
    }

    console.log('\n✅ All tests passed!\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testCharacterCardGeneration().catch(console.error);
