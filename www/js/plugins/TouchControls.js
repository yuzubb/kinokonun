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
        '    left: 0; right: 0; bottom: 0;',
        '    height: 40vh;',
        '    max-height: 260px;',
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
        '    background: rgba(255, 255, 255, 0.18);',
        '    border: 2px solid rgba(255, 255, 255, 0.55);',
        '    border-radius: 50%;',
        '    color: rgba(255, 255, 255, 0.85);',
        '    font-family: sans-serif;',
        '    font-weight: bold;',
        '    pointer-events: auto;',
        '    touch-action: none;',
        '    -webkit-tap-highlight-color: transparent;',
        '}',
        '.tc-btn.active {',
        '    background: rgba(255, 255, 255, 0.45);',
        '}',
        '.tc-haptic-switch {',
        '    position: absolute;',
        '    width: 1px;',
        '    height: 1px;',
        '    opacity: 0.01;',
        '    pointer-events: none;',
        '}',
        '#tc-dpad {',
        '    position: absolute;',
        '    left: 6vw;',
        '    bottom: 8vw;',
        '    width: 34vw;',
        '    height: 34vw;',
        '    max-width: 190px;',
        '    max-height: 190px;',
        '    pointer-events: none;',
        '}',
        '.tc-dpad-btn {',
        '    position: absolute;',
        '    width: 34%;',
        '    height: 34%;',
        '    font-size: 22px;',
        '}',
        '#tc-up    { top: 0;    left: 33%; }',
        '#tc-down  { bottom: 0; left: 33%; }',
        '#tc-left  { left: 0;   top: 33%; }',
        '#tc-right { right: 0;  top: 33%; }',
        '#tc-actions {',
        '    position: absolute;',
        '    right: 6vw;',
        '    bottom: 8vw;',
        '    width: 34vw;',
        '    height: 34vw;',
        '    max-width: 190px;',
        '    max-height: 190px;',
        '    pointer-events: none;',
        '}',
        '#tc-ok {',
        '    position: absolute;',
        '    right: 0;',
        '    bottom: 18%;',
        '    width: 40%;',
        '    height: 40%;',
        '    font-size: 16px;',
        '    background: rgba(120, 200, 255, 0.25);',
        '}',
        '#tc-cancel {',
        '    position: absolute;',
        '    left: 0;',
        '    top: 0;',
        '    width: 40%;',
        '    height: 40%;',
        '    font-size: 13px;',
        '    background: rgba(255, 160, 160, 0.25);',
        '}'
    ].join('\n');
    document.head.appendChild(style);

    function makeButton(id, label, extraClass) {
        var el = document.createElement('div');
        el.id = id;
        el.className = 'tc-btn' + (extraClass ? ' ' + extraClass : '');
        el.textContent = label;

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

    // Android Chrome等: 標準のVibration APIで振動。
    // iOS Safari: Vibration APIは非対応なので、上のswitch要素を
    // ユーザー操作と同じ呼び出しスタック内でクリックし、
    // OS標準のハプティックを代わりに鳴らす。
    function triggerHaptic(el) {
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
    var up = makeButton('tc-up', '\u25B2', 'tc-dpad-btn');
    var down = makeButton('tc-down', '\u25BC', 'tc-dpad-btn');
    var left = makeButton('tc-left', '\u25C0', 'tc-dpad-btn');
    var right = makeButton('tc-right', '\u25B6', 'tc-dpad-btn');
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
