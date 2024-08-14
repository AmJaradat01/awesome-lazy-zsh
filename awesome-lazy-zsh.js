const prompts = require('prompts');
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');

// Helper function to run shell commands
function runCommand(command) {
    try {
        console.log(`Running: ${command}`);
        execSync(command, { stdio: 'inherit' });
    } catch (error) {
        console.error(`Failed to run command: ${command}`, error);
    }
}

(async () => {
    // Step 1: Choose Installation Type
    const { installationType } = await prompts({
        type: 'select',
        name: 'installationType',
        message: 'Choose installation type:',
        choices: [
            { title: 'Default Installation', value: 'default' },
            { title: 'Custom Installation', value: 'custom' }
        ]
    });

    let plugins, theme, aliases, functions;

    if (installationType === 'default') {
        // Default Installation
        plugins = ['git', 'npm', 'vscode', 'zsh-autosuggestions', 'zsh-syntax-highlighting', 'docker', 'kubectl', 'terraform', 'fzf', 'z', 'thefuck'];
        theme = 'robbyrussell';
        aliases = 'default';
        functions = 'default';
        runCommand('brew tap homebrew/cask-fonts && brew install --cask font-meslo-lg-nerd-font');
    } else {
        // Custom Installation
        // Step 2: Select Theme
        const { selectedTheme } = await prompts({
            type: 'select',
            name: 'selectedTheme',
            message: 'Select a theme:',
            choices: [
                { title: 'Powerlevel10k', value: 'powerlevel10k' },
                { title: 'Agnoster', value: 'agnoster' },
                { title: 'Spaceship', value: 'spaceship' },
                { title: 'Robbyrussell', value: 'robbyrussell' }
            ]
        });
        theme = selectedTheme;

        if (theme === 'powerlevel10k') {
            runCommand('git clone --depth=1 https://github.com/romkatv/powerlevel10k.git ~/.oh-my-zsh/custom/themes/powerlevel10k');
            runCommand('brew install --cask font-hack-nerd-font');
        } else if (theme === 'agnoster') {
            runCommand('brew install --cask font-meslo-lg-nerd-font');
        } else if (theme === 'spaceship') {
            runCommand('git clone --depth=1 https://github.com/spaceship-prompt/spaceship-prompt.git ~/.oh-my-zsh/custom/themes/spaceship');
            runCommand('brew install --cask font-firacode-nerd-font');
        }

        // Step 3: Select Plugins
        const { selectedPlugins } = await prompts({
            type: 'multiselect',
            name: 'selectedPlugins',
            message: 'Select plugins:',
            choices: [
                { title: 'git', value: 'git' },
                { title: 'npm', value: 'npm' },
                { title: 'vscode', value: 'vscode' },
                { title: 'zsh-autosuggestions', value: 'zsh-autosuggestions' },
                { title: 'zsh-syntax-highlighting', value: 'zsh-syntax-highlighting' },
                { title: 'docker', value: 'docker' },
                { title: 'kubectl', value: 'kubectl' },
                { title: 'terraform', value: 'terraform' },
                { title: 'fzf', value: 'fzf' },
                { title: 'z', value: 'z' },
                { title: 'thefuck', value: 'thefuck' },
                { title: 'zsh-history-substring-search', value: 'zsh-history-substring-search' },
                { title: 'zsh-completions', value: 'zsh-completions' },
                { title: 'zsh-vi-mode', value: 'zsh-vi-mode' }
            ],
            instructions: false,
            min: 1
        });
        plugins = selectedPlugins;

        // Step 4: Select Aliases
        const { aliasChoice } = await prompts({
            type: 'select',
            name: 'aliasChoice',
            message: 'Choose alias setup:',
            choices: [
                { title: 'Default Aliases', value: 'default' },
                { title: 'Custom Aliases', value: 'custom' }
            ]
        });
        aliases = aliasChoice;

        // Step 5: Select Functions
        const { functionChoice } = await prompts({
            type: 'select',
            name: 'functionChoice',
            message: 'Choose function setup:',
            choices: [
                { title: 'Default Functions', value: 'default' },
                { title: 'Custom Functions', value: 'custom' }
            ]
        });
        functions = functionChoice;
    }

    // Generate .zshrc based on selections
    const zshrcContent = `
# ==============================
#   Oh-My-Zsh Configuration
# ==============================

export ZSH="\$HOME/.oh-my-zsh"
source \$ZSH/oh-my-zsh.sh

plugins=(${plugins.join(' ')})

ZSH_THEME="${theme}"

export PATH="\$HOME/bin:/usr/local/bin:\$PATH"
if [[ \$(uname -m) == 'arm64' ]]; then
    export PATH="/opt/homebrew/bin:\$PATH"
else
    export PATH="/usr/local/bin:\$PATH"
fi
export PATH="\$PATH:/Applications/Visual Studio Code.app/Contents/Resources/app/bin"
export PATH="\$PATH:/Applications/Docker.app/Contents/Resources/bin/"
export PATH="\$PATH:/usr/local/mysql/bin"
PATH=\$PATH:/usr/local/bin

export NVM_DIR="\$HOME/.nvm"
[ -s "\$NVM_DIR/nvm.sh" ] && \. "\$NVM_DIR/nvm.sh"
[ -s "\$NVM_DIR/bash_completion" ] && \. "\$NVM_DIR/bash_completion"

${aliases === 'custom' ? `
alias ll='ls -la'
alias gs='git status'
alias ..='cd ..'
alias la='ls -A'
alias h='history'
alias reload='source ~/.zshrc'

alias dps='docker ps'
alias dstop='docker stop \$(docker ps -a -q)'
alias drm='docker rm \$(docker ps -a -q)'
alias dimages='docker images'
alias dbuild='docker build -t'

alias ga='git add'
alias gc='git commit'
alias gp='git push'
alias gco='git checkout'
alias gb='git branch'
` : `
alias ll='ls -la'
alias gs='git status'
alias ..='cd ..'
alias la='ls -A'
alias h='history'
alias reload='source ~/.zshrc'
`}

${functions === 'custom' ? `
cl() { cd "\$1" && ls }
mkcd() { mkdir -p "\$1" && cd "\$1" }
duf() { du -sh "\$1" 2>/dev/null }
` : `
cl() { cd "\$1" && ls }
mkcd() { mkdir -p "\$1" && cd "\$1" }
`}
    `;

    // Write the .zshrc file
    fs.writeFileSync(`${os.homedir()}/.zshrc`, zshrcContent.trim());

    console.log('Zsh configuration has been updated. Please restart your terminal.');
})();
