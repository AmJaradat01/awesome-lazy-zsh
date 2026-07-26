/**
 * .zshrc file generation and management utilities
 * Uses a managed-block approach to preserve user customizations
 * Now with intelligent parsing, merging, and duplicate cleanup
 * @author Ali M. Jaradat <AmJaradat01@gmail.com>
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import { generateSystemOptimizations, setupTerminalIntegration } from './systemIntegration.js';
import { pluginRepos } from './config.js';
import {
    parseZshrc,
    parseZshrcFile,
    generateReport,
    hasManagedBlock,
    getUserContent,
    MANAGED_BLOCK_START,
    MANAGED_BLOCK_END
} from './zshrcParser.js';

// Unified backup directory for all awesome-lazy-zsh backups
const userHome = process.env.AWESOME_LAZY_ZSH_DATA_HOME || os.homedir();
const BACKUP_DIR = path.join(userHome, '.awesome-lazy-zsh', 'backups');
const ZSHRC_PATH = path.join(userHome, '.zshrc');

/**
 * Ensures backup directory exists with restrictive permissions
 */
function ensureBackupDir() {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true, mode: 0o700 });
    }
}



/**
 * Validates a theme name to ensure it's safe for shell interpolation.
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
 * Validates a plugin name for safety
 * @param {string} plugin - Plugin name to validate
 * @returns {boolean} True if the plugin name is safe
 */
function isValidPluginName(plugin) {
    return typeof plugin === 'string' &&
        plugin.length > 0 &&
        plugin.length <= 50 &&
        /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(plugin);
}

/**
 * Gets the stable path for awesome-lazy-zsh installation.
 * @returns {string|null} Stable installation path or null if not found
 */
function getStableInstallPath() {
    const optPath = '/opt/homebrew/opt/awesome-lazy-zsh/libexec';
    if (fs.existsSync(optPath)) return optPath;

    const intelOptPath = '/usr/local/opt/awesome-lazy-zsh/libexec';
    if (fs.existsSync(intelOptPath)) return intelOptPath;

    const scriptDir = path.dirname(new URL(import.meta.url).pathname);
    const localPath = path.resolve(scriptDir, '..');
    if (fs.existsSync(localPath)) return localPath;

    return null;
}



/**
 * Extracts plugin list from existing .zshrc content
 * @param {string} zshrcContent - Current .zshrc file content
 * @returns {string[]} Array of plugin names
 */
export function extractExistingPlugins(zshrcContent) {
    const parsed = parseZshrc(zshrcContent);
    if (parsed.settings.allPlugins.length > 0) {
        return parsed.settings.allPlugins;
    }
    return parsed.settings.plugins;
}

/**
 * Extracts the current theme from .zshrc content
 * @param {string} zshrcContent - Current .zshrc file content
 * @returns {string|null} Theme name or null
 */
export function extractExistingTheme(zshrcContent) {
    const parsed = parseZshrc(zshrcContent);
    return parsed.settings.theme?.value || null;
}

/**
 * Creates timestamped backup of existing .zshrc
 * @param {string} zshrcPath - Path to .zshrc file
 * @returns {string|null} Backup file path or null if no backup needed
 */
export function backupExistingZshrc(zshrcPath = ZSHRC_PATH) {
    if (!fs.existsSync(zshrcPath)) return null;

    ensureBackupDir();
    const timestamp = Date.now();
    const backupPath = path.join(BACKUP_DIR, `.zshrc.backup.${timestamp}`);
    const content = fs.readFileSync(zshrcPath, 'utf8');

    fs.writeFileSync(backupPath, content, { encoding: 'utf8', mode: 0o600 });
    console.log(chalk.blue(`Existing .zshrc backed up to: ${backupPath}`));
    return backupPath;
}

/**
 * Lists all available backups
 * @returns {string[]} Array of backup file paths, sorted newest first
 */
export function listBackups() {
    ensureBackupDir();
    return fs.readdirSync(BACKUP_DIR)
        .filter(f => f.startsWith('.zshrc.backup.'))
        .map(f => path.join(BACKUP_DIR, f))
        .sort((a, b) => {
            const tsA = parseInt(path.basename(a).split('.').pop(), 10);
            const tsB = parseInt(path.basename(b).split('.').pop(), 10);
            return tsB - tsA;
        });
}



