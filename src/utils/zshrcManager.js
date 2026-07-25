/**
 * .zshrc file generation and management utilities
 * Uses a managed-block approach to preserve user customizations
 * @author Ali M. Jaradat <AmJaradat01@gmail.com>
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import { generateSystemOptimizations, setupTerminalIntegration } from './systemIntegration.js';
import { pluginRepos } from './config.js';

// Managed block delimiters - used to identify our section in .zshrc
const BLOCK_START = '# >>> awesome-lazy-zsh managed block >>>';
const BLOCK_END = '# <<< awesome-lazy-zsh managed block <<<';

// Unified backup directory for all awesome-lazy-zsh backups
const BACKUP_DIR = path.join(os.homedir(), '.awesome-lazy-zsh', 'backups');

/**
 * Ensures backup directory exists with restrictive permissions
 */
function ensureBackupDir() {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true, mode: 0o700 });
    }
}

/**
 * Extracts plugin list from existing .zshrc content
 * @param {string} zshrcContent - Current .zshrc file content
 * @returns {string[]} Array of plugin names
 */
export function extractExistingPlugins(zshrcContent) {
    const pluginMatch = zshrcContent.match(/plugins=\(([^)]+)\)/);
    if (pluginMatch && pluginMatch[1]) {
        return pluginMatch[1].split(/\s+/).filter(Boolean);
    }
    return [];
}

/**
 * Validates a theme name to ensure it's safe for shell interpolation.
 * Only allows alphanumeric characters, hyphens, and underscores.
 * @param {string} theme - Theme name to validate
 * @returns {boolean} True if the theme name is safe
 */
function isValidThemeName(theme) {
    return typeof theme === 'string' &&
        theme.length > 0 &&
        theme.length <= 50 &&
        /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(theme);
}

/**
 * Gets the stable path for awesome-lazy-zsh installation.
 * Uses /opt/homebrew/opt/ symlink which survives version upgrades.
 * @returns {string|null} Stable installation path or null if not found
 */
function getStableInstallPath() {
    // Prefer stable opt/ symlink over versioned Cellar path
    const optPath = '/opt/homebrew/opt/awesome-lazy-zsh/libexec';
    if (fs.existsSync(optPath)) {
        return optPath;
    }
    
    // Fallback for Intel Macs
    const intelOptPath = '/usr/local/opt/awesome-lazy-zsh/libexec';
    if (fs.existsSync(intelOptPath)) {
        return intelOptPath;
    }
    
    // Fallback to local development path
    const scriptDir = path.dirname(new URL(import.meta.url).pathname);
    const localPath = path.resolve(scriptDir, '..');
    if (fs.existsSync(localPath)) {
        return localPath;
    }
    
    return null;
}

/**
 * Generates the managed block content for .zshrc
 * @param {string} theme - Selected theme name
 * @param {string[]} plugins - Array of plugin names
 * @returns {Promise<string>} Generated managed block content
 */
