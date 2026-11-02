#!/system/bin/sh
# ==============================================================================
# Metro Tracker Inspector - Hardware-Adaptive Deep Scanner Engine
# Author: kerneldroid [Official]
# Target: Nightzuku ADB Modules Runtime (API v2+)
#
# Engineered for Android Toybox & mksh:
# - Closes stdin (`exec </dev/null`) so RemoteProcess pipes never hang on EOF.
# - Avoids early pipe closures (`head -c` / `head -n` mid-pipe) because Android
#   JVM child processes inherit SIG_IGN for SIGPIPE.
# - Uses pure Toybox applets (sed, grep, tr, cut, sort, unzip, strings, base64)
#   with zero awk dependency.
# ==============================================================================

exec </dev/null

MODDIR="${MODDIR:-${0%/*}/..}"
REPORT_DIR="$MODDIR/reports"
WORK_DIR="$MODDIR/work"
CONFIG_DIR="$MODDIR/config"
CONFIG_FILE="$CONFIG_DIR/settings.json"
DEFAULT_EXPORT_PATH="/sdcard/Download/metro_tracker_report.json"

mkdir -p "$REPORT_DIR" "$WORK_DIR" "$CONFIG_DIR" 2>/dev/null || true

# Fast host check for batch commands; full guard check for init/CLI
verify_host_fast() {
    if [ "$NIGHTZUKU_HOST" != "1" ] || [ "$NIGHTZUKU_HOST_PKG" != "kerneldroid.nightzuku" ]; then
        if [ -f "$MODDIR/nightzuku-guard.sh" ]; then
            . "$MODDIR/nightzuku-guard.sh"
            require_nightzuku_host
        fi
    fi
}

json_escape() {
    printf '%s' "$1" | tr '\r\n\t' '   ' | sed 's/\\/\\\\/g; s/"/\\"/g'
}

# Detect CPU core count, max clock frequency, and RAM to adapt parallel workers
detect_hardware() {
    _cores=$(nproc 2>/dev/null || grep -c '^processor' /proc/cpuinfo 2>/dev/null || echo "4")
    case "$_cores" in
        ''|*[!0-9]*) _cores=4 ;;
    esac
    [ "$_cores" -lt 1 ] && _cores=4

    _mem_kb=$(sed -n '/^MemTotal:/{s/^MemTotal:[[:space:]]*\([0-9][0-9]*\).*/\1/p;q;}' /proc/meminfo 2>/dev/null)
    case "$_mem_kb" in
        ''|*[!0-9]*) _mem_kb=4194304 ;;
    esac
    _mem_mb=$((_mem_kb / 1024))

    _avail_kb=$(sed -n '/^MemAvailable:/{s/^MemAvailable:[[:space:]]*\([0-9][0-9]*\).*/\1/p;q;}' /proc/meminfo 2>/dev/null)
    case "$_avail_kb" in
        ''|*[!0-9]*) _avail_kb=2097152 ;;
    esac
    _avail_mb=$((_avail_kb / 1024))

    _max_khz=0
    for _freq_file in /sys/devices/system/cpu/cpu[0-9]*/cpufreq/cpuinfo_max_freq; do
        if [ -r "$_freq_file" ]; then
            _f=$(cat "$_freq_file" 2>/dev/null | tr -d '\r\n ')
            case "$_f" in
                ''|*[!0-9]*) _f=0 ;;
            esac
            [ "$_f" -gt "$_max_khz" ] && _max_khz="$_f"
        fi
    done
    _max_mhz=$((_max_khz / 1000))

    if [ "$_cores" -ge 8 ] && [ "$_mem_mb" -ge 5500 ]; then
        HW_TIER="HIGH"
        HW_WORKERS=4
        HW_BATCH=8
    elif [ "$_cores" -ge 6 ] && [ "$_mem_mb" -ge 3500 ]; then
        HW_TIER="BALANCED"
        HW_WORKERS=3
        HW_BATCH=6
    else
        HW_TIER="COMPACT"
        HW_WORKERS=2
        HW_BATCH=4
    fi
}