/**
 * Writes content to file atomically
 * @param {string} filePath - Target file path
 * @param {string} content - Content to write
 */
function atomicWrite(filePath, content) {
    const tempPath = `${filePath}.tmp.${process.pid}.${Date.now()}`;
    try {
        fs.writeFileSync(tempPath, content, { encoding: 'utf8', mode: 0o600 });
        fs.renameSync(tempPath, filePath);
    } catch (error) {
        try { fs.unlinkSync(tempPath); } catch { /* ignore */ }
        throw error;
    }
}

/**
 * Generates the managed block content for .zshrc
 * @param {string} theme - Selected theme name
 * @param {string[]} plugins - Array of plugin names
 * @returns {Promise<string>} Generated managed block content
 */
async function generateManagedBlockContent(theme, plugins = []) {
    if (!isValidThemeName(theme)) {
        console.log(chalk.yellow(`Invalid theme "${theme}", falling back to robbyrussell`));
        theme = 'robbyrussell';
    }

    if (!Array.isArray(plugins) || plugins.length === 0) {
        plugins = ['git'];
    }

    // Filter to only Oh My Zsh plugins (not alias-only)
    const omzPlugins = plugins.filter(p => {
        const repo = pluginRepos[p];
        if (repo === 'alias-only') return false;
        if (!isValidPluginName(p)) {
            console.log(chalk.yellow(`Skipping invalid plugin name: "${p}"`));
            return false;
        }
        return true;
    });

    const installPath = getStableInstallPath();
    let content = `${MANAGED_BLOCK_START}
#      _                                               _                         _____    _
#     / \\__      _____  ___  ___  _ __ ___   ___      | |    __ _ _____   _     |__  /___| |__
#    / _ \\ \\ /\\ / / _ \\/ __|/ _ \\| '_ \` _ \\ / _ \\_____| |   / _\` |_  / | | |_____ / // __| '_ \\
#   / ___ \\ V  V /  __/\\__ \\ (_) | | | | | |  __/_____| |__| (_| |/ /| |_| |_____/ /_\\__ \\ | | |
#  /_/   \\_\\_/\\_/ \\___||___/\\___/|_| |_| |_|\\___|     |_____\\__,_/___|\\__, |    /____|___/_| |_|
#                                                                      |___/
#
#  https://github.com/AmJaradat01/awesome-lazy-zsh
#  DO NOT EDIT THIS BLOCK - Your customizations should go ABOVE this block
#  Last updated: ${new Date().toISOString()}

# Path to your Oh My Zsh installation
export ZSH="$HOME/.oh-my-zsh"

# Theme
ZSH_THEME="${theme}"

# Plugins
plugins=(${omzPlugins.join(' ')})
# Complete selection for profiles (includes aliases/custom plugins)
# awesome-lazy-zsh-plugins=${JSON.stringify(plugins)}

# Load Oh My Zsh
source $ZSH/oh-my-zsh.sh
`;

    // Add architecture-specific Homebrew PATH
    content += getHomebrewPath();

    // Add plugin-specific configurations
    content += await generatePluginConfigs(plugins);

    // Add system optimizations
    content += generateSystemOptimizations();

    // Add terminal integration
    const terminalIntegration = await setupTerminalIntegration();
    if (terminalIntegration) {
        content += `\n# Terminal Integration\n${terminalIntegration}`;
    }

    // Add alias file sourcing
    content += generateAliasSourceLines(plugins, installPath);

    content += `${MANAGED_BLOCK_END}`;
    return content;
}



/**
 * Gets the Homebrew PATH configuration based on architecture
 * @returns {string} PATH export line
 */
