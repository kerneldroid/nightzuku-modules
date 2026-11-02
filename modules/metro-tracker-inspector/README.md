# Metro Tracker Inspector

**Author:** `kerneldroid [Official]`  
**Target Runtime:** Nightzuku ADB Modules API v2+ (`kerneldroid.nightzuku`)  
**UI Design:** Windows 8 Metro layout & interaction geometry in Material 3 tonal palettes

## Overview

Metro Tracker Inspector is a deep privacy and tracker auditing module for Nightzuku. Rather than performing a superficial package name check, it inspects installed Android applications across five independent forensic layers:

1. **Manifest Component Graph (`COMPONENT`)**: Audits declared `Activity`, `Service`, `BroadcastReceiver`, and `ContentProvider` classes from `dumpsys package`.
2. **Deep DEX Bytecode Descriptors (`DEX_BYTECODE`)**: Streams `classes*.dex` inside base and split APKs to identify code-initialized and obfuscated tracker SDKs.
3. **Native Shared Library Fingerprinting (`NATIVE_SO`)**: Scans `lib/<abi>/lib*.so` entries inside APKs for native crash, telemetry, anti-fraud, and ad-mediation engines.
4. **Manifest SDK Metadata Keys (`MANIFEST_META`)**: Detects SDK initialization keys and authorities declared in `AndroidManifest.xml`.
5. **Telemetry & Ad-ID Permissions (`PERMISSIONS`)**: Correlates `AD_ID`, Privacy Sandbox AdServices, background location, phone state, and Bluetooth/Wi-Fi beacon permissions.

## Features

- **Windows 8 Metro UI in Material 3 Palette**: Ultra-light typography, lowercase pivot navigation (`start`, `results`, `packages`, `config`, `json`), sharp `0px` Live Tiles with tactile press physics, rectangular Windows 8 toggle switches, and four selectable Material 3 tonal themes.
- **Flexible Scan Scope**: Scan all installed applications at once (`User`, `System`, or `All`) or manually select individual packages.
- **Chunked `.JSON` Export**: Saves full structured audit reports directly to `/sdcard/Download/metro_tracker_report.json` and `$MODDIR/reports/latest_scan.json`.
- **Host Guard Protection**: Protected by `nightzuku-guard.sh` and `nightzuku-guard.js` against incompatible third-party forks.