cmd_env_info() {
    if [ -f "$MODDIR/nightzuku-guard.sh" ]; then
        . "$MODDIR/nightzuku-guard.sh"
        require_nightzuku_host
    fi
    detect_hardware

    _sdk=$(getprop ro.build.version.sdk 2>/dev/null || echo "0")
    _rel=$(getprop ro.build.version.release 2>/dev/null || echo "unknown")
    _model=$(getprop ro.product.model 2>/dev/null || echo "Android Device")
    _brand=$(getprop ro.product.brand 2>/dev/null || echo "Generic")
    _abi=$(getprop ro.product.cpu.abi 2>/dev/null || echo "arm64-v8a")
    _uid=$(id -u 2>/dev/null || echo "2000")
    _latest_exists="false"
    [ -f "$REPORT_DIR/latest_scan.json" ] && _latest_exists="true"

    printf '{"ok":true,"device":{"brand":"%s","model":"%s","androidRelease":"%s","sdk":%s,"abi":"%s"},"hardware":{"cores":%s,"maxFreqMhz":%s,"totalRamMb":%s,"availRamMb":%s,"tier":"%s","recommendedWorkers":%s,"recommendedBatch":%s},"runtime":{"uid":%s,"moduleId":"%s","accessMode":"%s","trusted":%s,"hostPkg":"%s","hostVersion":"%s","apiVersion":%s},"capabilities":{"latestReportExists":%s,"modDir":"%s"}}\n' \
        "$(json_escape "$_brand")" \
        "$(json_escape "$_model")" \
        "$(json_escape "$_rel")" \
        "${_sdk:-0}" \
        "$(json_escape "$_abi")" \
        "${_cores:-4}" \
        "${_max_mhz:-0}" \
        "${_mem_mb:-4096}" \
        "${_avail_mb:-2048}" \
        "$HW_TIER" \
        "$HW_WORKERS" \
        "$HW_BATCH" \
        "${_uid:-2000}" \
        "$(json_escape "${SHIZUKU_MODULE_ID:-metro-tracker-inspector}")" \
        "$(json_escape "${SHIZUKU_MODULE_MODE:-full}")" \
        "${SHIZUKU_MODULE_TRUSTED:-0}" \
        "$(json_escape "${NIGHTZUKU_HOST_PKG:-kerneldroid.nightzuku}")" \
        "$(json_escape "${NIGHTZUKU_HOST_VERSION:-unknown}")" \
        "${NIGHTZUKU_MODULES_API:-2}" \
        "$_latest_exists" \
        "$(json_escape "$MODDIR")"
}

cmd_list_packages() {
    verify_host_fast
    _scope="${1:-user}"

    case "$_scope" in
        user)
            (cmd package list packages -3 2>/dev/null || pm list packages -3 2>/dev/null) | \
                tr -d '\r' | sed 's/^package://' | sort -u | \
                sed -n 's/^[[:space:]]*\([A-Za-z0-9_.$][A-Za-z0-9_.$]*\)[[:space:]]*$/{"package":"\1","isSystem":false}/p'
            ;;
        system)
            (cmd package list packages -s 2>/dev/null || pm list packages -s 2>/dev/null) | \
                tr -d '\r' | sed 's/^package://' | sort -u | \
                sed -n 's/^[[:space:]]*\([A-Za-z0-9_.$][A-Za-z0-9_.$]*\)[[:space:]]*$/{"package":"\1","isSystem":true}/p'
            ;;
        all|*)
            (cmd package list packages -3 2>/dev/null || pm list packages -3 2>/dev/null) | \
                tr -d '\r' | sed 's/^package://' | sort -u | \
                sed -n 's/^[[:space:]]*\([A-Za-z0-9_.$][A-Za-z0-9_.$]*\)[[:space:]]*$/{"package":"\1","isSystem":false}/p'
            (cmd package list packages -s 2>/dev/null || pm list packages -s 2>/dev/null) | \
                tr -d '\r' | sed 's/^package://' | sort -u | \
                sed -n 's/^[[:space:]]*\([A-Za-z0-9_.$][A-Za-z0-9_.$]*\)[[:space:]]*$/{"package":"\1","isSystem":true}/p'
            ;;
    esac
}

