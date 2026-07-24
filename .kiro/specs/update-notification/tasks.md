# Implementation Plan: Update Notification

## Overview

Implement an interactive self-update system for the awesome-lazy-zsh CLI. On startup, the tool checks GitHub for newer releases, prompts the user to update (Yes/No/Skip), and performs the update automatically via git pull or brew upgrade based on the installation method.

## Tasks

- [x] 1. Create updateChecker module with pure utility functions
  - [x] 1.1 Implement `parseVersion` and `compareVersions` functions
    - Create `src/utils/updateChecker.js` with ES module exports
    - Implement `parseVersion(version)` — strips leading "v", parses major.minor.patch, handles pre-release suffixes, returns null for invalid
    - Implement `compareVersions(a, b)` — returns 1 if a > b, -1 if a < b, 0 if equal, null if either invalid
    - Pre-release versions compare lower than same version without suffix
    - _Requirements: 1.2, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 1.2 Implement `isCacheFresh` and cache constants
    - Define `CACHE_FILE_PATH` (`~/.awesome-lazy-zsh-update-cache.json`), `CHECK_INTERVAL_MS` (24h)
    - Implement `isCacheFresh(cache)` — true if checkedAt within 24h, false for future timestamps
    - _Requirements: 7.2, 7.5_

  - [x] 1.3 Write property tests for pure functions
    - **Property 1: Version parsing round-trip**
    - **Property 3: Version comparison consistency (antisymmetry + reflexivity)**
    - **Property 4: Invalid versions yield null**
    - **Property 5: Pre-release versions compare lower**
    - **Property 6: Cache freshness time boundary**
    - Create `tests/updateChecker.property.test.js`
    - _Requirements: 1.2, 1.5, 2.1-2.5, 7.2, 7.5_

- [x] 2. Implement cache I/O and install method detection
  - [x] 2.1 Implement `readCache` and `writeCache` functions
    - `readCache()` — reads JSON, validates fields (latestVersion, checkedAt), returns null on failure, deletes corrupt files
    - `writeCache(cache)` — atomic write via .tmp rename, fails silently
    - _Requirements: 7.1, 7.3, 7.4, 1.3, 1.6_

  - [x] 2.2 Implement `detectInstallMethod` function
    - Check for `.git` directory at project root (resolved from import.meta.url)
    - Return `'git'` if exists, `'brew'` otherwise
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 2.3 Write property test for cache round-trip and malformed data
    - **Property 2: Cache round-trip preservation**
    - **Property 7: Skipped version suppresses prompt** (test the skip field logic)
    - _Requirements: 1.3, 7.1, 7.6_

  - [x] 2.4 Write unit tests for cache and install detection
    - Test readCache returns null when file missing
    - Test readCache deletes corrupt files
    - Test writeCache fails silently on error
    - Test detectInstallMethod returns 'git' when .git exists
    - Test detectInstallMethod returns 'brew' when .git missing
    - _Requirements: 7.3, 7.4, 4.1, 4.2, 4.3_

- [x] 3. Checkpoint - Verify utility functions and cache
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement core checkForUpdate and performUpdate
  - [x] 4.1 Implement `checkForUpdate` function
    - Use native `fetch` with `AbortController` and 5-second timeout
    - Orchestrate: readCache → isCacheFresh → fetch if stale → parseVersion → compareVersions → detect install method → return UpdateResult or null
    - Check skippedVersion in cache against latestVersion
    - Read current version from package.json
    - Wrap in try/catch, never reject, resolve null on any error
    - _Requirements: 1.1-1.6, 2.1-2.5, 7.2, 7.6, 8.1, 8.2_

  - [x] 4.2 Implement `performUpdate` function
    - For 'git': run `git pull origin master` in project root, then `npm install`
    - For 'brew': run `brew upgrade awesome-lazy-zsh`
    - Return `{ success: boolean, message: string }`
    - Display progress with chalk styling
    - Handle failures gracefully — show error, return success: false
    - _Requirements: 5.1-5.5, 6.1-6.3_

  - [x] 4.3 Write unit tests for checkForUpdate and performUpdate
    - Mock global.fetch to test API success/failure/timeout
    - Mock child_process exec for performUpdate
    - Test: resolves null on HTTP 500
    - Test: resolves null on 5s timeout
    - Test: uses cached version when fresh
    - Test: skipped version returns skipped=true
    - Test: git pull + npm install called for git method
    - Test: brew upgrade called for brew method
    - Test: failed git pull returns success: false
    - _Requirements: 1.4, 5.1-5.5, 6.1-6.3, 7.6, 8.1, 8.2_

- [x] 5. Add update prompt and integrate into startup
  - [x] 5.1 Add `promptUpdate` function to `src/prompts.js`
    - Show styled notice: "⚡ Update available: v{current} → v{latest} (via git pull/brew upgrade)"
    - Present three choices: "Yes, update now", "No, continue", "Skip this version"
    - Return 'yes', 'no', 'skip', or null (Ctrl+C)
    - _Requirements: 3.1, 3.2, 3.7, 3.8_

  - [x] 5.2 Integrate update flow into `src/index.js`
    - Import `checkForUpdate`, `performUpdate`, `writeCache`, `readCache` from updateChecker
    - Import `promptUpdate` from prompts
    - After banner, await `checkForUpdate()` (already has 5s internal timeout)
    - If updateAvailable and not skipped: show promptUpdate
    - If 'yes': call performUpdate, print success, exit
    - If 'skip': update cache with skippedVersion
    - If 'no' or Ctrl+C: continue to normal flow
    - _Requirements: 3.1-3.9, 4.4, 5.1-5.5, 6.1-6.3, 7.6, 8.3_

  - [x] 5.3 Write integration tests
    - Test: no prompt when no update available
    - Test: prompt shown when update available
    - Test: 'skip' caches the version
    - Test: 'yes' triggers performUpdate
    - Test: failed update continues to normal flow
    - _Requirements: 3.4, 3.9, 7.6_

- [x] 6. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests use fast-check with minimum 100 iterations
- The module follows stateManager.js patterns: atomic writes, silent failure, try/catch everywhere
- After a successful update, the CLI exits and asks the user to re-run (no auto-restart)
- Test file: `tests/updateChecker.property.test.js` for property tests, `tests/updateChecker.test.js` for unit tests

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "2.1", "2.2"] },
    { "id": 2, "tasks": ["2.3", "2.4"] },
    { "id": 3, "tasks": ["4.1", "4.2"] },
    { "id": 4, "tasks": ["4.3", "5.1"] },
    { "id": 5, "tasks": ["5.2"] },
    { "id": 6, "tasks": ["5.3"] }
  ]
}
```
