# Nightzuku Modules

ADB modules for the [Nightzuku](https://github.com/kerneldroid/Nightzuku) module catalog.

## Modules

| Module | Description |
|--------|-------------|
| [findcve](modules/findcve/) | Android CVE scanner — checks security patch, kernel, Bluetooth for known vulnerabilities |

## Installation

Modules can be installed via the Nightzuku catalog (GitHub Topics search) or manually from releases.

## Adding a Module

1. Create a directory under `modules/`
2. Add `module.prop` with required fields (id, name, version, versionCode, author, description)
3. Add `action.sh`, `banner.png`, and optional `webui/`
4. Tag the repo with `adb-modules` topic on GitHub
