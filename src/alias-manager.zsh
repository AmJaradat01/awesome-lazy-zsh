#!/bin/zsh
# Awesome-Lazy-Zsh Alias Manager
# Author: Ali M. Jaradat
# Description: Common aliases and shortcuts for development

# Git aliases
alias gs='git status'
alias ga='git add'
alias gc='git commit'
alias gp='git push'
alias gl='git pull'
alias gd='git diff'
alias gb='git branch'
alias gco='git checkout'

# Directory navigation
alias ll='ls -la'
alias la='ls -A'
alias l='ls -CF'
alias ..='cd ..'
alias ...='cd ../..'

# System shortcuts
alias c='clear'
alias h='history'
alias grep='grep --color=auto'

# Development shortcuts
alias code='code .'
alias subl='subl .'
alias serve='python3 -m http.server'
alias ports='lsof -i -P -n | grep LISTEN'

# Docker shortcuts (if docker plugin is enabled)
if [[ " ${plugins[@]} " =~ " docker " ]]; then
    alias dps='docker ps'
    alias dstop='docker stop $(docker ps -a -q)'
    alias drm='docker rm $(docker ps -a -q)'
    alias dimages='docker images'
fi

# Node.js shortcuts (if npm plugin is enabled)
if [[ " ${plugins[@]} " =~ " npm " ]]; then
    alias ni='npm install'
    alias ns='npm start'
    alias nt='npm test'
    alias nb='npm run build'
fi

echo "🚀 Awesome-Lazy-Zsh aliases loaded!"