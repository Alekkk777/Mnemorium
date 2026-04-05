# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 2.x     | ✅ Yes    |
| 1.x     | ❌ No     |

## Reporting a Vulnerability

**Please do NOT open a public GitHub Issue for security vulnerabilities.**

Report security issues privately via email: `security@memorium.app`

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (optional)

We will respond within 48 hours and aim to release a fix within 7 days for critical issues.

## Data Privacy

Memorium is designed to be fully local:
- All data is stored on your machine only
- No telemetry, no analytics, no cloud sync
- API keys (if provided) are stored locally in the SQLite settings database
- No data ever leaves your machine unless you explicitly use a cloud AI provider

## Security Architecture

- Data storage: SQLite database in the OS app data directory
- Images: stored in the OS app data directory filesystem
- API keys: stored in SQLite settings table (not in code or config files)
- Encryption: AES-256-GCM available for export bundles
