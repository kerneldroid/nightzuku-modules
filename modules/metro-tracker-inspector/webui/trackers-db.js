/**
 * Metro Tracker Inspector - Deep Multi-Vector Tracker Signature Database
 * Author: kerneldroid [Official]
 *
 * Matches installed Android packages across four forensic code/manifest vectors:
 * 1. Manifest Components (Activities, Services, BroadcastReceivers, ContentProviders)
 * 2. Compiled DEX Bytecode Descriptors (classes*.dex package/class namespaces)
 * 3. Native Shared Libraries (lib/<abi>/lib*.so inside base and split APKs)
 * 4. Manifest SDK Metadata Keys (AndroidManifest.xml meta-data & authorities)
 */

export const TRACKER_SIGNATURES = [
  // --- ANALYTICS & TELEMETRY ---
  {
    id: 'firebase_analytics',
    name: 'Google Firebase Analytics',
    vendor: 'Google LLC',
    category: 'Analytics',
    severity: 'medium',
    patterns: [
      'google.firebase.analytics',
      'google.android.gms.measurement',
      'AppMeasurementReceiver',
      'AppMeasurementService',
      'AppMeasurementJobService',
      'FirebaseAnalytics'
    ],
    nativeLibs: ['libFirebaseCppAnalytics.so']
  },
  {
    id: 'google_analytics_gtm',
    name: 'Google Analytics & Tag Manager',
    vendor: 'Google LLC',
    category: 'Analytics',
    severity: 'medium',
    patterns: [
      'google.android.gms.analytics',
      'google.android.gms.tagmanager',
      'CampaignTrackingReceiver',
      'CampaignTrackingService'
    ],
    nativeLibs: []
  },
  {
    id: 'meta_analytics',
    name: 'Meta / Facebook App Events',
    vendor: 'Meta Platforms, Inc.',
    category: 'Analytics',
    severity: 'high',
    patterns: [
      'facebook.appevents',
      'facebook.internal.FacebookInitProvider',
      'facebook.CurrentAccessTokenExpirationBroadcastReceiver',
      'com.facebook.sdk.ApplicationId',
      'com.facebook.sdk.ClientToken'
    ],
    nativeLibs: []
  },
  {
    id: 'amplitude',
    name: 'Amplitude Analytics',
    vendor: 'Amplitude Inc.',
    category: 'Analytics',
    severity: 'medium',
    patterns: ['amplitude.api', 'com.amplitude.android'],
    nativeLibs: []
  },
  {
    id: 'mixpanel',
    name: 'Mixpanel Behavioral Analytics',
    vendor: 'Mixpanel Inc.',
    category: 'Analytics',
    severity: 'medium',
    patterns: ['mixpanel.android'],
    nativeLibs: []
  },
  {
    id: 'segment',
    name: 'Twilio Segment Analytics',
    vendor: 'Twilio Inc.',
    category: 'Analytics',
    severity: 'medium',
    patterns: ['segment.analytics'],
    nativeLibs: []
  },
  {
    id: 'posthog',
    name: 'PostHog Product Analytics',
    vendor: 'PostHog Inc.',
    category: 'Analytics',
    severity: 'low',
    patterns: ['com.posthog', 'posthog.android'],
    nativeLibs: []
  },
  {
    id: 'snowplow',
    name: 'Snowplow Event Tracker',
    vendor: 'Snowplow Analytics',
    category: 'Analytics',
    severity: 'medium',
    patterns: ['snowplowanalytics'],
    nativeLibs: []
  },
  {
    id: 'flurry',
    name: 'Yahoo Flurry Analytics',
    vendor: 'Yahoo Inc.',
    category: 'Analytics',
    severity: 'medium',
    patterns: ['flurry.android'],
    nativeLibs: ['libflurry.so']
  },
  {
    id: 'yandex_appmetrica',
    name: 'Yandex AppMetrica',
    vendor: 'Yandex',
    category: 'Analytics',
    severity: 'high',
    patterns: [
      'yandex.metrica',
      'io.appmetrica.analytics',
      'yandex.metrica.api_key',
      'MetricaService'
    ],
    nativeLibs: ['libappmetrica_service_native.so', 'libappmetrica_native.so']
  },
  {
    id: 'vk_mytracker',
    name: 'VK Tracker / MyTracker',
    vendor: 'VK',
    category: 'Analytics',
    severity: 'high',
    patterns: ['vk.tracker', 'my.tracker'],
    nativeLibs: ['libmytracker.so']
  },
  {
    id: 'huawei_hianalytics',
    name: 'Huawei HMS HiAnalytics',
    vendor: 'Huawei Technologies',
    category: 'Analytics',
    severity: 'high',
    patterns: [
      'huawei.hms.analytics',
      'huawei.agconnect.core.provider.AGConnectInitializeProvider'
    ],
    nativeLibs: ['libhmsanalytics.so']
  },
  {
    id: 'umeng_analytics',
    name: 'Umeng+ Mobile Analytics',
    vendor: 'Alibaba / Umeng',
    category: 'Analytics',
    severity: 'high',
    patterns: ['umeng.analytics', 'umeng.commonsdk', 'umeng.message'],
    nativeLibs: ['libumeng-spy.so']
  },
  {
    id: 'sensors_data',
    name: 'Sensors Data Analytics',
    vendor: 'Sensors Data',
    category: 'Analytics',
    severity: 'medium',
    patterns: ['sensorsdata.analytics'],
    nativeLibs: []
  },
  {
    id: 'growingio',
    name: 'GrowingIO Tracker',
    vendor: 'GrowingIO',
    category: 'Analytics',
    severity: 'medium',
    patterns: ['growingio.android', 'com.growingio'],
    nativeLibs: []
  },
  {
    id: 'heap_analytics',
    name: 'Heap Auto-Capture Analytics',
    vendor: 'Heap Inc.',
    category: 'Analytics',
    severity: 'medium',
    patterns: ['com.heapanalytics', 'io.heap.core'],
    nativeLibs: []
  },

  // --- ATTRIBUTION & DEEP LINK TRACKING ---
  {
    id: 'appsflyer',
    name: 'AppsFlyer Attribution',
    vendor: 'AppsFlyer Ltd.',
    category: 'Attribution',
    severity: 'high',
    patterns: [
      'com.appsflyer',
      'appsflyer.SingleInstallBroadcastReceiver',
      'AppsFlyerLib',
      'AppsFlyerKey'
    ],
    nativeLibs: []
  },
  {
    id: 'adjust',
    name: 'Adjust Mobile Attribution',
    vendor: 'Adjust GmbH',
    category: 'Attribution',
    severity: 'high',
    patterns: [
      'adjust.sdk',
      'AdjustReferrerReceiver',
      'com.adjust.sdk'
    ],
    nativeLibs: []
  },
  {
    id: 'branch_io',
    name: 'Branch Deep Link & Attribution',
    vendor: 'Branch Metrics Inc.',
    category: 'Attribution',
    severity: 'high',
    patterns: [
      'io.branch.referral',
      'io.branch.sdk.BranchKey',
      'InstallListener'
    ],
    nativeLibs: []
  },
  {
    id: 'kochava',
    name: 'Kochava Attribution Tracker',
    vendor: 'Kochava Inc.',
    category: 'Attribution',
    severity: 'high',
    patterns: ['kochava.base', 'kochava.tracker', 'com.kochava'],
    nativeLibs: []
  },
  {
    id: 'singular',
    name: 'Singular Attribution & ROI',
    vendor: 'Singular Labs Inc.',
    category: 'Attribution',
    severity: 'high',
    patterns: ['singular.sdk'],
    nativeLibs: []
  },

  // --- ADVERTISING & MONETIZATION NETWORKS ---
  {
    id: 'google_admob',
    name: 'Google AdMob & Ad Manager',
    vendor: 'Google LLC',
    category: 'Advertising',
    severity: 'high',
    patterns: [
      'google.android.gms.ads',
      'com.google.android.gms.ads.APPLICATION_ID',
      'AdActivity',
      'MobileAdsInitProvider'
    ],
    nativeLibs: []
  },
  {
    id: 'meta_audience_network',
    name: 'Meta Audience Network',
    vendor: 'Meta Platforms, Inc.',
    category: 'Advertising',
    severity: 'high',
    patterns: [
      'facebook.ads',
      'AudienceNetworkActivity',
      'AudienceNetworkContentProvider'
    ],
    nativeLibs: []
  },
  {
    id: 'applovin_max',
    name: 'AppLovin MAX & Ad SDK',
    vendor: 'AppLovin Corp.',
    category: 'Advertising',
    severity: 'high',
    patterns: [
      'applovin.sdk',
      'applovin.mediation',
      'applovin.adview',
      'applovin.sdk.key'
    ],
    nativeLibs: ['libapplovin-native-crash-reporter.so']
  },
  {
    id: 'unity_ads',
    name: 'Unity Ads & LevelPlay',
    vendor: 'Unity Technologies',
    category: 'Advertising',
    severity: 'high',
    patterns: ['unity3d.ads', 'unity3d.services.ads'],
    nativeLibs: ['libunityads.so']
  },
  {
    id: 'ironsource',
    name: 'ironSource Ad Mediation',
    vendor: 'Unity / ironSource',
    category: 'Advertising',
    severity: 'high',
    patterns: ['ironsource.mediationsdk', 'ironsource.sdk'],
    nativeLibs: []
  },
  {
    id: 'vungle_liftoff',
    name: 'Liftoff / Vungle Ads',
    vendor: 'Liftoff Mobile',
    category: 'Advertising',
    severity: 'high',
    patterns: ['vungle.warren', 'com.vungle.ads', 'liftoff'],
    nativeLibs: []
  },
  {
    id: 'pangle_bytedance',
    name: 'ByteDance Pangle / OpenAdSDK',
    vendor: 'ByteDance Ltd.',
    category: 'Advertising',
    severity: 'high',
    patterns: ['bytedance.sdk.openadsdk', 'com.pangle.global'],
    nativeLibs: ['libpangle.so', 'libmetasec_ml.so', 'libByteVc1_dec.so']
  },
  {
    id: 'chartboost',
    name: 'Chartboost Ad Network',
    vendor: 'Chartboost Inc.',
    category: 'Advertising',
    severity: 'high',
    patterns: ['chartboost.sdk'],
    nativeLibs: []
  },
  {
    id: 'inmobi',
    name: 'InMobi Advertising SDK',
    vendor: 'InMobi Pte Ltd.',
    category: 'Advertising',
    severity: 'high',
    patterns: ['inmobi.sdk', 'inmobi.ads', 'inmobi.media'],
    nativeLibs: []
  },
  {
    id: 'mintegral',
    name: 'Mintegral Ad SDK',
    vendor: 'Mobvista / Mintegral',
    category: 'Advertising',
    severity: 'high',
    patterns: ['mintegral.msdk', 'mbbridge.msdk'],
    nativeLibs: []
  },
  {
    id: 'criteo',
    name: 'Criteo Direct Bidder SDK',
    vendor: 'Criteo SA',
    category: 'Advertising',
    severity: 'high',
    patterns: ['criteo.publisher'],
    nativeLibs: []
  },
  {
    id: 'amazon_ads',
    name: 'Amazon Publisher Services (APS)',
    vendor: 'Amazon.com Inc.',
    category: 'Advertising',
    severity: 'medium',
    patterns: ['amazon.device.ads'],
    nativeLibs: []
  },
  {
    id: 'yandex_ads',
    name: 'Yandex Mobile Ads Network',
    vendor: 'Yandex',
    category: 'Advertising',
    severity: 'high',
    patterns: ['yandex.mobile.ads'],
    nativeLibs: []
  },
  {
    id: 'huawei_ads',
    name: 'Huawei Petal Ads (OpenAlliance)',
    vendor: 'Huawei Technologies',
    category: 'Advertising',
    severity: 'high',
    patterns: ['huawei.hms.ads', 'huawei.openalliance.ad'],
    nativeLibs: []
  },
  {
    id: 'start_io',
    name: 'Start.io (StartApp) Ad & Location SDK',
    vendor: 'Start.io Inc.',
    category: 'Advertising',
    severity: 'high',
    patterns: ['startapp.sdk', 'startapp.android'],
    nativeLibs: []
  },
  {
    id: 'ogury',
    name: 'Ogury Choice & Ad Engine',
    vendor: 'Ogury Ltd.',
    category: 'Advertising',
    severity: 'high',
    patterns: ['com.ogury', 'io.presage'],
    nativeLibs: []
  },
  {
    id: 'tapjoy',
    name: 'Tapjoy Offerwall & Ads',
    vendor: 'Unity / Tapjoy',
    category: 'Advertising',
    severity: 'high',
    patterns: ['com.tapjoy'],
    nativeLibs: []
  },
  {
    id: 'fyber',
    name: 'Digital Turbine / Fyber Marketplace',
    vendor: 'Digital Turbine Inc.',
    category: 'Advertising',
    severity: 'high',
    patterns: ['com.fyber', 'inneractive.sdk'],
    nativeLibs: []
  },

  // --- CRASH REPORTING, APM & DIAGNOSTIC TELEMETRY ---
  {
    id: 'firebase_crashlytics',
    name: 'Google Firebase Crashlytics',
    vendor: 'Google LLC',
    category: 'Crash & Telemetry',
    severity: 'low',
    patterns: ['google.firebase.crashlytics', 'CrashlyticsRegistrar'],
    nativeLibs: ['libcrashlytics.so', 'libcrashlytics-trampoline.so', 'libcrashlytics-handler.so']
  },
  {
    id: 'firebase_perf',
    name: 'Google Firebase Performance APM',
    vendor: 'Google LLC',
    category: 'Crash & Telemetry',
    severity: 'low',
    patterns: ['google.firebase.perf', 'FirebasePerfProvider'],
    nativeLibs: []
  },
  {
    id: 'sentry',
    name: 'Sentry Error & Performance Telemetry',
    vendor: 'Functional Software (Sentry)',
    category: 'Crash & Telemetry',
    severity: 'low',
    patterns: ['io.sentry.android', 'io.sentry.dsn', 'SentryInitProvider'],
    nativeLibs: ['libsentry.so', 'libsentry-android.so']
  },
  {
    id: 'bugsnag',
    name: 'Bugsnag Stability Monitoring',
    vendor: 'SmartBear / Bugsnag',
    category: 'Crash & Telemetry',
    severity: 'low',
    patterns: ['bugsnag.android', 'com.bugsnag.android.API_KEY'],
    nativeLibs: ['libbugsnag-ndk.so', 'libbugsnag-plugin-android-anr.so']
  },
  {
    id: 'datadog',
    name: 'Datadog RUM & Mobile Telemetry',
    vendor: 'Datadog Inc.',
    category: 'Crash & Telemetry',
    severity: 'medium',
    patterns: ['datadog.android'],
    nativeLibs: ['libdatadog-native.so']
  },
  {
    id: 'new_relic',
    name: 'New Relic Mobile APM',
    vendor: 'New Relic Inc.',
    category: 'Crash & Telemetry',
    severity: 'medium',
    patterns: ['newrelic.agent.android'],
    nativeLibs: []
  },
  {
    id: 'instabug',
    name: 'Instabug Telemetry & Crash Diagnostics',
    vendor: 'Instabug Inc.',
    category: 'Crash & Telemetry',
    severity: 'medium',
    patterns: ['instabug.library', 'com.instabug'],
    nativeLibs: ['libinstabug.so']
  },
  {
    id: 'embrace',
    name: 'Embrace Mobile Telemetry',
    vendor: 'Embrace.io',
    category: 'Crash & Telemetry',
    severity: 'medium',
    patterns: ['embrace.android', 'io.embrace'],
    nativeLibs: ['libembrace-native.so']
  },
  {
    id: 'dynatrace',
    name: 'Dynatrace OneAgent Mobile',
    vendor: 'Dynatrace LLC',
    category: 'Crash & Telemetry',
    severity: 'medium',
    patterns: ['com.dynatrace.android'],
    nativeLibs: []
  },
  {
    id: 'tencent_bugly',
    name: 'Tencent Bugly Crash & Upgrade SDK',
    vendor: 'Tencent Holdings',
    category: 'Crash & Telemetry',
    severity: 'medium',
    patterns: ['tencent.bugly', 'tencent.stat', 'tencent.smtt'],
    nativeLibs: ['libBugly.so', 'libbugly.so', 'libBugly_Native.so']
  },

  // --- PUSH PROFILING & CUSTOMER ENGAGEMENT ---
  {
    id: 'onesignal',
    name: 'OneSignal Push & User Graph',
    vendor: 'OneSignal Inc.',
    category: 'Push & Engagement',
    severity: 'medium',
    patterns: ['com.onesignal', 'onesignal.NotificationOpenedReceiver'],
    nativeLibs: []
  },
  {
    id: 'braze',
    name: 'Braze (Appboy) Customer Engagement',
    vendor: 'Braze Inc.',
    category: 'Push & Engagement',
    severity: 'medium',
    patterns: ['com.braze', 'com.appboy', 'com.braze.api_key'],
    nativeLibs: []
  },
  {
    id: 'clevertap',
    name: 'CleverTap Behavioral Segmentation',
    vendor: 'CleverTap Inc.',
    category: 'Push & Engagement',
    severity: 'medium',
    patterns: ['clevertap.android', 'CLEVERTAP_ACCOUNT_ID'],
    nativeLibs: []
  },
  {
    id: 'leanplum',
    name: 'Leanplum (CleverTap) Engagement',
    vendor: 'CleverTap / Leanplum',
    category: 'Push & Engagement',
    severity: 'medium',
    patterns: ['com.leanplum'],
    nativeLibs: []
  },
  {
    id: 'airship',
    name: 'Airship (Urban Airship) Engagement',
    vendor: 'Airship Inc.',
    category: 'Push & Engagement',
    severity: 'medium',
    patterns: ['urbanairship', 'com.airship'],
    nativeLibs: []
  },
  {
    id: 'moengage',
    name: 'MoEngage Customer Analytics',
    vendor: 'MoEngage Inc.',
    category: 'Push & Engagement',
    severity: 'medium',
    patterns: ['com.moengage', 'moengage.core'],
    nativeLibs: []
  },
  {
    id: 'webengage',
    name: 'WebEngage User Retention SDK',
    vendor: 'WebEngage',
    category: 'Push & Engagement',
    severity: 'medium',
    patterns: ['com.webengage', 'webengage.sdk'],
    nativeLibs: []
  },
  {
    id: 'xiaomi_mipush',
    name: 'Xiaomi MiPush & System Telemetry',
    vendor: 'Xiaomi Inc.',
    category: 'Push & Engagement',
    severity: 'medium',
    patterns: ['xiaomi.mipush.sdk', 'xiaomi.push.service'],
    nativeLibs: []
  },
  {
    id: 'jpush_jiguang',
    name: 'Aurora JPush (Jiguang) Telemetry',
    vendor: 'Aurora Mobile (Jiguang)',
    category: 'Push & Engagement',
    severity: 'high',
    patterns: ['cn.jpush.android', 'cn.jiguang'],
    nativeLibs: ['libjcore.so', 'libcnpush.so']
  },

  // --- SESSION REPLAY & SCREEN RECORDING ---
  {
    id: 'uxcam',
    name: 'UXCam Session Replay & Heatmaps',
    vendor: 'UXCam Inc.',
    category: 'Session Replay',
    severity: 'high',
    patterns: ['com.uxcam'],
    nativeLibs: ['libuxcam.so']
  },
  {
    id: 'smartlook',
    name: 'Smartlook Qualitative Screen Recorder',
    vendor: 'Smartlook / Cisco',
    category: 'Session Replay',
    severity: 'high',
    patterns: ['smartlook.sdk', 'com.smartlook'],
    nativeLibs: ['libsmartlook.so']
  },
  {
    id: 'fullstory',
    name: 'FullStory Digital Experience Capture',
    vendor: 'FullStory Inc.',
    category: 'Session Replay',
    severity: 'high',
    patterns: ['com.fullstory'],
    nativeLibs: []
  }
];

