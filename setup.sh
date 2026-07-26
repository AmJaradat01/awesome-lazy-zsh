#!/bin/bash
# Author: Ali M. Jaradat
# Since: 1-Jan-2022
# Version: 3.4.5
# Description: Comprehensive Zsh environment setup with plugin management, themes, and profiles.
#              Installs dependencies (Git, Node.js, Homebrew, fzf) and provides interactive CLI
#              for plugin updates, profile switching, and custom plugin installation.
# Last Modified: 22-Jul-2026

# Exit on any error
set -euo pipefail


SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMP_DIR=""
LOG_FILE="${SCRIPT_DIR}/setup.log"


RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
RESET='\033[0m'


log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR] $*${RESET}" | tee -a "$LOG_FILE" >&2
}

log_success() {
    echo -e "${GREEN}[SUCCESS] $*${RESET}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING] $*${RESET}" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${BLUE}[INFO] $*${RESET}" | tee -a "$LOG_FILE"
}


cleanup() {
    if [[ -n "$TEMP_DIR" && -d "$TEMP_DIR" ]]; then
        rm -rf "$TEMP_DIR"
    fi
}


trap cleanup EXIT INT TERM


# Create a secure temporary directory (unpredictable name via mktemp)
create_temp_dir() {
    TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/awesome-lazy-zsh.XXXXXXXXXX")"
    if [[ ! -d "$TEMP_DIR" ]]; then
        log_error "Failed to create secure temporary directory"
        exit 1
    fi
    chmod 700 "$TEMP_DIR"
}


print_ascii_logo() {
    local version
    version=$(SCRIPT_DIR="$SCRIPT_DIR" node -e "import fs from 'fs';const p=JSON.parse(fs.readFileSync(process.env.SCRIPT_DIR+'/package.json','utf8'));console.log(p.version)" 2>/dev/null || echo "")
    echo -e "${GREEN}     _                                               _                         _____    _     ";
    echo -e "    / \__      _____  ___  ___  _ __ ___   ___      | |    __ _ _____   _     |__  /___| |__  ";
    echo -e "   / _ \ \ /\ / / _ \/ __|/ _ \| '_ \` _ \ / _ \_____| |   / _\` |_  / | | |_____ / // __| '_ \ ";
    echo -e "  / ___ \ V  V /  __/\__ \ (_) | | | | | |  __/_____| |__| (_| |/ /| |_| |_____/ /_\__ \ | | |";
    echo -e " /_/   \_\_/\_/ \___||___/\___/|_| |_| |_|\___|     |_____\__,_/___|\__, |    /____|___/_| |_|";
    echo -e "                                                                    |___/          v${version}${RESET}";
    echo "";
}


command_exists() {
    command -v "$1" >/dev/null 2>&1
}


install_homebrew() {
    if ! command_exists brew; then
        log_error "Homebrew is required but is not installed."
        log_error "Install it separately from https://brew.sh, review its installer, then rerun this command."
        return 1
    else
        log_success "Homebrew is already installed"
    fi

}


install_git() {
    if ! command_exists git; then
        log_warning "Git is not installed. Installing Git..."
        if command_exists brew; then
            if brew install git; then
                log_success "Git installed successfully"
            else
                log_error "Failed to install Git via Homebrew"
                return 1
            fi
        else
            log_error "Homebrew is required to install Git. Please install Homebrew first."
            return 1
        fi
    else
        log_success "Git is already installed ($(git --version))"
    fi

    return 0
}


install_node() {
    if ! command_exists node; then
        log_warning "Node.js is not installed. Installing Node.js..."
        if command_exists brew; then
            if brew install node; then
                log_success "Node.js installed successfully"
            else
                log_error "Failed to install Node.js via Homebrew"
                return 1
            fi
        else
            log_error "Homebrew is required to install Node.js. Please install Homebrew first."
            return 1
        fi
    else
        log_success "Node.js is already installed ($(node --version))"
    fi

    return 0
}


