# Implementation Plan: Service Installation

## Overview

This plan implements the service installation feature that allows the awesome-lazy-zsh CLI to install actual local development service servers (MongoDB, MySQL, PostgreSQL, Redis, RabbitMQ, Elasticsearch, Memcached) after users select service-related alias plugins. The implementation follows a bottom-up approach: registry configuration first, then platform detection, then installation logic, then orchestration flow, and finally integration into the existing plugin manager.

## Tasks

- [ ] 1. Set up testing infrastructure and service registry
  - [ ] 1.1 Install fast-check and configure test runner
    - Add `fast-check` as a dev dependency in `package.json`
    - Add a `"test"` script using `node --test` to `package.json`
    - Create a `tests/` directory at the project root
    - _Requirements: Testing strategy from design_

  - [ ] 1.2 Create the service registry module (`src/utils/serviceRegistry.js`)
    - Export `serviceRegistry` object with entries for all 7 services: mongodb, mysql, postgresql, redis, rabbitmq, elasticsearch, memcached
    - Each entry must include: `displayName`, `port`, `binary`, `brew` (package + tap), `apt` (packages + repoSetup), `yum` (packages + repoSetup), `systemdUnit`
    - Export `aliasToService` mapping from alias plugin names to service registry keys
    - Use exact package names and commands from Requirements 4, 5, and 6
    - _Requirements: 10.1, 10.2, 10.3, 4.1–4.7, 5.1–5.7, 6.1–6.7, 7.3_

  - [ ]* 1.3 Write property test for service registry structural completeness
    - **Property 4: Service registry structural completeness**
    - **Validates: Requirements 10.1, 7.3**
    - Create `tests/serviceRegistry.test.js`
    - Iterate all registry entries and verify each has all required fields with correct types

