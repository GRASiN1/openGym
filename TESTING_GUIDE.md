# Testing Guide: Routine:Exercise Record Separation

## Current Status
✅ Development server running at http://localhost:5173
✅ Build successful with no errors

## Manual Testing Steps

### Step 1: Clear Existing Data (Optional)
If you want to test with fresh data:
1. Open browser DevTools (F12)
2. Go to Application/Storage tab
3. Clear localStorage
4. Or delete the gym_state file if using mobile version

### Step 2: Test Push Day Workout

1. **Start a Push workout:**
   - Click "Start workout" button
   - Select "Push" routine

2. **Add Shoulder Press:**
   - Click "Add exercise"
   - Select a shoulder press exercise (e.g., "Overhead Press")
   - Add 3 sets
   - Enter: **80 kg × 8 reps** for each set
   - Check off all sets
   - Click "Save"
   - Click "Finish workout"

3. **Note the "Last time" display:**
   - It should show: `80 kg × 8`
   - This is Push day's record

### Step 3: Test Shoulder & Arms Day Workout

1. **Start a Shoulder & Arms workout:**
   - Click "Start workout" button
   - Select "Shoulder & Arms" routine

2. **Add the same Shoulder Press:**
   - Click "Add exercise"
   - Select the same shoulder press exercise
   - Add 3 sets
   - Enter: **90 kg × 6 reps** for each set (heavier because shoulder is fresh!)
   - Check off all sets
   - Click "Save"
   - Click "Finish workout"

### Step 4: Verify Routine-Specific Records

1. **Start Push workout again:**
   - Click "Start workout" button
   - Select "Push" routine

2. **Add the same Shoulder Press:**
   - Click "Add exercise"
   - Select the same shoulder press exercise

3. **Check the "Last time" display:**
   - ✅ **Expected:** Should show `80 kg × 8` (Push day's record)
   - ❌ **Bug:** If it shows `90 kg × 6`, the feature isn't working

### Step 5: Verify Workout Detail Shows Routine Name

1. Click on any workout in History
2. The title should show: `Workout Name (Push)` or `Workout Name (Shoulder & Arms)`

## What to Look For

### ✅ Working Correctly:
- "Last time" shows only the most recent workout from the **same routine**
- Each routine maintains its own progression independently
- Workout detail shows the routine name in parentheses

### ❌ Issues to Report:
- "Last time" shows weight from a different routine
- Workout detail doesn't show routine name
- Error messages in console

## Expected Behavior

| Scenario | Expected "Last time" Display |
|----------|------------------------------|
| Push day shoulder press (80 kg) | `80 kg × 8` |
| Shoulder & Arms day shoulder press (90 kg) | `90 kg × 6` |
| Return to Push day | `80 kg × 8` (NOT 90 kg!) |

## Browser Console Checks

Open DevTools (F12) → Console tab and look for:
- No red error messages
- No warnings about missing functions
- The app loads without issues

## Quick Test Command

To run a quick test in the browser:

1. Navigate to http://localhost:5173
2. Follow steps above
3. Verify the "Last time" shows the correct routine-specific record

## Known Limitations

- Freestyle workouts (no routine) still show all routines' history (backward compatible)
- Existing data is not automatically separated (manual migration may be needed)

## Next Steps After Testing

If testing is successful:
1. Test on different browsers (Chrome, Firefox, Safari)
2. Test on mobile devices
3. Test with different exercises and routines
4. Verify data sync works correctly

If issues are found:
1. Note the specific behavior
2. Check browser console for errors
3. Report with steps to reproduce
