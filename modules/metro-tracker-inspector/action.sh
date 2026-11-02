#!/system/bin/sh
# Metro Tracker Inspector - Action Runner
# Author: kerneldroid [Official]

exec </dev/null

MODDIR="${MODDIR:-${0%/*}}"
. "$MODDIR/nightzuku-guard.sh"
require_nightzuku_host

mkdir -p "$MODDIR/reports" "$MODDIR/work" "$MODDIR/config" 2>/dev/null || true

exec sh "$MODDIR/scripts/scanner.sh" --cli-scan
