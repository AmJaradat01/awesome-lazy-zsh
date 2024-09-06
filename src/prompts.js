/**
 * @author Ali M. Jaradat
 * @email AmJaradat01@gmail.com
 * @since 1-Jan-2022
 * @version 1.0.0
 * @file This file handles user prompts and selections for Awesome-Lazy-Zsh.
 * It provides functions for gathering user input during the setup process.
 * @lastModified 4-Sep-2024
 */

import prompts from 'prompts';

/**
 * Generic function to prompt user selection
 * @param {Object} params - Contains the prompt type, name, message, and choices
 * @returns {String|Null} - The selected option or null if nothing is selected
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
 * Function to prompt user for the initial action
 * @returns {String|Null} - The selected action (freshInstallation, restoreBackup, defaultInstallation)
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
                { title: 'Restore/Backup', value: 'restoreBackup' }
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
