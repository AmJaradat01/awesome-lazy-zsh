# Requirements Document

## Introduction

The Resume Setup feature enables the awesome-lazy-zsh CLI tool to persist setup progress so that users can continue from where they left off after an interruption (Ctrl+C, terminal crash, or accidental exit). Currently, any interruption forces the user to restart the entire setup process. This feature introduces checkpoint-based state persistence and a resume prompt on re-launch.

## Glossary

- **State_Manager**: The module responsible for reading, writing, and deleting the persistent state file that tracks setup progress.
- **State_File**: A JSON file stored at `~/.awesome-lazy-zsh-state.json` that records the current checkpoint, selections, and installation results.
- **Checkpoint**: A named marker representing a completed major step in the setup flow (e.g., `plugin_selection`, `plugin_installation`, `service_installation`, `theme_selection`).
- **Setup_Flow**: The interactive CLI process that guides users through plugin selection, plugin installation, service installation, and theme selection.
- **Resume_Prompt**: The interactive prompt displayed when an incomplete State_File is detected, offering the user a choice to resume or start fresh.

## Requirements

### Requirement 1: State File Persistence

**User Story:** As a user, I want my setup progress saved automatically at each major step, so that I do not lose my selections if the process is interrupted.

#### Acceptance Criteria

1. WHEN the user completes plugin selection, THE State_Manager SHALL write the selected plugin list and the checkpoint `plugin_selection` to the State_File.
2. WHEN a plugin is successfully installed, THE State_Manager SHALL update the State_File to record that plugin as installed.
3. WHEN the user completes service installation, THE State_Manager SHALL update the State_File with the service installation results and the checkpoint `service_installation`.
4. WHEN the user completes theme selection, THE State_Manager SHALL update the State_File with the selected theme and the checkpoint `theme_selection`.
5. THE State_Manager SHALL store the State_File at the path `~/.awesome-lazy-zsh-state.json` in the user's home directory.
6. THE State_Manager SHALL write the State_File as valid JSON containing the fields: `checkpoint`, `selectedPlugins`, `installedPlugins`, `pendingPlugins`, `selectedServices`, `installedServices`, `pendingServices`, `selectedTheme`, and `timestamp`.

### Requirement 2: Incomplete State Detection

**User Story:** As a user, I want the tool to detect when my previous setup was interrupted, so that I am offered the option to continue.

#### Acceptance Criteria

1. WHEN the Setup_Flow starts, THE State_Manager SHALL check for the existence of a State_File at the expected path.
2. WHEN a State_File exists and contains a valid checkpoint that is not the final completion state and not the initial state, THE Resume_Prompt SHALL be displayed to the user.
3. IF the State_File contains invalid JSON or an unrecognized checkpoint, THEN THE State_Manager SHALL delete the corrupted State_File and proceed with a fresh setup. Recovery actions MAY be triggered by validation failure signals without requiring explicit validation to have been performed.
4. IF the State_File does not exist, THEN THE Setup_Flow SHALL proceed with the normal initial action prompt without displaying the Resume_Prompt.
5. WHEN the checkpoint is the initial state (no meaningful progress recorded), THE State_Manager SHALL NOT display the Resume_Prompt and SHALL proceed with a fresh setup.

### Requirement 3: Resume or Start Fresh Prompt

**User Story:** As a user, I want to choose whether to resume my previous setup or start over, so that I have control over how to proceed.

#### Acceptance Criteria

1. WHEN an incomplete State_File is detected, THE Resume_Prompt SHALL display two choices: "Resume previous setup" and "Start fresh".
2. WHEN the user selects "Resume previous setup", THE Setup_Flow SHALL restore the saved state and continue from the next step after the recorded checkpoint.
3. WHEN the user selects "Start fresh", THE State_Manager SHALL delete the existing State_File and THE Setup_Flow SHALL proceed with the normal initial action prompt.
4. IF the user cancels the Resume_Prompt (e.g., Ctrl+C), THEN THE Setup_Flow SHALL exit without modifying the State_File.

### Requirement 4: Resume from Plugin Installation Checkpoint

**User Story:** As a user who was interrupted during plugin installation, I want to resume and only install the plugins that were not yet installed, so that I do not repeat completed work.