function getHomebrewPath() {
    if (os.platform() === 'linux') {
        return `\n# Homebrew PATH for Linux\nexport PATH="/home/linuxbrew/.linuxbrew/bin:$PATH"\n`;
    } else if (os.arch() === 'arm64') {
        return `\n# Homebrew PATH for Apple Silicon\nexport PATH="/opt/homebrew/bin:$PATH"\n`;
    } else {
        return `\n# Homebrew PATH for Intel Macs\nexport PATH="/usr/local/bin:$PATH"\n`;
    }
}

/**
 * Generates plugin-specific configuration lines
 * @param {string[]} plugins - Array of plugin names
 * @returns {Promise<string>} Configuration content
 */
async function generatePluginConfigs(plugins) {
    let content = '';

    if (plugins.includes('vscode')) {
        content += `\n# Visual Studio Code Path\nexport PATH="$PATH:/Applications/Visual Studio Code.app/Contents/Resources/app/bin"\n`;
    }

    if (plugins.includes('docker') || plugins.includes('docker-compose')) {
        content += `
# Docker Path
export PATH="$PATH:/Applications/Docker.app/Contents/Resources/bin/"

# Docker Aliases
alias dps='docker ps'
alias dstop='docker stop $(docker ps -a -q)'
alias drm='docker rm $(docker ps -a -q)'
alias dimages='docker images'
alias dbuild='docker build -t'

# Docker CLI completions
fpath=(~/.docker/completions $fpath)
autoload -Uz compinit
compinit
`;
    }

    if (plugins.includes('kubectl')) {
        content += `\n# Kubernetes Alias\nalias k8s-start='kubectl apply -f deployment.yaml'\n`;
    }

    if (plugins.includes('nvm')) {
        content += `
# NVM Setup
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && . "$NVM_DIR/bash_completion"
`;
    }

    if (plugins.includes('git') || plugins.includes('git-flow')) {
        content += `
# Git Branch Function
git_branch() {
    git branch 2>/dev/null | grep '^*' | colrm 1 2
}
`;
    }

    if (plugins.includes('starship') || plugins.some(p => p === 'starship')) {
        content += `\n# Starship Prompt\neval "$(starship init zsh)"\n`;
    }

    return content;
}



/**
 * Generates alias file source lines for custom plugins
 * @param {string[]} plugins - Array of plugin names
 * @param {string|null} installPath - Installation path
 * @returns {string} Source lines for alias files
 */
function generateAliasSourceLines(plugins, installPath) {
    const aliasMapping = {
        'mongodb': 'mongodb.zsh', 'postgresql': 'postgresql.zsh', 'mysql': 'mysql.zsh',
        'redis': 'redis.zsh', 'rabbitmq': 'rabbitmq.zsh', 'elasticsearch': 'elasticsearch.zsh',
        'memcached': 'memcached.zsh', 'aws': 'aws.zsh', 'gcloud': 'gcloud.zsh',
        'azure': 'azure.zsh', 'kubernetes': 'kubernetes.zsh',
        'docker-compose-extended': 'docker-compose.zsh', 'terraform-extended': 'terraform.zsh',
        'ansible': 'ansible.zsh', 'python': 'python.zsh', 'golang': 'golang.zsh',
        'rust': 'rust.zsh', 'node': 'node.zsh', 'java': 'java.zsh',
        'git-extras': 'git-extras.zsh', 'ssh': 'ssh.zsh', 'dotenv': 'dotenv.zsh',
        'directories': 'directories.zsh', 'history-search': 'history.zsh', 'extract': 'extract.zsh'
    };

    const selectedAliasPlugins = plugins.filter(p => aliasMapping[p]);
    if (selectedAliasPlugins.length === 0 || !installPath) return '';

    let content = `\n# Awesome-Lazy-Zsh Custom Aliases\n`;
    const aliasDir = path.join(installPath, 'src', 'aliases');

    // Source services.zsh if any service plugin is selected
    const servicePlugins = ['mongodb', 'postgresql', 'mysql', 'redis', 'rabbitmq', 'elasticsearch', 'memcached'];
    if (plugins.some(p => servicePlugins.includes(p))) {
        content += `[ -f "${aliasDir}/services.zsh" ] && source "${aliasDir}/services.zsh"\n`;
    }

    for (const plugin of selectedAliasPlugins) {
        const aliasFile = aliasMapping[plugin];
        content += `[ -f "${aliasDir}/${aliasFile}" ] && source "${aliasDir}/${aliasFile}"\n`;
    }

    content += `\n# Awesome-Lazy-Zsh Alias Manager\n`;
    content += `[ -f "${installPath}/src/alias-manager.zsh" ] && source "${installPath}/src/alias-manager.zsh"\n`;

    return content;
}