# Shared tracker namespace regex (used on short text lines only)
TRACKER_DOT_REGEX='(com\.(google\.(firebase\.(analytics|crashlytics|perf)|android\.gms\.(ads|measurement|analytics|tagmanager))|facebook\.(appevents|ads|internal|Facebook)|appsflyer|adjust\.sdk|amplitude\.api|mixpanel\.android|bytedance\.sdk\.openadsdk|pangle|unity3d\.(ads|services)|ironsource\.mediationsdk|vungle\.(warren|ads)|liftoff|chartboost\.sdk|inmobi\.(sdk|ads|media)|mintegral\.msdk|flurry\.android|yandex\.(metrica|mobile\.ads)|vk\.tracker|my\.tracker|huawei\.(hms\.(analytics|ads)|agconnect|openalliance\.ad)|xiaomi\.(mipush|push)|umeng\.(analytics|commonsdk|message)|tencent\.(bugly|stat|smtt)|sensorsdata\.analytics|growingio|bugsnag\.android|datadog\.android|newrelic\.agent|instabug\.library|dynatrace\.android|onesignal|braze|appboy|clevertap\.android|leanplum|urbanairship|moengage|webengage|kochava|singular\.sdk|snowplowanalytics|segment\.analytics|posthog|uxcam|smartlook|fullstory|heapanalytics|criteo\.publisher|amazon\.device\.ads|startapp\.sdk|ogury|tapjoy|fyber|inneractive|applovin\.(sdk|mediation|adview))|io\.(appmetrica\.analytics|branch\.(referral|sdk)|sentry\.android|embrace\.android|presage)|cn\.(jpush\.android|jiguang))[A-Za-z0-9_.$]*'

TRACKER_SLASH_REGEX='L(com/(google/firebase/(analytics|crashlytics|perf)|google/android/gms/(ads|measurement|analytics|tagmanager)|facebook/(appevents|ads|internal)|appsflyer|adjust/sdk|amplitude/api|mixpanel/android|bytedance/sdk/openadsdk|pangle|unity3d/(ads|services)|ironsource/mediationsdk|vungle/(warren|ads)|liftoff|chartboost/sdk|inmobi/(sdk|ads|media)|mintegral/msdk|flurry/android|yandex/(metrica|mobile/ads)|vk/tracker|my/tracker|huawei/(hms/(analytics|ads)|agconnect|openalliance/ad)|xiaomi/mipush|umeng/(analytics|commonsdk)|tencent/bugly|sensorsdata/analytics|growingio|bugsnag/android|datadog/android|newrelic/agent|instabug/library|dynatrace/android|onesignal|braze|appboy|clevertap/android|leanplum|urbanairship|moengage|webengage|kochava|singular/sdk|snowplowanalytics|segment/analytics|posthog|uxcam|smartlook|fullstory|heapanalytics|criteo/publisher|amazon/device/ads|startapp/sdk|ogury|tapjoy|fyber|inneractive|applovin/(sdk|mediation))|io/(appmetrica/analytics|branch/referral|sentry/android|embrace/android|presage)|cn/jpush/android)/[A-Za-z0-9_/$]+'

