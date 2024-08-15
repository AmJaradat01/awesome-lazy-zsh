import fs from 'fs';
import path from 'path';
import os from 'os';
import prompts from 'prompts';
import { execSync } from 'child_process';
import chalk from 'chalk';
import logSymbols from 'log-symbols';

// Helper function to create the backup folder if it doesn't exist
function ensureBackupFolderExists() {
    const backupFolder = path.join(os.homedir(), '.awesome-lazy-zsh_backup');
    if (!fs.existsSync(backupFolder)) {
        fs.mkdirSync(backupFolder, { recursive: true });
        console.log(`${logSymbols.success} ${chalk.green(`Backup folder created at: ${backupFolder}`)}`);
    }
    return backupFolder;
}

// Helper function to back up the .zshrc file
function backupZshrc() {
    const homeDir = os.homedir();
    const zshrcPath = path.join(homeDir, '.zshrc');
    const backupFolder = ensureBackupFolderExists();
    const backupPath = path.join(backupFolder, `.zshrc.backup.${Date.now()}`);

    try {
        if (fs.existsSync(zshrcPath)) {
            fs.copyFileSync(zshrcPath, backupPath);
            console.log(`${logSymbols.success} ${chalk.green(`Backup created at: ${backupPath}`)}`);
        } else {
            console.log(`${logSymbols.warning} ${chalk.yellow("No existing .zshrc file found to backup.")}`);
        }
    } catch (error) {
        console.error(`${logSymbols.error} ${chalk.red(`Failed to create backup: ${error.message}`)}`);
    }
}

// Helper function to restore the .zshrc file from a backup
async function restoreZshrc() {
    const backupFolder = ensureBackupFolderExists();
    try {
        const backups = fs.readdirSync(backupFolder).filter(file => file.startsWith('.zshrc.backup.'));
        if (backups.length === 0) {
            console.log(`${logSymbols.warning} ${chalk.yellow("No backups found.")}`);
            return;
        }

        const { backupFile } = await prompts({
            type: 'select',
            name: 'backupFile',
            message: 'Select a backup file to restore:',
            choices: backups.map(file => ({ title: file, value: path.join(backupFolder, file) }))
        });

        if (backupFile) {
            const zshrcPath = path.join(os.homedir(), '.zshrc');
            fs.copyFileSync(backupFile, zshrcPath);
            console.log(`${logSymbols.success} ${chalk.green(`.zshrc restored from backup: ${backupFile}`)}`);
        } else {
            console.log(`${logSymbols.info} ${chalk.blue("Restore canceled.")}`);
        }
    } catch (error) {
        console.error(`${logSymbols.error} ${chalk.red(`Failed to restore from backup: ${error.message}`)}`);
    }
}

// Helper function to run shell commands
async function runCommand(command) {
    try {
        console.log(`${logSymbols.info} ${chalk.blueBright(`Running: ${command}`)}`);
        execSync(command, { stdio: 'inherit', shell: '/bin/zsh' }); // Ensure using zsh
    } catch (error) {
        console.error(`${logSymbols.error} ${chalk.red(`Failed to run command: ${command}`)}`, error);
        throw error;
    }
}

// Function to check if a command exists
function commandExists(command) {
    try {
        execSync(`command -v ${command}`);
        return true;
    } catch {
        return false;
    }
}

// Function to check if NVM is installed correctly
function nvmInstalled() {
    const nvmDir = path.join(os.homedir(), '.nvm');
    return fs.existsSync(nvmDir) && fs.existsSync(path.join(nvmDir, 'nvm.sh'));
}

// Function to check and install Homebrew if not installed
async function installHomebrew() {
    if (!commandExists('brew')) {
        console.log(`${logSymbols.warning} ${chalk.yellow("Homebrew not found. Installing...")}`);
        await runCommand('/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"');

        // Add Homebrew to PATH based on architecture
        const brewPath = os.arch() === 'arm64' ? '/opt/homebrew/bin' : '/usr/local/bin';
        updateZshrcPath(brewPath);

        console.log(`${logSymbols.success} ${chalk.green("Homebrew installed and added to PATH.")}`);
    } else {
        console.log(`${logSymbols.success} ${chalk.green("Homebrew is already installed.")}`);
    }
}

