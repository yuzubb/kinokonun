//=============================================================================
// MobileEnhancements2.js
//=============================================================================

/*:
 * @plugindesc スマホプレイ向けの追加機能パート2です。
 * スリープ防止・左右反転・文字拡大・明るさ補正・オフライン通知・
 * ホーム画面追加の案内に対応します。
 * @author Claude
 *
 * @help
 * オプション画面の以下の項目と連動します（CustomizeConfigItemで追加）。
 *   ・画面スリープ防止
 *   ・左右反転(左利き設定)
 *   ・文字を大きく表示
 *   ・画面の明るさ補正（数値項目）
 *
 * プラグインコマンドはありません。
 */

(function() {
    'use strict';

    function boolOption(n, defaultValue) {
        var key = 'Boolean' + n;
        if (typeof ConfigManager === 'undefined' || ConfigManager[key] === undefined) {
            return defaultValue;
        }
        return ConfigManager[key];
    }

    function numberOption(n, defaultValue) {
        var key = 'Number' + n;
        if (typeof ConfigManager === 'undefined' || ConfigManager[key] === undefined) {
            return defaultValue;
        }
        return ConfigManager[key];
    }

    //=========================================================================
    // A. 画面スリープ防止 (Screen Wake Lock API)
    //    オプション「画面スリープ防止」がONの間、画面が自動で暗くなるのを防ぐ。
    //=========================================================================
    var wakeLock = null;

    function requestWakeLock() {
        if (!('wakeLock' in navigator)) return;
        navigator.wakeLock.request('screen').then(function(lock) {
            wakeLock = lock;
        }).catch(function() { /* 端末が対応していない・許可されない場合は無視 */ });
    }

    function releaseWakeLock() {
        if (wakeLock) {
            wakeLock.release().catch(function() {});
            wakeLock = null;
        }
    }

    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible' && boolOption(3, true) && !wakeLock) {
            requestWakeLock();
        }
    });

    setInterval(function() {
        var wantWakeLock = boolOption(3, true);
        if (wantWakeLock && !wakeLock) {
            requestWakeLock();
        } else if (!wantWakeLock && wakeLock) {
            releaseWakeLock();
        }
    }, 2000);

    //=========================================================================
    // B. 左右反転モード（左利き設定）
    //    タッチコントロールの十字キーとOK/メニューの左右を入れ替える。
    //=========================================================================
    var mirrorStyle = document.createElement('style');
    mirrorStyle.textContent = [
        '.tc-mirrored #tc-dpad {',
        '    left: auto;',
        '    right: 6vw;',
        '}',
        '.tc-mirrored #tc-actions {',
        '    right: auto;',
        '    left: 6vw;',
        '}',
        '.tc-mirrored #tc-ok {',
        '    right: auto;',
        '    left: 0;',
        '}',
        '.tc-mirrored #tc-cancel {',
        '    left: auto;',
        '    right: 0;',
        '}'
    ].join('\n');
    document.head.appendChild(mirrorStyle);

    setInterval(function() {
        var root = document.getElementById('touch-controls');
        if (!root) return;
        var mirrored = boolOption(4, false);
        root.classList.toggle('tc-mirrored', mirrored);
    }, 500);

    //=========================================================================
    // C. 文字を大きく表示
    //=========================================================================
    var _Window_Base_standardFontSize = Window_Base.prototype.standardFontSize;
    Window_Base.prototype.standardFontSize = function() {
        var base = _Window_Base_standardFontSize.call(this);
        return boolOption(5, false) ? base + 6 : base;
    };

    //=========================================================================
    // D. 画面の明るさ補正（ゲーム画面にCSSフィルターをかける）
    //=========================================================================
    setInterval(function() {
        var canvas = document.getElementById('GameCanvas');
        if (!canvas) return;
        var level = numberOption(1, 0); // -2 ～ +2
        var brightness = 1 + (level * 0.15);
        canvas.style.filter = 'brightness(' + brightness + ')';
    }, 500);

    //=========================================================================
    // E. オフライン通知バナー
    //=========================================================================
    var offlineBanner = document.createElement('div');
    offlineBanner.id = 'offline-banner';
    offlineBanner.textContent = '\u30AA\u30D5\u30E9\u30A4\u30F3\u3067\u3059\uFF08\u901A\u4FE1\u304C\u5FA9\u65E7\u3059\u308B\u307E\u3067\u4E00\u90E8\u6A5F\u80FD\u304C\u4F7F\u3048\u306A\u3044\u5834\u5408\u304C\u3042\u308A\u307E\u3059\uFF09';
    offlineBanner.style.position = 'fixed';
    offlineBanner.style.top = '0';
    offlineBanner.style.left = '0';
    offlineBanner.style.right = '0';
    offlineBanner.style.padding = '6px 10px';
    offlineBanner.style.background = 'rgba(180, 40, 40, 0.9)';
    offlineBanner.style.color = '#fff';
    offlineBanner.style.fontFamily = 'sans-serif';
    offlineBanner.style.fontSize = '12px';
    offlineBanner.style.textAlign = 'center';
    offlineBanner.style.zIndex = '999';
    offlineBanner.style.display = 'none';

    function updateOfflineBanner() {
        offlineBanner.style.display = navigator.onLine === false ? 'block' : 'none';
    }
    window.addEventListener('online', updateOfflineBanner);
    window.addEventListener('offline', updateOfflineBanner);

    //=========================================================================
    // F. ホーム画面に追加の案内バナー（初回のみ、閉じたら二度と出さない）
    //=========================================================================
    var A2HS_DISMISSED_KEY = 'kinokonun_a2hs_dismissed';

    function isStandalone() {
        return window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone === true;
    }

    var deferredInstallPrompt = null;
    window.addEventListener('beforeinstallprompt', function(event) {
        event.preventDefault();
        deferredInstallPrompt = event;
    });

    var a2hsBanner = document.createElement('div');
    a2hsBanner.id = 'a2hs-banner';
    a2hsBanner.style.position = 'fixed';
    a2hsBanner.style.left = '10px';
    a2hsBanner.style.right = '10px';
    a2hsBanner.style.bottom = 'calc(env(safe-area-inset-bottom, 0px) + 10px)';
    a2hsBanner.style.padding = '10px 12px';
    a2hsBanner.style.background = 'rgba(20, 20, 20, 0.92)';
    a2hsBanner.style.border = '1px solid rgba(255, 255, 255, 0.35)';
    a2hsBanner.style.borderRadius = '10px';
    a2hsBanner.style.color = '#fff';
    a2hsBanner.style.fontFamily = 'sans-serif';
    a2hsBanner.style.fontSize = '12px';
    a2hsBanner.style.zIndex = '999';
    a2hsBanner.style.display = 'none';

    var isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    var a2hsText = document.createElement('div');
    a2hsText.style.marginBottom = '8px';
    a2hsText.textContent = isIOS ?
        '\u5171\u6709\u30DC\u30BF\u30F3 \u2192 \u300C\u30DB\u30FC\u30E0\u753B\u9762\u306B\u8FFD\u52A0\u300D\u3067\u3001\u30A2\u30D7\u30EA\u306E\u3088\u3046\u306B\u4F7F\u3048\u307E\u3059\u3002' :
        '\u30DB\u30FC\u30E0\u753B\u9762\u306B\u8FFD\u52A0\u3059\u308B\u3068\u3001\u30A2\u30D7\u30EA\u306E\u3088\u3046\u306B\u4F7F\u3048\u307E\u3059\u3002';

    var a2hsButtonRow = document.createElement('div');
    a2hsButtonRow.style.display = 'flex';
    a2hsButtonRow.style.gap = '8px';
    a2hsButtonRow.style.justifyContent = 'flex-end';

    var a2hsInstallBtn = document.createElement('div');
    a2hsInstallBtn.textContent = '\u8FFD\u52A0\u3059\u308B';
    a2hsInstallBtn.style.padding = '5px 10px';
    a2hsInstallBtn.style.background = 'rgba(120, 200, 255, 0.3)';
    a2hsInstallBtn.style.border = '1px solid rgba(255, 255, 255, 0.5)';
    a2hsInstallBtn.style.borderRadius = '6px';

    var a2hsCloseBtn = document.createElement('div');
    a2hsCloseBtn.textContent = '\u9589\u3058\u308B';
    a2hsCloseBtn.style.padding = '5px 10px';
    a2hsCloseBtn.style.background = 'rgba(255, 255, 255, 0.12)';
    a2hsCloseBtn.style.border = '1px solid rgba(255, 255, 255, 0.35)';
    a2hsCloseBtn.style.borderRadius = '6px';

    function dismissA2hsBanner() {
        a2hsBanner.style.display = 'none';
        try { localStorage.setItem(A2HS_DISMISSED_KEY, '1'); } catch (e) { /* noop */ }
    }

    a2hsCloseBtn.addEventListener('pointerup', function(event) {
        event.preventDefault();
        dismissA2hsBanner();
    });

    a2hsInstallBtn.addEventListener('pointerup', function(event) {
        event.preventDefault();
        if (deferredInstallPrompt) {
            deferredInstallPrompt.prompt();
            deferredInstallPrompt.userChoice.finally(dismissA2hsBanner);
        } else {
            // iOSなどbeforeinstallpromptが無い場合はテキスト説明のままにする
            dismissA2hsBanner();
        }
    });

    if (!isIOS) {
        a2hsButtonRow.appendChild(a2hsInstallBtn);
    }
    a2hsButtonRow.appendChild(a2hsCloseBtn);
    a2hsBanner.appendChild(a2hsText);
    a2hsBanner.appendChild(a2hsButtonRow);

    function maybeShowA2hsBanner() {
        var dismissed = false;
        try { dismissed = localStorage.getItem(A2HS_DISMISSED_KEY) === '1'; } catch (e) { /* noop */ }
        if (!dismissed && !isStandalone()) {
            a2hsBanner.style.display = 'block';
        }
    }

    function attachExtras() {
        document.body.appendChild(offlineBanner);
        document.body.appendChild(a2hsBanner);
        updateOfflineBanner();
        setTimeout(maybeShowA2hsBanner, 3000);
    }
    if (document.body) {
        attachExtras();
    } else {
        document.addEventListener('DOMContentLoaded', attachExtras);
    }

})();
