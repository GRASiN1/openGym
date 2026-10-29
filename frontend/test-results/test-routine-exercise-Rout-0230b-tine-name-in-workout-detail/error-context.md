# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: test-routine-exercise.spec.js >> Routine:Exercise Record Separation Feature >> should show routine name in workout detail
- Location: test-routine-exercise.spec.js:197:3

# Error details

```
TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('.hdr h1') to be visible

```

# Page snapshot

```yaml
- generic [ref=e4]:
  - heading "openGym" [level=1] [ref=e10]
  - generic [ref=e11]: Your workouts. Your weights. Your profile.
  - button "Sign in with passkey" [ref=e12] [cursor=pointer]
  - button "Create new profile" [ref=e18] [cursor=pointer]
  - button "Continue without account" [ref=e24] [cursor=pointer]
  - generic [ref=e26]: Passkeys use your fingerprint, face or PIN — no passwords.Each profile keeps its own plan, workouts & body weight.
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Routine:Exercise Record Separation Feature', () => {
  4   |   test.beforeEach(async ({ page }) => {
  5   |     // Navigate to the app
  6   |     await page.goto('http://localhost:5173');
> 7   |     await page.waitForSelector('.hdr h1', { timeout: 10000 });
      |                ^ TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
  8   |     console.log('✅ App loaded successfully');
  9   |   });
  10  | 
  11  |   test('should show routine-specific last workout record', async ({ page }) => {
  12  |     console.log('\n========================================');
  13  |     console.log('TEST: Routine-Specific Record Separation');
  14  |     console.log('========================================\n');
  15  | 
  16  |     // Step 1: Start a Push workout and log shoulder press
  17  |     console.log('Step 1: Starting Push workout...');
  18  | 
  19  |     // Click Start workout button
  20  |     await page.click('button:has-text("Start workout")', { timeout: 5000 });
  21  |     console.log('  → Clicked "Start workout"');
  22  | 
  23  |     // Select Push routine
  24  |     const pushButton = page.locator('button').filter({ hasText: 'Push' });
  25  |     await pushButton.click({ timeout: 5000 });
  26  |     console.log('  → Selected Push routine');
  27  | 
  28  |     // Wait for workout to start
  29  |     await page.waitForSelector('.narrow', { timeout: 10000 });
  30  |     console.log('  → Workout started');
  31  | 
  32  |     // Add shoulder press exercise
  33  |     await page.click('button:has-text("Add exercise")', { timeout: 5000 });
  34  |     console.log('  → Clicked "Add exercise"');
  35  | 
  36  |     // Select first available exercise (shoulder press)
  37  |     const items = await page.locator('.item').all();
  38  |     if (items.length > 0) {
  39  |       await items[0].click({ timeout: 5000 });
  40  |       console.log('  → Selected exercise');
  41  |     }
  42  | 
  43  |     // Wait for config sheet
  44  |     await page.waitForSelector('h3', { timeout: 10000 });
  45  |     console.log('  → Config sheet opened');
  46  | 
  47  |     // Add 3 sets
  48  |     for (let i = 0; i < 3; i++) {
  49  |       await page.click('button:has-text("+")', { timeout: 5000 });
  50  |     }
  51  |     console.log('  → Added 3 sets');
  52  | 
  53  |     // Enter weight (80 kg) and reps (8) for each set
  54  |     for (let i = 0; i < 3; i++) {
  55  |       // Click weight field
  56  |       const weightField = page.locator('.val').nth(i);
  57  |       await weightField.click({ timeout: 5000 });
  58  |       await weightField.type('80', { timeout: 2000 });
  59  | 
  60  |       // Click reps field
  61  |       const repsField = page.locator('.val').nth(i + 3);
  62  |       await repsField.click({ timeout: 5000 });
  63  |       await repsField.type('8', { timeout: 2000 });
  64  |     }
  65  |     console.log('  → Entered 80 kg × 8 reps for all sets');
  66  | 
  67  |     // Check off all sets
  68  |     for (let i = 0; i < 3; i++) {
  69  |       const checkBox = page.locator('.setrow').nth(i).locator('.ck-sp');
  70  |       await checkBox.click({ timeout: 5000 });
  71  |     }
  72  |     console.log('  → Checked off all sets');
  73  | 
  74  |     // Save weight
  75  |     await page.click('button:has-text("Save")', { timeout: 5000 });
  76  |     console.log('  → Saved workout');
  77  | 
  78  |     // Wait for workout to continue or finish
  79  |     await page.waitForSelector('.narrow', { timeout: 10000 });
  80  |     console.log('  → Workout completed');
  81  | 
  82  |     // Finish workout
  83  |     await page.click('button:has-text("Finish workout")', { timeout: 5000 });
  84  |     await page.click('button:has-text("Finish workout")', { timeout: 5000 });
  85  |     console.log('  → Finished workout');
  86  | 
  87  |     // Navigate home
  88  |     await page.click('button:has-text("Nice!")', { timeout: 5000 });
  89  |     console.log('  → Returned to home');
  90  | 
  91  |     // Step 2: Start Shoulder & Arms workout and log heavier shoulder press
  92  |     console.log('\nStep 2: Starting Shoulder & Arms workout...');
  93  | 
  94  |     await page.click('button:has-text("Start workout")', { timeout: 5000 });
  95  |     console.log('  → Clicked "Start workout"');
  96  | 
  97  |     const shoulderButton = page.locator('button').filter({ hasText: 'Shoulder' });
  98  |     await shoulderButton.click({ timeout: 5000 });
  99  |     console.log('  → Selected Shoulder & Arms routine');
  100 | 
  101 |     // Add same shoulder press exercise
  102 |     await page.click('button:has-text("Add exercise")', { timeout: 5000 });
  103 |     console.log('  → Clicked "Add exercise"');
  104 | 
  105 |     // Select first available exercise
  106 |     const items2 = await page.locator('.item').all();
  107 |     if (items2.length > 0) {
```