// Function to update PATH in .zshrc file
function updateZshrcPath(newPath) {
    const zshrcPath = path.join(os.homedir(), '.zshrc');
    let zshrcContent = fs.readFileSync(zshrcPath, 'utf-8');

    if (!zshrcContent.includes(newPath)) {
        zshrcContent = `export PATH="${newPath}:$PATH"\n` + zshrcContent;
        fs.writeFileSync(zshrcPath, zshrcContent, 'utf-8');
    }
}

// Function to install a plugin or tool
async function installTool(toolName, installCommand) {
    if (!commandExists(toolName)) {
        console.log(`${logSymbols.warning} ${chalk.yellow(`${toolName} not found. Installing...`)}`);
        await runCommand(installCommand);
    } else {
        console.log(`${logSymbols.success} ${chalk.green(`${toolName} is already installed.`)}`);
    }
}

// Function to install NVM
async function installNvm() {
    if (!nvmInstalled()) {
        console.log(`${logSymbols.warning} ${chalk.yellow("NVM not found. Installing...")}`);
        await runCommand('curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash');
    } else {
        console.log(`${logSymbols.success} ${chalk.green("NVM is already installed.")}`);
    }
}

// Function to install a plugin
async function installPlugin(pluginName, repoUrl) {
    const pluginPath = path.join(os.homedir(), `.oh-my-zsh/custom/plugins/${pluginName}`);
    if (!fs.existsSync(pluginPath)) {
        console.log(`${logSymbols.warning} ${chalk.yellow(`${pluginName} not found. Installing...`)}`);
        await runCommand(`git clone ${repoUrl} ${pluginPath}`);
    } else {
        console.log(`${logSymbols.success} ${chalk.green(`${pluginName} is already installed.`)}`);
    }
}

// Function to check and install Oh-My-Zsh if not installed
async function installOhMyZsh() {
    const ohMyZshPath = path.join(os.homedir(), '.oh-my-zsh');
    if (!fs.existsSync(ohMyZshPath)) {
        console.log(`${logSymbols.warning} ${chalk.yellow("Oh-My-Zsh not found. Installing...")}`);
        await runCommand('sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"');
    } else {
        console.log(`${logSymbols.success} ${chalk.green("Oh-My-Zsh is already installed.")}`);
    }
}

// Function to install Zsh
async function installZsh() {
    if (!commandExists('zsh')) {
        console.log(`${logSymbols.warning} ${chalk.yellow("Zsh not found. Installing...")}`);
        await runCommand('brew install zsh');
        // Change default shell to Zsh
        await runCommand('chsh -s $(which zsh)');
        console.log(`${logSymbols.success} ${chalk.green("Zsh installed and set as the default shell.")}`);
    } else {
        console.log(`${logSymbols.success} ${chalk.green("Zsh is already installed.")}`);
    }
}

