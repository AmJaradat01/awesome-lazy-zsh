# Requirements Document

## Introduction

This feature adds an update notification and self-update system to awesome-lazy-zsh. On startup, the tool checks whether a newer version is available on GitHub and prompts the user to update. If the user accepts, the tool performs the update automatically based on the installation method (git clone or Homebrew). The check is throttled to avoid excessive API calls and handles network failures gracefully so offline users are never impacted.

## Glossary

- **CLI**: The awesome-lazy-zsh Node.js command-line application started via `node src/index.js`
- **Update_Checker**: The module responsible for fetching the latest release version from the GitHub API and comparing it to the current local version
- **Update_Prompt**: The interactive Y/N prompt that asks the user whether to perform the update
- **Update_Executor**: The component that performs the actual update (git pull or brew upgrade) based on the detected installation method
- **Version_Cache**: A local JSON file that stores the result of the last version check along with a timestamp to enable throttling
- **Current_Version**: The version string defined in the project's package.json (`"version"` field)
- **Latest_Version**: The version tag name returned by the GitHub Releases API for the latest release
- **Check_Interval**: The minimum elapsed time (24 hours) between consecutive GitHub API requests
- **GitHub_API**: The public endpoint `https://api.github.com/repos/AmJaradat01/awesome-lazy-zsh/releases/latest`
- **Install_Method**: How the user installed the tool — either "git" (cloned repository) or "brew" (Homebrew formula)

## Requirements

### Requirement 1: Fetch Latest Version from GitHub

**User Story:** As a user, I want the tool to check for the latest release version on GitHub, so that I can be informed when a newer version is available.

#### Acceptance Criteria

1. WHEN the CLI starts and the Check_Interval has elapsed since the last check, THE Update_Checker SHALL send a GET request to the GitHub_API to retrieve the latest release tag name
2. WHEN the GitHub_API responds with an HTTP 200 status and a JSON body containing a non-empty `tag_name` field, THE Update_Checker SHALL extract the version string from the `tag_name` field, stripping any leading `v` prefix
3. WHEN the GitHub_API responds with a valid release payload, THE Update_Checker SHALL store the extracted Latest_Version and the current timestamp as an ISO 8601 UTC string in the Version_Cache
4. IF the GitHub_API request fails due to a network error, non-200 response, malformed JSON body, or a missing `tag_name` field, THEN THE Update_Checker SHALL silently proceed without displaying an error or interrupting the startup flow
5. IF the extracted version string after stripping the `v` prefix does not conform to the semantic versioning format (major.minor.patch where each segment is a non-negative integer), THEN THE Update_Checker SHALL discard the result and silently proceed without updating the Version_Cache
6. IF the Update_Checker fails to write to the Version_Cache due to a filesystem error, THEN THE Update_Checker SHALL silently proceed without interrupting the startup flow

### Requirement 2: Compare Versions

**User Story:** As a user, I want the tool to determine whether the latest version is newer than my installed version, so that I only receive a notification when an actual update is available.

#### Acceptance Criteria

1. WHEN the Latest_Version is retrieved, THE Update_Checker SHALL compare it to the Current_Version by parsing each version as three numeric segments (major.minor.patch) and evaluating them in order of precedence: major first, then minor, then patch
2. WHEN the Latest_Version has a higher major, minor, or patch number than the Current_Version (evaluated left to right), THE Update_Checker SHALL indicate that an update is available
3. WHEN the Latest_Version is equal to or lower than the Current_Version, THE Update_Checker SHALL indicate that no update is available
4. IF either the Latest_Version or Current_Version cannot be parsed as a valid three-segment numeric version (major.minor.patch), THEN THE Update_Checker SHALL treat the comparison as inconclusive and indicate that no update is available
5. IF the Latest_Version contains a pre-release suffix (e.g., "1.0.0-beta.1"), THEN THE Update_Checker SHALL treat it as lower than the same version without a suffix and compare accordingly

### Requirement 3: Display Update Prompt

**User Story:** As a user, I want to be asked whether I'd like to update now, so that I can choose to update immediately or continue with my current version.

#### Acceptance Criteria

