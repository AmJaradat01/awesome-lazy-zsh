/**
 * Configuration mappings for plugins and themes
 * @author Ali M. Jaradat <AmJaradat01@gmail.com>
 */

/**
 * Plugin repository mappings
 * - empty string '' indicates a built-in Oh My Zsh plugin (added to plugins=() array)
 * - 'alias-only' indicates a custom alias plugin (sourced as a file, NOT added to plugins=())
 * - URL string indicates an external plugin to clone
 *
 * SECURITY: External plugins are pinned to specific release tags where available.
 * When updating, verify the new tag exists and review the changelog.
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
    
    // External plugins (cloned into custom/plugins/ at pinned tags)
    'fzf': 'https://github.com/junegunn/fzf.git#v0.74.1',
    'z': 'https://github.com/agkozak/zsh-z.git#acd0e1984df350c189f8f9c4956ec586b6c73fca',
    'thefuck': 'https://github.com/nvbn/thefuck.git#3.32',
    'zsh-autocomplete': 'https://github.com/marlonrichert/zsh-autocomplete.git#23.07.13',
    'zsh-autosuggestions': 'https://github.com/zsh-users/zsh-autosuggestions.git#v0.7.1',
    'zsh-syntax-highlighting': 'https://github.com/zsh-users/zsh-syntax-highlighting.git#0.8.0',
    
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
    'history-search': 'alias-only',
    
    // Mobile Development plugins
    'flutter': 'alias-only',
    'react-native': 'alias-only',
    'fastlane': 'alias-only',
    'firebase': 'alias-only'
};

/**
 * Theme repository mappings
 * - empty string indicates built-in Oh My Zsh theme
 * - URL#tag format pins to a specific release for supply-chain safety
 */
export const themeRepos = {
    'robbyrussell': '',
    'powerlevel10k': 'https://github.com/romkatv/powerlevel10k.git#v1.20.0',
    'agnoster': '',
    'spaceship': 'https://github.com/spaceship-prompt/spaceship-prompt.git#v4.22.5',
    'starship': 'binary'
};
