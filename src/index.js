/**
 * Main entry point for Awesome-Lazy-Zsh
 * Coordinates plugin installation, theme selection, profiles, and system integration
 * @author Ali M. Jaradat <AmJaradat01@gmail.com>
 */

import { promptInitialAction, getUserSelection, promptResume, promptUpdate } from './prompts.js';
import { handleRestoreBackup } from './utils/backupRestore.js';
import { runFreshInstallation, runDefaultInstallation } from './utils/pluginManager.js';
import { chooseTheme, applyDefaultTheme } from './utils/themeManager.js';
import { runCommand, runCommandSafe } from './utils/commands.js';
import { updateAllPlugins } from './utils/updateManager.js';
import { saveProfile, listProfiles, switchProfile } from './utils/profileManager.js';
import { installCustomPlugin } from './utils/customPlugins.js';
import { readState, writeState, deleteState, validateState, isExpired } from './utils/stateManager.js';
import { updateZshrc } from './utils/zshrcManager.js';
import { pluginRepos } from './utils/config.js';
import { runServiceInstallation } from './utils/serviceInstallFlow.js';
import { checkForUpdate, performUpdate, writeCache, readCache } from './utils/updateChecker.js';
import { fileURLToPath } from 'url';
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
            // Read current plugins and theme from .zshrc
            const zshrcPath = path.join(os.homedir(), '.zshrc');
            let plugins = ['git'];
            let theme = 'robbyrussell';
            
            if (fs.existsSync(zshrcPath)) {
                const content = fs.readFileSync(zshrcPath, 'utf8');
                const pluginMatch = content.match(/plugins=\(([^)]+)\)/);
                if (pluginMatch && pluginMatch[1]) {
                    plugins = pluginMatch[1].split(/\s+/).filter(Boolean);
                }
                const themeMatch = content.match(/ZSH_THEME="([^"]+)"/);
                if (themeMatch && themeMatch[1]) {
                    theme = themeMatch[1];
                }
            }
            
            saveProfile(name, plugins, theme);
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
    console.log(chalk.blue('\nℹ️ Browse plugins: https://github.com/unixorn/awesome-zsh-plugins\n'));

    const { repo } = await prompts({ type: 'text', name: 'repo', message: 'Repository URL (e.g. https://github.com/user/plugin.git):' });
    
    if (!repo) return;

    // Validate URL before proceeding
    const { validateRepoUrl, validatePluginName } = await import('./utils/customPlugins.js');
    const urlCheck = validateRepoUrl(repo);
    if (!urlCheck.valid) {
        console.log(chalk.red(`❌ ${urlCheck.reason}`));
        return;
    }

    // Extract plugin name from URL (last path segment, minus .git)
    const name = path.basename(repo.replace(/\.git$/, ''));

    // Validate extracted plugin name
    const nameCheck = validatePluginName(name);
    if (!nameCheck.valid) {
        console.log(chalk.red(`❌ Could not extract a valid plugin name from URL: ${nameCheck.reason}`));
        return;
    }

    console.log(chalk.cyan(`📦 Plugin name: ${name}`));

    const success = await installCustomPlugin(name, repo);
    if (success) {
        // Add to .zshrc plugins array
        const zshrcPath = path.join(os.homedir(), '.zshrc');
        if (fs.existsSync(zshrcPath)) {
            let content = fs.readFileSync(zshrcPath, 'utf8');
            const pluginMatch = content.match(/plugins=\(([^)]+)\)/);
            if (pluginMatch) {
                const currentPlugins = pluginMatch[1].split(/\s+/).filter(Boolean);
                if (!currentPlugins.includes(name)) {
                    currentPlugins.push(name);
                    content = content.replace(/plugins=\([^)]+\)/, `plugins=(${currentPlugins.join(' ')})`);
                    fs.writeFileSync(zshrcPath, content, { encoding: 'utf8', mode: 0o600 });
                    console.log(chalk.green(`✅ ${name} added to .zshrc plugins`));
                    console.log(chalk.yellow(`⚠️ Run 'source ~/.zshrc' to activate`));
                }
            }
        }
    }
}

/**
 * Installs a single plugin by name (mirrors logic from pluginManager).
 * @param {string} pluginName - Plugin name to install
 * @returns {Promise<boolean>} Installation success status
 */
async function installSinglePlugin(pluginName) {
    const repoUrl = pluginRepos[pluginName];

    if (!repoUrl || repoUrl === '') {
        console.log(chalk.blue(`ℹ️ ${pluginName} is a built-in Oh My Zsh plugin.`));
        return true;
    }

    if (repoUrl === 'alias-only') {
        console.log(chalk.blue(`ℹ️ ${pluginName} will be loaded as a custom alias file.`));
        return true;
    }

    const pluginPath = path.join(os.homedir(), `.oh-my-zsh/custom/plugins/${pluginName}`);

    if (fs.existsSync(pluginPath)) {
        console.log(chalk.blue(`ℹ️ ${pluginName} plugin is already installed.`));
        return true;
    }

    try {
        console.log(chalk.yellow(`⚠️ Installing ${pluginName} plugin...`));
        
        // Parse pinned tag from URL (format: "url#tag")
        const hashIndex = repoUrl.indexOf('#');
        const url = hashIndex === -1 ? repoUrl : repoUrl.substring(0, hashIndex);
        const tag = hashIndex === -1 ? null : repoUrl.substring(hashIndex + 1);
        
        const cloneArgs = ['clone', '--depth', '1'];
        if (tag) {
            cloneArgs.push('--branch', tag);
        }
        cloneArgs.push(url, pluginPath);
        
        await runCommandSafe('git', cloneArgs);

        if (fs.existsSync(pluginPath)) {
            console.log(chalk.green(`✅ ${pluginName} plugin installed successfully.`));
            return true;
        } else {
            throw new Error('Plugin directory not created');
        }
    } catch (error) {
        console.error(chalk.red(`❌ Failed to install ${pluginName}: ${error.message}`));
        return false;
    }
}

