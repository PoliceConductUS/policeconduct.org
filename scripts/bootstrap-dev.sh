#!/usr/bin/env bash
set -euo pipefail

MODE="install"
ASSUME_YES="false"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
cd "$ROOT_DIR"

export DO_NOT_TRACK=1
export SUPABASE_TELEMETRY_DISABLED=1
export TMPDIR="${TMPDIR:-$ROOT_DIR/.cache/tmp}"
export UV_CACHE_DIR="${UV_CACHE_DIR:-$ROOT_DIR/.cache/uv}"
export UV_TOOL_DIR="${UV_TOOL_DIR:-$ROOT_DIR/.cache/uv-tools}"

INFO_ITEMS=()
INSTALL_ITEMS=()
INSTALL_COMMANDS=()
MANUAL_ITEMS=()
CHECK_ERRORS=()

info() {
  printf '\033[1;34m==>\033[0m %s\n' "$*"
}

warn() {
  printf '\033[1;33mWARN:\033[0m %s\n' "$*" >&2
}

fail() {
  printf '\033[1;31mERROR:\033[0m %s\n' "$*" >&2
  exit 1
}

for arg in "$@"; do
  case "$arg" in
    --check)
      MODE="check"
      ;;
    --yes|-y)
      ASSUME_YES="true"
      ;;
    *)
      fail "Unknown argument: $arg"
      ;;
  esac
done

have() {
  command -v "$1" >/dev/null 2>&1
}

append_unique() {
  local array_name="$1"
  local item="$2"
  local existing
  declare -n target_array="$array_name"

  for existing in "${target_array[@]}"; do
    if [[ "$existing" == "$item" ]]; then
      return
    fi
  done

  target_array+=("$item")
}

load_homebrew_shellenv() {
  if have brew; then
    return
  fi

  if [[ -x /opt/homebrew/bin/brew ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  elif [[ -x /home/linuxbrew/.linuxbrew/bin/brew ]]; then
    eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
  elif [[ -x /usr/local/bin/brew ]]; then
    eval "$(/usr/local/bin/brew shellenv)"
  fi
}

ask_to_install() {
  if [[ "${#INSTALL_ITEMS[@]}" -eq 0 ]]; then
    return
  fi

  if [[ "$MODE" == "check" ]]; then
    fail "Missing installable dependencies found. Run ./scripts/bootstrap-dev.sh to install them."
  fi

  if [[ "$ASSUME_YES" == "true" ]]; then
    info "Installing missing dependencies: yes (--yes)"
    return
  fi

  if [[ ! -t 0 ]]; then
    fail "Missing dependencies require approval. Rerun with --yes or run in an interactive terminal."
  fi

  while true; do
    printf 'Install the missing dependencies listed above? [y/q] '
    read -r answer
    case "$answer" in
      y|Y|yes|YES)
        return
        ;;
      q|Q|quit|QUIT|"")
        fail "User quit before installing missing dependencies."
        ;;
      *)
        warn "Answer y to install or q to quit."
        ;;
    esac
  done
}

print_list() {
  local title="$1"
  shift
  local items=("$@")
  local item

  if [[ "${#items[@]}" -eq 0 ]]; then
    printf '%s: none\n' "$title"
    return
  fi

  printf '%s:\n' "$title"
  for item in "${items[@]}"; do
    printf '  - %s\n' "$item"
  done
}

detect_homebrew() {
  info "Checking for Homebrew"
  load_homebrew_shellenv

  if have brew; then
    append_unique INFO_ITEMS "Homebrew found at $(command -v brew)"
  else
    append_unique INSTALL_ITEMS "Homebrew using the official non-interactive installer"
    append_unique INSTALL_COMMANDS "NONINTERACTIVE=1 /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
  fi
}

detect_brewfile() {
  info "Checking Homebrew dependencies from Brewfile"

  if ! have brew; then
    append_unique INSTALL_ITEMS "Brewfile dependencies after Homebrew is installed"
    append_unique INSTALL_COMMANDS "brew bundle --file \"$ROOT_DIR/Brewfile\""
    return
  fi

  if HOMEBREW_NO_AUTO_UPDATE=1 brew bundle check --file "$ROOT_DIR/Brewfile" >/dev/null 2>&1; then
    append_unique INFO_ITEMS "Brewfile dependencies are satisfied"
  else
    append_unique INSTALL_ITEMS "missing Homebrew dependencies from Brewfile"
    append_unique INSTALL_COMMANDS "brew bundle --file \"$ROOT_DIR/Brewfile\""
  fi
}

detect_git() {
  info "Checking for Git"

  if have git; then
    append_unique INFO_ITEMS "Git $(git --version | sed 's/^git version //') is available at $(command -v git)"
  else
    append_unique INSTALL_ITEMS "Git from Brewfile"
    append_unique INSTALL_COMMANDS "brew bundle --file \"$ROOT_DIR/Brewfile\""
  fi
}

