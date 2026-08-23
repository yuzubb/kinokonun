//=============================================================================
// MobileEnhancements.js
//=============================================================================

/*:
 * @plugindesc スマホプレイ向けの追加機能をまとめたプラグインです。
 * 読み込み進捗バー・ジャンプスケア時の振動・歩数HUD・
 * SEワンタップミュート・セーブデータの書き出し/読み込みに対応します。
 * @author Claude
 *
 * @help
 * このプラグインは以下の機能を追加します。
 *
 * 1. 起動時の読み込み進捗バーを有効化
 * 2. 画面シェイク／フラッシュ（驚かせ演出）に合わせた端末の振動
 * 3. マップ画面右上に常時表示される歩数カウンター
 * 4. 画面左上のスピーカーアイコンで効果音のみワンタップミュート
 * 5. タイトル画面からセーブデータをファイルとして書き出し／読み込み
 *
 * プラグインコマンドはありません。
 */

(function() {
    'use strict';

    //=========================================================================
    // 1. 読み込み進捗バーを有効化
    //    (エンジン側に元々実装されているが、無効化されたままだった機能)
    //=========================================================================
    Graphics.setProgressEnabled(true);

    //=========================================================================
    // 2. ジャンプスケア（驚かせ演出）に合わせた振動
    //    画面シェイクや強いフラッシュが入った時に、端末を振動させる。
    //=========================================================================
    function vibrate(pattern) {
        if (typeof ConfigManager !== 'undefined' && ConfigManager.Boolean2 === false) return;
        if (navigator.vibrate) {
            try { navigator.vibrate(pattern); } catch (e) { /* noop */ }
        }
    }

    var _Game_Screen_startShake = Game_Screen.prototype.startShake;
    Game_Screen.prototype.startShake = function(power, speed, duration) {
        _Game_Screen_startShake.call(this, power, speed, duration);
        // 強めのシェイク（驚かせ演出でよく使われる）でのみ振動させる
        if (power >= 5) {
            vibrate([80, 40, 120, 40, 80]);
        } else if (power >= 2) {
            vibrate(60);
        }
    };

    var _Game_Screen_startFlash = Game_Screen.prototype.startFlash;
    Game_Screen.prototype.startFlash = function(color, duration) {
        _Game_Screen_startFlash.call(this, color, duration);
        var alpha = color && color.length > 3 ? color[3] : 0;
        if (alpha >= 170) {
            vibrate([150, 60, 200]);
        } else if (alpha >= 80) {
            vibrate(100);
        }
    };

    //=========================================================================
    // 3. 歩数HUD（マップ画面のみ、右上に常時表示）
    //=========================================================================
    var stepsHud = document.createElement('div');
    stepsHud.id = 'steps-hud';
    stepsHud.style.position = 'fixed';
    stepsHud.style.top = 'calc(env(safe-area-inset-top, 0px) + 8px)';
    stepsHud.style.right = 'calc(env(safe-area-inset-right, 0px) + 8px)';
    stepsHud.style.padding = '4px 10px';
    stepsHud.style.background = 'rgba(0, 0, 0, 0.55)';
    stepsHud.style.border = '1px solid rgba(255, 255, 255, 0.4)';
    stepsHud.style.borderRadius = '999px';
    stepsHud.style.color = '#fff';
    stepsHud.style.fontFamily = 'sans-serif';
    stepsHud.style.fontSize = '13px';
    stepsHud.style.zIndex = '190';
    stepsHud.style.pointerEvents = 'none';
    stepsHud.style.display = 'none';
    stepsHud.style.userSelect = 'none';

    function attachHud() {
        document.body.appendChild(stepsHud);
    }
    if (document.body) {
        attachHud();
    } else {
        document.addEventListener('DOMContentLoaded', attachHud);
    }

    setInterval(function() {
        var onMap = SceneManager._scene instanceof Scene_Map;
        if (onMap && typeof $gameParty !== 'undefined' && $gameParty) {
            stepsHud.textContent = '\u6B69\u6570: ' + $gameParty.steps();
            stepsHud.style.display = 'block';
        } else {
            stepsHud.style.display = 'none';
        }
    }, 250);

    //=========================================================================
    // 4. SEワンタップミュート（画面左上のスピーカーアイコン）
    //    Options画面のSE音量設定と連動する。
    //=========================================================================
    var seButton = document.createElement('div');
    seButton.id = 'se-mute-button';
    seButton.style.position = 'fixed';
    seButton.style.top = 'calc(env(safe-area-inset-top, 0px) + 8px)';
    seButton.style.left = 'calc(env(safe-area-inset-left, 0px) + 8px)';
    seButton.style.width = '32px';
    seButton.style.height = '32px';
    seButton.style.borderRadius = '50%';
    seButton.style.background = 'rgba(0, 0, 0, 0.55)';
    seButton.style.border = '1px solid rgba(255, 255, 255, 0.4)';
    seButton.style.color = '#fff';
    seButton.style.fontSize = '15px';
    seButton.style.display = 'flex';
    seButton.style.alignItems = 'center';
    seButton.style.justifyContent = 'center';
    seButton.style.zIndex = '190';
    seButton.style.userSelect = 'none';
    seButton.style.webkitTapHighlightColor = 'transparent';

    var lastSeVolume = 100;

    function refreshSeButton() {
        var vol = ConfigManager.seVolume;
        seButton.textContent = (vol > 0) ? '\uD83D\uDD0A' : '\uD83D\uDD07';
    }

    seButton.addEventListener('pointerup', function(event) {
        event.preventDefault();
        if (ConfigManager.seVolume > 0) {
            lastSeVolume = ConfigManager.seVolume;
            ConfigManager.seVolume = 0;
        } else {
            ConfigManager.seVolume = lastSeVolume || 100;
        }
        if (ConfigManager.save) { ConfigManager.save(); }
        refreshSeButton();
    });

    function attachSeButton() {
        document.body.appendChild(seButton);
        refreshSeButton();
    }
    if (document.body) {
        attachSeButton();
    } else {
        document.addEventListener('DOMContentLoaded', attachSeButton);
    }

    setInterval(refreshSeButton, 1000);

    //=========================================================================
    // 5. セーブデータの書き出し／読み込み（タイトル画面のみ表示）
    //=========================================================================
    var SAVE_KEY_PREFIX = 'RPG File';
    var GLOBAL_KEY = 'RPG Global';

    function collectSaveData() {
        var data = {};
        var globalValue = localStorage.getItem(GLOBAL_KEY);
        if (globalValue !== null) data[GLOBAL_KEY] = globalValue;
        for (var i = 1; i <= 20; i++) {
            var key = SAVE_KEY_PREFIX + i;
            var value = localStorage.getItem(key);
            if (value !== null) data[key] = value;
        }
        return data;
    }

    function exportSaveData() {
        var data = collectSaveData();
        if (Object.keys(data).length === 0) {
            alert('\u30BB\u30FC\u30D6\u30C7\u30FC\u30BF\u304C\u3042\u308A\u307E\u305B\u3093\u3002');
            return;
        }
        var json = JSON.stringify(data);
        var blob = new Blob([json], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        var now = new Date();
        var stamp = now.getFullYear() + '' +
            ('0' + (now.getMonth() + 1)).slice(-2) +
            ('0' + now.getDate()).slice(-2) + '_' +
            ('0' + now.getHours()).slice(-2) +
            ('0' + now.getMinutes()).slice(-2);
        a.href = url;
        a.download = 'kinokonun_save_' + stamp + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function() { URL.revokeObjectURL(url); }, 2000);
    }

    function importSaveDataFromFile(file) {
        var reader = new FileReader();
        reader.onload = function() {
            try {
                var data = JSON.parse(reader.result);
                var count = 0;
                Object.keys(data).forEach(function(key) {
                    if (key === GLOBAL_KEY || /^RPG File\d+$/.test(key)) {
                        localStorage.setItem(key, data[key]);
                        count++;
                    }
                });
                if (count > 0) {
                    alert('\u30BB\u30FC\u30D6\u30C7\u30FC\u30BF\u3092' + count + '\u4EF6\u8AAD\u307F\u8FBC\u307F\u307E\u3057\u305F\u3002\u30DA\u30FC\u30B8\u3092\u518D\u8AAD\u307F\u8FBC\u307F\u3057\u307E\u3059\u3002');
                    location.reload();
                } else {
                    alert('\u6709\u52B9\u306A\u30BB\u30FC\u30D6\u30C7\u30FC\u30BF\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3067\u3057\u305F\u3002');
                }
            } catch (e) {
                alert('\u30D5\u30A1\u30A4\u30EB\u306E\u8AAD\u307F\u8FBC\u307F\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002');
            }
        };
        reader.readAsText(file);
    }

    var saveButtonsWrap = document.createElement('div');
    saveButtonsWrap.id = 'save-transfer-buttons';
    saveButtonsWrap.style.position = 'fixed';
    saveButtonsWrap.style.bottom = 'calc(env(safe-area-inset-bottom, 0px) + 10px)';
    saveButtonsWrap.style.left = '50%';
    saveButtonsWrap.style.transform = 'translateX(-50%)';
    saveButtonsWrap.style.display = 'none';
    saveButtonsWrap.style.gap = '10px';
    saveButtonsWrap.style.zIndex = '190';
    saveButtonsWrap.style.flexDirection = 'row';

    function makeSaveButton(label) {
        var btn = document.createElement('div');
        btn.textContent = label;
        btn.style.padding = '6px 12px';
        btn.style.background = 'rgba(0, 0, 0, 0.6)';
        btn.style.border = '1px solid rgba(255, 255, 255, 0.5)';
        btn.style.borderRadius = '6px';
        btn.style.color = '#fff';
        btn.style.fontFamily = 'sans-serif';
        btn.style.fontSize = '12px';
        btn.style.userSelect = 'none';
        btn.style.webkitTapHighlightColor = 'transparent';
        return btn;
    }

    var exportBtn = makeSaveButton('\u30BB\u30FC\u30D6\u3092\u66F8\u304D\u51FA\u3057');
    var importBtn = makeSaveButton('\u30BB\u30FC\u30D6\u3092\u8AAD\u307F\u8FBC\u307F');

    exportBtn.addEventListener('pointerup', function(event) {
        event.preventDefault();
        exportSaveData();
    });

    var fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'application/json';
    fileInput.style.display = 'none';
    fileInput.addEventListener('change', function() {
        if (fileInput.files && fileInput.files[0]) {
            importSaveDataFromFile(fileInput.files[0]);
        }
        fileInput.value = '';
    });

    importBtn.addEventListener('pointerup', function(event) {
        event.preventDefault();
        fileInput.click();
    });

    saveButtonsWrap.appendChild(exportBtn);
    saveButtonsWrap.appendChild(importBtn);

    function attachSaveButtons() {
        document.body.appendChild(saveButtonsWrap);
        document.body.appendChild(fileInput);
    }
    if (document.body) {
        attachSaveButtons();
    } else {
        document.addEventListener('DOMContentLoaded', attachSaveButtons);
    }

    setInterval(function() {
        var onTitle = SceneManager._scene instanceof Scene_Title;
        saveButtonsWrap.style.display = onTitle ? 'flex' : 'none';
    }, 250);

})();
