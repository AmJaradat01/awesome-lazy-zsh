/**
 * User prompt utilities for interactive CLI
 * @author Ali M. Jaradat <AmJaradat01@gmail.com>
 */

import prompts from 'prompts';

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
