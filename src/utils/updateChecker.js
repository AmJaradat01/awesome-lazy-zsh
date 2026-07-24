/**
 * Update checker utilities for awesome-lazy-zsh
 * @author Ali M. Jaradat <AmJaradat01@gmail.com>
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import chalk from 'chalk';

/** Path to the version cache file in the user's home directory. */
export const CACHE_FILE_PATH = path.join(os.homedir(), '.awesome-lazy-zsh-update-cache.json');

/** Check interval: 24 hours in milliseconds. */
export const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * @typedef {Object} ParsedVersion
 * @property {number} major - Major version number
 * @property {number} minor - Minor version number
 * @property {number} patch - Patch version number
 * @property {string|null} prerelease - Pre-release suffix or null
 */

/**
 * Parses a version string into its components.
 * Strips leading "v" prefix. Parses major.minor.patch.
 * Handles pre-release suffixes (e.g., "1.0.0-beta.1").
 * @param {string} version - The version string to parse.
 * @returns {ParsedVersion|null} Parsed version object or null for invalid input.
 */
export function parseVersion(version) {
    if (typeof version !== 'string') {
        return null;
    }

    // Strip leading "v" prefix
    let v = version.trim();
    if (v.startsWith('v')) {
        v = v.slice(1);
    }

    // Match: digits.digits.digits with optional -prerelease suffix
    const match = v.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
    if (!match) {
        return null;
    }

    const major = parseInt(match[1], 10);
    const minor = parseInt(match[2], 10);
    const patch = parseInt(match[3], 10);
    const prerelease = match[4] || null;

    // Validate that segments are non-negative integers (no leading zeros for multi-digit)
    if (!Number.isFinite(major) || !Number.isFinite(minor) || !Number.isFinite(patch)) {
        return null;
    }

    return { major, minor, patch, prerelease };
}

/**
 * Compares two version strings.
 * Returns 1 if a > b, -1 if a < b, 0 if equal, null if either invalid.
 * Evaluates segments left-to-right: major > minor > patch.
 * Pre-release versions compare lower than same version without suffix.
 * @param {string} a - First version string.
 * @param {string} b - Second version string.
 * @returns {1|-1|0|null} Comparison result or null if either version is invalid.
 */
export function compareVersions(a, b) {
    const parsedA = parseVersion(a);
    const parsedB = parseVersion(b);

    if (parsedA === null || parsedB === null) {
        return null;
    }

    // Compare major
    if (parsedA.major > parsedB.major) return 1;
    if (parsedA.major < parsedB.major) return -1;

    // Compare minor
    if (parsedA.minor > parsedB.minor) return 1;
    if (parsedA.minor < parsedB.minor) return -1;

    // Compare patch
    if (parsedA.patch > parsedB.patch) return 1;
    if (parsedA.patch < parsedB.patch) return -1;

    // Same major.minor.patch — handle pre-release
    // A version with pre-release is lower than the same version without
    if (parsedA.prerelease && !parsedB.prerelease) return -1;
    if (!parsedA.prerelease && parsedB.prerelease) return 1;

    // Both have no pre-release — equal
    if (!parsedA.prerelease && !parsedB.prerelease) return 0;

    // Both have pre-release — compare lexicographically
    if (parsedA.prerelease < parsedB.prerelease) return -1;
    if (parsedA.prerelease > parsedB.prerelease) return 1;

    return 0;
}

/**
 * Reads and validates the version cache file from disk.
 * Returns null if the file doesn't exist, is unreadable, or contains invalid data.
 * Deletes corrupt/invalid files before returning null.
 * @returns {import('./updateChecker.js').VersionCache|null} The parsed cache object, or null on failure.
 */