/**
 * Cleans user content by removing items that will be in the managed block
 * @param {string} content - User content to clean
 * @param {string[]} plugins - Plugins that will be managed
 * @returns {string} Cleaned content
 */
function cleanUserContent(content, plugins) {
    if (!content) return '';

    const lines = content.split('\n');
    const cleanedLines = [];
    let skipUntilDone = false;
    let skipBlock = null;
    let consecutiveEmpty = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Track consecutive empty lines
        if (!trimmed) {
            consecutiveEmpty++;
            // Allow max 1 consecutive empty line
            if (consecutiveEmpty > 1) continue;
            // Don't add empty lines at the start
            if (cleanedLines.length === 0) continue;
            cleanedLines.push(line);
            continue;
        }
        consecutiveEmpty = 0;

        // Skip lines that will be in managed block
        if (shouldSkipLine(trimmed, plugins)) continue;

        // Skip multi-line blocks that will be managed
        if (skipUntilDone) {
            if (trimmed === '}' || trimmed.startsWith('done') || trimmed.startsWith('fi')) {
                skipUntilDone = false;
                skipBlock = null;
            }
            continue;
        }

        // Detect start of blocks to skip
        if (trimmed.startsWith('git_branch()') && (plugins.includes('git') || plugins.includes('git-flow'))) {
            skipUntilDone = true;
            skipBlock = 'function';
            continue;
        }

        cleanedLines.push(line);
    }

    // Remove trailing empty lines
    while (cleanedLines.length > 0 && !cleanedLines[cleanedLines.length - 1].trim()) {
        cleanedLines.pop();
    }

    // Remove leading empty lines
    while (cleanedLines.length > 0 && !cleanedLines[0].trim()) {
        cleanedLines.shift();
    }

    return cleanedLines.join('\n');
}

/**
 * Determines if a line should be skipped (will be in managed block)
 * @param {string} line - Trimmed line to check
 * @param {string[]} plugins - Plugins that will be managed
 * @returns {boolean} True if line should be skipped
 */
