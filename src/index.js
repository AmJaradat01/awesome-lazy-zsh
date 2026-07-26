/**
 * Main entry point for Awesome-Lazy-Zsh
 * Coordinates plugin installation, theme selection, profiles, and system integration
 * @author Ali M. Jaradat <AmJaradat01@gmail.com>
 */

import { promptInitialAction, getUserSelection, promptResume, promptUpdate, promptUpdateConfig, promptAnalyzeRepair } from './prompts.js';
import { handleRestoreBackup } from './utils/backupRestore.js';
import { runFreshInstallation, runDefaultInstallation } from './utils/pluginManager.js';
import { chooseTheme, applyDefaultTheme } from './utils/themeManager.js';
import { runCommandSafe } from './utils/commands.js';
import { updateAllPlugins } from './utils/updateManager.js';
import { saveProfile, listProfiles, switchProfile } from './utils/profileManager.js';
import { installCustomPlugin, loadCustomPlugins } from './utils/customPlugins.js';
import { readState, writeState, deleteState, validateState, isExpired } from './utils/stateManager.js';
import { 
    updateZshrc, 
    extractExistingPlugins, 
    extractExistingTheme,
    addPlugin, 
    removePlugin, 
    setTheme, 
    analyzeZshrc, 
    repairZshrc, 
    cleanDuplicates,
    parseZshrcFile
} from './utils/zshrcManager.js';
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
 * Ensures Oh My Zsh is installed before proceeding.
 * Downloads the installer to a temp file, validates it, then executes.
 * @returns {Promise<boolean>} Installation success status
 */