async function generateManagedBlockContent(theme, plugins = []) {
    // Validate theme name to prevent shell injection via .zshrc
    if (!isValidThemeName(theme)) {
        console.log(chalk.yellow(`Invalid theme name "${theme}", falling back to robbyrussell`));
        theme = 'robbyrussell';
    }

    // Ensure plugins array is not empty
    if (!Array.isArray(plugins) || plugins.length === 0) {
        plugins = ['git'];
    }

    // Validate each plugin name before interpolating into shell config
    const safePluginPattern = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;
    const omzPlugins = plugins.filter(p => {
        const repo = pluginRepos[p];
        if (repo === 'alias-only') return false;
        if (!safePluginPattern.test(p)) {
            console.log(chalk.yellow(`Skipping plugin with unsafe name: "${p}"`));
            return false;
        }
        return true;
    });

    const installPath = getStableInstallPath();

    let content = `${BLOCK_START}
# DO NOT EDIT THIS BLOCK - managed by awesome-lazy-zsh
# Your customizations should go OUTSIDE this block
# Last updated: ${new Date().toISOString()}

# Path to your Oh My Zsh installation
export ZSH="\$HOME/.oh-my-zsh"

# Theme
ZSH_THEME="${theme}"

# Plugins
plugins=(${omzPlugins.join(' ')})

# Load Oh My Zsh
source \$ZSH/oh-my-zsh.sh
`;

    // Add Homebrew PATH based on architecture
    if (os.platform() === 'linux') {
        content += `
# Homebrew PATH for Linux
export PATH="/home/linuxbrew/.linuxbrew/bin:\$PATH"
`;
    } else if (os.arch() === 'arm64') {
        content += `
# Homebrew PATH for Apple Silicon
export PATH="/opt/homebrew/bin:\$PATH"
`;
    } else {
        content += `
# Homebrew PATH for Intel Macs
export PATH="/usr/local/bin:\$PATH"
`;
    }

    // Add Visual Studio Code Path
    if (plugins.includes('vscode')) {
        content += `
# Visual Studio Code Path
export PATH="\$PATH:/Applications/Visual Studio Code.app/Contents/Resources/app/bin"
`;
    }

    // Add Docker Path and aliases
    if (plugins.includes('docker') || plugins.includes('docker-compose')) {
        content += `
# Docker Path
export PATH="\$PATH:/Applications/Docker.app/Contents/Resources/bin/"

# Docker Aliases
alias dps='docker ps'
alias dstop='docker stop \$(docker ps -a -q)'
alias drm='docker rm \$(docker ps -a -q)'
alias dimages='docker images'
alias dbuild='docker build -t'

# Docker CLI completions
fpath=(~/.docker/completions \$fpath)
autoload -Uz compinit
compinit
`;
    }

    // Add Kubernetes alias
    if (plugins.includes('kubectl')) {
        content += `
# Kubernetes Alias
alias k8s-start='kubectl apply -f deployment.yaml'
`;
    }

    // Add NVM setup
    if (plugins.includes('nvm')) {
        content += `
# NVM Setup
export NVM_DIR="\$HOME/.nvm"
[ -s "\$NVM_DIR/nvm.sh" ] && . "\$NVM_DIR/nvm.sh"
[ -s "\$NVM_DIR/bash_completion" ] && . "\$NVM_DIR/bash_completion"
`;
    }

    // Add Git branch function
    if (plugins.includes('git') || plugins.includes('git-flow')) {
        content += `
# Git Branch Function
git_branch() {
    git branch 2>/dev/null | grep '^*' | colrm 1 2
}
`;
    }

    // Add Starship prompt initialization if chosen
    if (theme === 'starship') {
        content += `
# Starship Prompt Initialization
eval "\$(starship init zsh)"
`;
    }

    // Add system-specific optimizations
    content += generateSystemOptimizations();

    // Add terminal integration
    const terminalIntegration = await setupTerminalIntegration();
    if (terminalIntegration) {
        content += `
# Terminal Integration
${terminalIntegration}`;
    }

    // Add alias file sourcing using STABLE paths
    const aliasMapping = {
        'mongodb': 'mongodb.zsh',
        'postgresql': 'postgresql.zsh',
        'mysql': 'mysql.zsh',
        'redis': 'redis.zsh',
        'rabbitmq': 'rabbitmq.zsh',
        'elasticsearch': 'elasticsearch.zsh',
        'memcached': 'memcached.zsh',
        'aws': 'aws.zsh',
        'gcloud': 'gcloud.zsh',
        'azure': 'azure.zsh',
        'kubernetes': 'kubernetes.zsh',
        'docker-compose-extended': 'docker-compose.zsh',
        'terraform-extended': 'terraform.zsh',
        'ansible': 'ansible.zsh',
        'python': 'python.zsh',
        'golang': 'golang.zsh',
        'rust': 'rust.zsh',
        'node': 'node.zsh',
        'java': 'java.zsh',
        'git-extras': 'git-extras.zsh',
        'ssh': 'ssh.zsh',
        'dotenv': 'dotenv.zsh',
        'directories': 'directories.zsh',
        'history-search': 'history.zsh',
        'extract': 'extract.zsh'
    };

    // Check if we have any alias plugins selected
    const selectedAliasPlugins = plugins.filter(p => aliasMapping[p]);
    if (selectedAliasPlugins.length > 0 && installPath) {
        content += `
# Awesome-Lazy-Zsh Custom Aliases
# Using stable opt/ path to survive version upgrades
`;
        const aliasDir = path.join(installPath, 'aliases');
        
        // Always source services.zsh if any service plugin is selected
        const servicePlugins = ['mongodb', 'postgresql', 'mysql', 'redis', 'rabbitmq', 'elasticsearch', 'memcached'];
        if (plugins.some(p => servicePlugins.includes(p))) {
            content += `[ -f "${aliasDir}/services.zsh" ] && source "${aliasDir}/services.zsh"\n`;
        }

        for (const plugin of selectedAliasPlugins) {
            const aliasFile = aliasMapping[plugin];
            content += `[ -f "${aliasDir}/${aliasFile}" ] && source "${aliasDir}/${aliasFile}"\n`;
        }
    }

    // Source alias-manager.zsh using stable path
    if (installPath) {
        content += `
# Awesome-Lazy-Zsh Alias Manager (stable path)
[ -f "${installPath}/alias-manager.zsh" ] && source "${installPath}/alias-manager.zsh"
`;
    }

    content += `${BLOCK_END}`;

    return content;
}