function shouldSkipLine(line, plugins) {
    // Skip managed block markers
    if (line.includes('awesome-lazy-zsh managed block')) return true;
    if (line.includes('DO NOT EDIT THIS BLOCK')) return true;
    if (line.includes('awesome-lazy-zsh-plugins=')) return true;
    if (line.includes('Last updated:') && line.includes('202')) return true;

    // Skip Oh My Zsh configuration (will be in managed block)
    if (line.startsWith('export ZSH=')) return true;
    if (line.startsWith('ZSH_THEME=')) return true;
    if (line.startsWith('plugins=(')) return true;
    if (line.startsWith('source $ZSH/oh-my-zsh.sh')) return true;
    if (line.includes('source "$ZSH/oh-my-zsh.sh"')) return true;
    if (line === '# Plugins') return true;
    if (line === '# Theme') return true;
    if (line.includes('Path to your Oh My Zsh installation')) return true;

    // Skip header comments that will be regenerated
    if (line.includes('Awesome-Lazy-Zsh Configuration')) return true;
    if (line.includes('Generated by Awesome-Lazy-Zsh')) return true;
    if (line.includes('github.com/AmJaradat01/awesome-lazy-zsh')) return true;
    if (line === '# ==============================') return true;

    // Skip theme-related comments
    if (line.includes('Set name of the theme to load')) return true;
    if (line.includes('load a random theme')) return true;
    if (line.includes('which specific one was loaded')) return true;
    if (line.includes('ohmyzsh/ohmyzsh/wiki/Themes')) return true;

    // Skip Homebrew PATH if it will be managed
    if (line.includes('/opt/homebrew/bin') && line.startsWith('export PATH=')) return true;
    if (line.includes('/usr/local/bin') && line.startsWith('export PATH=') && !line.includes('$PATH:/usr/local/bin')) return true;
    if (line === '# Homebrew PATH for Apple Silicon') return true;
    if (line === '# Homebrew PATH for Intel Macs') return true;
    if (line === '# Homebrew PATH for Linux') return true;

    // Skip VSCode path if vscode plugin is selected
    if (plugins.includes('vscode')) {
        if (line.includes('Visual Studio Code') && line.includes('PATH')) return true;
        if (line === '# Visual Studio Code Path') return true;
    }

    // Skip Docker config if docker plugin is selected
    if (plugins.includes('docker') || plugins.includes('docker-compose')) {
        if (line.startsWith('alias dps=')) return true;
        if (line.startsWith('alias dstop=')) return true;
        if (line.startsWith('alias drm=')) return true;
        if (line.startsWith('alias dimages=')) return true;
        if (line.startsWith('alias dbuild=')) return true;
        if (line.includes('Docker Path')) return true;
        if (line.includes('Docker Aliases')) return true;
        if (line.includes('Docker CLI completions')) return true;
        if (line.includes('docker/completions')) return true;
        if (line.includes('/Applications/Docker.app')) return true;
    }

    // Skip NVM setup if nvm plugin is selected
    if (plugins.includes('nvm')) {
        if (line.startsWith('export NVM_DIR=')) return true;
        if (line.includes('$NVM_DIR/nvm.sh')) return true;
        if (line.includes('$NVM_DIR/bash_completion')) return true;
        if (line.includes('NVM Setup')) return true;
    }

    // Skip kubectl alias if kubectl plugin is selected
    if (plugins.includes('kubectl')) {
        if (line.startsWith('alias k8s-start=')) return true;
        if (line === '# Kubernetes Alias') return true;
    }

    // Skip git_branch function if git plugin is selected
    if (plugins.includes('git') || plugins.includes('git-flow')) {
        if (line === '# Git Branch Function') return true;
    }

    // Skip compinit if it will be called by docker setup
    if ((plugins.includes('docker') || plugins.includes('docker-compose'))) {
        if (line.includes('compinit')) return true;
        if (line.includes('autoload -Uz compinit')) return true;
    }

    // Skip alias-manager sourcing
    if (line.includes('alias-manager.zsh')) return true;

    // Skip awesome-lazy-zsh alias sourcing
    if (line.includes('awesome-lazy-zsh') && line.includes('source')) return true;
    if (line.includes('/aliases/') && line.includes('source')) return true;
    if (line.includes('Awesome-Lazy-Zsh Alias Manager')) return true;
    if (line.includes('Awesome-Lazy-Zsh Custom Aliases')) return true;
    if (line.includes('stable opt/ symlink')) return true;
    if (line.includes('stable opt/ path')) return true;

    // Skip system optimization comments that will be regenerated
    if (line === '# System Optimizations') return true;
    if (line === '# macOS specific settings') return true;
    if (line === '# Linux specific settings') return true;
    if (line.startsWith('export BROWSER=')) return true;
    if (line.includes('brew shellenv')) return true;

    // Skip generic comments that are now empty/orphaned
    if (line === '# User configuration') return true;

    return false;
}



/**
 * Repairs common syntax errors in .zshrc content
 * @param {string} content - Content to repair
 * @returns {{content: string, repairs: string[]}} Repaired content and list of repairs made
 */
