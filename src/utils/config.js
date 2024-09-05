/**
 * @author Ali M. Jaradat
 * @email AmJaradat01@gmail.com
 * @since 1-Jan-2022
 * @version 1.0.0
 * @file This configuration file contains repository mappings for plugins and themes used in Awesome-Lazy-Zsh.
 * @lastModified 4-Sep-2024
 */

// Plugin repository mappings
export const pluginRepos = {
    'git': 'https://github.com/ohmyzsh/ohmyzsh.git',
    'git-flow': 'https://github.com/nvie/gitflow.git',
    'npm': 'https://github.com/ohmyzsh/ohmyzsh.git',
    'nvm': 'https://github.com/nvm-sh/nvm.git',
    'docker': 'https://github.com/ohmyzsh/ohmyzsh.git',
    'docker-compose': 'https://github.com/ohmyzsh/ohmyzsh.git',
    'kubectl': 'https://github.com/ohmyzsh/ohmyzsh.git',
    'terraform': 'https://github.com/hashicorp/terraform.git',
    'vscode': 'https://github.com/ohmyzsh/ohmyzsh.git',
    'fzf': 'https://github.com/junegunn/fzf.git',
    'z': 'https://github.com/agkozak/zsh-z.git',
    'thefuck': 'https://github.com/nvbn/thefuck.git',
    'zsh-autocomplete': 'https://github.com/marlonrichert/zsh-autocomplete.git',
    'zsh-autosuggestions': 'https://github.com/zsh-users/zsh-autosuggestions.git',
    'zsh-syntax-highlighting': 'https://github.com/zsh-users/zsh-syntax-highlighting.git'
};

// Theme repository mappings
export const themeRepos = {
    'robbyrussell': '',  // Default theme in Oh My Zsh
    'powerlevel10k': 'https://github.com/romkatv/powerlevel10k.git',
    'agnoster': '',      // Comes by default with Oh My Zsh
    'spaceship': 'https://github.com/spaceship-prompt/spaceship-prompt.git',
    'starship': 'https://github.com/starship/starship.git'
};