confirm_install() {
    echo
    echo "This setup will install dependencies and launch the interactive CLI."
    echo
    echo "Dependencies (installed if missing):"
    echo "  • Git, Node.js, Homebrew, fzf"
    echo
    echo "✨ Features:"
    echo "✓ 42 plugins with auto-update notifications"
    echo "✓ 5 themes (Spaceship, Powerlevel10k, etc.)"
    echo "✓ Resume interrupted setups automatically"
    echo "✓ Cross-platform support (macOS/Linux/WSL2)"
    echo "✓ Installation logging to: $LOG_FILE"
    echo
    read -r -p "Do you want to proceed? (y/n): " answer
    if [[ "$(echo "$answer" | tr '[:upper:]' '[:lower:]')" != "y" ]]; then
        log_info "Installation cancelled by user"
        exit 0
    fi
}


install_npm_dependencies() {
    if [[ ! -f "$SCRIPT_DIR/package.json" ]]; then
        log_error "package.json not found in $SCRIPT_DIR"
        return 1
    fi

    log_info "Installing npm dependencies..."
    cd "$SCRIPT_DIR"

    if [[ -d "$SCRIPT_DIR/node_modules" ]]; then
        log_success "Packaged npm dependencies are already installed"
    elif npm ci --ignore-scripts; then
        log_success "npm dependencies installed successfully"
    else
        log_error "Failed to install npm dependencies"
        return 1
    fi

    return 0
}


verify_installations() {
    local all_good=true

    log_info "Verifying installations..."

    if command_exists git; then
        log_success "Git: $(git --version)"
    else
        log_error "Git verification failed"
        all_good=false
    fi

    if command_exists node; then
        log_success "Node.js: $(node --version)"
    else
        log_error "Node.js verification failed"
        all_good=false
    fi

    if command_exists npm; then
        log_success "npm: $(npm --version)"
    else
        log_error "npm verification failed"
        all_good=false
    fi

    if command_exists brew; then
        log_success "Homebrew: $(brew --version | head -n1)"
    else
        log_error "Homebrew verification failed"
        all_good=false
    fi

    if $all_good; then
        log_success "All installations verified successfully"
        return 0
    else
        log_error "Some installations could not be verified"
        return 1
    fi
}


install_fzf() {
    if ! command_exists fzf; then
        log_warning "fzf is not installed. Installing fzf..."
        if command_exists brew; then
            if brew install fzf; then
                log_success "fzf installed successfully"
                "$(brew --prefix)/opt/fzf/install" --all
            else
                log_error "Failed to install fzf via Homebrew"
                return 1
            fi
        else
            log_error "Homebrew is required to install fzf. Please install Homebrew first."
            return 1
        fi
    else
        log_success "fzf is already installed ($(fzf --version))"
    fi
}


install_alias_manager() {
    log_info "Alias manager will be configured atomically by the managed .zshrc writer"
    return 0
}


start_main() {
    log_info "Starting Awesome-Lazy-Zsh main application..."
    
    cd "$SCRIPT_DIR"
    
    if ! install_npm_dependencies; then
        log_error "Failed to install npm dependencies"
        return 1
    fi
    
    if node src/index.js; then
        return 0
    else
        log_error "Failed to run main application"
        return 1
    fi
}


main() {
    log "Starting Awesome-Lazy-Zsh setup (PID: $$)"
    print_ascii_logo
    confirm_install

    if ! install_homebrew; then
        log_error "Failed to install Homebrew"
        exit 1
    fi

    if ! install_git; then
        log_error "Failed to install Git"
        exit 1
    fi

    if ! install_node; then
        log_error "Failed to install Node.js"
        exit 1
    fi

    if ! install_fzf; then
        log_warning "Failed to install fzf, but continuing..."
    fi

    if ! install_alias_manager; then
        log_warning "Failed to install alias manager, but continuing..."
    fi

    if ! verify_installations; then
        log_warning "Some installations could not be verified, but continuing..."
    fi

    if ! start_main; then
        log_error "Main setup failed"
        exit 1
    fi

    log_success "Awesome-Lazy-Zsh setup completed successfully!"
    log_info "Check $LOG_FILE for detailed installation log"
}


main "$@"
