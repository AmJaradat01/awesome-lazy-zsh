# Implementation Plan: Resume Setup

## Overview

Implement checkpoint-based state persistence for the awesome-lazy-zsh CLI tool. The implementation creates a new `stateManager` module for state file I/O, integrates save-points into the existing setup flow, and adds resume detection with a prompt at startup. All state operations use graceful degradation — failures never crash the setup flow.

## Tasks

- [x] 1. Create State Manager module
  - [x] 1.1 Create `src/utils/stateManager.js` with constants and core functions
    - Define `STATE_FILE_PATH`, `CURRENT_SCHEMA_VERSION`, `MAX_AGE_MS` constants
    - Implement `readState()` — reads and parses JSON from state file, returns `null` on any failure
    - Implement `writeState(partialState)` — merges partial updates into existing state, updates `timestamp`, writes JSON atomically
    - Implement `deleteState()` — removes state file, logs warning on failure, never throws
    - Implement `validateState(data)` — checks schema version, required fields, correct types, valid checkpoint names
    - Implement `isExpired(state)` — returns `true` if `Date.now() - state.timestamp > MAX_AGE_MS`
    - All functions wrapped in try/catch for graceful degradation
    - _Requirements: 1.5, 1.6, 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3_

  - [x] 1.2 Write property tests for `stateManager`
    - **Property 1: State round-trip preservation** — For any valid SetupState, `writeState` then `readState` produces identical field values
    - **Validates: Requirements 1.1, 1.3, 1.4, 1.6**

  - [x] 1.3 Write property test for validation rejection
    - **Property 3: Validation rejects invalid state objects** — For any object missing required fields, with incorrect types, unrecognized checkpoints, or wrong version, `validateState` returns `false`
    - **Validates: Requirements 2.3, 8.1, 8.4**

  - [x] 1.4 Write property test for timestamp expiry
    - **Property 4: Timestamp expiry boundary** — For any timestamp, `isExpired` returns `true` iff `Date.now() - timestamp > MAX_AGE_MS`
    - **Validates: Requirements 9.2**

  - [x] 1.5 Write unit tests for `stateManager`
    - Test `readState` returns `null` when file doesn't exist
    - Test `readState` returns `null` for invalid JSON
    - Test `deleteState` logs warning when file cannot be deleted
    - Test `validateState` rejects object with missing `checkpoint` field
    - Test `validateState` rejects object with non-array `selectedPlugins`
    - Test `validateState` accepts a fully valid state object
    - Test `isExpired` returns `true` for timestamp exactly 24h+1ms old
    - Test `isExpired` returns `false` for timestamp exactly 24h-1ms old
    - _Requirements: 8.1, 8.2, 9.2_

- [x] 2. Add resume prompt and detection logic to entry point
  - [x] 2.1 Add `promptResume()` function to `src/prompts.js`
    - Display two choices: "Resume previous setup" and "Start fresh"
    - Return `'resume'`, `'fresh'`, or `null` (for Ctrl+C)
    - Use existing `prompts` package pattern
    - _Requirements: 3.1, 3.4_

  - [x] 2.2 Modify `src/index.js` to detect state and route resume flow
    - Import `readState`, `deleteState`, `validateState`, `isExpired` from stateManager
    - At start of `main()`, check for existing state file
    - If state exists but invalid or expired: delete and proceed fresh
    - If state valid: show resume prompt
    - If user picks "resume": call `resumeFromCheckpoint(state)`
    - If user picks "fresh": delete state and proceed to normal flow
    - If user cancels (Ctrl+C): exit without modifying state
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.2, 3.3, 3.4, 9.3_

  - [x] 2.3 Implement `resumeFromCheckpoint(state)` in `src/index.js`
    - Route `plugin_selection` → install pending plugins → services → theme
    - Route `plugin_installation` → service installation → theme
    - Route `service_installation` → theme selection
    - Route `theme_selection` → apply saved theme directly
    - Delete state file on successful completion
    - _Requirements: 4.1, 4.2, 5.1, 5.2, 6.1, 6.2, 7.1, 7.2_

  - [x] 2.4 Write property test for checkpoint routing
    - **Property 5: Checkpoint-to-step routing correctness** — For any valid state with a recognized checkpoint, the resume routing maps to the correct next step
    - **Validates: Requirements 3.2, 4.1, 5.1, 6.1, 6.2**

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Integrate state persistence into plugin flow
  - [x] 4.1 Modify `src/utils/pluginManager.js` to save state after plugin selection
    - Import `writeState` from stateManager
    - After successful plugin selection in `runFreshInstallation`, call `writeState` with checkpoint `plugin_selection`, selected plugins as both `selectedPlugins` and `pendingPlugins`
    - _Requirements: 1.1_

  - [x] 4.2 Modify `src/utils/pluginManager.js` to update state during installation loop
    - After each successful plugin install, call `writeState` to move plugin from `pendingPlugins` to `installedPlugins`
    - After all plugins installed, call `writeState` with checkpoint `plugin_installation`
    - _Requirements: 1.2, 4.3_

  - [x] 4.3 Write property test for pending-to-installed set invariant
    - **Property 2: Pending-to-installed transition preserves the selection set** — After moving a plugin from pending to installed, `installedPlugins.concat(pendingPlugins)` equals `selectedPlugins`
    - **Validates: Requirements 1.2, 4.2, 4.3, 5.2, 5.3**

- [x] 5. Integrate state persistence into service and theme flows
  - [x] 5.1 Modify `src/utils/serviceInstallFlow.js` to save state during service installation
    - Import `writeState` from stateManager
    - After service selection, call `writeState` with checkpoint `service_installation`, selected services in `selectedServices` and `pendingServices`
    - After each successful service install, update state to move service from `pendingServices` to `installedServices`
    - _Requirements: 1.3, 5.3_

  - [x] 5.2 Modify `src/utils/themeManager.js` to save state after theme selection
    - Import `writeState` from stateManager
    - After user selects a theme (before applying), call `writeState` with checkpoint `theme_selection` and `selectedTheme`
    - _Requirements: 1.4_

  - [x] 5.3 Add state file cleanup on completion in `src/index.js`
    - Import `deleteState` from stateManager
    - After successful completion of both fresh and default installation flows, call `deleteState()`
    - Log warning if deletion fails, never throw
    - _Requirements: 7.1, 7.2_

- [x] 6. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- All state I/O operations use try/catch for graceful degradation — failures never crash the flow
- The project uses Node.js ES modules (`type: "module"`), `node --test` runner, and `fast-check` for property tests

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "1.5", "2.2"] },
    { "id": 2, "tasks": ["2.3", "2.4"] },
    { "id": 3, "tasks": ["4.1", "5.1", "5.2"] },
    { "id": 4, "tasks": ["4.2", "4.3", "5.3"] }
  ]
}
```