export const TRACKING_PERMISSION_DEFINITIONS = {
  'com.google.android.gms.permission.AD_ID': {
    shortName: 'Advertising ID (GMS)',
    riskWeight: 18,
    description: 'Allows cross-app user profiling via Google Advertising ID.'
  },
  'android.permission.ACCESS_ADSERVICES_AD_ID': {
    shortName: 'Privacy Sandbox Ad ID',
    riskWeight: 16,
    description: 'Accesses Android AdServices Advertising ID.'
  },
  'android.permission.ACCESS_ADSERVICES_ATTRIBUTION': {
    shortName: 'Ad Attribution API',
    riskWeight: 14,
    description: 'Tracks ad conversion and campaign attribution events.'
  },
  'android.permission.ACCESS_ADSERVICES_TOPICS': {
    shortName: 'Ad Topics Interest API',
    riskWeight: 12,
    description: 'Reads behavioral interest topics for targeted advertising.'
  },
  'android.permission.ACCESS_BACKGROUND_LOCATION': {
    shortName: 'Background Location',
    riskWeight: 22,
    description: 'Continuously tracks physical location even when app is closed.'
  },
  'android.permission.ACCESS_FINE_LOCATION': {
    shortName: 'Precise GPS Location',
    riskWeight: 14,
    description: 'Reads exact GPS coordinates and nearby location beacons.'
  },
  'android.permission.ACCESS_COARSE_LOCATION': {
    shortName: 'Approximate Location',
    riskWeight: 8,
    description: 'Estimates user location from cell towers and Wi-Fi.'
  },
  'android.permission.READ_PHONE_STATE': {
    shortName: 'Device & SIM Identity',
    riskWeight: 14,
    description: 'Accesses cellular network, SIM operator, and device identifiers.'
  },
  'android.permission.ACTIVITY_RECOGNITION': {
    shortName: 'Physical Activity Sensors',
    riskWeight: 10,
    description: 'Detects walking, driving, and motion telemetry.'
  },
  'android.permission.BLUETOOTH_SCAN': {
    shortName: 'Bluetooth Beacon Scan',
    riskWeight: 10,
    description: 'Scans nearby Bluetooth devices and retail proximity beacons.'
  },
  'android.permission.NEARBY_WIFI_DEVICES': {
    shortName: 'Wi-Fi Topology Scan',
    riskWeight: 8,
    description: 'Enumerates nearby Wi-Fi BSSIDs for indoor positioning.'
  },
  'android.permission.GET_ACCOUNTS': {
    shortName: 'Device Account List',
    riskWeight: 10,
    description: 'Enumerates accounts registered on the device.'
  },
  'android.permission.PACKAGE_USAGE_STATS': {
    shortName: 'App Usage History',
    riskWeight: 16,
    description: 'Monitors which other applications are launched and used.'
  }
};

