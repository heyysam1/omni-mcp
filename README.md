<div align="center">

<img src="public/logo.png" alt="Omni MCP Logo" width="128" height="128" />

# Omni MCP

**Universal Model Context Protocol (MCP) Desktop Companion & Gateway**

[![Release](https://img.shields.io/github/v/release/heyysam1/omni-mcp?style=flat-square&color=10B981)](https://github.com/heyysam1/omni-mcp/releases/latest)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%20%7C%2011-38BDF8?style=flat-square)](https://github.com/heyysam1/omni-mcp/releases/latest)
[![License](https://img.shields.io/badge/license-Pending-gray?style=flat-square)](#license)

[**Download for Windows (v1.0.0)**](https://github.com/heyysam1/omni-mcp/releases/latest) • [Key Features](#key-capabilities) • [Supported Clients](#supported-ai-clients) • [Security](#security-overview) • [Development](#development)

</div>

---

## Overview

**Omni MCP** is a lightweight, universal desktop companion engineered to bridge and synchronize Model Context Protocol (MCP) servers across all your AI desktop clients from a single, centralized control point.

Instead of manually maintaining scattered JSON files across disparate directories, Omni MCP dynamically discovers installed AI clients, manages server lifecycles with native process supervision, repairs pasted server configs, and saves system memory with Windows Efficiency Mode.

---

## Key Capabilities

- **Multi-Client Synchronization**: Automatically discovers supported AI clients installed on your system and synchronizes MCP server configurations across selected clients.
- **Native Process Supervision**: Real process spawning and process tree management with standard I/O pipes, live process health monitoring, auto-restart on crashes, and live terminal streaming.
- **Master Pause & Efficiency Mode**: Instantly pause background MCP processes to reclaim RAM. Omni MCP applies Windows 11 Efficiency Mode (EcoQoS) to minimize system resource usage.
- **Intelligent Config Deployment**: Paste raw JSON configs or `npx` CLI commands. The built-in parser automatically sanitizes syntax, repairs formatting, and includes an `--allow-http` toggle for local development servers.
- **Collision-Protected Deployments**: Distinct add and edit workflows prevent accidental configuration overwrites while preserving explicit updates.
- **Interactive Configuration Editor**: Inspect, format, edit, copy, or remove MCP server configs with instant disk updates.
- **Built-in MCP Catalog**: Explore and install popular community and official MCP tools directly with client target selection.

---

## Supported AI Clients

Omni MCP dynamically discovers configuration paths on Windows for:

- **Google Antigravity IDE** (`~/.gemini/antigravity-ide/mcp_config.json`, `~/.gemini/config/mcp_config.json`)
- **Anthropic Claude Desktop** (`%LOCALAPPDATA%\Claude-3p`, `%LOCALAPPDATA%\Packages\Claude_...`, `%APPDATA%\Claude`)
- **Cursor AI** (`~/.cursor/mcp.json`, Cline global storage)
- **Codeium Windsurf** (`~/.codeium/windsurf/mcp_config.json`)
- **VS Code (Cline)** (`%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`)
- **VS Code (Roo Code)** (`%APPDATA%\Code\User\globalStorage\rooveterinaryinc.roo-cline\settings\cline_mcp_settings.json`)
- **Continue** (`~/.continue/config.json`)
- **Custom MCP Clients**: Register custom client configuration files anywhere on your filesystem.

> **Note**: Omni MCP strictly surfaces only genuinely detected AI clients installed on your PC.

---

## Installation

### Download for Windows

1. Download the latest official Windows installer:
   👉 [**Download Omni MCP Setup 1.0.0.exe**](https://github.com/heyysam1/omni-mcp/releases/latest)
2. Run `Omni MCP Setup 1.0.0.exe` and complete the guided installation wizard.
3. Launch **Omni MCP** from your Desktop or Start Menu.
4. On first launch, the 4-phase onboarding walkthrough will guide you through discovered clients and server controls.

---

## Security Overview

Omni MCP is designed with local-first, privacy-conscious architectural principles:

- **Strict Electron Sandbox**: Built with `contextIsolation: true`, `nodeIntegration: false`, and an isolated preload bridge exposing strictly typed, sanitized IPC methods.
- **Content Security Policy**: Comprehensive CSP headers enforce local script execution and prevent unauthorized external script injection.
- **Navigation Lockdown**: In-app external navigation is denied; external links open exclusively in the operating system's default browser via `shell.openExternal`.
- **Safe Key Validation**: All server identifiers and configuration keys are validated against prototype pollution and path traversal attacks before filesystem commits.
- **Local Storage Transparency**: All credentials and server configurations remain strictly on your local device. Omni MCP contains zero remote telemetry, tracking, or cloud synchronizers.

For reporting vulnerabilities, please consult [SECURITY.md](SECURITY.md).

---

## Development

### Prerequisites

- Windows 10 or 11 (64-bit)
- Node.js 18+ and npm

### Local Setup

```bash
# Clone the repository
git clone https://github.com/heyysam1/omni-mcp.git
cd omni-mcp

# Install dependencies
npm install

# Run Vite development server
npm run dev

# Launch Electron desktop application in development mode
npm start
```

### Build & Package

```bash
# Verify TypeScript types
npx tsc --noEmit

# Compile renderer and Electron main bundles
npm run build

# Package standalone Windows unpacked directory
npm run pack

# Build official Windows NSIS installer
npm run build:installer
```

Output installers are generated in the `release/` directory.

---

## Contributing

Contributions, bug reports, and suggestions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) for development workflows and submission guidelines.

---

## License

Copyright © 2026. License status pending official designation. See project repository updates for future licensing details.
