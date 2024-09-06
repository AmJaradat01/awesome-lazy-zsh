#!/bin/bash
# Author: Ali M. Jaradat
# Since: 1-Jan-2022
# Version: 1.0.0
# Description: This script installs Git, Node.js, and Homebrew (if not already installed).
#              It then runs the main setup process for Awesome-Lazy-Zsh.
# Last Modified: 4-Sep-2024

# Print ASCII art for Awesome-Lazy-Zsh
print_ascii_logo() {
    GREEN='\033[0;32m'
    RESET='\033[0m'

    echo -e "${GREEN}     _                                               _                         _____    _     ";
    echo -e "    / \__      _____  ___  ___  _ __ ___   ___      | |    __ _ _____   _     |__  /___| |__  ";
    echo -e "   / _ \ \ /\ / / _ \/ __|/ _ \| '_ \` _ \ / _ \_____| |   / _\` |_  / | | |_____ / // __| '_ \ ";
    echo -e "  / ___ \ V  V /  __/\__ \ (_) | | | | | |  __/_____| |__| (_| |/ /| |_| |_____/ /_\__ \ | | |";
    echo -e " /_/   \_\_/\_/ \___||___/\___/|_| |_| |_|\___|     |_____\__,_/___|\__, |    /____|___/_| |_|";
    echo -e "                                                                    |___/                     ${RESET}";
    echo "                                                                                              ";
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install Git
install_git() {
    if ! command_exists git; then
        echo -e "⚠️  Git is not installed. Installing Git..."
        if command_exists brew; then
            brew install git && echo -e "✅ Git installed successfully."
        else
            echo -e "❌ Please install Git manually."
            exit 1
        fi
    else
        echo -e "✅ Git is already installed."
    fi
}

# Function to install Node.js
install_node() {
    if ! command_exists node; then
        echo -e "⚠️  Node.js is not installed. Installing Node.js..."
        if command_exists brew; then
            brew install node && echo -e "✅ Node.js installed successfully."
        else
            echo -e "❌ Please install Node.js manually."
            exit 1
        fi
    else
        echo -e "✅ Node.js is already installed."
    fi
}

# Function to install Homebrew
install_homebrew() {
    if ! command_exists brew; then
        echo -e "⚠️  Homebrew is not installed. Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" && echo -e "✅ Homebrew installed successfully."
    else
        echo -e "✅ Homebrew is already installed."
    fi
}

# Prompt for confirmation to proceed with installation
confirm_install() {
    echo
    echo "This setup will install the following tools if they are not already installed:"
    echo "- Git"
    echo "- Node.js"
    echo "- Homebrew"
    echo
    read -p "Do you want to proceed with the installation? (y/n): " answer
    if [[ $answer != "y" ]]; then
        echo -e "❌ Installation aborted."
        exit 0
    fi
}

# Function to install npm dependencies
install_npm_dependencies() {
    if [ -f package.json ]; then
        echo -e "⚠️  Installing npm dependencies..."
        npm install && echo -e "✅ npm dependencies installed successfully."
    else
        echo -e "❌ package.json not found. Please make sure you are in the correct directory."
        exit 1
    fi
}

# Start the main script (index.js)
start_main() {    
    if command_exists node; then
        install_npm_dependencies
        node src/index.js
    else
        echo -e "❌ Node.js is required to run the setup. Please install Node.js and try again."
        exit 1
    fi
}

# Main flow
print_ascii_logo
confirm_install
install_homebrew
install_git
install_node
start_main