- [ ] 2. Implement platform detection
  - [ ] 2.1 Create the platform detector module (`src/utils/platformDetector.js`)
    - Export `detectPlatform()` async function returning `PlatformInfo` object
    - Use `os.platform()` to determine macOS vs Linux
    - On macOS: check if `brew` binary is available via `which brew`
    - On Linux: check for `apt-get` first, then fall back to `yum`
    - Return `{ os, packageManager, error }` — set `error` if no valid package manager found
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 2.2 Write unit tests for platform detector
    - Create `tests/platformDetector.test.js`
    - Mock `os.platform()` and command execution to test macOS/brew, Linux/apt, Linux/yum, and missing-package-manager scenarios
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 3. Implement core service installer
  - [ ] 3.1 Create the service installer module (`src/utils/serviceInstaller.js`)
    - Export `isServiceInstalled(binary)` — uses `which` or `command -v` to check if binary exists, returns boolean
    - Export `installService(serviceKey, platform)` — reads from serviceRegistry, runs tap/repo setup if needed, then runs install command; returns `InstallResult` object
    - Export `startService(serviceKey, platform)` — runs `brew services start` on macOS or `systemctl start` + `systemctl enable` on Linux
    - Export `getInstallCommands(serviceKey, platform)` — pure function returning the command sequence for a given service+platform (used by property tests)
    - Export `getStartCommands(serviceKey, platform)` — pure function returning the start command(s) for a given service+platform
    - Handle error cases: record failure, include error details in InstallResult, continue (fail-forward)
    - Display progress messages with chalk: service name, command being executed, success with port, or error details
    - _Requirements: 7.1, 7.2, 7.3, 4.1–4.7, 5.1–5.7, 6.1–6.7, 8.2, 8.4, 8.5, 9.1, 9.2, 9.3_

  - [ ]* 3.2 Write property test for install command generation
    - **Property 2: Install command generation correctness**
    - **Validates: Requirements 4.1–4.7, 5.1–5.7, 6.1–6.7**
    - Create `tests/serviceInstaller.test.js`
    - For each service × platform combination, verify generated commands include tap/repo setup (if non-null) followed by correct package install command

  - [ ]* 3.3 Write property test for start command generation
    - **Property 3: Start command generation correctness**
    - **Validates: Requirements 8.2, 8.4, 8.5**
    - Verify macOS uses `brew services start <package>`, Linux uses `systemctl start` + `systemctl enable` with correct unit name

  - [ ]* 3.4 Write property test for success message format
    - **Property 6: Success message format**
    - **Validates: Requirements 9.2**
    - Verify that for each service key, the success message contains both `displayName` and `port`

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement service installation flow orchestration
  - [ ] 5.1 Create the service install flow module (`src/utils/serviceInstallFlow.js`)
    - Export `runServiceInstallation(selectedPlugins)` as the main entry point
    - Export `getInstallableServices(plugins)` — filters selected plugins against `aliasToService` mapping, returns matching service keys
    - If no installable services found, return early (skip prompt)
    - Prompt user: "Install selected services" vs "Skip (aliases only)" using `prompts`
    - If user chooses install: show multi-select of installable services (all pre-selected by default)
    - Call `detectPlatform()` — if error, display message and return
    - For each selected service: check `isServiceInstalled()`, if not installed call `installService()`
    - After all installations: prompt "Start services now?" if any were successfully installed
    - If yes: call `startService()` for each successful service
    - If no: display manual start commands for each installed service
    - Display final summary: list installed, failed, and skipped services
    - Handle user cancellation gracefully (Ctrl+C)
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 8.1, 8.2, 8.3, 9.4_

  - [ ]* 5.2 Write property test for service filtering
    - **Property 1: Service filtering from plugin selection**
    - **Validates: Requirements 1.1, 1.2, 2.1**
    - Create `tests/serviceInstallFlow.test.js`
    - Generate random subsets of plugin names from `pluginRepos` keys, verify `getInstallableServices()` returns exactly the intersection with `aliasToService` keys

  - [ ]* 5.3 Write property test for installation summary completeness
    - **Property 5: Installation summary completeness**
    - **Validates: Requirements 9.4**
    - Generate random lists of `InstallResult` objects, verify the summary mentions every service's displayName exactly once with correct status label

- [ ] 6. Integrate into existing plugin manager
  - [ ] 6.1 Update `pluginManager.js` to call service installation flow
    - Import `runServiceInstallation` from `./serviceInstallFlow.js`
    - In `runFreshInstallation()`: after successful plugin installation and before returning, call `await runServiceInstallation(installedPlugins)`
    - In `runDefaultInstallation()`: after successful plugin installation and before returning, call `await runServiceInstallation(installedPlugins)`
    - Ensure service installation errors don't break the overall flow (wrap in try/catch, log warning if it fails)
    - _Requirements: 1.1, 1.2_

  - [ ]* 6.2 Write integration tests for the full flow
    - Create `tests/integration.test.js`
    - Mock `runCommand` and `prompts` to simulate end-to-end flow
    - Test: plugins with services → prompt shown → services installed → summary displayed
    - Test: plugins without services → no prompt shown
    - Test: package manager missing → error displayed, flow continues
    - _Requirements: 1.1, 1.2, 3.5, 9.4_

- [ ] 7. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses Node.js ES modules (`"type": "module"`) — all new files must use `import`/`export` syntax
- The existing `serviceManager.js` can remain for its service management operations (start/stop/restart/status) while the new modules handle installation
- `fast-check` with `node --test` is used for property-based testing since no test framework is currently configured

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["1.3", "2.1"] },
    { "id": 3, "tasks": ["2.2", "3.1"] },
    { "id": 4, "tasks": ["3.2", "3.3", "3.4"] },
    { "id": 5, "tasks": ["5.1"] },
    { "id": 6, "tasks": ["5.2", "5.3", "6.1"] },
    { "id": 7, "tasks": ["6.2"] }
  ]
}
```