/**
 * Performs deep multi-vector forensic matching on raw package scan output.
 */
export function analyzePackageForensics(rawPkg) {
  const splitPipe = (str) =>
    String(str || '')
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean);

  const components = splitPipe(rawPkg.components);
  const dexSignatures = splitPipe(rawPkg.dexSignatures);
  const nativeLibs = splitPipe(rawPkg.nativeLibs);
  const metaKeys = splitPipe(rawPkg.metaKeys);
  const permissions = splitPipe(rawPkg.permissions);

  const allEvidenceTokens = [
    ...components.map((v) => ({ type: 'COMPONENT', value: v })),
    ...dexSignatures.map((v) => ({ type: 'DEX_BYTECODE', value: v })),
    ...nativeLibs.map((v) => ({ type: 'NATIVE_SO', value: v })),
    ...metaKeys.map((v) => ({ type: 'MANIFEST_META', value: v }))
  ];

  const matchedTrackers = [];

  for (const sig of TRACKER_SIGNATURES) {
    const matchedVectors = new Set();
    const matchedArtifacts = [];

    for (const ev of allEvidenceTokens) {
      const lowerVal = ev.value.toLowerCase();

      if (ev.type === 'NATIVE_SO') {
        for (const lib of sig.nativeLibs || []) {
          if (lowerVal === lib.toLowerCase() || lowerVal.includes(lib.toLowerCase().replace('.so', ''))) {
            matchedVectors.add('NATIVE_SO');
            matchedArtifacts.push(`lib/${ev.value}`);
          }
        }
      }

      for (const pat of sig.patterns) {
        if (lowerVal.includes(pat.toLowerCase())) {
          matchedVectors.add(ev.type);
          matchedArtifacts.push(`${ev.type}: ${ev.value}`);
        }
      }
    }

    if (matchedVectors.size > 0) {
      matchedTrackers.push({
        id: sig.id,
        name: sig.name,
        vendor: sig.vendor,
        category: sig.category,
        severity: sig.severity,
        vectors: Array.from(matchedVectors),
        evidence: Array.from(new Set(matchedArtifacts)).slice(0, 8)
      });
    }
  }

  // Deep heuristic fallback: catch unlisted custom/regional tracker namespaces in DEX or Components
  const matchedArtifactStrings = new Set(
    matchedTrackers.flatMap((t) => t.evidence.map((e) => e.toLowerCase()))
  );
  const heuristicNamespaces = new Set();
  for (const token of [...components, ...dexSignatures]) {
    const lower = token.toLowerCase();
    const alreadyCovered = Array.from(matchedArtifactStrings).some((m) => m.includes(lower));
    if (alreadyCovered) continue;
    if (
      /(oaidsdk|msaoaid|adtracker|trackersdk|admediation|openadsdk|mobads|gdt_plugin|talkingdata|baidumobstat|kochava|adjust|appsflyer)/i.test(
        lower
      )
    ) {
      const prefix = token.split('.').slice(0, 3).join('.');
      heuristicNamespaces.add(prefix);
    }
  }

  for (const ns of heuristicNamespaces) {
    matchedTrackers.push({
      id: `heuristic_${ns.replace(/[^a-z0-9]/gi, '_')}`,
      name: `Heuristic SDK (${ns})`,
      vendor: 'Heuristic Deep Bytecode Match',
      category: 'Analytics',
      severity: 'medium',
      vectors: ['HEURISTIC_DEX'],
      evidence: [`NAMESPACE: ${ns}`]
    });
  }

  // Compute composite privacy risk score (0 - 100)
  let riskScore = 0;
  for (const t of matchedTrackers) {
    if (t.severity === 'high') riskScore += 14;
    else if (t.severity === 'medium') riskScore += 9;
    else riskScore += 5;
    if (t.vectors.includes('DEX_BYTECODE') && t.vectors.includes('COMPONENT')) {
      riskScore += 3;
    }
    if (t.vectors.includes('NATIVE_SO')) {
      riskScore += 4;
    }
  }

  const detailedPermissions = permissions.map((perm) => {
    const info = TRACKING_PERMISSION_DEFINITIONS[perm] || {
      shortName: perm.split('.').pop(),
      riskWeight: 5,
      description: 'Declared telemetry or device state permission.'
    };
    riskScore += Math.round(info.riskWeight * 0.45);
    return {
      permission: perm,
      shortName: info.shortName,
      riskWeight: info.riskWeight,
      description: info.description
    };
  });

  riskScore = Math.min(100, riskScore);

  let riskLevel = 'CLEAN';
  if (matchedTrackers.length >= 6 || riskScore >= 65) riskLevel = 'CRITICAL';
  else if (matchedTrackers.length >= 3 || riskScore >= 35) riskLevel = 'HIGH';
  else if (matchedTrackers.length >= 1 || riskScore >= 15) riskLevel = 'MODERATE';

  const shortName = String(rawPkg.package || '')
    .split('.')
    .slice(-2)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');

  return {
    package: rawPkg.package,
    displayName: shortName || rawPkg.package,
    versionName: rawPkg.versionName || '1.0',
    versionCode: rawPkg.versionCode || '1',
    uid: rawPkg.uid || '0',
    isSystem: Boolean(rawPkg.isSystem),
    apkCount: Number(rawPkg.apkCount || 1),
    firstInstall: rawPkg.firstInstall || '',
    lastUpdate: rawPkg.lastUpdate || '',
    trackerCount: matchedTrackers.length,
    riskScore,
    riskLevel,
    trackers: matchedTrackers,
    permissions: detailedPermissions,
    rawVectors: {
      componentCount: components.length,
      dexSignatureCount: dexSignatures.length,
      nativeLibCount: nativeLibs.length,
      metaKeyCount: metaKeys.length,
      permissionCount: permissions.length
    }
  };
}