scan_single_package() {
    _pkg="$1"
    [ -z "$_pkg" ] && return 0

    _do_comp="${SCAN_COMPONENTS:-1}"
    _do_dex="${SCAN_DEX:-1}"
    _do_native="${SCAN_NATIVE:-1}"
    _do_perm="${SCAN_PERMS:-1}"

    _dump_file="$WORK_DIR/d_${_pkg}_$$.txt"
    (cmd package dump "$_pkg" 2>/dev/null || dumpsys package "$_pkg" 2>/dev/null) | tr -d '\r' > "$_dump_file"

    if [ ! -s "$_dump_file" ]; then
        rm -f "$_dump_file" 2>/dev/null || true
        printf '{"package":"%s","versionName":"1.0","versionCode":"1","uid":"0","isSystem":false,"apkCount":1,"components":"","metaKeys":"","permissions":"","nativeLibs":"","dexSignatures":""}\n' "$(json_escape "$_pkg")"
        return 0
    fi

    # Single-process sed metadata extraction (quits on first match, zero pipes)
    _ver_name=$(sed -n '/versionName=/{s/.*versionName=\([^[:space:]]*\).*/\1/p;q;}' "$_dump_file")
    _ver_code=$(sed -n '/versionCode=/{s/.*versionCode=\([0-9][0-9]*\).*/\1/p;q;}' "$_dump_file")
    _uid=$(sed -n '/\(userId\|appId\)=/{s/.*\(userId\|appId\)=\([0-9][0-9]*\).*/\2/p;q;}' "$_dump_file")
    _code_path=$(sed -n '/codePath=/{s/.*codePath=\([^[:space:]]*\).*/\1/p;q;}' "$_dump_file")

    _is_sys="false"
    if [ -n "$(sed -n '/flags=\[.*SYSTEM/{p;q;}' "$_dump_file")" ]; then
        _is_sys="true"
    fi

    _perm_matches=""
    if [ "$_do_perm" = "1" ]; then
        _perm_matches=$(grep -o -E '(com\.google\.android\.gms\.permission\.AD_ID|android\.permission\.(ACCESS_ADSERVICES_AD_ID|ACCESS_ADSERVICES_ATTRIBUTION|ACCESS_ADSERVICES_TOPICS|ACCESS_FINE_LOCATION|ACCESS_COARSE_LOCATION|ACCESS_BACKGROUND_LOCATION|READ_PHONE_STATE|ACTIVITY_RECOGNITION|BLUETOOTH_SCAN|NEARBY_WIFI_DEVICES|GET_ACCOUNTS|PACKAGE_USAGE_STATS))' "$_dump_file" 2>/dev/null | \
            sort -u | tr '\n' '|' | sed 's/|$//')
    fi

    # Resolve base.apk directly from codePath (0ms, no JVM spawn)
    _base_apk=""
    _apk_count=1
    if [ -n "$_code_path" ]; then
        if [ -f "$_code_path" ]; then
            _base_apk="$_code_path"
        elif [ -f "$_code_path/base.apk" ]; then
            _base_apk="$_code_path/base.apk"
            _apk_count=$(ls -1 "$_code_path"/*.apk 2>/dev/null | wc -l | tr -d ' ')
            case "$_apk_count" in
                ''|*[!0-9]*) _apk_count=1 ;;
            esac
        fi
    fi
    if [ -z "$_base_apk" ]; then
        _base_apk=$(cmd package path "$_pkg" 2>/dev/null | sed -n '1s/^package://p' | tr -d '\r')
    fi

    # 1. Manifest Components & SDK Meta Keys
    _comp_matches=""
    _meta_matches=""
    if [ "$_do_comp" = "1" ]; then
        _comp_matches=$(grep -o -E "$TRACKER_DOT_REGEX" "$_dump_file" 2>/dev/null | \
            sort -u | tr '\n' '|' | sed 's/|$//')

        _meta_matches=$(grep -o -E '(com\.google\.android\.gms\.ads\.APPLICATION_ID|com\.facebook\.sdk\.(ApplicationId|ClientToken)|applovin\.sdk\.key|io\.branch\.sdk\.BranchKey|com\.onesignal\.AppId|com\.braze\.api_key|CLEVERTAP_ACCOUNT_ID|io\.sentry\.dsn|com\.bugsnag\.android\.API_KEY|yandex\.metrica\.api_key|AppsFlyerKey)' "$_dump_file" 2>/dev/null | \
            sort -u | tr '\n' '|' | sed 's/|$//')
    fi

    # 2. Fast APK Central Directory Inspection (`unzip -l` reads only ZIP footer, 2ms!)
    _native_matches=""
    _zip_dex_markers=""
    if [ -n "$_base_apk" ] && [ -r "$_base_apk" ] && command -v unzip >/dev/null 2>&1; then
        _zip_list="$WORK_DIR/z_${_pkg}_$$.txt"
        unzip -l "$_base_apk" 2>/dev/null > "$_zip_list"

        if [ "$_do_native" = "1" ]; then
            _native_matches=$(grep -o -E 'lib/[^/]+/lib[A-Za-z0-9_.-]+\.so' "$_zip_list" 2>/dev/null | \
                sed 's|.*/||' | \
                grep -i -E '(bugly|sentry|crashlytics|pangle|metasec|apms|datadog|newrelic|uetracker|mytracker|hmsanalytics|jpush|umeng|vungle|unityads|applovin|ironsource|appmetrica|instabug|embrace|smartlook|uxcam|kochava|flurry|xcrash|msaoaidsec)' | \
                sort -u | tr '\n' '|' | sed 's/|$//')
        fi

        _zip_dex_markers=$(grep -o -E '(firebase-(analytics|crashlytics|perf|measurement-connector)|play-services-(ads|measurement|analytics|tagmanager)|appsflyer|adjust|amplitude|mixpanel|onesignal|braze|clevertap|sentry|bugsnag|datadog|applovin|unity-ads|vungle|inmobi|chartboost|appmetrica|mytracker|posthog|snowplow|moengage|uxcam|smartlook)[A-Za-z0-9_.-]*\.(properties|kotlin_module)' "$_zip_list" 2>/dev/null | \
            sed 's/\.\(properties\|kotlin_module\)$//' | \
            sort -u | tr '\n' '|' | sed 's/|$//')

        rm -f "$_zip_list" 2>/dev/null || true
    fi

    # 3. Deep DEX String Pool Inspection (no mid-pipe head cutoff -> zero SIGPIPE hang!)
    _dex_matches="$_zip_dex_markers"
    if [ "$_do_dex" = "1" ] && [ -n "$_base_apk" ] && [ -r "$_base_apk" ] && command -v unzip >/dev/null 2>&1 && command -v strings >/dev/null 2>&1; then
        _raw_dex=$(unzip -p "$_base_apk" classes.dex 2>/dev/null | \
            strings -n 14 2>/dev/null | \
            grep -o -E "$TRACKER_SLASH_REGEX" 2>/dev/null | \
            sed 's/^L//' | tr '/' '.' | cut -d. -f1-4 | sort -u | tr '\n' '|' | sed 's/|$//')
        if [ -n "$_raw_dex" ]; then
            _dex_matches="${_dex_matches:+$_dex_matches|}$_raw_dex"
        fi
    fi

    rm -f "$_dump_file" 2>/dev/null || true

    printf '{"package":"%s","versionName":"%s","versionCode":"%s","uid":"%s","isSystem":%s,"apkCount":%s,"components":"%s","metaKeys":"%s","permissions":"%s","nativeLibs":"%s","dexSignatures":"%s"}\n' \
        "$(json_escape "$_pkg")" \
        "$(json_escape "${_ver_name:-1.0}")" \
        "$(json_escape "${_ver_code:-1}")" \
        "$(json_escape "${_uid:-0}")" \
        "${_is_sys:-false}" \
        "${_apk_count:-1}" \
        "$(json_escape "$_comp_matches")" \
        "$(json_escape "$_meta_matches")" \
        "$(json_escape "$_perm_matches")" \
        "$(json_escape "$_native_matches")" \
        "$(json_escape "$_dex_matches")"
}

cmd_scan_batch() {
    verify_host_fast
    if [ -z "$SCAN_WORKERS" ]; then
        detect_hardware
        _workers="$HW_WORKERS"
    else
        _workers="$SCAN_WORKERS"
    fi
    case "$_workers" in
        ''|*[!0-9]*) _workers=2 ;;
    esac
    [ "$_workers" -lt 1 ] && _workers=1

    _pkg_list="$*"
    if [ -z "$_pkg_list" ] && [ -n "$SCAN_PKGS" ]; then
        _pkg_list=$(printf '%s' "$SCAN_PKGS" | tr '|,\n\r' '    ')
    fi

    _count=0
    for _p in $_pkg_list; do
        [ -n "$_p" ] && _count=$((_count + 1))
    done

    if [ "$_count" -le 1 ] || [ "$_workers" -le 1 ]; then
        for _pkg in $_pkg_list; do
            [ -n "$_pkg" ] && scan_single_package "$_pkg"
        done
        return 0
    fi

    _running=0
    _idx=0
    _batch_id="b_$$"

    for _pkg in $_pkg_list; do
        [ -z "$_pkg" ] && continue
        _idx=$((_idx + 1))
        _out_slot="$WORK_DIR/${_batch_id}_${_idx}.json"
        (
            scan_single_package "$_pkg" > "$_out_slot" 2>/dev/null
        ) &
        _running=$((_running + 1))

        if [ "$_running" -ge "$_workers" ]; then
            wait
            _running=0
        fi
    done
    wait

    _i=1
    while [ "$_i" -le "$_idx" ]; do
        _slot="$WORK_DIR/${_batch_id}_${_i}.json"
        if [ -f "$_slot" ]; then
            cat "$_slot"
            rm -f "$_slot" 2>/dev/null || true
        fi
        _i=$((_i + 1))
    done
}

