/**
 * Configuration mappings for plugins and themes
 * @author Ali M. Jaradat <AmJaradat01@gmail.com>
 */

/**
 * Plugin repository mappings
 * - empty string '' indicates a built-in Oh My Zsh plugin (added to plugins=() array)
 * - 'alias-only' indicates a custom alias plugin (sourced as a file, NOT added to plugins=())
 * - URL string indicates an external plugin to clone
 */
export const pluginRepos = {
    // Built-in Oh My Zsh plugins
    'git': '',
    'git-flow': '',
    'npm': '',
    'nvm': '',
    'docker': '',
    'docker-compose': '',
    'kubectl': '',
    'terraform': '',
    'vscode': '',
    'extract': '',
    'dotenv': '',
    'ssh-agent': '',
    'node': '',
    'gitfast': '',
    
    // External plugins (cloned into custom/plugins/)
    'fzf': 'https://github.com/junegunn/fzf.git',
    'z': 'https://github.com/agkozak/zsh-z.git',
    'thefuck': 'https://github.com/nvbn/thefuck.git',
    'zsh-autocomplete': 'https://github.com/marlonrichert/zsh-autocomplete.git',
    'zsh-autosuggestions': 'https://github.com/zsh-users/zsh-autosuggestions.git',
    'zsh-syntax-highlighting': 'https://github.com/zsh-users/zsh-syntax-highlighting.git',
    
    // Alias-only plugins (sourced as custom alias files, not Oh My Zsh plugins)
    'mongodb': 'alias-only',
    'postgresql': 'alias-only',
    'mysql': 'alias-only',
    'redis': 'alias-only',
    'rabbitmq': 'alias-only',
    'elasticsearch': 'alias-only',
    'memcached': 'alias-only',
    'aws': 'alias-only',
    'gcloud': 'alias-only',
    'azure': 'alias-only',
    'kubernetes': 'alias-only',
    'docker-compose-extended': 'alias-only',
    'terraform-extended': 'alias-only',
    'ansible': 'alias-only',
    'python': 'alias-only',
    'golang': 'alias-only',
    'rust': 'alias-only',
    'java': 'alias-only',
    'git-extras': 'alias-only',
    'ssh': 'alias-only',
    'directories': 'alias-only',
    'history-search': 'alias-only'
};

/** Theme repository mappings - empty string indicates built-in Oh My Zsh theme */
export const themeRepos = {
    'robbyrussell': '',
    'powerlevel10k': 'https://github.com/romkatv/powerlevel10k.git',
    'agnoster': '',
    'spaceship': 'https://github.com/spaceship-prompt/spaceship-prompt.git',
    'starship': 'https://github.com/starship/starship.git'
};
