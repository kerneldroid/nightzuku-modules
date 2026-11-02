/**
 * Nightzuku Genuine Host Guard for Module WebUI (`nightzuku-guard.js`)
 *
 * Drop-in verification helper for Nightzuku ADB Module WebUIs.
 * Blocks execution and renders a clear unsupported-fork screen when a module
 * is opened inside an unofficial/broken fork (such as "Shizuku Next").
 *
 * Usage in `webui/index.html`:
 *   <script src="nightzuku-guard.js"></script>
 *   <script>
 *     NightzukuGuard.enforce({
 *       minApiVersion: 2,
 *       expectedSignerSha256: null // optional hex string
 *     });
 *   </script>
 */
(function (global) {
  'use strict';

  const REQUIRED_PKG = 'kerneldroid.nightzuku';
  const REQUIRED_DESCRIPTOR = 'kerneldroid.nightzuku.INightService';

  function verify(options) {
    const opts = options || {};
    const minApi = opts.minApiVersion || 2;
    const expectedSha = opts.expectedSignerSha256
      ? String(opts.expectedSignerSha256).toLowerCase().replace(/[:\s]/g, '')
      : null;

    const bridge = global.Nightzuku || global.Shizuku;
    if (!bridge || typeof bridge.getModuleInfo !== 'function') {
      return {
        ok: false,
        reason: 'Missing window.Nightzuku WebUI bridge.'
      };
    }

    if (typeof bridge.verifyHost !== 'function') {
      return {
        ok: false,
        reason: 'Host does not implement Nightzuku cryptographic host attestation (verifyHost).'
      };
    }

    try {
      const challenge = 'webui-' + Date.now() + '-' + Math.random().toString(36).slice(2);
      const rawAttest = bridge.verifyHost(challenge);
      const attest = JSON.parse(rawAttest);

      if (!attest || !attest.ok || attest.genuineNightzuku !== true) {
        return { ok: false, reason: 'Host failed genuineNightzuku attestation.' };
      }
      if (attest.hostPackage !== REQUIRED_PKG) {
        return {
          ok: false,
          reason: 'Invalid host package: ' + attest.hostPackage + ' (expected ' + REQUIRED_PKG + ').'
        };
      }
      if (attest.binderDescriptor !== REQUIRED_DESCRIPTOR) {
        return {
          ok: false,
          reason: 'Missing native Nightzuku dual-wire binder descriptor.'
        };
      }
      if ((attest.modulesApiVersion || 0) < minApi) {
        return {
          ok: false,
          reason: 'Nightzuku Modules API v' + minApi + '+ required (found v' + attest.modulesApiVersion + ').'
        };
      }
      if (!attest.attestationToken || String(attest.attestationToken).length < 64) {
        return {
          ok: false,
          reason: 'Invalid HMAC-SHA256 attestation token.'
        };
      }
      if (expectedSha) {
        const actualSha = String(attest.signerSha256 || '').toLowerCase().replace(/[:\s]/g, '');
        if (actualSha !== expectedSha) {
          return {
            ok: false,
            reason: 'APK signing certificate mismatch.'
          };
        }
      }

      return {
        ok: true,
        hostPackage: attest.hostPackage,
        hostVersion: attest.hostVersion,
        modulesApiVersion: attest.modulesApiVersion,
        signerSha256: attest.signerSha256
      };
    } catch (e) {
      return {
        ok: false,
        reason: 'Attestation exception: ' + (e && e.message ? e.message : String(e))
      };
    }
  }

  function enforce(options) {
    const res = verify(options);
    if (res.ok) return res;

    const renderBlock = function () {
      if (!document.body) return;
      document.body.innerHTML =
        '<div style="font-family:system-ui,-apple-system,sans-serif;padding:24px;max-width:520px;margin:40px auto;background:#2b1114;color:#ffdad6;border-radius:20px;border:1px solid #93000a;">' +
        '<h2 style="margin-top:0;color:#ffb4ab;">Unsupported Host Environment</h2>' +
        '<p style="line-height:1.5;">This module is built exclusively for <strong>Nightzuku</strong> (<code>kerneldroid.nightzuku</code>).</p>' +
        '<p style="line-height:1.5;font-family:monospace;background:#1a0a0c;padding:12px;border-radius:10px;">' +
        String(res.reason).replace(/</g, '&lt;') +
        '</p>' +
        '<p style="line-height:1.5;font-size:13px;opacity:0.85;">Unofficial forks (such as Shizuku Next) have an incomplete module implementation and are not supported. Please install official Nightzuku instead of reporting bugs to the module author.</p>' +
        '</div>';
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', renderBlock);
    } else {
      renderBlock();
    }
    throw new Error('[NightzukuGuard] ' + res.reason);
  }

  global.NightzukuGuard = {
    verify: verify,
    enforce: enforce
  };
})(window);
