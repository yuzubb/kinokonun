//=============================================================================
// TouchControls.js
//=============================================================================

/*:
 * @plugindesc スマートフォンでの操作用に、画面上に十字キーとOK/キャンセルの
 * バーチャルボタンを表示します。
 * @author Claude
 *
 * @help
 * タッチ操作可能な端末（スマートフォン・タブレット）でのみ、
 * 画面下部に十字キー（移動）とOK/メニューボタンを表示します。
 * PC（マウス・キーボード操作）では表示されません。
 *
 * 十字キーは矢印キー、OKボタンはZキー、
 * メニュー/キャンセルボタンはXキーと同じ入力として扱われます。
 */

(function() {
    'use strict';

    // タッチ操作可能な端末のみで有効化する。
    //
    // 注意: 最新のiPad（iPadOS）はSafariのUser-Agentが
    // 通常のMac（デスクトップ）と全く同じ文字列を返すため、
    // User-Agent文字列やnavigator.platformでの判定は当てにならない。
    // 「実際に何本の指でタッチ操作できるか」を返す
    // navigator.maxTouchPoints で判定すれば、
    // 本物のMac/Windows PC（マウスのみ、0本）と
    // iPad・スマホ（タッチ対応、1本以上）を正しく区別できる。
    var maxTouchPoints = navigator.maxTouchPoints || navigator.msMaxTouchPoints || 0;
    var isTouchDevice = maxTouchPoints > 0;
    if (!isTouchDevice) return;

    var style = document.createElement('style');
    style.textContent = [
        '#touch-controls {',
        '    position: fixed;',
        '    left: 0; right: 0;',
        '    bottom: 0;',
        '    height: clamp(160px, 38vh, 260px);',
        '    pointer-events: none;',
        '    z-index: 200;',
        '    user-select: none;',
        '    -webkit-user-select: none;',
        '}',
        '.tc-btn {',
        '    position: absolute;',
        '    display: flex;',
        '    align-items: center;',
        '    justify-content: center;',
        '    background: rgba(255, 255, 255, 0.16);',
        '    border: 1px solid rgba(255, 255, 255, 0.45);',
        '    border-radius: 50%;',
        '    color: rgba(255, 255, 255, 0.9);',
        '    font-family: sans-serif;',
        '    font-weight: 600;',
        '    pointer-events: auto;',
        '    touch-action: none;',
        '    -webkit-tap-highlight-color: transparent;',
        '    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);',
        '}',
        '.tc-btn.active {',
        '    background: rgba(255, 255, 255, 0.4);',
        '}',
        '.tc-haptic-switch {',
        '    position: absolute;',
        '    width: 1px;',
        '    height: 1px;',
        '    opacity: 0.01;',
        '    pointer-events: none;',
        '}',
        // 十字キー本体。セーフエリア（ホームインジケーター等）を避けて配置する。
        '#tc-dpad {',
        '    position: absolute;',
        '    left: calc(env(safe-area-inset-left, 0px) + 18px);',
        '    bottom: calc(env(safe-area-inset-bottom, 0px) + 18px);',
        '    width: clamp(130px, 32vw, 190px);',
        '    height: clamp(130px, 32vw, 190px);',
        '    pointer-events: none;',
        '}',
        '.tc-dpad-btn {',
        '    position: absolute;',
        '    width: 34%;',
        '    height: 34%;',
        '}',
        '#tc-up    { top: 0;    left: 33%; }',
        '#tc-down  { bottom: 0; left: 33%; }',
        '#tc-left  { left: 0;   top: 33%; }',
        '#tc-right { right: 0;  top: 33%; }',
        // 矢印はCSSで描いた三角形（絵文字・記号フォント非依存で機種差が出ない）
        '.tc-arrow {',
        '    width: 0;',
        '    height: 0;',
        '    border: 8px solid transparent;',
        '}',
        '#tc-up .tc-arrow    { border-bottom-color: rgba(255,255,255,0.9); border-top-width: 0; margin-bottom: 2px; }',
        '#tc-down .tc-arrow  { border-top-color: rgba(255,255,255,0.9); border-bottom-width: 0; margin-top: 2px; }',
        '#tc-left .tc-arrow  { border-right-color: rgba(255,255,255,0.9); border-left-width: 0; margin-right: 2px; }',
        '#tc-right .tc-arrow { border-left-color: rgba(255,255,255,0.9); border-right-width: 0; margin-left: 2px; }',
        // 決定・メニューボタン
        '#tc-actions {',
        '    position: absolute;',
        '    right: calc(env(safe-area-inset-right, 0px) + 18px);',
        '    bottom: calc(env(safe-area-inset-bottom, 0px) + 18px);',
        '    width: clamp(130px, 32vw, 190px);',
        '    height: clamp(130px, 32vw, 190px);',
        '    pointer-events: none;',
        '}',
        '#tc-ok {',
        '    position: absolute;',
        '    right: 0;',
        '    bottom: 18%;',
        '    width: 42%;',
        '    height: 42%;',
        '    font-size: clamp(13px, 3.5vw, 16px);',
        '    background: rgba(120, 200, 255, 0.22);',
        '}',
        '#tc-cancel {',
        '    position: absolute;',
        '    left: 0;',
        '    top: 0;',
        '    width: 40%;',
        '    height: 40%;',
        '    font-size: clamp(11px, 3vw, 13px);',
        '    background: rgba(255, 160, 160, 0.22);',
        '}'
    ].join('\n');
    document.head.appendChild(style);

    function makeButton(id, label, extraClass) {
        var el = document.createElement('div');
        el.id = id;
        el.className = 'tc-btn' + (extraClass ? ' ' + extraClass : '');

        if (label) {
            el.textContent = label;
        }

        // iOS Safari (17以降) 用: <input type="checkbox" switch> は
        // タップでOS標準のハプティックが鳴る、公式にサポートされた要素。
        // 見た目には出さず、ボタンの内部に仕込んでおく。
        var hapticSwitch = document.createElement('input');
        hapticSwitch.type = 'checkbox';
        try { hapticSwitch.setAttribute('switch', ''); } catch (e) { /* noop */ }
        hapticSwitch.className = 'tc-haptic-switch';
        hapticSwitch.tabIndex = -1;
        hapticSwitch.setAttribute('aria-hidden', 'true');
        el.appendChild(hapticSwitch);
        el._hapticSwitch = hapticSwitch;

        return el;
    }

    function makeArrowButton(id) {
        var el = makeButton(id, null, 'tc-dpad-btn');
        var arrow = document.createElement('div');
        arrow.className = 'tc-arrow';
        el.appendChild(arrow);
        return el;
    }

    // Android Chrome等: 標準のVibration APIで振動。
    // iOS Safari: Vibration APIは非対応なので、上のswitch要素を
    // ユーザー操作と同じ呼び出しスタック内でクリックし、
    // OS標準のハプティックを代わりに鳴らす。
    //
    // オプション画面の「触覚フィードバック(振動)」がOFFの場合は鳴らさない。
    // (CustomizeConfigItemプラグインで追加した2番目のスイッチ項目 = Boolean2。
    //  まだ読み込まれていない起動直後は未定義になるため、その場合はON扱いにする)
    function isHapticEnabled() {
        if (typeof ConfigManager === 'undefined') return true;
        return ConfigManager.Boolean2 !== false;
    }

    function triggerHaptic(el) {
        if (!isHapticEnabled()) return;
        if (navigator.vibrate) {
            try { navigator.vibrate(12); } catch (e) { /* noop */ }
        }
        if (el && el._hapticSwitch) {
            try { el._hapticSwitch.click(); } catch (e) { /* noop */ }
        }
    }

    var root = document.createElement('div');
    root.id = 'touch-controls';

    var dpad = document.createElement('div');
    dpad.id = 'tc-dpad';
    var up = makeArrowButton('tc-up');
    var down = makeArrowButton('tc-down');
    var left = makeArrowButton('tc-left');
    var right = makeArrowButton('tc-right');
    dpad.appendChild(up);
    dpad.appendChild(down);
    dpad.appendChild(left);
    dpad.appendChild(right);

    var actions = document.createElement('div');
    actions.id = 'tc-actions';
    var ok = makeButton('tc-ok', '\u6C7A\u5B9A');
    var cancel = makeButton('tc-cancel', '\u30E1\u30CB\u30E5\u30FC');
    actions.appendChild(ok);
    actions.appendChild(cancel);

    root.appendChild(dpad);
    root.appendChild(actions);

    function attach() {
        document.body.appendChild(root);
    }
    if (document.body) {
        attach();
    } else {
        document.addEventListener('DOMContentLoaded', attach);
    }

    // 各ボタンに、押下中は Input._currentState を true にし続け、
    // 離したら false に戻す処理を割り当てる。
    // キーボード入力（矢印キー・Z・X）と全く同じ扱いになる。
    function bindButton(el, keyName) {
        var pointerId = null;

        function press(event) {
            if (pointerId !== null) return;
            pointerId = event.pointerId;
            el.classList.add('active');
            Input._currentState[keyName] = true;
            triggerHaptic(el);
            try { el.setPointerCapture(pointerId); } catch (e) { /* noop */ }
            event.preventDefault();
        }

        function release(event) {
            if (pointerId !== event.pointerId) return;
            pointerId = null;
            el.classList.remove('active');
            Input._currentState[keyName] = false;
            event.preventDefault();
        }

        el.addEventListener('pointerdown', press);
        el.addEventListener('pointerup', release);
        el.addEventListener('pointercancel', release);
        el.addEventListener('lostpointercapture', function(event) {
            if (pointerId === event.pointerId) {
                pointerId = null;
                el.classList.remove('active');
                Input._currentState[keyName] = false;
            }
        });
    }

    bindButton(up, 'up');
    bindButton(down, 'down');
    bindButton(left, 'left');
    bindButton(right, 'right');
    bindButton(ok, 'ok');
    // メニュー/キャンセルは X キーと同じ 'escape' として扱う
    // （isMenuCalled / isCancelTriggered どちらにも対応する特殊キー）
    bindButton(cancel, 'escape');

})();
