#!/system/bin/sh
# ==============================================================================
# Metro Tracker Inspector - Background Service Hook (`service.sh`)
# Author: kerneldroid [Official]
# ==============================================================================

MODDIR="${MODDIR:-${0%/*}}"
. "$MODDIR/nightzuku-guard.sh"
require_nightzuku_host

mkdir -p "$MODDIR/reports" "$MODDIR/work" "$MODDIR/config" 2>/dev/null || true

# Initialize default configuration JSON if not present
CONFIG_FILE="$MODDIR/config/settings.json"
if [ ! -f "$CONFIG_FILE" ]; then
    cat > "$CONFIG_FILE" << 'EOF'
{
  "scanAllAtOnce": true,
  "packageScope": "user",
  "deepDex": true,
  "scanComponents": true,
  "scanNativeLibs": true,
  "scanPermissions": true,
  "skipCleanApps": false,
  "batchSize": 15,
  "palette": "m3-violet-dark",
  "exportPath": "/sdcard/Download/metro_tracker_report.json"
}
EOF
fi

echo "[Metro Tracker Inspector] Service initialized."
echo "Author : kerneldroid [Official]"
echo "Host   : $NIGHTZUKU_HOST_PKG (API v$NIGHTZUKU_MODULES_API)"
echo "Mode   : $SHIZUKU_MODULE_MODE (background=$SHIZUKU_MODULE_BACKGROUND)"
echo "Time   : $(date -u '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date)"
exit 0
