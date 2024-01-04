import { AbstractInputSuggest, EditorSuggest, Plugin } from 'obsidian';
import { around } from "monkey-around";

declare module 'obsidian' {
	interface Workspace {
		editorSuggest: {
			suggests: EditorSuggest<any>[];
		};
	}
}

export default class SwapSuggesterHotkeyPlugin extends Plugin {
	originalKeyBindings = new Map();
	patchedScopes = new Map();

	async onload() {
		this.initEditorSuggesterHotkeys();
		this.initPropertySuggesterHotkeys();
	}

	updateHotkeys(suggester: any) {
		const originalTabKey = suggester.scope.keys.find((key: any) => key.key === 'Tab');
		const originalArrowDownKey = suggester.scope.keys.find((key: any) => key.key === 'ArrowDown');
		const originalArrowUpKey = suggester.scope.keys.find((key: any) => key.key === 'ArrowUp');

		if (originalTabKey) suggester.scope.keys.splice(suggester.scope.keys.indexOf(originalTabKey), 1);

		if (originalArrowDownKey && originalArrowUpKey) {
			suggester.scope.register([], 'Tab', originalArrowDownKey.func);
			suggester.scope.register(['Shift'], 'Tab', originalArrowUpKey.func);
		}
	}

	initEditorSuggesterHotkeys() {
		const suggesters = this.app.workspace.editorSuggest.suggests;

		suggesters.forEach((suggester: any) => {
			const originalKeys = suggester.scope.keys.slice();
			this.originalKeyBindings.set(suggester, originalKeys);

			this.updateHotkeys(suggester);
		});
	}

	initPropertySuggesterHotkeys() {
		const alreadyPatchTarget = (target: any) => {
			return target.patched;
		};

		const setPatched = (target: any) => {
			if (!target.patched) {
				this.patchedScopes.set(target, [...target.scope.keys]);
				target.patched = true;
				this.updateHotkeys(target);
			}
		};

		around(AbstractInputSuggest.prototype as any, {
			showSuggestions: (next) => {
				return function (args: any) {
					if (!this.patched) {
						setPatched(this);
					}
					const result = next.call(this, args);
					return result;
				};
			}
		});
	}

	restorePatchedScopes() {
		this.patchedScopes.forEach((originalKeys, target) => {
			target.scope.keys = originalKeys; // 恢复原始 hotkeys
			delete target.patched; // 删除 patched 标记
		});
	}

	restoreOriginalHotkeys() {
		this.originalKeyBindings.forEach((originalKeys, suggester) => {
			suggester.scope.keys = originalKeys;
		});
	}

	onunload() {
		this.restoreOriginalHotkeys();
		this.restorePatchedScopes();
	}

}
