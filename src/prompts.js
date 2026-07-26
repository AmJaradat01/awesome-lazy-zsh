/**
 * User prompt utilities for interactive CLI
 * @author Ali M. Jaradat <AmJaradat01@gmail.com>
 */

import prompts from 'prompts';
import chalk from 'chalk';

/**
 * Generic user selection prompt
 * @param {Object} params - Prompt configuration
 * @param {string} params.type - Prompt type (select, multiselect, etc.)
 * @param {string} params.name - Response property name
 * @param {string} params.message - Prompt message
 * @param {Array} params.choices - Available choices
 * @returns {Promise<string|null>} Selected option or null
 */
export async function getUserSelection({ type, name, message, choices }) {
    try {
        const response = await prompts({
            type,
            name,
            message,
            choices
        });

        if (!response || !response[name]) {
            console.error('No selection made or invalid selection.');
            return null;
        }

        return response[name];
    } catch (error) {
        console.error('Error during user selection:', error);
        return null;
    }
}

/**
 * Prompts user to resume previous setup or start fresh
 * @returns {Promise<'resume'|'fresh'|null>} Selected action or null if cancelled
 */
export async function promptResume() {
    try {
        const response = await prompts({
            type: 'select',
            name: 'action',
            message: 'A previous setup was interrupted. What would you like to do?',
            choices: [
                { title: 'Resume previous setup', value: 'resume' },
                { title: 'Start fresh', value: 'fresh' }
            ]
        });

        if (!response || response.action == null) {
            return null;
        }

        return response.action;
    } catch (error) {
        console.error('Error during resume prompt:', error);
        return null;
    }
}

/**
 * Prompts user for initial setup action
 * @returns {Promise<string|null>} Selected action type
 */
export async function promptInitialAction() {
    try {
        const startOption = await getUserSelection({
            type: 'select',
            name: 'startOption',
            message: 'What do you want to do?',
            choices: [
                { title: 'Start fresh installation', value: 'freshInstallation' },
                { title: 'Default installation', value: 'defaultInstallation' },
                { title: 'Update existing configuration', value: 'updateConfig' },
                { title: 'Analyze & repair .zshrc', value: 'analyzeRepair' },
                { title: 'Restore/Backup', value: 'restoreBackup' },
                { title: 'Update plugins', value: 'updatePlugins' },
                { title: 'Manage profiles', value: 'manageProfiles' },
                { title: 'Add custom plugin', value: 'addCustomPlugin' }
            ]
        });

        if (!startOption) {
            return null;
        }

        return startOption;
    } catch (error) {
        console.error('Error during initial action selection:', error);
        return null;
    }
}

/**
 * Prompts user for configuration update action
 * @returns {Promise<string|null>} Selected action type
 */
export async function promptUpdateConfig() {
    try {
        const action = await getUserSelection({
            type: 'select',
            name: 'action',
            message: 'What would you like to update?',
            choices: [
                { title: 'Add a plugin', value: 'addPlugin' },
                { title: 'Remove a plugin', value: 'removePlugin' },
                { title: 'Change theme', value: 'changeTheme' },
                { title: 'Clean duplicates', value: 'cleanDuplicates' },
                { title: 'Preview changes', value: 'preview' },
                { title: 'Back to main menu', value: 'back' }
            ]
        });

        return action;
    } catch (error) {
        console.error('Error during update config selection:', error);
        return null;
    }
}

/**
 * Prompts user for analyze/repair action
 * @returns {Promise<string|null>} Selected action type
 */
export async function promptAnalyzeRepair() {
    try {
        const action = await getUserSelection({
            type: 'select',
            name: 'action',
            message: 'Analyze & Repair options:',
            choices: [
                { title: 'Show analysis report', value: 'analyze' },
                { title: 'Preview repairs', value: 'previewRepair' },
                { title: 'Apply repairs', value: 'repair' },
                { title: 'Back to main menu', value: 'back' }
            ]
        });

        return action;
    } catch (error) {
        console.error('Error during analyze/repair selection:', error);
        return null;
    }
}

/**
 * Prompts user about an available update
 * @param {Object} updateResult - The update check result
 * @param {string} updateResult.currentVersion - Current installed version
 * @param {string} updateResult.latestVersion - Latest available version
 * @param {'git'|'brew'} updateResult.installMethod - Detected installation method
 * @returns {Promise<'yes'|'no'|'skip'|null>} User's choice or null if cancelled
 */
export async function promptUpdate(updateResult) {
    const { currentVersion, latestVersion, installMethod } = updateResult;
    const method = installMethod === 'git' ? 'git pull' : 'brew upgrade';

    console.log(chalk.yellow(`\n⚡ Update available: v${currentVersion} → v${latestVersion} (via ${method})\n`));

    const response = await prompts({
        type: 'select',
        name: 'action',
        message: 'Would you like to update?',
        choices: [
            { title: 'Yes, update now', value: 'yes' },
            { title: 'No, continue with current version', value: 'no' },
            { title: 'Skip this version', value: 'skip' }
        ]
    });

    if (!response || response.action == null) return null; // Ctrl+C
    return response.action;
}