async function ensureOhMyZshInstalled() {
    const ohMyZshPath = path.join(os.homedir(), '.oh-my-zsh');
    
    if (!fs.existsSync(ohMyZshPath)) {
        console.log(chalk.yellow('⚠️ Oh My Zsh is not installed. Installing...'));

        const installerCommit = 'b37dd49ca5bfe0d99b35607637152cb8cc8b29d7';
        const installerSha256 = '95118b50d062198597e2b73d3a57b609fd95ca68cdc86faf4460d955f0172b61';
        const installerUrl = `https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/${installerCommit}/tools/install.sh`;
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'awesome-lazy-zsh-'));
        const installerPath = path.join(tmpDir, 'install.sh');

        try {
            // Download installer to temp file
            const downloadSuccess = await runCommandSafe('curl', ['-fsSL', '-o', installerPath, installerUrl]);
            if (!downloadSuccess || !fs.existsSync(installerPath)) {
                console.error(chalk.red('❌ Failed to download Oh My Zsh installer.'));
                return false;
            }

            // Validate: must be a shell script
            const content = fs.readFileSync(installerPath, 'utf8');
            const { createHash } = await import('crypto');
            const actualSha256 = createHash('sha256').update(content).digest('hex');
            if (actualSha256 !== installerSha256) {
                console.error(chalk.red('❌ Oh My Zsh installer checksum mismatch.'));
                return false;
            }
            const firstLine = content.split('\n')[0];
            if (!firstLine.startsWith('#!/') || !firstLine.includes('sh')) {
                console.error(chalk.red('❌ Downloaded file does not appear to be a valid shell script.'));
                console.error(chalk.red(`   First line: ${firstLine}`));
                return false;
            }

            // Validate: reasonable size (installer should be 5KB–500KB)
            const fileSize = Buffer.byteLength(content, 'utf8');
            if (fileSize < 5000 || fileSize > 512000) {
                console.error(chalk.red(`❌ Installer has unexpected size (${fileSize} bytes). Aborting.`));
                return false;
            }

            // Validate: must contain expected Oh My Zsh markers
            if (!content.includes('oh-my-zsh') && !content.includes('ohmyzsh')) {
                console.error(chalk.red('❌ Installer does not appear to be the Oh My Zsh install script.'));
                return false;
            }

            // Execute the validated installer with --unattended --keep-zshrc flags
            // --unattended: non-interactive mode, no prompts
            // --keep-zshrc: preserve existing .zshrc instead of overwriting
            // RUNZSH=no: prevent launching zsh after install
            // CHSH=no: don't change default shell
            fs.chmodSync(installerPath, 0o700);
            const success = await runCommandSafe('sh', [installerPath, '--unattended', '--keep-zshrc'], {
                timeout: 120000,
                env: { ...process.env, RUNZSH: 'no', CHSH: 'no' }
            });

            if (!success || !fs.existsSync(ohMyZshPath)) {
                console.error(chalk.red('❌ Failed to install Oh My Zsh. Please install it manually.'));
                return false;
            }

            console.log(chalk.green('✅ Oh My Zsh installed successfully.'));
        } finally {
            // Clean up temp files
            try {
                fs.rmSync(tmpDir, { recursive: true, force: true });
            } catch { /* ignore cleanup errors */ }
        }
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
                plugins = extractExistingPlugins(content);
                const themeMatch = content.match(/ZSH_THEME="([^"]+)"/);
                if (themeMatch && themeMatch[1]) {
                    theme = themeMatch[1];
                }
            }
            
            const allCustomRepos = loadCustomPlugins();
            const customRepos = Object.fromEntries(Object.entries(allCustomRepos).filter(([plugin]) => plugins.includes(plugin)));
            saveProfile(name, plugins, theme, customRepos);
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
        
        // Parse pinned ref from URL (format: "url#tag" or "url#commitSha")
        const hashIndex = repoUrl.indexOf('#');
        const url = hashIndex === -1 ? repoUrl : repoUrl.substring(0, hashIndex);
        const ref = hashIndex === -1 ? null : repoUrl.substring(hashIndex + 1);
        // Detect if ref looks like a commit SHA (40 hex characters)
        const isCommitSha = ref && /^[a-f0-9]{40}$/i.test(ref);
        
        if (isCommitSha) {
            // For commit SHAs: clone without depth limit, then checkout
            const cloneArgs = ['clone', url, pluginPath];
            await runCommandSafe('git', cloneArgs);
            
            if (fs.existsSync(pluginPath)) {
                await runCommandSafe('git', ['checkout', ref], { cwd: pluginPath });
            }
        } else {
            // For tags/branches: use --depth 1 --branch
            const cloneArgs = ['clone', '--depth', '1'];
            if (ref) {
                cloneArgs.push('--branch', ref);
            }
            cloneArgs.push(url, pluginPath);
            await runCommandSafe('git', cloneArgs);
        }

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
            const pending = [...(state.pendingPlugins || [])];
            const installed = [...(state.installedPlugins || [])];

            if (pending.length > 0) {
                console.log(chalk.bold.cyan(`📦 Installing ${pending.length} remaining plugin(s)...`));

                for (const plugin of pending) {
                    const success = await installSinglePlugin(plugin);
                    if (success) {
                        if (!installed.includes(plugin)) installed.push(plugin);
                        const index = pending.indexOf(plugin);
                        if (index !== -1) pending.splice(index, 1);
                        writeState({
                            installedPlugins: installed,
                            pendingPlugins: [...pending]
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
            // Continue only the services that were not completed.
            const installed = state.installedPlugins || [];

            if ((state.pendingServices || []).length > 0) {
                await runServiceInstallation(installed, state);
                separator();
            }

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

        if (process.argv.includes('--version')) {
            console.log(version);
            return;
        }
        if (process.argv.includes('--doctor')) {
            const checks = [
                ['node', process.execPath],
                ['zsh', 'zsh'],
                ['git', 'git']
            ];
            let healthy = true;
            for (const [name, command] of checks) {
                const available = command.includes('/') ? fs.existsSync(command) : await runCommandSafe('sh', ['-c', `command -v ${command}`]);
                console.log(`${available ? 'OK' : 'MISSING'} ${name}`);
                healthy &&= Boolean(available);
            }
            if (!healthy) process.exitCode = 1;
            return;
        }

        // CLI flags for non-interactive updates
        const addPluginIdx = process.argv.indexOf('--add-plugin');
        if (addPluginIdx !== -1 && process.argv[addPluginIdx + 1]) {
            const pluginName = process.argv[addPluginIdx + 1];
            const result = await addPlugin(pluginName);
            console.log(result.success ? chalk.green(`✅ ${result.message}`) : chalk.red(`❌ ${result.message}`));
            return;
        }

        const removePluginIdx = process.argv.indexOf('--remove-plugin');
        if (removePluginIdx !== -1 && process.argv[removePluginIdx + 1]) {
            const pluginName = process.argv[removePluginIdx + 1];
            const result = await removePlugin(pluginName);
            console.log(result.success ? chalk.green(`✅ ${result.message}`) : chalk.red(`❌ ${result.message}`));
            return;
        }

        const setThemeIdx = process.argv.indexOf('--set-theme');
        if (setThemeIdx !== -1 && process.argv[setThemeIdx + 1]) {
            const themeName = process.argv[setThemeIdx + 1];
            const result = await setTheme(themeName);
            console.log(result.success ? chalk.green(`✅ ${result.message}`) : chalk.red(`❌ ${result.message}`));
            return;
        }

        if (process.argv.includes('--analyze')) {
            const result = await analyzeZshrc();
            if (!result) {
                console.log(chalk.yellow('No .zshrc file found.'));
                return;
            }
            console.log(result.report);
            return;
        }

        if (process.argv.includes('--repair')) {
            const result = await repairZshrc({ preview: false });
            if (result.repairs.length === 0) {
                console.log(chalk.green('No repairs needed.'));
            } else {
                console.log(chalk.green(`Applied ${result.repairs.length} repair(s):`));
                for (const repair of result.repairs) {
                    console.log(`  - ${repair}`);
                }
            }
            return;
        }

        if (process.argv.includes('--clean-duplicates')) {
            const result = await cleanDuplicates();
            console.log(result.success ? chalk.green(`✅ ${result.message}`) : chalk.red(`❌ ${result.message}`));
            return;
        }

        if (process.argv.includes('--help')) {
            console.log(`
${chalk.bold('awesome-lazy-zsh')} - Streamlined Zsh setup tool

${chalk.bold('USAGE:')}
  awesome-lazy-zsh [OPTIONS]

${chalk.bold('OPTIONS:')}
  --version              Show version number
  --help                 Show this help message
  --doctor               Check system dependencies

${chalk.bold('CONFIGURATION:')}
  --add-plugin <name>    Add a plugin to .zshrc
  --remove-plugin <name> Remove a plugin from .zshrc  
  --set-theme <name>     Change the Zsh theme

${chalk.bold('MAINTENANCE:')}
  --analyze              Analyze .zshrc for issues
  --repair               Auto-repair .zshrc syntax errors
  --clean-duplicates     Remove duplicate entries from .zshrc

${chalk.bold('EXAMPLES:')}
  awesome-lazy-zsh --add-plugin zsh-autosuggestions
  awesome-lazy-zsh --set-theme powerlevel10k
  awesome-lazy-zsh --analyze
  awesome-lazy-zsh --repair
`);
            return;
        }

        separator();

        // Update check
        const updateResult = await checkForUpdate();
        if (updateResult && updateResult.updateAvailable && !updateResult.skipped) {
            const choice = await promptUpdate(updateResult);
            if (choice === 'yes') {
                const result = await performUpdate(updateResult.installMethod, updateResult.latestVersion);
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
        } else if (startOption === 'updateConfig') {
            await handleUpdateConfig();
        } else if (startOption === 'analyzeRepair') {
            await handleAnalyzeRepair();
        } else {
            console.error('❌ Unknown option selected. Exiting.');
        }
    } catch (error) {
        console.error('❌ An error occurred during the setup process:', error);
    }
}

/**
 * Handles the Update Configuration menu
 */
async function handleUpdateConfig() {
    const action = await promptUpdateConfig();

    if (!action || action === 'back') return;

    if (action === 'addPlugin') {
        // Get list of available plugins not currently installed
        const parsed = parseZshrcFile();
        const currentPlugins = parsed?.settings.allPlugins || parsed?.settings.plugins || [];
        const availablePlugins = Object.keys(pluginRepos).filter(p => !currentPlugins.includes(p));

        if (availablePlugins.length === 0) {
            console.log(chalk.yellow('All available plugins are already installed.'));
            return;
        }

        const { plugin } = await prompts({
            type: 'autocomplete',
            name: 'plugin',
            message: 'Select plugin to add:',
            choices: availablePlugins.map(p => ({ title: p, value: p })),
            suggest: (input, choices) => 
                choices.filter(c => c.title.toLowerCase().includes(input.toLowerCase()))
        });

        if (plugin) {
            const result = await addPlugin(plugin);
            console.log(result.success ? chalk.green(`✅ ${result.message}`) : chalk.red(`❌ ${result.message}`));
        }
    } else if (action === 'removePlugin') {
        const parsed = parseZshrcFile();
        const currentPlugins = parsed?.settings.allPlugins || parsed?.settings.plugins || [];

        if (currentPlugins.length === 0) {
            console.log(chalk.yellow('No plugins installed.'));
            return;
        }

        const { plugin } = await prompts({
            type: 'select',
            name: 'plugin',
            message: 'Select plugin to remove:',
            choices: currentPlugins.map(p => ({ title: p, value: p }))
        });

        if (plugin) {
            const result = await removePlugin(plugin);
            console.log(result.success ? chalk.green(`✅ ${result.message}`) : chalk.red(`❌ ${result.message}`));
        }
    } else if (action === 'changeTheme') {
        const themes = Object.keys(await import('./utils/config.js').then(m => m.themeRepos));
        
        const { theme } = await prompts({
            type: 'select',
            name: 'theme',
            message: 'Select theme:',
            choices: themes.map(t => ({ title: t, value: t }))
        });

        if (theme) {
            const result = await setTheme(theme);
            console.log(result.success ? chalk.green(`✅ ${result.message}`) : chalk.red(`❌ ${result.message}`));
        }
    } else if (action === 'cleanDuplicates') {
        console.log(chalk.blue('🔍 Checking for duplicates...'));
        const result = await cleanDuplicates();
        console.log(result.success ? chalk.green(`✅ ${result.message}`) : chalk.red(`❌ ${result.message}`));
    } else if (action === 'preview') {
        const parsed = parseZshrcFile();
        if (!parsed) {
            console.log(chalk.yellow('No .zshrc file found.'));
            return;
        }
        
        const plugins = parsed.settings.allPlugins.length > 0 ? parsed.settings.allPlugins : parsed.settings.plugins;
        const theme = parsed.settings.theme?.value || 'robbyrussell';
        
        const result = await updateZshrc(plugins, theme, { preview: true });
        if (result.preview) {
            console.log(result.preview);
        }
    }
}

/**
 * Handles the Analyze & Repair menu
 */
async function handleAnalyzeRepair() {
    const action = await promptAnalyzeRepair();

    if (!action || action === 'back') return;

    if (action === 'analyze') {
        const result = await analyzeZshrc();
        if (!result) {
            console.log(chalk.yellow('No .zshrc file found.'));
            return;
        }
        console.log(chalk.bold('\n📊 .zshrc Analysis Report\n'));
        console.log(result.report);
    } else if (action === 'previewRepair') {
        const result = await repairZshrc({ preview: true });
        if (result.repairs.length === 0) {
            console.log(chalk.green('✅ No repairs needed - your .zshrc looks healthy!'));
        } else {
            console.log(chalk.yellow(`Found ${result.repairs.length} issue(s) to fix:\n`));
            for (const repair of result.repairs) {
                console.log(chalk.blue(`  • ${repair}`));
            }
            if (result.preview) {
                console.log('\n' + result.preview);
            }
        }
    } else if (action === 'repair') {
        const result = await repairZshrc({ preview: false });
        if (result.repairs.length === 0) {
            console.log(chalk.green('✅ No repairs needed - your .zshrc looks healthy!'));
        } else {
            console.log(chalk.green(`✅ Applied ${result.repairs.length} repair(s):`));
            for (const repair of result.repairs) {
                console.log(chalk.blue(`  • ${repair}`));
            }
        }
    }
}

main();