#### Acceptance Criteria

1. WHEN resuming from the `plugin_selection` checkpoint, THE Setup_Flow SHALL skip the plugin selection step and use the previously saved plugin list.
2. WHEN resuming from the `plugin_selection` checkpoint, THE Setup_Flow SHALL attempt to install only the plugins listed in `pendingPlugins` (those not yet in `installedPlugins`).
3. WHEN a pending plugin is successfully installed during a resumed session, THE State_Manager SHALL move that plugin from `pendingPlugins` to `installedPlugins` in the State_File.
4. IF a previously installed plugin fails during a retry in a resumed session, THEN THE State_Manager SHALL move that plugin from `installedPlugins` back to `pendingPlugins`.

### Requirement 5: Resume from Service Installation Checkpoint

**User Story:** As a user who was interrupted during service installation, I want to resume and only install the services that were not yet installed, so that I do not repeat completed work.

#### Acceptance Criteria

1. WHEN resuming from the `plugin_installation` checkpoint, THE Setup_Flow SHALL skip plugin selection and plugin installation, and proceed to the service installation step using the previously installed plugin list.
2. WHEN resuming from the `service_installation` checkpoint, THE Setup_Flow SHALL attempt to install only the services listed in `pendingServices`.
3. WHEN a pending service is successfully installed during a resumed session, THE State_Manager SHALL move that service from `pendingServices` to `installedServices` in the State_File.
4. IF a previously installed service fails during a retry in a resumed session, THEN THE State_Manager SHALL move that service from `installedServices` back to `pendingServices`.
5. THE Setup_Flow SHALL allow skipping service installation steps independently of plugin step status.

### Requirement 6: Resume from Theme Selection Checkpoint

**User Story:** As a user who was interrupted during theme selection, I want to resume directly at theme selection, so that I do not repeat plugin and service steps.

#### Acceptance Criteria

1. WHEN resuming from the `service_installation` checkpoint and all services are resolved, THE Setup_Flow SHALL skip plugin and service steps and proceed directly to theme selection. Service steps MAY be skipped independently of plugin step status.
2. WHEN resuming from the `theme_selection` checkpoint, THE Setup_Flow SHALL apply the previously selected theme without re-prompting the user.

### Requirement 7: State File Cleanup on Completion

**User Story:** As a user who completes setup successfully, I want the state file removed, so that the next run starts cleanly without a stale resume prompt.

#### Acceptance Criteria

1. WHEN the Setup_Flow completes all steps successfully, THE State_Manager SHALL delete the State_File.
2. IF the State_File deletion fails (e.g., permission error), THEN THE State_Manager SHALL log a warning message and continue without interrupting the user.

### Requirement 8: State File Schema Validation

**User Story:** As a user, I want the tool to handle corrupted or outdated state files gracefully, so that I am never stuck in a broken state.

#### Acceptance Criteria

1. WHEN the State_Manager reads the State_File, THE State_Manager SHALL validate that the JSON structure contains all required fields with correct types.
2. IF validation fails, THEN THE State_Manager SHALL mark the State_File as invalid, delete it, and THE Setup_Flow SHALL proceed with a fresh setup.
3. THE State_Manager SHALL include a `version` field in the State_File schema to support future schema migrations.
4. IF the State_File `version` does not match the current expected version, THEN THE State_Manager SHALL mark the State_File as invalid and delete it as a consequence of being invalid.

### Requirement 9: Timestamp Staleness Check

**User Story:** As a user, I want expired state files to be automatically discarded, so that I am not prompted to resume a setup from days ago that is no longer relevant.

#### Acceptance Criteria

1. THE State_Manager SHALL record a `timestamp` field in the State_File representing the time of the last state update.
2. WHEN the State_File `timestamp` is older than 24 hours relative to the current time, THE State_Manager SHALL treat the State_File as expired.
3. WHEN the State_File is expired, THE State_Manager SHALL delete the expired State_File and THE Setup_Flow SHALL proceed with a fresh setup without displaying the Resume_Prompt.
4. ONCE the Setup_Flow has begun a fresh setup (due to expiry or any other reason), THE system SHALL NOT display the Resume_Prompt for the duration of that session.
