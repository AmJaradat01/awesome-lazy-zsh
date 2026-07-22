/**
 * Theme installation and management utilities
 * @author Ali M. Jaradat <AmJaradat01@gmail.com>
 */

import { getUserSelection } from '../prompts.js';
import { runCommand } from './commands.js';
import fs from 'fs';
import os from 'os';
import chalk from 'chalk';
import { themeRepos } from './config.js';  // Import theme repository mappings
import { updateZshrc } from './zshrcManager.js';
import { writeState } from './stateManager.js';

/**
 * Installs a theme with validation and fallback
 * @param {string} themeName - Theme name to install
 * @returns {Promise<boolean>} Installation success status
 */
async function installTheme(themeName) {
    const repoUrl = themeRepos[themeName];
    
    if (!repoUrl || repoUrl === '') {
        console.log(chalk.blue(`ℹ️ ${themeName} is a built-in Oh My Zsh theme.`));
        return true;
    }

    const themePath = `${os.homedir()}/.oh-my-zsh/custom/themes/${themeName}`;
    const themeFile = `${themePath}/${themeName}.zsh-theme`;
    const symlinkPath = `${os.homedir()}/.oh-my-zsh/custom/themes/${themeName}.zsh-theme`;
    
    if (fs.existsSync(themePath)) {
        console.log(chalk.blue(`ℹ️ ${themeName} theme is already installed.`));
        // Ensure symlink exists even if theme was installed by a previous version
        if (fs.existsSync(themeFile) && !fs.existsSync(symlinkPath)) {
            fs.symlinkSync(themeFile, symlinkPath);
        }
        return true;
    }

    try {
        console.log(chalk.yellow(`⚠️ Installing ${themeName} theme...`));
        const success = await runCommand(`git clone ${repoUrl} ${themePath}`);
        
        if (success && fs.existsSync(themePath)) {
            // Create symlink for Oh My Zsh to find the theme
            // Oh My Zsh looks for custom/themes/<name>.zsh-theme
            if (fs.existsSync(themeFile) && !fs.existsSync(symlinkPath)) {
                fs.symlinkSync(themeFile, symlinkPath);
            }
            console.log(chalk.green(`✅ ${themeName} theme installed successfully.`));
            return true;
        } else {
            throw new Error('Theme directory not created');
        }
    } catch (error) {
        console.error(chalk.red(`❌ Failed to install ${themeName} theme: ${error.message}`));
        return false;
    }
}

/**
 * Interactive theme selection and application
 * @param {string[]} plugins - Installed plugins for .zshrc generation
 */
export async function chooseTheme(plugins = []) {
    const themes = Object.keys(themeRepos);

    console.log(chalk.bold.blue('Select a theme to apply:'));
    const selectedTheme = await getUserSelection({
        type: 'select',
        name: 'selectedTheme',
        message: 'Choose a theme to apply:',
        choices: themes.map(theme => ({ title: theme, value: theme }))
    });

    if (!selectedTheme) {
        console.error(chalk.red('❌ No theme selected. Using default theme.'));
        updateZshrc(plugins, 'robbyrussell');
        return;
    }

    console.log(chalk.bold.cyan('Selected theme:'), selectedTheme);

    // Save state checkpoint: theme selection complete
    writeState({
        checkpoint: 'theme_selection',
        selectedTheme: selectedTheme
    });

    const success = await installTheme(selectedTheme);

    if (success) {
        console.log(chalk.green(`✅ Applying theme: ${selectedTheme}`));
        await updateZshrc(plugins, selectedTheme);
    } else {
        console.log(chalk.yellow(`⚠️ Failed to install ${selectedTheme}, using default theme.`));
        await updateZshrc(plugins, 'robbyrussell');
    }
}

/**
 * Applies default theme with fallback handling
 * @param {string[]} plugins - Installed plugins for .zshrc generation
 */
export async function applyDefaultTheme(plugins) {
    const defaultTheme = 'spaceship';
    console.log(chalk.green(`✅ Applying default theme: ${defaultTheme}`));
    
    const success = await installTheme(defaultTheme);
    
    if (success) {
        await updateZshrc(plugins, defaultTheme);
        console.log(chalk.green.bold('✅ Default theme applied successfully.'));
    } else {
        console.log(chalk.yellow(`⚠️ Failed to install ${defaultTheme}, using built-in theme.`));
        await updateZshrc(plugins, 'robbyrussell');
        console.log(chalk.green.bold('✅ Built-in theme applied successfully.'));
    }
}
