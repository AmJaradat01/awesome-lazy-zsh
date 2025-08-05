/**
 * Main entry point for Awesome-Lazy-Zsh
 * Coordinates plugin installation, theme selection, profiles, and system integration
 * @author Ali M. Jaradat <AmJaradat01@gmail.com>
 */

import { promptInitialAction, getUserSelection } from './prompts.js';
import { handleRestoreBackup } from './utils/backupRestore.js';
import { runFreshInstallation, runDefaultInstallation } from './utils/pluginManager.js';
import { chooseTheme, applyDefaultTheme } from './utils/themeManager.js';
import { runCommand } from './utils/commands.js';
import { updateAllPlugins } from './utils/updateManager.js';
import { saveProfile, listProfiles, switchProfile } from './utils/profileManager.js';
import { installCustomPlugin } from './utils/customPlugins.js';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import os from 'os';
import prompts from 'prompts';

const separator = () => console.log(chalk.magentaBright('\n-------------------------\n'));

/**
 * Ensures Oh My Zsh is installed before proceeding
 * @returns {Promise<boolean>} Installation success status
 */
async function ensureOhMyZshInstalled() {
    const ohMyZshPath = path.join(os.homedir(), '.oh-my-zsh');
    
    if (!fs.existsSync(ohMyZshPath)) {
        console.log(chalk.yellow('⚠️ Oh My Zsh is not installed. Installing...'));
        const success = await runCommand('sh -c "$(curl -fsSL https://raw.github.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"');
        
        if (!success || !fs.existsSync(ohMyZshPath)) {
            console.error(chalk.red('❌ Failed to install Oh My Zsh. Please install it manually.'));
            return false;
        }
        
        console.log(chalk.green('✅ Oh My Zsh installed successfully.'));
    } else {
        console.log(chalk.blue('ℹ️ Oh My Zsh is already installed.'));
    }
    
    return true;
}

/**
 * Handles profile management operations (save, switch, list)
 */
async function handleProfileManagement() {
    const action = await getUserSelection({
        type: 'select',
        name: 'action',
        message: 'Profile management:',
        choices: [
            { title: 'Switch profile', value: 'switch' },
            { title: 'Save current as profile', value: 'save' },
            { title: 'List profiles', value: 'list' }
        ]
    });

    if (action === 'switch') {
        const profiles = listProfiles();
        if (profiles.length === 0) {
            console.log(chalk.yellow('⚠️ No profiles found'));
            return;
        }
        const profile = await getUserSelection({
            type: 'select',
            name: 'profile',
            message: 'Select profile:',
            choices: profiles.map(p => ({ title: p, value: p }))
        });
        if (profile) await switchProfile(profile);
    } else if (action === 'save') {
        const { name } = await prompts({ type: 'text', name: 'name', message: 'Profile name:' });
        if (name) {
            saveProfile(name, ['git'], 'robbyrussell');
        }
    } else if (action === 'list') {
        const profiles = listProfiles();
        console.log(chalk.blue('Available profiles:'), profiles.join(', ') || 'None');
    }
}

/**
 * Handles custom plugin installation from user input
 */
async function handleCustomPlugin() {
    const { name } = await prompts({ type: 'text', name: 'name', message: 'Plugin name:' });
    const { repo } = await prompts({ type: 'text', name: 'repo', message: 'Repository URL:' });
    
    if (name && repo) {
        await installCustomPlugin(name, repo);
    }
}

/**
 * Main application entry point
 */
async function main() {
    try {
        console.log(chalk.bold.blue('🚀 Starting Awesome-Lazy-Zsh setup...'));
        separator();

        // Ensure Oh My Zsh is installed
        if (!(await ensureOhMyZshInstalled())) {
            return;
        }
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
            const plugins = await runFreshInstallation();
            if (!plugins) {
                console.error('❌ No plugins installed. Exiting.');
                return;
            }
            separator();
            console.log('✅ Plugin installation complete. Now selecting theme...');
            await chooseTheme(plugins);
            separator();
            console.log('✅ Setup completed successfully.');
        } else if (startOption === 'defaultInstallation') {
            console.log('⚠️ Starting default installation...');
            separator();
            const plugins = await runDefaultInstallation();
            if (!plugins) {
                console.error('❌ No plugins installed. Exiting.');
                return;
            }
            separator();
            console.log('✅ Plugin installation complete. Applying default theme...');
            await applyDefaultTheme(plugins);
            separator();
            console.log('✅ Default setup completed successfully.');
        } else if (startOption === 'updatePlugins') {
            console.log('🔄 Updating plugins...');
            separator();
            await updateAllPlugins();
        } else if (startOption === 'manageProfiles') {
            await handleProfileManagement();
        } else if (startOption === 'addCustomPlugin') {
            await handleCustomPlugin();
        } else {
            console.error('❌ Unknown option selected. Exiting.');
        }
    } catch (error) {
        console.error('❌ An error occurred during the setup process:', error);
    }
}

main();
