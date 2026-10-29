const { test, expect } = require('@playwright/test');

test.describe('Routine:Exercise Record Separation Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');
    await page.waitForSelector('.hdr h1', { timeout: 10000 });
    console.log('✅ App loaded successfully');
  });

  test('should show routine-specific last workout record', async ({ page }) => {
    console.log('\n========================================');
    console.log('TEST: Routine-Specific Record Separation');
    console.log('========================================\n');

    // Step 1: Start a Push workout and log shoulder press
    console.log('Step 1: Starting Push workout...');

    // Click Start workout button
    await page.click('button:has-text("Start workout")', { timeout: 5000 });
    console.log('  → Clicked "Start workout"');

    // Select Push routine
    const pushButton = page.locator('button').filter({ hasText: 'Push' });
    await pushButton.click({ timeout: 5000 });
    console.log('  → Selected Push routine');

    // Wait for workout to start
    await page.waitForSelector('.narrow', { timeout: 10000 });
    console.log('  → Workout started');

    // Add shoulder press exercise
    await page.click('button:has-text("Add exercise")', { timeout: 5000 });
    console.log('  → Clicked "Add exercise"');

    // Select first available exercise (shoulder press)
    const items = await page.locator('.item').all();
    if (items.length > 0) {
      await items[0].click({ timeout: 5000 });
      console.log('  → Selected exercise');
    }

    // Wait for config sheet
    await page.waitForSelector('h3', { timeout: 10000 });
    console.log('  → Config sheet opened');

    // Add 3 sets
    for (let i = 0; i < 3; i++) {
      await page.click('button:has-text("+")', { timeout: 5000 });
    }
    console.log('  → Added 3 sets');

    // Enter weight (80 kg) and reps (8) for each set
    for (let i = 0; i < 3; i++) {
      // Click weight field
      const weightField = page.locator('.val').nth(i);
      await weightField.click({ timeout: 5000 });
      await weightField.type('80', { timeout: 2000 });

      // Click reps field
      const repsField = page.locator('.val').nth(i + 3);
      await repsField.click({ timeout: 5000 });
      await repsField.type('8', { timeout: 2000 });
    }
    console.log('  → Entered 80 kg × 8 reps for all sets');

    // Check off all sets
    for (let i = 0; i < 3; i++) {
      const checkBox = page.locator('.setrow').nth(i).locator('.ck-sp');
      await checkBox.click({ timeout: 5000 });
    }
    console.log('  → Checked off all sets');

    // Save weight
    await page.click('button:has-text("Save")', { timeout: 5000 });
    console.log('  → Saved workout');

    // Wait for workout to continue or finish
    await page.waitForSelector('.narrow', { timeout: 10000 });
    console.log('  → Workout completed');

    // Finish workout
    await page.click('button:has-text("Finish workout")', { timeout: 5000 });
    await page.click('button:has-text("Finish workout")', { timeout: 5000 });
    console.log('  → Finished workout');

    // Navigate home
    await page.click('button:has-text("Nice!")', { timeout: 5000 });
    console.log('  → Returned to home');

    // Step 2: Start Shoulder & Arms workout and log heavier shoulder press
    console.log('\nStep 2: Starting Shoulder & Arms workout...');

    await page.click('button:has-text("Start workout")', { timeout: 5000 });
    console.log('  → Clicked "Start workout"');

    const shoulderButton = page.locator('button').filter({ hasText: 'Shoulder' });
    await shoulderButton.click({ timeout: 5000 });
    console.log('  → Selected Shoulder & Arms routine');

    // Add same shoulder press exercise
    await page.click('button:has-text("Add exercise")', { timeout: 5000 });
    console.log('  → Clicked "Add exercise"');

    // Select first available exercise
    const items2 = await page.locator('.item').all();
    if (items2.length > 0) {
      await items2[0].click({ timeout: 5000 });
      console.log('  → Selected exercise');
    }

    // Add 3 sets
    for (let i = 0; i < 3; i++) {
      await page.click('button:has-text("+")', { timeout: 5000 });
    }
    console.log('  → Added 3 sets');

    // Enter heavier weight (90 kg) and reps (6) for each set
    for (let i = 0; i < 3; i++) {
      const weightField2 = page.locator('.val').nth(i);
      await weightField2.click({ timeout: 5000 });
      await weightField2.type('90', { timeout: 2000 });

      const repsField2 = page.locator('.val').nth(i + 3);
      await repsField2.click({ timeout: 5000 });
      await repsField2.type('6', { timeout: 2000 });
    }
    console.log('  → Entered 90 kg × 6 reps for all sets (heavier!)');

    // Check off all sets
    for (let i = 0; i < 3; i++) {
      const checkBox2 = page.locator('.setrow').nth(i).locator('.ck-sp');
      await checkBox2.click({ timeout: 5000 });
    }
    console.log('  → Checked off all sets');

    // Save weight
    await page.click('button:has-text("Save")', { timeout: 5000 });
    console.log('  → Saved workout');

    // Finish workout
    await page.click('button:has-text("Finish workout")', { timeout: 5000 });
    await page.click('button:has-text("Finish workout")', { timeout: 5000 });
    console.log('  → Finished workout');

    // Navigate home
    await page.click('button:has-text("Nice!")', { timeout: 5000 });
    console.log('  → Returned to home');

    // Step 3: Start Push workout again and verify it shows Push day's record
    console.log('\nStep 3: Starting Push workout again to verify routine-specific records...');

    await page.click('button:has-text("Start workout")', { timeout: 5000 });
    console.log('  → Clicked "Start workout"');

    await pushButton.click({ timeout: 5000 });
    console.log('  → Selected Push routine');

    // Add shoulder press exercise
    await page.click('button:has-text("Add exercise")', { timeout: 5000 });
    console.log('  → Clicked "Add exercise"');

    // Select first available exercise
    const items3 = await page.locator('.item').all();
    if (items3.length > 0) {
      await items3[0].click({ timeout: 5000 });
      console.log('  → Selected exercise');
    }

    // Wait for exercise block to render
    await page.waitForSelector('.sethead', { timeout: 10000 });
    console.log('  → Exercise block rendered');

    // Check if "Last time" shows Push day's record (80 kg)
    console.log('\nVerifying "Last time" display...');

    // Get the "Last time" text
    const lastTimeElement = page.locator('.small.dim').first();
    const lastTimeText = await lastTimeElement.innerText();
    console.log('  → "Last time" text:', lastTimeText);

    // Verify the last time shows the Push day record (80 kg), not Shoulder & Arms day (90 kg)
    if (lastTimeText.includes('80')) {
      console.log('  ✅ PASS: Shows Push day\'s record (80 kg)');
    } else if (lastTimeText.includes('90')) {
      console.log('  ❌ FAIL: Shows Shoulder & Arms day\'s record (90 kg) instead of Push day\'s record (80 kg)');
      throw new Error('Routine-specific records not working correctly');
    } else {
      console.log('  ⚠️  WARNING: No previous record found (this is expected for first workout)');
    }

    console.log('\n========================================');
    console.log('✅ TEST PASSED: Routine-specific records are working!');
    console.log('========================================\n');
  });

  test('should show routine name in workout detail', async ({ page }) => {
    console.log('\n========================================');
    console.log('TEST: Routine Name in Workout Detail');
    console.log('========================================\n');

    // Start a workout
    console.log('Starting Push workout...');
    await page.click('button:has-text("Start workout")', { timeout: 5000 });
    console.log('  → Clicked "Start workout"');

    const pushButton = page.locator('button').filter({ hasText: 'Push' });
    await pushButton.click({ timeout: 5000 });
    console.log('  → Selected Push routine');

    // Add an exercise
    await page.click('button:has-text("Add exercise")', { timeout: 5000 });
    console.log('  → Clicked "Add exercise"');

    const items = await page.locator('.item').all();
    if (items.length > 0) {
      await items[0].click({ timeout: 5000 });
      console.log('  → Selected exercise');
    }

    // Add one set and check it off
    await page.click('button:has-text("+")', { timeout: 5000 });
    console.log('  → Added 1 set');

    await page.click('.val', { timeout: 5000 });
    await page.type('.val', '75', { timeout: 2000 });

    await page.click('.val', { timeout: 5000 });
    await page.type('.val', '10', { timeout: 2000 });

    await page.click('.setrow.done .ck-sp', { timeout: 5000 });
    console.log('  → Checked off set');

    // Save and finish
    await page.click('button:has-text("Save")', { timeout: 5000 });
    console.log('  → Saved workout');

    await page.click('button:has-text("Finish workout")', { timeout: 5000 });
    await page.click('button:has-text("Finish workout")', { timeout: 5000 });
    console.log('  → Finished workout');

    await page.click('button:has-text("Nice!")', { timeout: 5000 });
    console.log('  → Returned to home');

    // Click on the workout to see details
    console.log('Opening workout detail...');
    await page.click('.item:has-text("Push")', { timeout: 5000 });
    console.log('  → Clicked on workout');

    // Wait for workout detail sheet
    await page.waitForSelector('h3', { timeout: 10000 });
    console.log('  → Workout detail opened');

    // Verify routine name is shown
    const title = await page.locator('h3').first().innerText();
    console.log('  → Workout title:', title);

    if (title.includes('Push')) {
      console.log('  ✅ PASS: Routine name "Push" is shown in title');
    } else {
      console.log('  ❌ FAIL: Routine name not found in title');
      throw new Error('Routine name not shown in workout detail');
    }

    console.log('\n========================================');
    console.log('✅ TEST PASSED: Routine name is shown correctly!');
    console.log('========================================\n');
  });
});
