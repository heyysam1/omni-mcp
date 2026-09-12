# Contributing to Omni MCP

Thank you for your interest in contributing to **Omni MCP**! This project aims to provide a lightweight, reliable desktop companion for Model Context Protocol (MCP) clients.

---

## Code of Conduct

We are committed to providing a friendly, welcoming, and inclusive environment for all contributors. Please be respectful, professional, and constructive in all interactions.

---

## How to Contribute

### 1. Reporting Bugs

Before creating a bug report, please check the [existing issues](https://github.com/heyysam1/omni-mcp/issues) to avoid duplicates.

When filing a bug report, include:
- A clear, descriptive title.
- Steps to reproduce the behavior.
- Expected vs. actual results.
- Your Windows version and installed AI clients (e.g. Antigravity IDE, Claude Desktop, Cursor).
- Any relevant logs from the terminal or Developer Tools console.

### 2. Suggesting Enhancements

We welcome ideas for new features, additional AI client adapters, and workflow improvements.
- Open an issue describing the proposed feature.
- Explain the motivation and use cases.
- Discuss implementation details before submitting a large pull request.

### 3. Submitting Pull Requests

1. **Fork and Branch**: Fork the repository and create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Design System Adherence**:
   - **Colors**: Deep obsidian (`#07080B`), matte graphite surfaces (`#101217`), emerald (`#10B981`) and cyan (`#38BDF8`) accents.
   - **Typography**: Inter for interface elements, JetBrains Mono for code/metrics.
   - **Iconography**: Clean 1.5px/1.75px vector icons (Lucide). Strictly zero emojis in the user interface.
4. **Validation**: Ensure all checks pass with zero errors before committing:
   ```bash
   npx tsc --noEmit
   npm run build
   ```
5. **Commit Conventions**: Use concise, conventional commit messages:
   - `feat: add support for new client adapter`
   - `fix: resolve process termination signal handling`
   - `docs: update installation instructions`
6. **Open PR**: Push your branch to your fork and submit a Pull Request against the `main` branch with a clear summary of changes.
