/**
 * Configuration mappings for plugins and themes
 * @author Ali M. Jaradat <AmJaradat01@gmail.com>
 */

/** Plugin repository mappings - empty string indicates built-in Oh My Zsh plugin */
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
    
    // External plugins
    'fzf': 'https://github.com/junegunn/fzf.git',
    'z': 'https://github.com/agkozak/zsh-z.git',
    'thefuck': 'https://github.com/nvbn/thefuck.git',
    'zsh-autocomplete': 'https://github.com/marlonrichert/zsh-autocomplete.git',
    'zsh-autosuggestions': 'https://github.com/zsh-users/zsh-autosuggestions.git',
    'zsh-syntax-highlighting': 'https://github.com/zsh-users/zsh-syntax-highlighting.git',
    
    // Database services
    'mongodb': '',
    'postgresql': '',
    'mysql': '',
    'redis': '',
    'rabbitmq': '',
    'elasticsearch': '',
    'memcached': '',
    
    // Cloud providers
    'aws': '',
    'gcloud': '',
    'azure': '',
    
    // DevOps tools
    'kubernetes': '',
    'docker-compose-extended': '',
    'terraform-extended': '',
    'ansible': '',
    
    // Development languages
    'python': '',
    'golang': '',
    'rust': '',
    'node': '',
    'java': '',
    
    // Productivity
    'git-extras': '',
    'ssh': '',
    'dotenv': '',
    'directories': '',
    'history-search': '',
    'extract': ''
};

/** Theme repository mappings - empty string indicates built-in Oh My Zsh theme */
export const themeRepos = {
    'robbyrussell': '',
    'powerlevel10k': 'https://github.com/romkatv/powerlevel10k.git',
    'agnoster': '',
    'spaceship': 'https://github.com/spaceship-prompt/spaceship-prompt.git',
    'starship': 'https://github.com/starship/starship.git'
};