export function readCache() {
    try {
        const content = fs.readFileSync(CACHE_FILE_PATH, 'utf8');
        const data = JSON.parse(content);

        // Validate latestVersion is a string matching semver pattern
        if (typeof data.latestVersion !== 'string' || !/^\d+\.\d+\.\d+$/.test(data.latestVersion)) {
            try { fs.unlinkSync(CACHE_FILE_PATH); } catch {}
            return null;
        }

        // Validate checkedAt is a valid ISO 8601 date string
        if (typeof data.checkedAt !== 'string' || Number.isNaN(new Date(data.checkedAt).getTime())) {
            try { fs.unlinkSync(CACHE_FILE_PATH); } catch {}
            return null;
        }

        // Validate skippedVersion if present: must be string or null
        if (data.skippedVersion !== undefined && data.skippedVersion !== null && typeof data.skippedVersion !== 'string') {
            try { fs.unlinkSync(CACHE_FILE_PATH); } catch {}
            return null;
        }

        return {
            latestVersion: data.latestVersion,
            checkedAt: data.checkedAt,
            skippedVersion: data.skippedVersion || null
        };
    } catch (error) {
        // If file exists but couldn't be parsed (corrupt), delete it
        if (error instanceof SyntaxError || (error.code && error.code !== 'ENOENT')) {
            try { fs.unlinkSync(CACHE_FILE_PATH); } catch {}
        }
        return null;
    }
}

/**
 * Writes the version cache atomically via a temporary file + rename.
 * Always sets checkedAt to the current ISO timestamp.
 * Fails silently on any error.
 * @param {Object} cache - Cache object to write (latestVersion required, skippedVersion optional).
 */
export function writeCache(cache) {
    try {
        const data = {
            latestVersion: cache.latestVersion,
            checkedAt: new Date().toISOString(),
            skippedVersion: cache.skippedVersion || null
        };
        const tmpPath = CACHE_FILE_PATH + '.tmp';
        fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o600 });
        fs.renameSync(tmpPath, CACHE_FILE_PATH);
    } catch {
        // Fail silently — no logging, no throwing
    }
}

/**
 * Determines if a cache entry is still fresh (checked within the last 24 hours).
 * Returns false for future timestamps or invalid/unparseable dates.
 * @param {Object} cache - Cache object with a checkedAt field (ISO 8601 string).
 * @returns {boolean} True if the cache is fresh, false otherwise.
 */
export function isCacheFresh(cache) {
    try {
        if (!cache || typeof cache.checkedAt !== 'string') {
            return false;
        }

        const checkedAt = new Date(cache.checkedAt).getTime();

        // Invalid date
        if (Number.isNaN(checkedAt)) {
            return false;
        }

        const now = Date.now();

        // Future timestamp — treat as stale
        if (checkedAt > now) {
            return false;
        }

        // Within 24h interval
        return (now - checkedAt) <= CHECK_INTERVAL_MS;
    } catch {
        return false;
    }
}

/**
 * @typedef {Object} UpdateResult
 * @property {boolean} updateAvailable - True if latest > current
 * @property {boolean} skipped - True if this version was previously skipped
 * @property {string} currentVersion - Local version from package.json
 * @property {string} latestVersion - Version from GitHub or cache
 * @property {'git'|'brew'} installMethod - Detected installation method
 */

/**
 * Checks for available updates by orchestrating cache read, GitHub API fetch,
 * version comparison, and install method detection.
 * Never rejects — resolves null on any error.
 * @returns {Promise<UpdateResult|null>} The update result or null on failure.
 */
