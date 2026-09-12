# Omni MCP - Master Project Context & Knowledge Base

This project was engineered and packaged in collaboration with Antigravity.
All architectural decisions, design system constraints, and functional logic are documented below for seamless continuous development in Antigravity IDE.

---

## 1. Project Overview & Identity
- **Project Name**: Omni MCP (strictly with space, never "OmniMCP").
- **Product Definition**: A lightweight, universal Model Context Protocol (MCP) desktop companion and gateway. Bridges and synchronizes AI clients (Antigravity IDE, Claude Desktop, Cursor) with local/remote MCP tools from a single control point.
- **Window Constraints**: Strictly 500px width by 700px height. Fixed, non-resizable, frameless window.
- **Workspace Directory**: `D:\2! Admin - Productivity\Antigravity Projects\Omni Mcp`
- **Previous Session ID**: `86e66279-835d-4807-81d7-722f50b930fe`

---

## 2. Multi-Path AI Client Detection (Resolved & Verified)
Windows systems install Claude Desktop and AI clients in varied locations. Omni MCP scans candidate paths dynamically:
- **Antigravity IDE**:
  - `~/.gemini/antigravity-ide/mcp_config.json`
  - `~/.gemini/config/mcp_config.json`
- **Claude Desktop**:
  - `%LOCALAPPDATA%\Claude-3p\claude_desktop_config.json`
  - `%LOCALAPPDATA%\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude\claude_desktop_config.json`
  - `%APPDATA%\Claude\claude_desktop_config.json`
- **Cursor**: `~/.cursor/mcp.json`
- **Windsurf**: `~/.codeium/windsurf/mcp_config.json`

Strict Rule: Only genuinely detected clients found on the user's filesystem are displayed in the UI checkboxes.

---

## 3. Design System: "Obsidian Precision"
Adheres strictly to the visual specifications derived from user mockups:
- **Canvas / Background**: `#07080B` with subtle radial micro-dot grid (`subtle-grid`).
- **Cards & Surfaces**: `#101217` matte graphite with 12px rounded corners and 1px `#1E222D` hairline borders.
- **Active Accents**: Emerald (`#10B981`) and Cyan (`#38BDF8`).
- **Typography**: Inter (UI labels & headings) and JetBrains Mono (metrics, badges, code).
- **Iconography**: Clean 1.5px vector outlines (Lucide / 21st.dev inspired). STRICTLY ZERO EMOJIS anywhere in the UI.
- **Official App Logo**: Emerald electric lightning bolt centered in a double-bordered squircle (`src/assets/logo.png`, `public/logo.png`, and `src/icons/Logo.tsx`).

---

## 4. Implemented Components & Feature Map
- `src/components/Header.tsx`: Frameless titlebar with drag region, logo, title, v1.0 badge, pulsing Live status pill, Master Pause toggle (`||` RAM saver), Settings gear, Minimize (`—`), and Close (`✕`).
- `src/components/HeroDeployButton.tsx`: Full-width `+ Deploy MCP Server` primary action button.
- `src/components/Telemetry.tsx`: Bento grid with `Active Servers` count and `AI Clients` count with interactive `🔄 Rescan` button.
- `src/components/InstalledServers.tsx`: Dynamic real server feed with empty state, live client tags, `Logs` drawer trigger, `Config` modal trigger, `Trash2` one-click delete trigger, and stateful lifecycle button (`Terminate` / `Start`).
- `src/components/ConfigModal.tsx`: Slide-up modal displaying actual JSON configuration with in-line editor, syntax format, copy to clipboard, delete server, and save changes back to disk.
- `src/components/BottomBar.tsx`: Clean status with live Electron process RAM usage (`RAM: XX MB`). Fake latency and static text removed.
- `src/components/OnboardingModal.tsx`: Origin UI 4-step walkthrough modal (`Phase 01` to `Phase 04`).
- `src/components/DeployModal.tsx`: Auto-repair JSON and npx CLI parser, `--allow-http` toggle, and checkboxes dynamically displaying ONLY detected AI clients.
- `src/components/SettingsModal.tsx`: Auto-restart crash guard, system tray minimize toggle, polling rate selector, and local vault.
- `src/components/LogDrawer.tsx`: Monospace terminal log streamer.
- `electron/main.ts`: Electron 34 main process managing 490x700 window bounds, frameless window, system tray, real memory querying via `process.getProcessMemoryInfo()`, and native filesystem IPC handlers.

---

## 5. Build & Execution Commands
- **Launch Development Server (Browser)**: `npm run dev` (Runs Vite on `localhost:5173`)
- **Launch Electron Desktop App**: `npm start`
- **Build Production Bundles**: `npm run build`
- **Package Standalone Windows Executable**: `npm run pack`
  - Output binary: `release\win-unpacked\Omni MCP.exe`
- **Package Official Windows Setup Installer (for GitHub Releases)**: `npm run build:installer`
  - Output setup executable: `release\Omni MCP Setup 1.0.0.exe` (~85.2 MB)