export function repairZshrcContent(content) {
    const repairs = [];
    let repaired = content;

    // Remove orphaned 'fi' without matching 'if'
    const lines = repaired.split('\n');
    const repairedLines = [];
    let ifCount = 0;

    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();

        // Count if/fi
        if (/^if\s+/.test(trimmed) || trimmed === 'if') ifCount++;
        if (trimmed === 'fi' || trimmed.endsWith('; fi')) {
            if (ifCount > 0) {
                ifCount--;
                repairedLines.push(lines[i]);
            } else {
                repairs.push(`Removed orphaned 'fi' at line ${i + 1}`);
            }
            continue;
        }

        repairedLines.push(lines[i]);
    }

    repaired = repairedLines.join('\n');

    // Fix malformed PATH assignments
    const pathRegex = /export PATH=([^$\n]*)\$PATH([a-zA-Z])/g;
    if (pathRegex.test(repaired)) {
        repaired = repaired.replace(pathRegex, 'export PATH=$1$PATH:$2');
        repairs.push('Fixed malformed PATH assignment (missing colon after $PATH)');
    }

    // Remove lines with obvious corruption (e.g., error messages in exports)
    const corruptedLineRegex = /^export PATH=.*Unknown command.*$/gm;
    if (corruptedLineRegex.test(repaired)) {
        repaired = repaired.replace(corruptedLineRegex, '');
        repairs.push('Removed corrupted PATH line containing error message');
    }

    // Remove duplicate empty lines (more than 2 consecutive)
    repaired = repaired.replace(/\n{4,}/g, '\n\n\n');
    if (repaired !== content && !repairs.some(r => r.includes('empty lines'))) {
        repairs.push('Normalized excessive empty lines');
    }

    return { content: repaired, repairs };
}



/**
 * Generates a diff preview between old and new content
 * @param {string} oldContent - Current .zshrc content
 * @param {string} newContent - Proposed new content
 * @returns {string} Human-readable diff
 */
export function generateDiffPreview(oldContent, newContent) {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');

    let diff = chalk.bold('=== Changes Preview ===\n\n');

    // Simple line-by-line diff
    const maxLines = Math.max(oldLines.length, newLines.length);
    let changes = 0;
    let additions = 0;
    let deletions = 0;

    for (let i = 0; i < maxLines; i++) {
        const oldLine = oldLines[i] || '';
        const newLine = newLines[i] || '';

        if (oldLine !== newLine) {
            changes++;
            if (!oldLine && newLine) {
                additions++;
            } else if (oldLine && !newLine) {
                deletions++;
            }
        }
    }

    diff += `Lines: ${oldLines.length} -> ${newLines.length}\n`;
    diff += chalk.green(`+ ${additions} additions\n`);
    diff += chalk.red(`- ${deletions} deletions\n`);
    diff += `~ ${changes - additions - deletions} modifications\n\n`;

    // Show key changes
    const oldParsed = parseZshrc(oldContent);
    const newParsed = parseZshrc(newContent);

    if (oldParsed.settings.theme?.value !== newParsed.settings.theme?.value) {
        diff += chalk.yellow(`Theme: ${oldParsed.settings.theme?.value || 'none'} -> ${newParsed.settings.theme?.value || 'none'}\n`);
    }

    const oldPlugins = new Set(oldParsed.settings.plugins);
    const newPlugins = new Set(newParsed.settings.plugins);

    const added = [...newPlugins].filter(p => !oldPlugins.has(p));
    const removed = [...oldPlugins].filter(p => !newPlugins.has(p));

    if (added.length > 0) {
        diff += chalk.green(`+ Plugins added: ${added.join(', ')}\n`);
    }
    if (removed.length > 0) {
        diff += chalk.red(`- Plugins removed: ${removed.join(', ')}\n`);
    }

    if (oldParsed.duplicates.length > 0 && newParsed.duplicates.length < oldParsed.duplicates.length) {
        const fixed = oldParsed.duplicates.length - newParsed.duplicates.length;
        diff += chalk.green(`✓ ${fixed} duplicate(s) will be resolved\n`);
    }

    if (oldParsed.errors.length > 0 && newParsed.errors.length < oldParsed.errors.length) {
        const fixed = oldParsed.errors.length - newParsed.errors.length;
        diff += chalk.green(`✓ ${fixed} syntax error(s) will be fixed\n`);
    }

    return diff;
}



/**
 * Analyzes current .zshrc and returns a report
 * @returns {Promise<{parsed: ParsedZshrc, report: string}|null>} Analysis result or null
 */
export async function analyzeZshrc() {
    const parsed = parseZshrcFile();
    if (!parsed) {
        return null;
    }
    const report = generateReport(parsed);
    return { parsed, report };
}

