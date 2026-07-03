#!/system/bin/sh
echo "=== FindCVE v2.0 — Android CVE Scanner (20 CVEs) ==="
echo ""

PATCH=$(getprop ro.build.version.security_patch)
ANDROID=$(getprop ro.build.version.release)
MODEL=$(getprop ro.product.model)
BRAND=$(getprop ro.product.brand)
KERNEL=$(uname -r)
BT=$(settings get global bluetooth_on 2>/dev/null)

echo "Device: $BRAND $MODEL"
echo "Android: $ANDROID"
echo "Security Patch: $PATCH"
echo "Kernel: $KERNEL"
echo "Bluetooth: $BT"
echo ""
echo "=== CVE Scan Results (20 CVEs, 2025-2026) ==="
echo ""

VULN=0

check_patch() {
  CVE="$1"; COMP="$2"; DESC="$3"; CVSS="$4"
  if [ "$PATCH" \< "$COMP" ]; then
    echo "[VULNERABLE] $CVE | CVSS $CVSS | $DESC"
    VULN=$((VULN + 1))
  else
    echo "[PATCHED]    $CVE | $DESC"
  fi
}

check_bt() {
  CVE="$1"; COMP="$2"; DESC="$3"; CVSS="$4"
  if [ "$BT" = "1" ] && [ "$PATCH" \< "$COMP" ]; then
    echo "[VULNERABLE] $CVE | CVSS $CVSS | $DESC (BT enabled)"
    VULN=$((VULN + 1))
  else
    echo "[PATCHED]    $CVE | $DESC"
  fi
}

check_patch CVE-2025-36896 2025-09-05 "WLAN Pixel EoP" 9.8
check_patch CVE-2025-36904 2025-09-05 "WLAN Pixel EoP (2)" 9.8
check_patch CVE-2026-0126 2026-06-01 "WC-Radio OOB Write RCE" 9.8
check_patch CVE-2025-48543 2025-09-01 "ART Runtime sandbox escape" 8.8
check_patch CVE-2025-36901 2025-09-05 "WLAN Pixel Adjacent EoP" 8.8
check_patch CVE-2025-48595 2026-06-01 "Framework integer overflow" 8.4
check_patch CVE-2026-0021 2026-03-01 "AppInfoBase confused deputy" 8.4
check_patch CVE-2025-20704 2025-09-01 "MediaTek Modem OOB Write" 8.0
check_patch CVE-2025-48572 2025-12-01 "Framework permissions bypass" 7.8
check_patch CVE-2025-48643 2026-06-01 "Provisioning bypass" 7.8
check_patch CVE-2025-48617 2026-06-01 "CarrierConfigLoader UID bypass" 7.8
check_patch CVE-2026-0019 2026-06-01 "SettingsLib disable components" 7.8
check_patch CVE-2025-22438 2025-04-01 "InputDispatcher UAF" 7.8
check_patch CVE-2025-22441 2025-08-01 "RemoteViews confused deputy" 7.3
check_patch CVE-2026-0083 2026-06-01 "NFC UAF race condition" 7.0
check_bt CVE-2025-20702 2025-08-01 "Airoha BT Audio RACE" 8.8
check_bt CVE-2025-20700 2025-08-01 "Airoha BT Audio GATT" 8.8
check_bt CVE-2025-48640 2026-06-01 "BT Passkey pairing bypass" 8.0

echo ""
echo "=== Kernel CVE Check ==="
echo "Kernel: $KERNEL"
echo ""

ver_cmp() {
  echo "$1" | sed 's/^[^0-9]*//' | awk -F. '{printf "%d%03d%03d", $1, $2, $3}'
}

check_kernel() {
  CVE="$1"; DESC="$2"; CVSS="$3"; SHIFT="$4"
  PKT=$(ver_cmp "$KERNEL")
  PATCHED="false"
  for V in $SHIFT; do
    if [ "$(ver_cmp "$V")" -le "$PKT" ] 2>/dev/null; then
      PATCHED="true"
    fi
  done
  if [ "$PATCHED" = "true" ]; then
    echo "[PATCHED]    $CVE | $DESC"
  else
    echo "[VULNERABLE] $CVE | CVSS $CVSS | $DESC"
    VULN=$((VULN + 1))
  fi
}

check_kernel CVE-2025-21756 "Kernel vsock UAF" 7.8 "5.10.235 5.15.179 6.1.131 6.6.79 6.12.16 6.13.4"
check_kernel CVE-2025-21702 "Kernel pfifo_tail privesc" 7.8 "5.4.291 5.10.235 5.15.179 6.1.130 6.6.83 6.12.14 6.13.3"

echo ""
echo "=== Summary ==="
echo "Vulnerabilities found: $VULN / 20"
