# Security Policy

## Supported Versions

Security updates and patches are actively provided for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

---

## Security Architecture

Omni MCP is engineered with defensive, local-first architectural guarantees:

1. **Strict Context Isolation**: Renderer processes execute with `nodeIntegration: false` and `contextIsolation: true`. Renderer code cannot directly invoke Node.js or OS APIs.
2. **Sanitized IPC Bridge**: All inter-process communication is routed through a typed, validated bridge (`electron/preload.ts` and `electron/main.ts`).
3. **Content Security Policy (CSP)**: In-app HTTP/HTTPS requests are restricted to official registries (e.g. npm registry for catalog metadata) and local bundles. Dynamic eval and unsafe scripts are disallowed.
4. **Filesystem Boundaries**: Configuration operations are restricted to known, validated AI client configuration paths on the host system. Keys are validated against prototype pollution (`__proto__`, `constructor`, `prototype`).
5. **No Cloud Telemetry**: Omni MCP does not send server configurations, credentials, or logs to remote servers. All data remains strictly local on your machine.

---

## Reporting a Vulnerability

We take the security of Omni MCP seriously. If you discover or suspect a security vulnerability, please do **NOT** disclose it in a public GitHub issue.

### Preferred Disclosure Method

Please report vulnerabilities using **GitHub Private Vulnerability Reporting**:
1. Navigate to the repository's **Security** tab at [https://github.com/heyysam1/omni-mcp/security](https://github.com/heyysam1/omni-mcp/security).
2. Click **Report a vulnerability** to open an encrypted advisory draft.

### Alternative Disclosure

If GitHub Advisory is unavailable, email your report to:
`heyy.mohammed07@gmail.com`

Please include:
- A description of the vulnerability and its potential impact.
- Clear reproduction steps or a minimal proof of concept.
- Affected components or configuration details.

### Response Timeline

- **Initial Response**: Within 48 hours of receipt.
- **Assessment & Status Updates**: Within 5 business days.
- **Remediation**: Fixes will be prepared and published in a coordinated point release.