detect_mise() {
  info "Checking for mise"

  if have mise; then
    append_unique INFO_ITEMS "mise $(mise --version | awk '{print $1}') is available at $(command -v mise)"
  else
    append_unique INSTALL_ITEMS "mise from Brewfile"
    append_unique INSTALL_COMMANDS "brew bundle --file \"$ROOT_DIR/Brewfile\""
  fi
}

detect_mise_tools() {
  info "Checking mise-managed tools"

  if ! have mise; then
    append_unique INSTALL_ITEMS "mise tools after mise is installed"
    append_unique INSTALL_COMMANDS "mise trust ./mise.toml"
    append_unique INSTALL_COMMANDS "mise install"
    return
  fi

  if mise exec -- node --version >/dev/null 2>&1; then
    append_unique INFO_ITEMS "Node $(mise exec -- node --version) is available through mise"
  else
    append_unique INSTALL_ITEMS "Node from mise.toml"
    append_unique INSTALL_COMMANDS "mise trust ./mise.toml"
    append_unique INSTALL_COMMANDS "mise install"
  fi

  if mise exec -- gh --version >/dev/null 2>&1; then
    append_unique INFO_ITEMS "GitHub CLI $(mise exec -- gh --version | head -n 1 | awk '{print $3}') is available through mise"
  else
    append_unique INSTALL_ITEMS "GitHub CLI from mise.toml"
    append_unique INSTALL_COMMANDS "mise trust ./mise.toml"
    append_unique INSTALL_COMMANDS "mise install"
  fi

  if mise exec -- uv --version >/dev/null 2>&1; then
    append_unique INFO_ITEMS "uv $(mise exec -- uv --version | awk '{print $2}') is available through mise"
  else
    append_unique INSTALL_ITEMS "uv from mise.toml"
    append_unique INSTALL_COMMANDS "mise trust ./mise.toml"
    append_unique INSTALL_COMMANDS "mise install"
  fi
}

detect_github_cli_auth() {
  info "Checking GitHub CLI authentication"

  if have mise && mise exec -- gh auth status -h github.com >/dev/null 2>&1; then
    append_unique INFO_ITEMS "GitHub CLI is authenticated for github.com"
  else
    append_unique MANUAL_ITEMS "authenticate GitHub CLI with: mise exec -- gh auth login"
  fi
}

detect_npm_dependencies() {
  info "Checking project npm dependencies"

  if [[ -d node_modules ]] && have mise && mise exec -- npm ls --depth=0 >/dev/null 2>&1; then
    append_unique INFO_ITEMS "project npm dependencies are installed"
  else
    append_unique INSTALL_ITEMS "project npm dependencies with npm install"
    append_unique INSTALL_COMMANDS "mise exec -- npm install"
  fi
}

detect_docker() {
  info "Checking for Docker"

  if have docker; then
    append_unique INFO_ITEMS "Docker CLI found at $(command -v docker)"
    if docker info >/dev/null 2>&1; then
      append_unique INFO_ITEMS "Docker daemon is running"
    else
      append_unique MANUAL_ITEMS "start Docker Desktop on macOS, or start the Docker service on Linux"
    fi
    return
  fi

  case "$(uname -s)" in
    Darwin)
      append_unique INSTALL_ITEMS "Docker Desktop from Brewfile"
      append_unique INSTALL_COMMANDS "brew bundle --file \"$ROOT_DIR/Brewfile\""
      append_unique MANUAL_ITEMS "start Docker Desktop after installation"
      ;;
    Linux)
      append_unique MANUAL_ITEMS "install Docker for this Linux distribution and start the Docker daemon"
      ;;
    *)
      append_unique CHECK_ERRORS "unsupported OS for Docker bootstrap: $(uname -s)"
      ;;
  esac
}

detect_project_tools() {
  info "Checking local OpenSpec and Supabase CLI packages"

  if [[ -x node_modules/.bin/openspec ]]; then
    append_unique INFO_ITEMS "local OpenSpec CLI package is installed"
  else
    append_unique INSTALL_ITEMS "OpenSpec CLI npm package via npm install"
    append_unique INSTALL_COMMANDS "mise exec -- npm install"
  fi

  if [[ -x node_modules/.bin/supabase ]]; then
    append_unique INFO_ITEMS "local Supabase CLI package is installed"
  else
    append_unique INSTALL_ITEMS "Supabase CLI npm package via npm install"
    append_unique INSTALL_COMMANDS "mise exec -- npm install"
  fi
}

