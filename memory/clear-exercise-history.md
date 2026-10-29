name: clear-exercise-history
description: Clear all workout history for a specific exercise
metadata:
  type: feature

## Feature: Clear Exercise Workout History

### Overview
Added a "Clear all history" button to the exercise detail sheet that allows users to remove all past workout records for a specific exercise while keeping their current routine plan and best 1RM estimate.

### Problem Solved
When using the routine:exercise record separation feature, users might want to:
- Reset an exercise's progression after changing training approach
- Remove old data from before equipment changes
- Start fresh with a new training program
- Clean up data from experimental training phases

### Implementation

#### File Modified: `frontend/src/sheets.jsx`

**Changes to ExerciseDetail component:**

1. **Added clearHistory function:**
   - Shows confirmation dialog before clearing
   - Removes all workouts containing the exercise
   - Clears exWeights for the exercise
   - Shows success toast message

2. **Added "Clear all history" button:**
   - Only shown when exercise has workout history
   - Uses danger variant (red) to indicate destructive action
   - Has trash icon for visual clarity

#### Code Added:
```javascript
const clearHistory = () => {
  confirmSheet({
    title: t('Clear workout history?'),
    message: t('This will remove all past workout records for "{0}" — only your current routine plan and best 1RM estimate will remain.', ex.n),
    confirmText: t('Clear history'),
    danger: true,
    onConfirm: () => {
      update(s => {
        s.workouts = s.workouts.filter(w => !w.entries.find(e => e.id === ex.id))
        if (s.exWeights && s.exWeights[ex.id]) {
          delete s.exWeights[ex.id]
        }
      })
      close()
      toast(t('History cleared for "{0}"', ex.n))
    }
  })
}
```

### User Experience

1. **Click info icon (i)** next to exercise name in workout view
2. **Exercise detail sheet opens** showing:
   - Exercise name and animation
   - Tags (body part, goal, equipment)
   - Best effort and last workout (if any)
   - "Add to my plan" button
   - **"Clear all history" button** (only if history exists)
   - Edit/Delete buttons (for custom exercises)
   - 1RM estimate (if applicable)
   - Instructions (if available)

3. **Click "Clear all history"**
4. **Confirmation dialog appears** explaining what will be deleted
5. **Click "Clear history"** to confirm
6. **All workout records removed** and success message shown

### What Gets Cleared

- ✅ All past workout records in history
- ✅ exWeights (best weight tracking)
- ✅ Workout history displayed in exercise detail

### What Remains

- ✅ Current routine plan (sets, reps, weight targets)
- ✅ Best 1RM estimate (if calculated)
- ✅ Exercise metadata (name, body part, description)
- ✅ Routine associations

### Safety Features

- **Confirmation dialog** prevents accidental deletion
- **Clear warning message** explains what will be deleted
- **Only shown when needed** (hidden if no history exists)
- **Danger styling** (red button) indicates destructive action

### Testing

To test this feature:

1. Log some workouts with an exercise
2. Click the info icon (i) next to the exercise
3. Verify "Clear all history" button appears
4. Click it and confirm the deletion
5. Verify the button disappears (no history left)
6. Verify routine plan is still intact

### Related Features

- Routine:Exercise Record Separation (memory/routine-exercise-records.md)
- Exercise Detail Sheet (existing feature)
- Workout History (existing feature)