resolve_tracker_ids() {
    _combined="$1"
    _matched=""
    add_t() {
        case "|$_matched|" in
            *"|$1|"*) ;;
            *) _matched="${_matched:+$_matched|}$1" ;;
        esac
    }
    case "$_combined" in *google.firebase.analytics*|*google.android.gms.measurement*|*AppMeasurement*|*firebase-analytics*|*play-services-measurement*) add_t "firebase_analytics" ;; esac
    case "$_combined" in *google.firebase.crashlytics*|*crashlytics*) add_t "firebase_crashlytics" ;; esac
    case "$_combined" in *google.firebase.perf*|*firebase-perf*) add_t "firebase_perf" ;; esac
    case "$_combined" in *google.android.gms.ads*|*AdMob*|*play-services-ads*) add_t "google_admob" ;; esac
    case "$_combined" in *google.android.gms.analytics*|*google.android.gms.tagmanager*) add_t "google_analytics_gtm" ;; esac
    case "$_combined" in *facebook.appevents*|*facebook.internal*|*com.facebook.sdk*) add_t "meta_analytics" ;; esac
    case "$_combined" in *facebook.ads*) add_t "meta_audience_network" ;; esac
    case "$_combined" in *appsflyer*|*AppsFlyer*) add_t "appsflyer" ;; esac
    case "$_combined" in *adjust.sdk*|*com.adjust.sdk*|*adjust*) add_t "adjust" ;; esac
    case "$_combined" in *io.branch.referral*|*io.branch.sdk*) add_t "branch_io" ;; esac
    case "$_combined" in *kochava*) add_t "kochava" ;; esac
    case "$_combined" in *singular.sdk*) add_t "singular" ;; esac
    case "$_combined" in *amplitude*) add_t "amplitude" ;; esac
    case "$_combined" in *mixpanel*) add_t "mixpanel" ;; esac
    case "$_combined" in *segment.analytics*) add_t "segment" ;; esac
    case "$_combined" in *posthog*) add_t "posthog" ;; esac
    case "$_combined" in *snowplow*) add_t "snowplow" ;; esac
    case "$_combined" in *applovin*) add_t "applovin_max" ;; esac
    case "$_combined" in *unity3d.ads*|*unity3d.services*|*unityads*|*unity-ads*) add_t "unity_ads" ;; esac
    case "$_combined" in *ironsource*) add_t "ironsource" ;; esac
    case "$_combined" in *vungle*|*liftoff*) add_t "vungle_liftoff" ;; esac
    case "$_combined" in *chartboost*) add_t "chartboost" ;; esac
    case "$_combined" in *inmobi*) add_t "inmobi" ;; esac
    case "$_combined" in *mintegral*) add_t "mintegral" ;; esac
    case "$_combined" in *bytedance.sdk.openadsdk*|*pangle*|*metasec*) add_t "pangle_bytedance" ;; esac
    case "$_combined" in *criteo.publisher*) add_t "criteo" ;; esac
    case "$_combined" in *amazon.device.ads*) add_t "amazon_ads" ;; esac
    case "$_combined" in *startapp.sdk*) add_t "start_io" ;; esac
    case "$_combined" in *ogury*|*presage*) add_t "ogury" ;; esac
    case "$_combined" in *tapjoy*) add_t "tapjoy" ;; esac
    case "$_combined" in *fyber*|*inneractive*) add_t "fyber" ;; esac
    case "$_combined" in *flurry*) add_t "flurry" ;; esac
    case "$_combined" in *yandex.metrica*|*io.appmetrica*|*appmetrica*) add_t "yandex_appmetrica" ;; esac
    case "$_combined" in *yandex.mobile.ads*) add_t "yandex_ads" ;; esac
    case "$_combined" in *vk.tracker*|*my.tracker*|*mytracker*) add_t "vk_mytracker" ;; esac
    case "$_combined" in *huawei.hms.analytics*|*hmsanalytics*|*huawei.agconnect*) add_t "huawei_hianalytics" ;; esac
    case "$_combined" in *huawei.hms.ads*|*huawei.openalliance.ad*) add_t "huawei_ads" ;; esac
    case "$_combined" in *xiaomi.mipush*) add_t "xiaomi_mipush" ;; esac
    case "$_combined" in *umeng*) add_t "umeng_analytics" ;; esac
    case "$_combined" in *cn.jpush*|*jpush*) add_t "jpush_jiguang" ;; esac
    case "$_combined" in *tencent.bugly*|*bugly*) add_t "tencent_bugly" ;; esac
    case "$_combined" in *sensorsdata*) add_t "sensors_data" ;; esac
    case "$_combined" in *growingio*) add_t "growingio" ;; esac
    case "$_combined" in *io.sentry*|*sentry*) add_t "sentry" ;; esac
    case "$_combined" in *bugsnag*) add_t "bugsnag" ;; esac
    case "$_combined" in *datadog*) add_t "datadog" ;; esac
    case "$_combined" in *newrelic*) add_t "new_relic" ;; esac
    case "$_combined" in *instabug*) add_t "instabug" ;; esac
    case "$_combined" in *embrace.android*|*embrace*) add_t "embrace" ;; esac
    case "$_combined" in *dynatrace*) add_t "dynatrace" ;; esac
    case "$_combined" in *onesignal*) add_t "onesignal" ;; esac
    case "$_combined" in *braze*|*appboy*) add_t "braze" ;; esac
    case "$_combined" in *clevertap*) add_t "clevertap" ;; esac
    case "$_combined" in *leanplum*) add_t "leanplum" ;; esac
    case "$_combined" in *urbanairship*|*airship*) add_t "airship" ;; esac
    case "$_combined" in *moengage*) add_t "moengage" ;; esac
    case "$_combined" in *webengage*) add_t "webengage" ;; esac
    case "$_combined" in *uxcam*) add_t "uxcam" ;; esac
    case "$_combined" in *smartlook*) add_t "smartlook" ;; esac
    case "$_combined" in *fullstory*) add_t "fullstory" ;; esac
    case "$_combined" in *heapanalytics*) add_t "heap_analytics" ;; esac
    printf '%s' "$_matched"
}

