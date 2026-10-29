# Clear Exercise History Feature

## Overview

Added a "Clear all history" button to the exercise detail sheet that allows users to remove all past workout records for a specific exercise while keeping their current routine plan and best 1RM estimate.

## Location

The button appears on the exercise detail sheet, which opens when you click the info icon (i) next to an exercise name in your workout view.

## What It Does

- **Removes all past workout records** for the selected exercise
- **Clears workout history** displayed in the exercise detail
- **Removes exWeights** (best weight tracking) for the exercise
- **Preserves your current routine plan** (sets, reps, weight targets)
- **Preserves your best 1RM estimate** (if calculated)

## When It Appears

The "Clear all history" button only appears when:
- You have workout history for an exercise
- The exercise has been logged in at least one completed workout

It's hidden when there's no history to clear, preventing accidental clicks.

## How To Use

1. **Start a workout** and click the info icon (i) next to any exercise
2. **Exercise detail sheet opens** showing your exercise information
3. **Click "Clear all history"** (red button with trash icon)
4. **Read the confirmation message** explaining what will be deleted
5. **Click "Clear history"** to confirm
6. **All history is removed** and you're returned to the home screen

## Safety Features

- ✅ **Confirmation dialog** prevents accidental deletion
- ✅ **Clear warning message** explains exactly what will be deleted
- ✅ **Only shown when needed** (hidden if no history exists)
- ✅ **Danger styling** (red button) indicates destructive action

## What Gets Cleared

| Item | Cleared? |
|------|----------|
| Past workout records in history | ✅ Yes |
| exWeights (best weight tracking) | ✅ Yes |
| Workout history display | ✅ Yes |
| Current routine plan | ❌ No |
| Best 1RM estimate | ❌ No |
| Exercise metadata | ❌ No |

## Use Cases

This feature is useful when you want to:

- **Reset progression** after changing your training approach
- **Remove old data** from before equipment changes
- **Start fresh** with a new training program
- **Clean up data** from experimental training phases
- **Fix incorrect data** that can't be edited individually

## Technical Details

### Files Modified

- `frontend/src/sheets.jsx` - ExerciseDetail component

### Implementation

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

### Build Status

✅ Build successful (553ms)

## Related Features

- [Routine:Exercise Record Separation](./routine-exercise-records.md) - Separate records for each routine:exercise combination
- [Clear Exercise History](./clear-exercise-history.md) - Documentation for this feature

## Testing

To test this feature:

1. Log some workouts with an exercise
2. Click the info icon (i) next to the exercise
3. Verify "Clear all history" button appears
4. Click it and confirm the deletion
5. Verify the button disappears (no history left)
6. Verify routine plan is still intact

## Future Enhancements

Potential improvements:
- Batch clear multiple exercises at once
- Export data before clearing (backup option)
- Show summary of what will be deleted
- Option to keep exWeights separately
