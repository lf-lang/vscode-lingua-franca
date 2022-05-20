import * as vscode from 'vscode';

export function getTerminal(name: string, cwd?: string) {
    let terminal: vscode.Terminal = vscode.window.terminals.find(
        t => t.name === name
    );
    if (!terminal) {
        terminal = vscode.window.createTerminal({ name: name, cwd: cwd });
    }
    return terminal;
}

export const defaultDict = (defaultValue: any) => (dict: Object) => new Proxy(dict, {
    get: (target: Object, name: string) => name in target ? target[name] : defaultValue
});