// Helper function to write the .zshrc file based on user selections
async function writeZshrc(theme, plugins) {
    let zshrcContent = `
# ==============================
#   Awesome-Lazy-Zsh Configuration
#   Generated by Awesome-Lazy-Zsh
#   https://github.com/AmJaradat01/awesome-lazy-zsh
# ==============================

# If you come from bash you might have to change your \$PATH.
# export PATH=\$HOME/bin:\$HOME/.local/bin:/usr/local/bin:\$PATH

# Path to your Oh My Zsh installation.
export ZSH="\$HOME/.oh-my-zsh"

# Set name of the theme to load --- if set to "random", it will
# load a random theme each time Oh My Zsh is loaded, in which case,
# to know which specific one was loaded, run: echo \$RANDOM_THEME
# See https://github.com/ohmyzsh/ohmyzsh/wiki/Themes
ZSH_THEME="${theme}"

# Uncomment the following line to use case-sensitive completion.
# CASE_SENSITIVE="true"

# Uncomment the following line to use hyphen-insensitive completion.
# Case-sensitive completion must be off. _ and - will be interchangeable.
# HYPHEN_INSENSITIVE="true"

# Uncomment one of the following lines to change the auto-update behavior
# zstyle ':omz:update' mode disabled  # disable automatic updates
# zstyle ':omz:update' mode auto      # update automatically without asking
# zstyle ':omz:update' mode reminder  # just remind me to update when it's time

# Uncomment the following line to change how often to auto-update (in days).
# zstyle ':omz:update' frequency 13

# Uncomment the following line if pasting URLs and other text is messed up.
# DISABLE_MAGIC_FUNCTIONS="true"

# Uncomment the following line to disable colors in ls.
# DISABLE_LS_COLORS="true"

# Uncomment the following line to disable auto-setting terminal title.
# DISABLE_AUTO_TITLE="true"

# Uncomment the following line to enable command auto-correction.
# ENABLE_CORRECTION="true"

# Uncomment the following line to display red dots whilst waiting for completion.
# COMPLETION_WAITING_DOTS="true"

# Uncomment the following line if you want to disable marking untracked files
# under VCS as dirty. This makes repository status check for large repositories
# much, much faster.
# DISABLE_UNTRACKED_FILES_DIRTY="true"

# Uncomment the following line if you want to change the command execution time
# stamp shown in the history command output.
# HIST_STAMPS="mm/dd/yyyy"

# Would you like to use another custom folder than \$ZSH/custom?
# ZSH_CUSTOM=/path/to/new-custom-folder

# Which plugins would you like to load?
# Standard plugins can be found in \$ZSH/plugins/
# Custom plugins may be added to \$ZSH_CUSTOM/plugins/
# Example format: plugins=(rails git textmate ruby lighthouse)
# Add wisely, as too many plugins slow down shell startup.
plugins=(${plugins.join(' ')})

source \$ZSH/oh-my-zsh.sh

# User configuration

# export MANPATH="/usr/local/man:\$MANPATH"

# You may need to manually set your language environment
# export LANG=en_US.UTF-8

# Preferred editor for local and remote sessions
# if [[ -n \$SSH_CONNECTION ]]; then
#   export EDITOR='vim'
# else
#   export EDITOR='mvim'
# fi

# Compilation flags
# export ARCHFLAGS="-arch \$(uname -m)"

# Set personal aliases, overriding those provided by Oh My Zsh libs,
# plugins, and themes. Aliases can be placed here, though Oh My Zsh
# users are encouraged to define aliases within a top-level file in
# the \$ZSH_CUSTOM folder, with .zsh extension. Examples:
# - \$ZSH_CUSTOM/aliases.zsh
# - \$ZSH_CUSTOM/macos.zsh
# For a full list of active aliases, run \`alias\`.

# Example aliases
# alias zshconfig="mate ~/.zshrc"
# alias ohmyzsh="mate ~/.oh-my-zsh"
`;

    // Include Homebrew PATH based on architecture
    if (os.arch() === 'arm64') {
        zshrcContent += `
# Homebrew PATH for Apple Silicon
export PATH="/opt/homebrew/bin:\$PATH"
`;
    } else {
        zshrcContent += `
# Homebrew PATH for Intel Macs
export PATH="/usr/local/bin:\$PATH"
`;
    }

    // Add Visual Studio Code Path
    if (plugins.includes('vscode')) {
        zshrcContent += `
# Visual Studio Code Path
export PATH="\$PATH:/Applications/Visual Studio Code.app/Contents/Resources/app/bin"
`;
    }

    // Add Docker Path and aliases
    if (plugins.includes('docker') || plugins.includes('docker-compose')) {
        zshrcContent += `
# Docker Path
export PATH="\$PATH:/Applications/Docker.app/Contents/Resources/bin/"

# Docker Aliases
alias dps='docker ps'
alias dstop='docker stop \$(docker ps -a -q)'
alias drm='docker rm \$(docker ps -a -q)'
alias dimages='docker images'
alias dbuild='docker build -t'
`;
    }

    // Add Kubernetes alias
    if (plugins.includes('kubectl')) {
        zshrcContent += `
# Kubernetes Alias
alias k8s-start='kubectl apply -f deployment.yaml'
`;
    }

    // Add NVM setup
    if (plugins.includes('nvm')) {
        zshrcContent += `
# ==============================
#   NVM Setup
# ==============================

export NVM_DIR="\$HOME/.nvm"
[ -s "\$NVM_DIR/nvm.sh" ] && . "\$NVM_DIR/nvm.sh"
[ -s "\$NVM_DIR/bash_completion" ] && . "\$NVM_DIR/bash_completion"
`;
    }

    // Add Git branch function
    if (plugins.includes('git') || plugins.includes('git-flow')) {
        zshrcContent += `
# Git Branch Function
git_branch() {
    git branch 2>/dev/null | grep '^*' | colrm 1 2
}
`;
    }

    // Add Starship prompt initialization if chosen
    if (theme === 'starship') {
        zshrcContent += `
# ==============================
#   Starship Prompt Initialization
# ==============================

# Initialize Starship prompt
eval "\$(starship init zsh)"
`;
    }

    // Write the .zshrc file
    const zshrcPath = path.join(os.homedir(), '.zshrc');
    fs.writeFileSync(zshrcPath, zshrcContent.trim());
    console.log(`${logSymbols.success} ${chalk.green(`Zsh configuration has been updated.`)}`);
    console.log(`${logSymbols.info} ${chalk.blueBright(`The .zshrc file is located at: ${zshrcPath}`)}`);
}

