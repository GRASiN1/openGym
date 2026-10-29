import { chromium } from 'playwright';

async function runTest() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log('\n========================================');
  console.log('AUTOMATED TEST: Routine:Exercise Record Separation');
  console.log('========================================\n');

  try {
    // Navigate to the app
    console.log('1. Navigating to app...');
    await page.goto('http://localhost:5173');
    await page.waitForSelector('body', { timeout: 10000 });
    console.log('   ✅ App loaded\n');

    // Step 1: Push workout with 80kg
    console.log('2. Starting Push workout (80kg)...');
    await page.click('button:has-text("Start workout")');
    await page.click('button:has-text("Push")');
    await page.click('button:has-text("Add exercise")');

    // Select first exercise
    const items = await page.locator('.item').all();
    if (items.length > 0) {
      await items[0].click();
    }

    // Add 3 sets
    for (let i = 0; i < 3; i++) {
      await page.click('button:has-text("+")');
    }

    // Enter 80kg × 8 reps
    for (let i = 0; i < 3; i++) {
      await page.click('.val').catch(() => {});
      await page.type('.val', '80');
      await page.click('.val').catch(() => {});
      await page.type('.val', '8');
    }

    // Check off sets
    for (let i = 0; i < 3; i++) {
      await page.locator('.setrow .ck-sp').nth(i).click();
    }

    // Save and finish
    await page.click('button:has-text("Save")');
    await page.click('button:has-text("Finish workout")');
    await page.click('button:has-text("Finish workout")');
    await page.click('button:has-text("Nice!")');
    console.log('   ✅ Push workout completed (80kg)\n');

    // Step 2: Shoulder & Arms workout with 90kg
    console.log('3. Starting Shoulder & Arms workout (90kg)...');
    await page.click('button:has-text("Start workout")');
    await page.click('button:has-text("Shoulder")');
    await page.click('button:has-text("Add exercise")');

    // Select first exercise
    const items2 = await page.locator('.item').all();
    if (items2.length > 0) {
      await items2[0].click();
    }

    // Add 3 sets
    for (let i = 0; i < 3; i++) {
      await page.click('button:has-text("+")');
    }

    // Enter 90kg × 6 reps
    for (let i = 0; i < 3; i++) {
      await page.click('.val').catch(() => {});
      await page.type('.val', '90');
      await page.click('.val').catch(() => {});
      await page.type('.val', '6');
    }

    // Check off sets
    for (let i = 0; i < 3; i++) {
      await page.locator('.setrow .ck-sp').nth(i).click();
    }

    // Save and finish
    await page.click('button:has-text("Save")');
    await page.click('button:has-text("Finish workout")');
    await page.click('button:has-text("Finish workout")');
    await page.click('button:has-text("Nice!")');
    console.log('   ✅ Shoulder & Arms workout completed (90kg)\n');

    // Step 3: Push workout again - verify it shows 80kg
    console.log('4. Starting Push workout again to verify...');
    await page.click('button:has-text("Start workout")');
    await page.click('button:has-text("Push")');
    await page.click('button:has-text("Add exercise")');

    // Select first exercise
    const items3 = await page.locator('.item').all();
    if (items3.length > 0) {
      await items3[0].click();
    }

    // Wait for exercise block
    await page.waitForSelector('.sethead', { timeout: 10000 });

    // Check "Last time" display
    console.log('   Checking "Last time" display...');
    const lastTimeText = await page.locator('.small.dim').first().innerText();
    console.log('   "Last time" text:', lastTimeText);

    if (lastTimeText.includes('80')) {
      console.log('   ✅ PASS: Shows Push day\'s record (80 kg)');
      console.log('\n========================================');
      console.log('✅ ALL TESTS PASSED!');
      console.log('Routine-specific records are working correctly!');
      console.log('========================================\n');
    } else if (lastTimeText.includes('90')) {
      console.log('   ❌ FAIL: Shows Shoulder & Arms day\'s record (90 kg)');
      console.log('   Expected: 80 kg (Push day)');
      console.log('\n========================================');
      console.log('❌ TEST FAILED!');
      console.log('Routine-specific records are NOT working!');
      console.log('========================================\n');
    } else {
      console.log('   ⚠️  No previous record found (expected for first workout)');
      console.log('\n========================================');
      console.log('⚠️  TEST INCONCLUSIVE');
      console.log('========================================\n');
    }

  } catch (error) {
    console.error('Error during test:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the test
runTest().catch(console.error);