/**
 * Extracts content outside the managed block
 * @param {string} content - Full .zshrc content
 * @returns {{before: string, after: string}} Content before and after the managed block
 */
function extractUserContent(content) {
    const startIndex = content.indexOf(BLOCK_START);
    const endIndex = content.indexOf(BLOCK_END);

    if (startIndex === -1 || endIndex === -1) {
        // No managed block found - treat entire content as "before"
        return { before: content, after: '' };
    }

    const before = content.substring(0, startIndex).trimEnd();
    const after = content.substring(endIndex + BLOCK_END.length).trimStart();

    return { before, after };
}

/**
 * Creates timestamped backup of existing .zshrc in unified backup directory
 * @param {string} zshrcPath - Path to .zshrc file
 * @returns {string|null} Backup file path or null if no backup needed
 */
export function backupExistingZshrc(zshrcPath) {
    if (!fs.existsSync(zshrcPath)) {
        return null;
    }

    ensureBackupDir();
    
    const timestamp = Date.now();
    const backupPath = path.join(BACKUP_DIR, `.zshrc.backup.${timestamp}`);
    const zshrcContent = fs.readFileSync(zshrcPath, 'utf8');
    
    fs.writeFileSync(backupPath, zshrcContent, { encoding: 'utf8', mode: 0o600 });
    console.log(chalk.blue(`Existing .zshrc backed up to: ${backupPath}`));
    
    return backupPath;
}

/**
 * Lists all available backups from the unified backup directory
 * @returns {string[]} Array of backup file paths, sorted newest first
 */
export function listBackups() {
    ensureBackupDir();
    
    const files = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.startsWith('.zshrc.backup.'))
        .map(f => path.join(BACKUP_DIR, f))
        .sort((a, b) => {
            // Sort by timestamp (newest first)
            const tsA = parseInt(path.basename(a).split('.').pop(), 10);
            const tsB = parseInt(path.basename(b).split('.').pop(), 10);
            return tsB - tsA;
        });
    
    return files;
}

/**
 * Writes content to file atomically (write to temp, then rename)
 * @param {string} filePath - Target file path
 * @param {string} content - Content to write
 */
function atomicWrite(filePath, content) {
    const tempPath = `${filePath}.tmp.${process.pid}.${Date.now()}`;
    
    try {
        // Write to temp file with restrictive permissions
        fs.writeFileSync(tempPath, content, { encoding: 'utf8', mode: 0o600 });
        
        // Atomic rename
        fs.renameSync(tempPath, filePath);
    } catch (error) {
        // Clean up temp file on error
        try {
            fs.unlinkSync(tempPath);
        } catch { /* ignore cleanup errors */ }
        throw error;
    }
}

/**
 * Updates .zshrc file with plugins and theme configuration
 * Uses managed-block approach to preserve user customizations
 * @param {string[]} newPlugins - Array of plugin names
 * @param {string} theme - Theme name to apply
 */
export async function updateZshrc(newPlugins, theme) {
    const zshrcPath = path.join(os.homedir(), '.zshrc');

    try {
        // Read existing content if file exists
        let existingContent = '';
        if (fs.existsSync(zshrcPath)) {
            existingContent = fs.readFileSync(zshrcPath, 'utf8');
        }

        // Backup existing .zshrc before any modifications
        backupExistingZshrc(zshrcPath);

        // Extract user content outside our managed block
        const { before, after } = extractUserContent(existingContent);

        // Generate our managed block
        const managedBlock = await generateManagedBlockContent(theme, newPlugins);

        // Combine: user content before + managed block + user content after
        let finalContent = '';
        
        if (before.trim()) {
            finalContent += before.trim() + '\n\n';
        }
        
        finalContent += managedBlock;
        
        if (after.trim()) {
            finalContent += '\n\n' + after.trim();
        }
        
        // Ensure file ends with newline
        finalContent = finalContent.trim() + '\n';

        // Atomic write to prevent corruption
        atomicWrite(zshrcPath, finalContent);

        console.log(chalk.green(`\`.zshrc updated with selected plugins and theme: ${theme}`));
        console.log(chalk.yellow(`Please restart your terminal or run 'source ~/.zshrc' to apply changes.`));
    } catch (error) {
        console.error(chalk.red(`Error updating .zshrc: ${error.message}`));
        throw error;
    }
}

/**
 * Generates complete .zshrc configuration (legacy function for compatibility)
 * @deprecated Use updateZshrc with managed-block approach instead
 * @param {string} theme - Selected theme name
 * @param {string[]} plugins - Array of plugin names
 * @returns {Promise<string>} Generated .zshrc content
 */
export async function generateZshrcContent(theme, plugins = []) {
    // This function is kept for backward compatibility
    // It now just generates the managed block content
    return generateManagedBlockContent(theme, plugins);
}
