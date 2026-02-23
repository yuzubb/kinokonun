
/*:ja
 * @plugindesc 歩数を調整するプラグインです
 * @author 村人A
 *
 * @help
 *
 * プラグインコマンド:
 *   steps_reset    # 歩数を０に
 *   steps_add　4    # 歩数に4を足す
 *   steps_sub 7    # 歩数から7を引く
 *   steps_ass 2    # 歩数を変数２に代入
 */

(function() {
    var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        if (command === 'steps_reset') {
			this._steps = 0;
        }
		
        if (command === 'steps_add') {
			var addStep = parseFloat(args[0]);
			$gameParty._steps += addStep
        }
		
        if (command === 'steps_sub') {
			var addStep = parseFloat(args[0]);
			$gameParty._steps -= addStep
        }
		
        if (command === 'steps_ass') {
			var assval = parseFloat(args[0]);
			$gameVariables.setValue(assval,$gameParty._steps)
        }
    };
	
	Game_Party.prototype.increaseSteps = function() {
		this._steps++;
		console.log(this._steps)
	};
})();