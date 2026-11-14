# Nightzuku Modules

ADB modules for the [Nightzuku](https://github.com/kerneldroid/Nightzuku) module catalog.

## Modules

| Module | Description |
|--------|-------------|
| [findcve](modules/findcve/) | Android CVE scanner — checks security patch, kernel, Bluetooth for known vulnerabilities |
| [metro-tracker-inspector](modules/metro-tracker-inspector/) | Deep tracker scanner — audits manifest components, DEX bytecode, native libraries, SDK metadata and telemetry permissions with a Metro WebUI |

## Installation

Modules can be installed via the Nightzuku catalog (GitHub Topics search) or manually from releases.

## Adding a Module

1. Create a directory under `modules/`
2. Add `module.prop` with required fields (id, name, version, versionCode, author, description)
3. Add `action.sh`, `banner.png`, and optional `webui/`
4. Tag the repo with `adb-modules` topic on GitHub

> **Note**: modules like *metro-tracker-inspector* are "vibe-coded". These are examples of the capabilities of ADB Modules, do with them what you want — port to other forks, change their code, etc. Nightzuku-guard will be in only 1 of these modules, for an example of a new feature. 
