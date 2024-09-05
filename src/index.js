/**
 * @author Ali M. Jaradat
 * @email AmJaradat01@gmail.com
 * @since 1-Jan-2022
 * @version 1.0.0
 * @file This is the main entry point for Awesome-Lazy-Zsh.
 * It coordinates plugin installation, theme selection, and backup/restore functionality.
 * @lastModified 4-Sep-2024
 */

import { promptInitialAction } from './prompts.js';
import { handleRestoreBackup } from './utils/backupRestore.js';
import { runFreshInstallation, runDefaultInstallation } from './utils/pluginManager.js';
import { chooseTheme, applyDefaultTheme } from './utils/themeManager.js';
import chalk from 'chalk';

const separator = () => console.log(chalk.magentaBright('\n-------------------------\n'));

async function main() {
    try {
        console.log(chalk.bold.blue('🚀 Starting Awesome-Lazy-Zsh setup...'));
        separator();

        const startOption = await promptInitialAction();

        if (!startOption) {
            console.error('❌ No valid option selected. Exiting.');
            return;
        }

        if (startOption === 'restoreBackup') {
            console.log('⚠️ Starting backup/restore process...');
            separator();
            await handleRestoreBackup();
        } else if (startOption === 'freshInstallation') {
            console.log('⚠️ Starting fresh installation...');
            separator();
            const plugins = await runFreshInstallation();  // Ensure this returns selected plugins
            if (!plugins) {
                console.error('❌ No plugins installed. Exiting.');
                return;
            }
            separator();
            console.log('✅ Plugin installation complete. Now selecting theme...');
            await chooseTheme(plugins);  // Pass selected plugins for theme generation
            separator();
            console.log('✅ Setup completed successfully.');
        } else if (startOption === 'defaultInstallation') {
            console.log('⚠️ Starting default installation...');
            separator();
            const plugins = await runDefaultInstallation();  // Ensure default plugins are passed
            if (!plugins) {
                console.error('❌ No plugins installed. Exiting.');
                return;
            }
            separator();
            console.log('✅ Plugin installation complete. Applying default theme...');
            await applyDefaultTheme(plugins);  // Pass default plugins for theme generation
            separator();
            console.log('✅ Default setup completed successfully.');
        } else {
            console.error('❌ Unknown option selected. Exiting.');
        }
    } catch (error) {
        console.error('❌ An error occurred during the setup process:', error);
    }
}

main();
