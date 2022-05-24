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

export type MessageShower = (message: string, ...items: string[]) => Thenable<string | undefined>;