// Function to handle user selection with an "Exit" option
async function getUserSelection({ type, name, message, choices }) {
    const response = await prompts({
        type,
        name,
        message,
        choices: [
            ...choices,
            { title: '❌ Exit', value: 'exit', description: 'Exit without proceeding', disabled: false }
        ]
    });

    if (response[name] === 'exit') {
        console.log(`${logSymbols.info} ${chalk.blueBright('Exiting...')}`);
        process.exit(); // Ensure the script exits immediately
    }

    return response;
}

// Function to handle the backup/restore selection
async function handleRestoreBackup() {
    const { backupOption } = await getUserSelection({
        type: 'select',
        name: 'backupOption',
        message: 'Choose an option:',
        choices: [
            { title: 'Backup .zshrc', value: 'backup' },
            { title: 'Restore .zshrc from Backup', value: 'restore' }
        ]
    });

    if (backupOption === 'backup') {
        console.log(`${logSymbols.success} ${chalk.green("Backing up .zshrc...")}`);
        backupZshrc();
    } else if (backupOption === 'restore') {
        console.log(`${logSymbols.success} ${chalk.green("Restoring .zshrc from backup...")}`);
        await restoreZshrc();
    }
}

// Function to install Starship
async function installStarship() {
    if (!commandExists('starship')) {
        console.log(`${logSymbols.warning} ${chalk.yellow("Starship not found. Installing...")}`);
        await runCommand('brew install starship');
        console.log(`${logSymbols.success} ${chalk.green("Starship installed.")}`);
    } else {
        console.log(`${logSymbols.success} ${chalk.green("Starship is already installed.")}`);
    }
}

// Function to install the Spaceship theme
async function installSpaceshipTheme() {
    const themePath = path.join(os.homedir(), '.oh-my-zsh/custom/themes/spaceship-prompt');
    if (!fs.existsSync(themePath)) {
        console.log(`${logSymbols.warning} ${chalk.yellow("Spaceship theme not found. Installing...")}`);
        await runCommand('git clone https://github.com/spaceship-prompt/spaceship-prompt.git "$ZSH/custom/themes/spaceship-prompt" --depth=1');
        await runCommand('ln -s "$ZSH/custom/themes/spaceship-prompt/spaceship.zsh-theme" "$ZSH/custom/themes/spaceship.zsh-theme"');
        console.log(`${logSymbols.success} ${chalk.green("Spaceship theme installed.")}`);
    } else {
        console.log(`${logSymbols.success} ${chalk.green("Spaceship theme is already installed.")}`);
    }
}