1. WHEN an update is available, THE Update_Prompt SHALL display a styled notice showing the Current_Version and the Latest_Version, followed by an interactive prompt asking whether to update now
2. THE Update_Prompt SHALL present three choices: "Yes, update now", "No, continue with current version", and "Skip this version"
3. WHEN the user selects "Yes, update now", THE Update_Executor SHALL perform the update
4. WHEN the user selects "No, continue with current version", THE CLI SHALL proceed to the normal startup flow without modifying anything
5. WHEN the user selects "Skip this version", THE Version_Cache SHALL record the skipped version so the user is not prompted again for that specific version
6. IF the user cancels the prompt (Ctrl+C), THEN THE CLI SHALL proceed to the normal startup flow without modifying the Version_Cache
7. THE Update_Prompt SHALL be displayed after the startup banner and before the main menu prompt
8. THE Update_Prompt SHALL format the notice using chalk styling consistent with the existing CLI visual style (emoji-prefixed, chalk.yellow for notice, chalk.bold for versions)
9. WHEN no update is available, THE CLI SHALL not display any update-related output or prompts

### Requirement 4: Detect Installation Method

**User Story:** As a user, I want the tool to automatically determine how I installed it, so that the correct update command is used.

#### Acceptance Criteria

1. THE Update_Executor SHALL detect the Install_Method by checking whether the project directory contains a `.git` directory
2. IF a `.git` directory exists at the project root, THEN THE Install_Method SHALL be "git"
3. IF no `.git` directory exists at the project root, THEN THE Install_Method SHALL be "brew"
4. THE Update_Prompt SHALL display the appropriate update method in the prompt message (e.g., "via git pull" or "via brew upgrade")

### Requirement 5: Perform Update via Git

**User Story:** As a user who installed via git clone, I want the tool to run git pull to update itself, so that I get the latest code without manual steps.

#### Acceptance Criteria

1. WHEN the Install_Method is "git" and the user accepts the update, THE Update_Executor SHALL run `git pull origin master` in the project root directory
2. IF `git pull` succeeds (exit code 0), THEN THE Update_Executor SHALL display a success message and run `npm install` to update dependencies
3. IF `npm install` succeeds, THEN THE Update_Executor SHALL display a completion message instructing the user to re-run the tool
4. IF `git pull` fails (non-zero exit code), THEN THE Update_Executor SHALL display an error message with the failure output and proceed to the normal startup flow without crashing
5. IF `npm install` fails after a successful git pull, THEN THE Update_Executor SHALL display a warning and proceed to the normal startup flow

### Requirement 6: Perform Update via Homebrew

**User Story:** As a user who installed via Homebrew, I want the tool to run brew upgrade to update itself, so that I get the latest formula without manual steps.

#### Acceptance Criteria

1. WHEN the Install_Method is "brew" and the user accepts the update, THE Update_Executor SHALL run `brew upgrade awesome-lazy-zsh`
2. IF `brew upgrade` succeeds (exit code 0), THEN THE Update_Executor SHALL display a success message instructing the user to re-run the tool
3. IF `brew upgrade` fails (non-zero exit code), THEN THE Update_Executor SHALL display an error message with the failure output and proceed to the normal startup flow without crashing

### Requirement 7: Throttle Update Checks

**User Story:** As a user, I want the tool to limit how often it contacts GitHub, so that my startup time is not impacted on every run and I respect API rate limits.

#### Acceptance Criteria

1. THE Version_Cache SHALL persist the timestamp of the last successful version check, the retrieved Latest_Version, and optionally a skipped version as a JSON file in the user's home directory
2. WHEN the CLI starts and the elapsed time since the last check is less than the Check_Interval (24 hours), THE Update_Checker SHALL skip the network request and use the cached Latest_Version for comparison
3. WHEN no Version_Cache file exists, THE Update_Checker SHALL treat the check as overdue and perform a fresh request to the GitHub_API
4. IF the Version_Cache file cannot be parsed as valid JSON or is missing the required timestamp or Latest_Version fields, THEN THE Update_Checker SHALL delete the file and perform a fresh request to the GitHub_API
5. IF the Version_Cache file contains a timestamp that is in the future relative to the current system time, THEN THE Update_Checker SHALL treat the check as overdue and perform a fresh request to the GitHub_API
6. IF the Version_Cache contains a `skippedVersion` field that matches the Latest_Version, THEN THE CLI SHALL not display the Update_Prompt for that version

### Requirement 8: Non-Blocking Version Check

**User Story:** As a user, I want the version check to be fast, so that my startup is not noticeably delayed.

#### Acceptance Criteria

1. THE Update_Checker SHALL enforce a maximum timeout of 5 seconds on the GitHub_API request
2. IF the timeout is exceeded, THEN THE Update_Checker SHALL abort the request and proceed without displaying the Update_Prompt
3. THE version check and cache read SHALL complete before the Oh My Zsh installation check, so the prompt can be shown at the appropriate time in the startup sequence