detect_codex_app() {
  info "Checking for Codex App"

  if [[ "$(uname -s)" == "Darwin" ]]; then
    if [[ -d "/Applications/Codex.app" ]]; then
      append_unique INFO_ITEMS "Codex App found at /Applications/Codex.app"
      return
    fi

    if [[ -d "$HOME/Applications/Codex.app" ]]; then
      append_unique INFO_ITEMS "Codex App found at $HOME/Applications/Codex.app"
      return
    fi
  fi

  if have codex; then
    append_unique INFO_ITEMS "Codex CLI found at $(command -v codex)"
    return
  fi

  append_unique MANUAL_ITEMS "install/open Codex App and verify this repo is opened at $ROOT_DIR"
}

detect_superpowers() {
  info "Checking Superpowers agent guidance"

  if [[ -d .codex/skills/openspec-propose ]] && [[ -d openspec/schemas/superpowers-bridge ]]; then
    append_unique INFO_ITEMS "project-local OpenSpec/Superpowers bridge files are installed"
  else
    append_unique CHECK_ERRORS "project-local OpenSpec/Superpowers bridge files are missing"
  fi

  append_unique MANUAL_ITEMS "verify Superpowers skills are available inside Codex App; this script does not run interactive agent plugin commands"
}

detect_all() {
  detect_homebrew
  detect_brewfile
  detect_git
  detect_mise
  detect_mise_tools
  detect_github_cli_auth
  detect_npm_dependencies
  detect_docker
  detect_project_tools
  detect_codex_app
  detect_superpowers
}

print_summary() {
  printf '\nDependency check summary\n'
  printf '========================\n'
  print_list "Already available" "${INFO_ITEMS[@]}"
  print_list "Missing and installable" "${INSTALL_ITEMS[@]}"
  print_list "Install commands that will run" "${INSTALL_COMMANDS[@]}"
  print_list "Manual follow-up" "${MANUAL_ITEMS[@]}"
  print_list "Blocking check errors" "${CHECK_ERRORS[@]}"
  printf '\n'
}

install_homebrew_if_needed() {
  if have brew; then
    return
  fi

  info "Installing Homebrew"
  NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  load_homebrew_shellenv
  have brew || fail "Homebrew installed, but brew is not on PATH. Open a new shell and rerun this script."
}

install_brewfile_if_needed() {
  install_homebrew_if_needed

  if HOMEBREW_NO_AUTO_UPDATE=1 brew bundle check --file "$ROOT_DIR/Brewfile" >/dev/null 2>&1; then
    return
  fi

  info "Installing Homebrew dependencies from Brewfile"
  brew bundle --file "$ROOT_DIR/Brewfile"
}

install_mise_tools_if_needed() {
  install_brewfile_if_needed
  have mise || fail "mise is not available after Brewfile installation. Open a new shell and rerun this script."

  info "Trusting mise.toml"
  mise trust ./mise.toml

  info "Installing mise-managed tools"
  mise install
}

install_npm_dependencies_if_needed() {
  install_mise_tools_if_needed

  if mise exec -- npm ls --depth=0 >/dev/null 2>&1; then
    return
  fi

  info "Installing project npm dependencies"
  mise exec -- npm install
}

install_missing() {
  install_brewfile_if_needed
  install_mise_tools_if_needed
  install_npm_dependencies_if_needed
}

verify_github_cli_auth() {
  info "Verifying GitHub CLI authentication"

  have mise || fail "mise is not installed. Run ./scripts/bootstrap-dev.sh first."

  if ! mise exec -- gh auth status -h github.com >/dev/null 2>&1; then
    fail "GitHub CLI is not authenticated. Run mise exec -- gh auth login, then rerun npm run doctor."
  fi
}

verify_project_tools() {
  verify_github_cli_auth

  info "Verifying OpenSpec"
  mise exec -- npx openspec --version >/dev/null
  mise exec -- npm run validate:openspec

  info "Verifying Supabase CLI"
  mise exec -- npx supabase --version >/dev/null
}

main() {
  info "Bootstrapping policeconduct.org development environment ($MODE mode)"
  mkdir -p "$TMPDIR" "$UV_CACHE_DIR" "$UV_TOOL_DIR"

  detect_all
  print_summary

  if [[ "${#CHECK_ERRORS[@]}" -gt 0 ]]; then
    fail "Resolve blocking check errors before continuing."
  fi

  ask_to_install

  if [[ "$MODE" != "check" && "${#INSTALL_ITEMS[@]}" -gt 0 ]]; then
    install_missing
  fi

  verify_project_tools

  if have docker && docker info >/dev/null 2>&1; then
    info "Docker is installed and running"
  else
    warn "Docker is not running. Start it before running Supabase locally."
  fi

  warn "Superpowers is agent-specific. Verify it inside your coding agent."
  info "Bootstrap complete"
}

main "$@"