/**
 * Resumes setup from a previously saved checkpoint.
 * @param {Object} state - The validated state object to resume from.
 */
async function resumeFromCheckpoint(state) {
    const checkpoint = state.checkpoint;

    console.log(chalk.bold.blue(`🔄 Resuming setup from checkpoint: ${checkpoint}`));
    separator();

    try {
        if (checkpoint === 'plugin_selection') {
            // Install pending plugins
            const pending = state.pendingPlugins || [];
            const installed = [...(state.installedPlugins || [])];

            if (pending.length > 0) {
                console.log(chalk.bold.cyan(`📦 Installing ${pending.length} remaining plugin(s)...`));

                for (const plugin of pending) {
                    const success = await installSinglePlugin(plugin);
                    if (success) {
                        installed.push(plugin);
                        writeState({
                            installedPlugins: installed,
                            pendingPlugins: pending.filter(p => p !== plugin)
                        });
                    } else {
                        console.log(chalk.yellow(`⚠️ Skipping ${plugin}, will continue with remaining plugins.`));
                    }
                }
            }

            console.log(chalk.green(`✅ Plugin installation complete.`));
            separator();

            // Proceed to service installation
            console.log(chalk.bold.cyan('🔧 Proceeding to service installation...'));
            try {
                await runServiceInstallation(installed);
            } catch (error) {
                console.log(chalk.yellow(`⚠️ Service installation step failed: ${error.message}`));
            }
            separator();

            // Proceed to theme selection
            console.log(chalk.bold.cyan('🎨 Proceeding to theme selection...'));
            await chooseTheme(installed);
            separator();

        } else if (checkpoint === 'plugin_installation') {
            // Skip plugins, go to service installation
            const installed = state.installedPlugins || [];

            console.log(chalk.bold.cyan('🔧 Proceeding to service installation...'));
            try {
                await runServiceInstallation(installed);
            } catch (error) {
                console.log(chalk.yellow(`⚠️ Service installation step failed: ${error.message}`));
            }
            separator();

            // Proceed to theme selection
            console.log(chalk.bold.cyan('🎨 Proceeding to theme selection...'));
            await chooseTheme(installed);
            separator();

        } else if (checkpoint === 'service_installation') {
            // Skip plugins and services, go to theme selection
            const installed = state.installedPlugins || [];

            console.log(chalk.bold.cyan('🎨 Proceeding to theme selection...'));
            await chooseTheme(installed);
            separator();

        } else if (checkpoint === 'theme_selection') {
            // Apply saved theme directly without re-prompting
            const installed = state.installedPlugins || [];
            const theme = state.selectedTheme;

            if (theme) {
                console.log(chalk.green(`✅ Applying previously selected theme: ${theme}`));
                await updateZshrc(installed, theme);
            } else {
                console.log(chalk.yellow('⚠️ No theme was saved, applying default theme.'));
                await updateZshrc(installed, 'robbyrussell');
            }
            separator();
        }

        // Cleanup state file on successful completion
        deleteState();
        console.log(chalk.green.bold('✅ Setup resumed and completed successfully!'));

    } catch (error) {
        console.error(chalk.red(`❌ Error during resumed setup: ${error.message}`));
        console.log(chalk.yellow('⚠️ Your progress has been saved. You can try resuming again.'));
    }
}

/**
 * Main application entry point
 */
async function main() {
    try {
        // Read version from package.json
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const pkgPath = path.resolve(__dirname, '..', 'package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const version = pkg.version;

        separator();

        // Update check
        const updateResult = await checkForUpdate();
        if (updateResult && updateResult.updateAvailable && !updateResult.skipped) {
            const choice = await promptUpdate(updateResult);
            if (choice === 'yes') {
                const result = await performUpdate(updateResult.installMethod);
                if (result.success) {
                    console.log(chalk.green.bold('\n✅ Updated successfully! Please re-run awesome-lazy-zsh.\n'));
                    process.exit(0);
                }
                // If update failed, continue to normal flow
                separator();
            } else if (choice === 'skip') {
                const cache = readCache();
                writeCache({ ...cache, latestVersion: updateResult.latestVersion, skippedVersion: updateResult.latestVersion });
                separator();
            }
            // 'no' or null (Ctrl+C): just continue
            if (choice !== 'yes' && choice !== 'skip') {
                separator();
            }
        }

        // Ensure Oh My Zsh is installed
        if (!(await ensureOhMyZshInstalled())) {
            return;
        }
        separator();

        // Resume detection
        const existingState = readState();
        if (existingState) {
            if (!validateState(existingState) || isExpired(existingState)) {
                deleteState();
                // Fall through to normal flow
            } else {
                const choice = await promptResume();
                if (choice === 'resume') {
                    await resumeFromCheckpoint(existingState);
                    return;
                } else if (choice === 'fresh') {
                    deleteState();
                    // Fall through to normal flow
                } else {
                    // Ctrl+C — exit without touching state
                    return;
                }
            }
        }

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
            deleteState();
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
            deleteState();
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