/**
 * Main update function with intelligent merging
 * @param {string[]} newPlugins - Array of plugin names
 * @param {string} theme - Theme name to apply
 * @param {Object} [options] - Update options
 * @param {boolean} [options.preview=false] - Show preview without applying
 * @param {boolean} [options.repair=true] - Auto-repair syntax errors
 * @param {boolean} [options.cleanDuplicates=true] - Remove duplicates
 * @returns {Promise<{success: boolean, preview?: string, repairs?: string[]}>}
 */
export async function updateZshrc(newPlugins, theme, options = {}) {
    const { preview = false, repair = true, cleanDuplicates = true } = options;

    try {
        // Refuse to replace symlinked .zshrc
        if (fs.existsSync(ZSHRC_PATH) && fs.lstatSync(ZSHRC_PATH).isSymbolicLink()) {
            throw new Error('Refusing to replace symlinked .zshrc; update the symlink target explicitly.');
        }

        // Read and parse existing content
        let existingContent = '';
        let parsed = null;
        if (fs.existsSync(ZSHRC_PATH)) {
            existingContent = fs.readFileSync(ZSHRC_PATH, 'utf8');
            parsed = parseZshrc(existingContent);
        }

        // Apply repairs if requested
        let repairs = [];
        if (repair && existingContent) {
            const repairResult = repairZshrcContent(existingContent);
            if (repairResult.repairs.length > 0) {
                existingContent = repairResult.content;
                repairs = repairResult.repairs;
                parsed = parseZshrc(existingContent);
            }
        }

        // Extract user content (content outside managed block)
        let userPre = '';
        let userPost = '';

        if (parsed) {
            const userContent = getUserContent(parsed);
            userPre = cleanUserContent(userContent.pre, newPlugins);
            userPost = cleanUserContent(userContent.post, newPlugins);
        }

        // Generate new managed block
        const managedBlock = await generateManagedBlockContent(theme, newPlugins);

        // Assemble final content
        let finalContent = '';

        if (userPre.trim()) {
            finalContent += userPre.trim() + '\n\n';
        }

        finalContent += managedBlock;

        if (userPost.trim()) {
            finalContent += '\n\n' + userPost.trim();
        }

        finalContent = finalContent.trim() + '\n';

        // Preview mode
        if (preview) {
            const diffPreview = generateDiffPreview(existingContent, finalContent);
            return { success: true, preview: diffPreview, repairs };
        }

        // Backup before writing
        backupExistingZshrc(ZSHRC_PATH);

        // Write atomically
        atomicWrite(ZSHRC_PATH, finalContent);

        console.log(chalk.green(`\`.zshrc updated with selected plugins and theme: ${theme}`));
        if (repairs.length > 0) {
            console.log(chalk.blue(`Repairs applied: ${repairs.join(', ')}`));
        }
        console.log(chalk.yellow(`Please restart your terminal or run 'source ~/.zshrc' to apply changes.`));

        return { success: true, repairs };
    } catch (error) {
        console.error(chalk.red(`Error updating .zshrc: ${error.message}`));
        return { success: false, error: error.message };
    }
}



