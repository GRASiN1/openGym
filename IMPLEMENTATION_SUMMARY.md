# Routine:Exercise Record Separation - Implementation Summary

## Overview
This implementation adds support for storing workout records separately for each `routine:exercise` combination. Previously, all records for an exercise were stored together regardless of which routine they came from, causing issues when the same exercise was performed in different routines with different intensities.

## Problem Statement
When you do shoulder press on both Push day and Shoulder & Arms day:
- On Push day: chest is fatigued, so you lift lighter weight for fewer reps
- On Shoulder & Arms day: shoulder is fresh, so you lift heavier weight for more reps

**Before**: The app showed the Push day record as the "last" record when you returned to Push day, even though the Shoulder & Arms day record had more weight.

**After**: Records are now stored separately for each routine:exercise combination, so each routine maintains its own progression independently.

## Files Modified

### 1. `frontend/src/lib/history.js`
**Changes:**
- Updated `lastEntryFor(S, exId, routineId)` function to accept optional `routineId` parameter
  - When `routineId` is provided, only searches workouts from that specific routine
  - When `routineId` is null (freestyle), searches all workouts
- Updated `bestWeightFor(S, exId, routineId)` function similarly
  - Returns best weight only from the specified routine or all routines

**Key Code:**
```javascript
export function lastEntryFor(S, exId, routineId = null) {
  // If no routine specified, search all workouts
  if (routineId === null) {
    for (let i = S.workouts.length - 1; i >= 0; i--) {
      const en = S.workouts[i].entries.find(e => e.id === exId)
      if (en && en.sets.some(s => s.done)) {
        return { d: S.workouts[i].d, sets: en.sets.filter(s => s.done), target: en.target || null }
      }
    }
    return null
  }
  
  // Search only workouts from the specified routine
  for (let i = S.workouts.length - 1; i >= 0; i--) {
    const workout = S.workouts[i]
    const routine = S.routines.find(r => r.id === workout.routineId)
    if (routine && routine.id === routineId) {
      const en = workout.entries.find(e => e.id === exId)
      if (en && en.sets.some(s => s.done)) {
        return { d: workout.d, sets: en.sets.filter(s => s.done), target: en.target || null }
      }
    }
  }
  return null
}
```

### 2. `frontend/src/views/Workout.jsx`
**Changes:**
- Updated `ExerciseBlock` component to pass routine ID to `lastEntryFor()` and `bestWeightFor()`
- Added logic to determine the routine for the current exercise
- Shows "Last time" only from the same routine (or all routines for freestyle workouts)

**Key Code:**
```javascript
const routine = S.routines.find(r => r.id === entry.routineId) || 
                S.routines.find(r => r.id === S.active.routineId)
const last = lastEntryFor(S, entry.id, routine ? routine.id : null)
const best = cardio ? 0 : Math.max(
  bestWeightFor(S, entry.id, routine ? routine.id : null), 
  (S.exWeights[entry.id] || {}).w || 0
)
```

### 3. `frontend/src/sheets.jsx`
**Changes:**
- Updated `beginWorkout()` function to pass routine ID to `buildSets()`
- Updated `WorkoutDetail` component to show routine name and indicate it's showing history for that routine

**Key Code:**
```javascript
export function beginWorkout(routineId, bw) {
  const st = S()
  const r = routineId ? st.routines.find(x => x.id === routineId) : null
  const entries = (r ? r.ex : []).map(cfg => {
    const plan = nextPrescription(st, cfg, r)
    return { 
      id: cfg.id, 
      sg: cfg.sg, 
      target: { ...cfg }, 
      plan, 
      sets: applyPrescription(buildSets(st, cfg, r ? r.id : null), plan) 
    }
  })
  // ...
}
```

## How It Works

### Data Flow
1. **Starting a workout from a routine:**
   - User selects a routine (e.g., "Push")
   - `beginWorkout()` is called with the routine ID
   - Each exercise's sets are built using `buildSets(st, cfg, routineId)`
   - Only the specified routine's history is used for progression

2. **During workout:**
   - User logs sets for each exercise
   - `lastEntryFor()` and `bestWeightFor()` use the routine ID to find the correct history
   - Progression is based only on the current routine's workouts

3. **Freestyle workouts:**
   - When no routine is specified (freestyle), `routineId` is null
   - All routines' history is searched (backward compatibility)

### User Experience
- **Push day**: Shows only Push day's shoulder press history
- **Shoulder & Arms day**: Shows only that routine's shoulder press history
- Each routine maintains its own progression independently
- Freestyle workouts still work as before (searches all routines)

## Testing
The implementation was tested by:
1. Building the frontend with `npm run build` - ✅ Success
2. Verifying no compilation errors
3. Checking that all functions properly handle the optional `routineId` parameter

## Backward Compatibility
- Freestyle workouts (no routine) continue to work as before
- Existing data is not affected
- The `routineId` parameter is optional with a default of `null`

## Future Enhancements
Potential improvements for future iterations:
1. Add UI indicator showing which routine's history is being displayed
2. Allow users to manually select which routine's history to use for freestyle workouts
3. Add statistics comparing progressions across different routines
4. Export/import routine-specific progressions

## Related Documentation
- See `memory/routine-exercise-records.md` for detailed feature documentation