async function main() {
    try {
        console.log(chalk.bold.blue("\nWelcome to the Awesome Lazy Zsh Setup!\n"));

        await installZsh();
        await installOhMyZsh();
        await installHomebrew();

        console.log(`${logSymbols.success} ${chalk.green("Continuing with the setup...")}`);

        const { startOption } = await getUserSelection({
            type: 'select',
            name: 'startOption',
            message: chalk.cyan('Choose an option:'),
            choices: [
                { title: 'Proceed with Installation', value: 'install' },
                { title: 'Restore/Backup', value: 'restoreBackup' }
            ]
        });

        if (startOption === 'restoreBackup') {
            await handleRestoreBackup();
            return;
        }

        const { installationType } = await getUserSelection({
            type: 'select',
            name: 'installationType',
            message: chalk.cyan('Choose installation type:'),
            choices: [
                { title: 'Default Installation', value: 'default' },
                { title: 'Custom Installation', value: 'custom' }
            ]
        });

        let plugins = [];
        let theme = 'spaceship';

        if (installationType === 'default') {
            plugins = [
                'git', 'git-flow', 'npm', 'nvm', 'docker', 'docker-compose',
                'kubectl', 'terraform', 'vscode', 'fzf', 'z',
                'zsh-autocomplete', 'zsh-autosuggestions',
                'zsh-syntax-highlighting'
            ];

            await installTool('git', 'brew install git');
            await installNvm();
        } else {
            const builtInThemes = ['robbyrussell', 'powerlevel10k', 'agnoster', 'spaceship', 'starship'];

            const { selectedTheme } = await getUserSelection({
                type: 'select',
                name: 'selectedTheme',
                message: chalk.cyan('Choose a theme:'),
                choices: builtInThemes.map(theme => ({ title: theme, value: theme.toLowerCase() }))
            });

            theme = selectedTheme;

            if (theme === 'spaceship') {
                await installSpaceshipTheme();
            }

            if (theme === 'starship') {
                await installStarship();
            }

            const builtInPlugins = [
                'git', 'git-flow', 'npm', 'nvm', 'docker', 'docker-compose',
                'kubectl', 'terraform', 'vscode', 'fzf', 'z',
                'zsh-autocomplete', 'zsh-autosuggestions',
                'zsh-syntax-highlighting'
            ];

            const { selectedPlugins } = await getUserSelection({
                type: 'multiselect',
                name: 'selectedPlugins',
                message: chalk.cyan('Choose plugins:'),
                choices: builtInPlugins.map(plugin => ({ title: plugin, value: plugin }))
            });

            if (!selectedPlugins || selectedPlugins.length === 0) {
                console.log(`${logSymbols.info} ${chalk.blueBright('No plugins selected, exiting...')}`);
                process.exit();
            }

            plugins = selectedPlugins;

            if (plugins.includes('git')) {
                await installTool('git', 'brew install git');
            }
            if (plugins.includes('nvm')) {
                await installNvm();
            }
        }

        await writeZshrc(theme, plugins);

        for (const plugin of plugins) {
            const pluginRepos = {
                'git': 'https://github.com/ohmyzsh/ohmyzsh.git',
                'git-flow': 'https://github.com/ohmyzsh/ohmyzsh.git',
                'npm': 'https://github.com/ohmyzsh/ohmyzsh.git',
                'nvm': 'https://github.com/nvm-sh/nvm.git',
                'docker': 'https://github.com/ohmyzsh/ohmyzsh.git',
                'docker-compose': 'https://github.com/ohmyzsh/ohmyzsh.git',
                'kubectl': 'https://github.com/ohmyzsh/ohmyzsh.git',
                'terraform': 'https://github.com/hashicorp/terraform.git',
                'vscode': 'https://github.com/ohmyzsh/ohmyzsh.git',
                'fzf': 'https://github.com/junegunn/fzf.git',
                'z': 'https://github.com/agkozak/zsh-z.git',
                'zsh-autocomplete': 'https://github.com/marlonrichert/zsh-autocomplete.git',
                'zsh-autosuggestions': 'https://github.com/zsh-users/zsh-autosuggestions.git',
                'zsh-syntax-highlighting': 'https://github.com/zsh-users/zsh-syntax-highlighting.git'
            };
            if (pluginRepos[plugin]) {
                await installPlugin(plugin, pluginRepos[plugin]);
            }
        }

        console.log(`${logSymbols.success} ${chalk.green("Installation complete. Please restart your terminal.")}`);
        console.log(`${logSymbols.info} ${chalk.blueBright("Run 'source ~/.zshrc' in your terminal to apply the changes.")}`);

    } catch (error) {
        console.error(`${logSymbols.error} ${chalk.red('An unexpected error occurred:')}`, error);
    }
}

main();