/**
 * Adds a single plugin to the current configuration
 * @param {string} pluginName - Plugin to add
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function addPlugin(pluginName) {
    if (!isValidPluginName(pluginName)) {
        return { success: false, message: `Invalid plugin name: ${pluginName}` };
    }

    const parsed = parseZshrcFile();
    if (!parsed) {
        return { success: false, message: 'No .zshrc file found' };
    }

    const currentPlugins = parsed.settings.allPlugins.length > 0
        ? parsed.settings.allPlugins
        : parsed.settings.plugins;

    if (currentPlugins.includes(pluginName)) {
        return { success: false, message: `Plugin ${pluginName} is already installed` };
    }

    const newPlugins = [...currentPlugins, pluginName];
    const theme = parsed.settings.theme?.value || 'robbyrussell';

    const result = await updateZshrc(newPlugins, theme);
    if (result.success) {
        return { success: true, message: `Added plugin: ${pluginName}` };
    }
    return { success: false, message: result.error || 'Failed to update .zshrc' };
}

/**
 * Removes a single plugin from the current configuration
 * @param {string} pluginName - Plugin to remove
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function removePlugin(pluginName) {
    const parsed = parseZshrcFile();
    if (!parsed) {
        return { success: false, message: 'No .zshrc file found' };
    }

    const currentPlugins = parsed.settings.allPlugins.length > 0
        ? parsed.settings.allPlugins
        : parsed.settings.plugins;

    if (!currentPlugins.includes(pluginName)) {
        return { success: false, message: `Plugin ${pluginName} is not installed` };
    }

    const newPlugins = currentPlugins.filter(p => p !== pluginName);
    const theme = parsed.settings.theme?.value || 'robbyrussell';

    const result = await updateZshrc(newPlugins, theme);
    if (result.success) {
        return { success: true, message: `Removed plugin: ${pluginName}` };
    }
    return { success: false, message: result.error || 'Failed to update .zshrc' };
}

/**
 * Changes the theme
 * @param {string} themeName - New theme name
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function setTheme(themeName) {
    if (!isValidThemeName(themeName)) {
        return { success: false, message: `Invalid theme name: ${themeName}` };
    }

    const parsed = parseZshrcFile();
    if (!parsed) {
        return { success: false, message: 'No .zshrc file found' };
    }

    const currentPlugins = parsed.settings.allPlugins.length > 0
        ? parsed.settings.allPlugins
        : parsed.settings.plugins;

    const result = await updateZshrc(currentPlugins, themeName);
    if (result.success) {
        return { success: true, message: `Theme changed to: ${themeName}` };
    }
    return { success: false, message: result.error || 'Failed to update .zshrc' };
}



/**
 * Repairs the current .zshrc file
 * @param {Object} [options] - Repair options
 * @param {boolean} [options.preview=false] - Preview only, don't apply
 * @returns {Promise<{success: boolean, repairs: string[], preview?: string}>}
 */
export async function repairZshrc(options = {}) {
    const { preview = false } = options;

    if (!fs.existsSync(ZSHRC_PATH)) {
        return { success: false, repairs: [], message: 'No .zshrc file found' };
    }

    const content = fs.readFileSync(ZSHRC_PATH, 'utf8');
    const { content: repaired, repairs } = repairZshrcContent(content);

    if (repairs.length === 0) {
        return { success: true, repairs: [], message: 'No repairs needed' };
    }

    if (preview) {
        const diffPreview = generateDiffPreview(content, repaired);
        return { success: true, repairs, preview: diffPreview };
    }

    backupExistingZshrc(ZSHRC_PATH);
    atomicWrite(ZSHRC_PATH, repaired);

    console.log(chalk.green('Repairs applied:'));
    for (const repair of repairs) {
        console.log(chalk.blue(`  - ${repair}`));
    }

    return { success: true, repairs };
}

/**
 * Cleans duplicates from .zshrc while preserving user customizations
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function cleanDuplicates() {
    const parsed = parseZshrcFile();
    if (!parsed) {
        return { success: false, message: 'No .zshrc file found' };
    }

    if (parsed.duplicates.length === 0) {
        return { success: true, message: 'No duplicates found' };
    }

    // Re-run updateZshrc with current settings to clean up
    const plugins = parsed.settings.allPlugins.length > 0
        ? parsed.settings.allPlugins
        : parsed.settings.plugins;
    const theme = parsed.settings.theme?.value || 'robbyrussell';

    const result = await updateZshrc(plugins, theme, { cleanDuplicates: true });
    if (result.success) {
        return { success: true, message: `Cleaned ${parsed.duplicates.length} duplicate(s)` };
    }
    return { success: false, message: result.error || 'Failed to clean duplicates' };
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use updateZshrc with managed-block approach instead
 */
export async function generateZshrcContent(theme, plugins = []) {
    return generateManagedBlockContent(theme, plugins);
}

// Re-export parser functions for convenience
export { parseZshrc, parseZshrcFile, generateReport, hasManagedBlock };
