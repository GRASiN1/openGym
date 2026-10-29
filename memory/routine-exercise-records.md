name: routine-exercise-records
description: Separate records for each routine:exercise combination
metadata:
  type: feature

When logging exercises that appear in multiple routines (e.g., shoulder press on both Push and Shoulder & Arms days), records are now stored separately for each routine:exercise combination.

## Problem
Previously, all records for an exercise were stored together regardless of which routine they came from. This caused issues when:
- Same exercise done in different routines with different intensities
- Last workout showed weight from a different routine (e.g., shoulder day instead of push day)
- Progression carried over weights from the wrong routine

## Solution
Modified the following files to track routine-specific records:

### frontend/src/lib/history.js
- Updated `lastEntryFor(S, exId, routineId)` to accept optional `routineId` parameter
- When `routineId` is provided, only searches workouts from that routine
- When `routineId` is null (freestyle), searches all workouts

### frontend/src/lib/history.js - bestWeightFor()
- Updated to accept optional `routineId` parameter
- Returns best weight only from the specified routine or all routines

### frontend/src/views/Workout.jsx
- ExerciseBlock now passes routine ID to `lastEntryFor()` and `bestWeightFor()`
- Shows "Last time" only from the same routine (or all routines for freestyle)

### frontend/src/sheets.jsx
- Updated `beginWorkout()` to pass routine ID to `buildSets()`
- Updated WorkoutDetail to show routine name and indicate it's showing history for that routine

## Usage
- When starting a workout from a routine, only that routine's history is used for progression
- Freestyle workouts still show all routines' history
- Each routine:exercise combination maintains its own progression independently
