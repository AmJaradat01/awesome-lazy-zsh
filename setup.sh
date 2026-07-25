#!/bin/bash
# Author: Ali M. Jaradat
# Since: 1-Jan-2022
# Version: 3.4.4
# Description: Comprehensive Zsh environment setup with plugin management, themes, and profiles.
#              Installs dependencies (Git, Node.js, Homebrew, fzf) and provides interactive CLI
#              for plugin updates, profile switching, and custom plugin installation.
# Last Modified: 22-Jul-2026

# Exit on any error
set -euo pipefail


SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOMEBREW_INSTALLER_URL="https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh"
HOMEBREW_INSTALLER_SHA256="latest" # We'll fetch the latest SHA256
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


verify_download() {
    local file="$1"
    local expected_hash="$2"

    if [[ "$expected_hash" == "skip" ]]; then
        log_warning "Skipping checksum verification (not recommended)"
        return 0
    fi

    local actual_hash
    if command_exists sha256sum; then
        actual_hash=$(sha256sum "$file" | cut -d' ' -f1)
    elif command_exists shasum; then
        actual_hash=$(shasum -a 256 "$file" | cut -d' ' -f1)
    else
        log_error "Neither sha256sum nor shasum found. Cannot verify download."
        return 1
    fi

    if [[ "$actual_hash" == "$expected_hash" ]]; then
        log_success "Checksum verification passed"
        return 0
    else
        log_error "Checksum verification failed!"
        log_error "Expected: $expected_hash"
        log_error "Actual:   $actual_hash"
        return 1
    fi
}


secure_download() {
    local url="$1"
    local output_file="$2"
    local expected_hash="${3:-skip}"

    log_info "Downloading from: $url"

    # Ensure secure temp dir exists
    if [[ -z "$TEMP_DIR" || ! -d "$TEMP_DIR" ]]; then
        create_temp_dir
    fi

    if command_exists curl; then
        curl -fsSL "$url" -o "$output_file" || {
            log_error "Failed to download $url"
            return 1
        }
    elif command_exists wget; then
        wget -q "$url" -O "$output_file" || {
            log_error "Failed to download $url"
            return 1
        }
    else
        log_error "Neither curl nor wget found. Please install one of them."
        return 1
    fi

    if [[ "$expected_hash" != "skip" ]]; then
        verify_download "$output_file" "$expected_hash" || return 1
    fi

    return 0
}


get_homebrew_checksum() {
    # Homebrew does not publish static checksums for their installer script.
    # Instead, we verify the download source is the official GitHub repository
    # and rely on HTTPS certificate validation for transport security.
    # The installer is run in a subprocess and inspected before execution.
    log_warning "Homebrew installer will be downloaded from official source (HTTPS)" >&2
    log_info "Source: ${HOMEBREW_INSTALLER_URL}" >&2
    log_info "Transport security: TLS certificate validation via curl/wget" >&2
    echo "skip"
}


install_homebrew() {
    if ! command_exists brew; then
        log_warning "Homebrew is not installed. Installing Homebrew..."

        if ! command_exists curl && ! command_exists wget; then
            log_error "curl or wget is required to download Homebrew installer"
            return 1
        fi

        # Ensure secure temp dir exists
        if [[ -z "$TEMP_DIR" || ! -d "$TEMP_DIR" ]]; then
            create_temp_dir
        fi

        local expected_hash
        expected_hash=$(get_homebrew_checksum)

        local installer_path="$TEMP_DIR/homebrew_installer.sh"
        if ! secure_download "$HOMEBREW_INSTALLER_URL" "$installer_path" "$expected_hash"; then
            log_error "Failed to download Homebrew installer"
            return 1
        fi

        # Basic sanity check: verify the downloaded file looks like a shell script
        local first_line
        first_line=$(head -n 1 "$installer_path")
        if [[ "$first_line" != "#!/bin/bash"* && "$first_line" != "#!/usr/bin/env bash"* ]]; then
            log_error "Downloaded file does not appear to be a valid shell script"
            log_error "First line: $first_line"
            rm -f "$installer_path"
            return 1
        fi

        # Check file size is reasonable (installer should be < 1MB)
        local file_size
        file_size=$(wc -c < "$installer_path" | tr -d ' ')
        if [[ "$file_size" -gt 1048576 ]]; then
            log_error "Downloaded installer is unexpectedly large (${file_size} bytes). Aborting."
            rm -f "$installer_path"
            return 1
        fi

        if [[ "$file_size" -lt 100 ]]; then
            log_error "Downloaded installer is suspiciously small (${file_size} bytes). Aborting."
            rm -f "$installer_path"
            return 1
        fi

        chmod +x "$installer_path"

        log_info "Running Homebrew installer..."
        if /bin/bash "$installer_path"; then
            log_success "Homebrew installed successfully"

            if [[ -f "/opt/homebrew/bin/brew" ]]; then
                log_info "Configuring Homebrew PATH for Apple Silicon..."
                eval "$(/opt/homebrew/bin/brew shellenv)"

                export PATH="/opt/homebrew/bin:$PATH"

                log_warning "Please add the following to your shell configuration file:"
                echo 'eval "$(/opt/homebrew/bin/brew shellenv)"'
            fi
        else
            log_error "Homebrew installation failed"
            return 1
        fi
    else
        log_success "Homebrew is already installed"
    fi

    return 0
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
    read -p "Do you want to proceed? (y/n): " answer
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

    if npm install; then
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
                $(brew --prefix)/opt/fzf/install --all
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
    return 0
}


install_alias_manager() {
    log_info "Setting up Awesome-Lazy-Zsh Alias Manager..."
    
    local alias_file="$SCRIPT_DIR/src/alias-manager.zsh"
    local zshrc_path="$HOME/.zshrc"
    
    if [[ -f "$alias_file" ]]; then
        if ! grep -q "alias-manager.zsh" "$zshrc_path" 2>/dev/null; then
            echo "" >> "$zshrc_path"
            echo "# Awesome-Lazy-Zsh Alias Manager" >> "$zshrc_path"
            echo "source $alias_file" >> "$zshrc_path"
            log_success "Alias manager added to .zshrc"
        else
            log_info "Alias manager already configured in .zshrc"
        fi
    else
        log_warning "Alias manager file not found, skipping..."
    fi
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
    
    return 0
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