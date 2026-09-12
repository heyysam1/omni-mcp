# Contributing to Omni MCP

Thank you for your interest in contributing to **Omni MCP**! This project aims to provide a lightweight, reliable desktop companion for Model Context Protocol (MCP) clients.

---

## Code of Conduct

We are committed to providing a friendly, welcoming, and inclusive environment for all contributors. Please be respectful, professional, and constructive in all interactions.

---

## Welcome Contributions

The project welcomes community contributions, including:
- **Bug Fixes**: Resolving defects, edge-case crashes, or unexpected UI/Electron behaviors.
- **Security Fixes**: Addressing security disclosures and defensive hygiene.
- **Reliability Improvements**: Hardening process supervision, stdio pipe handling, and IPC channels.
- **Documentation Improvements**: Clarifying guides, installation steps, and architecture overviews.
- **Tests & Quality Assurance**: Adding unit or end-to-end regression tests.
- **Small Feature Improvements**: Thoughtful additions that align with Omni MCP's focused scope.
- **Performance Optimizations**: Minimizing memory footprint and startup overhead.

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
- Explain the motivation and concrete use cases.
- Discuss implementation details before submitting a large pull request.

### 3. Submitting Pull Requests

Please follow these steps when submitting changes:

1. **Fork the Repository**: Create your own fork of [heyysam1/omni-mcp](https://github.com/heyysam1/omni-mcp).
2. **Create a Dedicated Branch**: Branch off from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make Focused Changes**: Keep changes scoped and focused on a single issue or improvement.
4. **Adhere to Design Guidelines**:
   - **Aesthetics**: Deep obsidian (`#07080B`), matte graphite surfaces (`#101217`), emerald (`#10B981`) and cyan (`#38BDF8`) accents.
   - **Typography**: Inter for interface elements, JetBrains Mono for metrics and code.
   - **Iconography**: Clean 1.5px/1.75px vector outlines (Lucide). Strictly zero emojis in the user interface.
5. **Test Your Changes**: Verify that your code compiles with zero errors and that the application builds cleanly:
   ```bash
   npx tsc --noEmit
   npm run build
   ```
6. **Commit Conventions**: Use conventional, descriptive commit messages (`feat: ...`, `fix: ...`, `docs: ...`).
7. **Submit Pull Request**: Push your branch to your fork and submit a Pull Request against `main`. Clearly explain what was changed, why it was changed, and how it was tested.
8. **Maintainer Review**:
   - Every Pull Request undergoes review by maintainers before being merged.
   - Maintainers may accept the contribution, request modifications, or decline it if it does not align with the product's architectural scope or quality criteria.
   - Submitting a pull request does not guarantee that it will be merged.