cmd_cli_scan() {
    if [ -f "$MODDIR/nightzuku-guard.sh" ]; then
        . "$MODDIR/nightzuku-guard.sh"
        require_nightzuku_host
    fi
    detect_hardware

    _out_file="${1:-$DEFAULT_EXPORT_PATH}"
    _latest_file="$REPORT_DIR/latest_scan.json"
    _tmp_json="$WORK_DIR/cli_report.json"

    _pkgs=$( (cmd package list packages -3 2>/dev/null || pm list packages -3 2>/dev/null) | tr -d '\r' | sed 's/^package://' | sort -u )

    _total_apps=0
    _apps_with_trackers=0
    _total_tracker_instances=0
    _ts=$(date -u '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date)

    printf 'Hardware: %s (%s cores, %s MB RAM, %s workers)\n\n' "$HW_TIER" "$_cores" "$_mem_mb" "$HW_WORKERS"
    printf '{\n  "module": "metro-tracker-inspector",\n  "author": "kerneldroid [Official]",\n  "generatedAt": "%s",\n  "hardwareTier": "%s",\n  "applications": [\n' "$(json_escape "$_ts")" "$HW_TIER" > "$_tmp_json"

    _first=1
    for _p in $_pkgs; do
        [ -z "$_p" ] && continue
        _total_apps=$((_total_apps + 1))
        _raw=$(SCAN_COMPONENTS=1 SCAN_DEX=1 SCAN_NATIVE=1 SCAN_PERMS=1 scan_single_package "$_p")
        _t_ids=$(resolve_tracker_ids "$_raw")
        _t_count=0
        if [ -n "$_t_ids" ]; then
            _t_count=$(printf '%s\n' "$_t_ids" | tr '|' '\n' | grep -c '[a-z]' 2>/dev/null || echo "0")
        fi
        if [ "$_t_count" -gt 0 ]; then
            _apps_with_trackers=$((_apps_with_trackers + 1))
            _total_tracker_instances=$((_total_tracker_instances + _t_count))
        fi
        printf '[%03d] %-40s : %2d tracker(s)\n' "$_total_apps" "$_p" "$_t_count"

        if [ "$_first" -eq 1 ]; then
            _first=0
        else
            printf ',\n' >> "$_tmp_json"
        fi
        _trimmed=$(printf '%s' "$_raw" | sed 's/}$//')
        printf '    %s,"trackerCount":%d,"matchedTrackerIds":"%s"}' "$_trimmed" "$_t_count" "$(json_escape "$_t_ids")" >> "$_tmp_json"
    done

    printf '\n  ],\n  "summary": {\n    "totalScannedApps": %d,\n    "appsWithTrackers": %d,\n    "cleanApps": %d,\n    "totalTrackerDetections": %d\n  }\n}\n' \
        "$_total_apps" \
        "$_apps_with_trackers" \
        "$((_total_apps - _apps_with_trackers))" \
        "$_total_tracker_instances" >> "$_tmp_json"

    cp "$_tmp_json" "$_latest_file" 2>/dev/null || true
    mkdir -p "$(dirname "$_out_file")" 2>/dev/null || true
    if cp "$_tmp_json" "$_out_file" 2>/dev/null; then
        _saved_to="$_out_file"
    else
        _saved_to="$_latest_file"
    fi
    rm -f "$_tmp_json" 2>/dev/null || true

    printf '\nScanned: %d | With Trackers: %d | Total Detections: %d\nSaved JSON: %s\n' \
        "$_total_apps" "$_apps_with_trackers" "$_total_tracker_instances" "$_saved_to"
}

ACTION="$1"
shift 2>/dev/null || true

case "$ACTION" in
    --env-info)
        cmd_env_info
        ;;
    --list-packages)
        cmd_list_packages "${1:-user}"
        ;;
    --scan-batch)
        cmd_scan_batch "$@"
        ;;
    --save-config)
        if [ -n "$CONFIG_PAYLOAD" ]; then
            printf '%s\n' "$CONFIG_PAYLOAD" > "$CONFIG_FILE"
        fi
        printf '{"ok":true,"path":"%s"}\n' "$(json_escape "$CONFIG_FILE")"
        ;;
    --load-config)
        if [ -f "$CONFIG_FILE" ]; then
            cat "$CONFIG_FILE"
        else
            printf '{"ok":false}\n'
        fi
        ;;
    --save-report-init)
        _staging="$WORK_DIR/export_staging.json"
        : > "$_staging"
        if [ -n "$1" ]; then
            printf '%s' "$1" | base64 -d >> "$_staging" 2>/dev/null || printf '%s' "$1" >> "$_staging"
        elif [ -n "$REPORT_CHUNK" ]; then
            printf '%s' "$REPORT_CHUNK" >> "$_staging"
        fi
        printf '{"ok":true,"stage":"init"}\n'
        ;;
    --save-report-append)
        _staging="$WORK_DIR/export_staging.json"
        if [ -n "$1" ]; then
            printf '%s' "$1" | base64 -d >> "$_staging" 2>/dev/null || printf '%s' "$1" >> "$_staging"
        elif [ -n "$REPORT_CHUNK" ]; then
            printf '%s' "$REPORT_CHUNK" >> "$_staging"
        fi
        printf '{"ok":true,"stage":"append"}\n'
        ;;
    --save-report-commit)
        _target="${1:-$DEFAULT_EXPORT_PATH}"
        _staging="$WORK_DIR/export_staging.json"
        _latest="$REPORT_DIR/latest_scan.json"
        cp "$_staging" "$_latest" 2>/dev/null || true
        _primary_ok="false"
        _final_path="$_latest"
        mkdir -p "$(dirname "$_target")" 2>/dev/null || true
        if cp "$_staging" "$_target" 2>/dev/null; then
            _primary_ok="true"
            _final_path="$_target"
        fi
        _size=$(wc -c < "$_final_path" 2>/dev/null | tr -d ' ' || echo 0)
        _sha=$(sha256sum "$_final_path" 2>/dev/null | cut -d' ' -f1 || echo "ok")
        rm -f "$_staging" 2>/dev/null || true
        printf '{"ok":true,"primarySaved":%s,"path":"%s","backupPath":"%s","bytes":%s,"sha256":"%s"}\n' \
            "$_primary_ok" \
            "$(json_escape "$_final_path")" \
            "$(json_escape "$_latest")" \
            "${_size:-0}" \
            "$(json_escape "$_sha")"
        ;;
    --load-report)
        _target="${1:-$REPORT_DIR/latest_scan.json}"
        if [ -f "$_target" ]; then
            cat "$_target"
        elif [ -f "$REPORT_DIR/latest_scan.json" ]; then
            cat "$REPORT_DIR/latest_scan.json"
        else
            printf '{"ok":false,"error":"No saved JSON report found."}\n'
        fi
        ;;
    --cli-scan|*)
        cmd_cli_scan "$1"
        ;;
esac
