/**
 * Configuration mappings for plugins and themes
 * @author Ali M. Jaradat <AmJaradat01@gmail.com>
 */

/** Plugin repository mappings - empty string indicates built-in Oh My Zsh plugin */
export const pluginRepos = {
    'git': '', // Built-in Oh My Zsh plugin
    'golang': '', // Golang aliases
    'git-flow': '', // Built-in Oh My Zsh plugin
    'npm': '', // Built-in Oh My Zsh plugin
    'nvm': '', // Built-in Oh My Zsh plugin
    'docker': '', // Built-in Oh My Zsh plugin
    'docker-compose': '', // Built-in Oh My Zsh plugin
    'kubectl': '', // Built-in Oh My Zsh plugin
    'terraform': '', // Built-in Oh My Zsh plugin
    'vscode': '', // Built-in Oh My Zsh plugin
    'fzf': 'https://github.com/junegunn/fzf.git',
    'z': 'https://github.com/agkozak/zsh-z.git',
    'thefuck': 'https://github.com/nvbn/thefuck.git',
    'zsh-autocomplete': 'https://github.com/marlonrichert/zsh-autocomplete.git',
    'zsh-autosuggestions': 'https://github.com/zsh-users/zsh-autosuggestions.git',
    'zsh-syntax-highlighting': 'https://github.com/zsh-users/zsh-syntax-highlighting.git'
};

/** Theme repository mappings - empty string indicates built-in Oh My Zsh theme */
export const themeRepos = {
    'robbyrussell': '',
    'powerlevel10k': 'https://github.com/romkatv/powerlevel10k.git',
    'agnoster': '',
    'spaceship': 'https://github.com/spaceship-prompt/spaceship-prompt.git',
    'starship': 'https://github.com/starship/starship.git'
};
