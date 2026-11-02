#!/system/bin/sh
# ==============================================================================
# Nightzuku Genuine Host Guard (`nightzuku-guard.sh`)
# ==============================================================================
# Drop-in anti-fork verification header for Nightzuku ADB Modules.
#
# Why this exists:
# Unofficial forks (such as "Shizuku Next" or stripped clones) often copy the
# Nightzuku ADB Modules UI without porting the native dual-wire runtime
# (`kerneldroid.nightzuku.INightService`), module environment contract, or
# execution policies, causing modules to break and generating false bug reports
# ("Not working on Shizuku Next") for module authors.
#
# Usage in `action.sh` or `service.sh`:
#   . "${MODDIR:-.}/nightzuku-guard.sh"
#   require_nightzuku_host
#
# Optional: Pin your module to an expected APK signing certificate SHA-256:
#   NIGHTZUKU_EXPECTED_SHA256="your_expected_sha256_lowercase_hex"
#   require_nightzuku_host "$NIGHTZUKU_EXPECTED_SHA256"
# ==============================================================================

NIGHTZUKU_REQUIRED_PKG="kerneldroid.nightzuku"
NIGHTZUKU_REQUIRED_DESCRIPTOR="kerneldroid.nightzuku.INightService"
NIGHTZUKU_REQUIRED_AUTHORITY="kerneldroid.nightzuku.nightzuku"

_nightzuku_abort() {
    echo "================================================================" >&2
    echo "[!] UNSUPPORTED HOST ENVIRONMENT DETECTED" >&2
    echo "----------------------------------------------------------------" >&2
    echo "Reason : $1" >&2
    echo "Host   : ${NIGHTZUKU_HOST_PKG:-unknown} (MODDIR=${MODDIR:-unset})" >&2
    echo "" >&2
    echo "This module is built exclusively for genuine Nightzuku" >&2
    echo "(package: kerneldroid.nightzuku)." >&2
    echo "Unofficial forks (such as Shizuku Next) have an incomplete/broken" >&2
    echo "module runner and are NOT supported. Do not report bugs to the" >&2
    echo "module developer when using third-party forks." >&2
    echo "================================================================" >&2
    exit 78
}

require_nightzuku_host() {
    _expected_sha256="$1"
    _min_api="${2:-2}"

    # 1. Load generated attestation file if present in $MODDIR
    if [ -n "$MODDIR" ] && [ -f "$MODDIR/.nightzuku_env" ]; then
        # Verify that the runtime environment was not stripped vs the attestation file
        _file_token=$(grep '^NIGHTZUKU_SESSION_TOKEN=' "$MODDIR/.nightzuku_env" 2>/dev/null | cut -d= -f2-)
        if [ -n "$_file_token" ] && [ -z "$NIGHTZUKU_SESSION_TOKEN" ]; then
            _nightzuku_abort "Runtime environment stripped by third-party fork (missing NIGHTZUKU_SESSION_TOKEN)."
        fi
    else
        _nightzuku_abort "Missing Nightzuku host attestation file (.nightzuku_env)."
    fi

    # 2. Verify canonical module path ownership & runtime environment contract
    case "$MODDIR" in
        *"/$NIGHTZUKU_REQUIRED_PKG/"*) ;;
        *) _nightzuku_abort "Module is not installed inside $NIGHTZUKU_REQUIRED_PKG storage." ;;
    esac

    if [ "$NIGHTZUKU_HOST" != "1" ] || [ "$NIGHTZUKU_HOST_PKG" != "$NIGHTZUKU_REQUIRED_PKG" ]; then
        _nightzuku_abort "Invalid NIGHTZUKU_HOST_PKG ($NIGHTZUKU_HOST_PKG != $NIGHTZUKU_REQUIRED_PKG)."
    fi

    if [ "$NIGHTZUKU_BINDER_DESCRIPTOR" != "$NIGHTZUKU_REQUIRED_DESCRIPTOR" ]; then
        _nightzuku_abort "Missing native Nightzuku dual-wire descriptor ($NIGHTZUKU_BINDER_DESCRIPTOR)."
    fi

    if [ -z "$NIGHTZUKU_SESSION_TOKEN" ] || [ "${#NIGHTZUKU_SESSION_TOKEN}" -lt 64 ]; then
        _nightzuku_abort "Missing or invalid HMAC-SHA256 session attestation token."
    fi

    # 3. Check minimum Nightzuku Modules API version
    if [ -n "$NIGHTZUKU_MODULES_API" ] && [ "$NIGHTZUKU_MODULES_API" -lt "$_min_api" ] 2>/dev/null; then
        _nightzuku_abort "Nightzuku Modules API v$_min_api required (current: v$NIGHTZUKU_MODULES_API)."
    fi

    # 4. Verify live package installation in Android PackageManager
    if command -v pm >/dev/null 2>&1; then
        _pm_path=$(pm path "$NIGHTZUKU_REQUIRED_PKG" 2>/dev/null | head -n 1)
        if [ -z "$_pm_path" ]; then
            _nightzuku_abort "Package $NIGHTZUKU_REQUIRED_PKG is not installed on this device."
        fi
    fi

    # 5. Live IPC challenge against kerneldroid.nightzuku.nightzuku provider
    if command -v content >/dev/null 2>&1; then
        _ipc_out=$(content call --uri "content://$NIGHTZUKU_REQUIRED_AUTHORITY" --method verifyNightzukuHost --arg "guard-probe" 2>/dev/null || true)
        case "$_ipc_out" in
            *"genuine=true"*|*"binderDescriptor=$NIGHTZUKU_REQUIRED_DESCRIPTOR"*) ;;
            "")
                # Some restricted SELinux contexts block `content call` from shell; fall back to token match
                if [ "$_file_token" != "$NIGHTZUKU_SESSION_TOKEN" ]; then
                    _nightzuku_abort "Session token mismatch against attestation file."
                fi
                ;;
            *)
                _nightzuku_abort "Live IPC verification against $NIGHTZUKU_REQUIRED_AUTHORITY failed."
                ;;
        esac
    fi

    # 6. Optional cryptographic APK signer SHA-256 pinning
    if [ -n "$_expected_sha256" ]; then
        _norm_expected=$(echo "$_expected_sha256" | tr 'A-F' 'a-f' | tr -d ': ')
        _norm_actual=$(echo "$NIGHTZUKU_SIGNER_SHA256" | tr 'A-F' 'a-f' | tr -d ': ')
        if [ "$_norm_actual" != "$_norm_expected" ]; then
            _nightzuku_abort "APK signature mismatch (expected $_norm_expected, got ${_norm_actual:-none})."
        fi
    fi

    return 0
}