export async function checkForUpdate() {
    try {
        // 1. Read current version from package.json
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const pkgPath = path.resolve(__dirname, '..', '..', 'package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const currentVersion = pkg.version;

        // 2. Read cache
        const cache = readCache();
        let latestVersion;

        if (cache && isCacheFresh(cache)) {
            latestVersion = cache.latestVersion;
        } else {
            // 3. Fetch from GitHub API with 5s timeout
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(
                'https://api.github.com/repos/AmJaradat01/awesome-lazy-zsh/releases/latest',
                {
                    signal: controller.signal,
                    headers: { 'User-Agent': 'awesome-lazy-zsh' }
                }
            );
            clearTimeout(timeout);

            if (!response.ok) return null;

            const data = await response.json();
            if (!data.tag_name) return null;

            // Strip "v" prefix
            latestVersion = data.tag_name.replace(/^v/, '');

            // Validate it's valid semver
            if (!parseVersion(latestVersion)) return null;

            // Write to cache
            writeCache({ latestVersion, skippedVersion: cache?.skippedVersion || null });
        }

        // 4. Compare versions
        const cmpResult = compareVersions(latestVersion, currentVersion);
        if (cmpResult === null) return null;

        const updateAvailable = cmpResult === 1;
        const skipped = cache?.skippedVersion === latestVersion;
        const installMethod = detectInstallMethod();

        return { updateAvailable, skipped, currentVersion, latestVersion, installMethod };
    } catch {
        return null;
    }
}

/**
 * Detects the installation method by checking for a .git directory at the project root.
 * @returns {'git'|'brew'} The detected installation method.
 */
export function detectInstallMethod() {
    try {
        // Resolve project root from this file's location
        // This file is at src/utils/updateChecker.js, so project root is ../../
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const projectRoot = path.resolve(__dirname, '..', '..');
        const gitDir = path.join(projectRoot, '.git');

        if (fs.existsSync(gitDir)) {
            return 'git';
        }
        return 'brew';
    } catch {
        return 'brew'; // Default to brew on error
    }
}

/**
 * Runs a shell command and returns the result.
 * @param {string} command - The command to execute.
 * @param {string} [cwd] - Optional working directory.
 * @returns {Promise<{success: boolean, output: string}>} Result with success status and output.
 */
function runCommand(command, cwd) {
    return new Promise((resolve) => {
        exec(command, { cwd }, (error, stdout, stderr) => {
            if (error) {
                resolve({ success: false, output: stderr || error.message });
            } else {
                resolve({ success: true, output: stdout.trim() });
            }
        });
    });
}

/**
 * Performs the update based on the detected installation method.
 * For 'git': runs `git pull origin master` then `npm install`.
 * For 'brew': runs `brew upgrade awesome-lazy-zsh`.
 * Displays progress with chalk styling and handles failures gracefully.
 * @param {'git'|'brew'} installMethod - The installation method.
 * @returns {Promise<{success: boolean, message: string}>} Result of the update operation.
 */
export async function performUpdate(installMethod) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const projectRoot = path.resolve(__dirname, '..', '..');

    try {
        if (installMethod === 'git') {
            console.log(chalk.blue('📦 Updating via git pull...'));
            const pullResult = await runCommand('git pull origin master', projectRoot);
            if (!pullResult.success) {
                console.log(chalk.red(`❌ git pull failed: ${pullResult.output}`));
                return { success: false, message: pullResult.output };
            }
            console.log(chalk.green('✅ Code updated successfully.'));

            console.log(chalk.blue('📦 Installing dependencies...'));
            const npmResult = await runCommand('npm install', projectRoot);
            if (!npmResult.success) {
                console.log(chalk.yellow(`⚠️ npm install failed: ${npmResult.output}`));
                // Still consider it a success since code was pulled
                return { success: true, message: 'Code updated, but npm install failed. Please run npm install manually.' };
            }
            console.log(chalk.green('✅ Dependencies updated.'));
            return { success: true, message: 'Updated successfully via git pull.' };

        } else {
            // brew
            console.log(chalk.blue('📦 Updating via brew upgrade...'));
            const brewResult = await runCommand('brew upgrade awesome-lazy-zsh');
            if (!brewResult.success) {
                console.log(chalk.red(`❌ brew upgrade failed: ${brewResult.output}`));
                return { success: false, message: brewResult.output };
            }
            console.log(chalk.green('✅ Updated via Homebrew.'));
            return { success: true, message: 'Updated successfully via brew upgrade.' };
        }
    } catch (error) {
        console.log(chalk.red(`❌ Update failed: ${error.message}`));
        return { success: false, message: error.message };
    }
}
