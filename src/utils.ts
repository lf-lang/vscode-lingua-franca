import * as vscode from 'vscode';

export function getTerminal(name: string, cwd?: string) {
    let terminal: vscode.Terminal | undefined = vscode.window.terminals.find(
        t => t.name === name
    );
    if (!terminal) {
        terminal = vscode.window.createTerminal({ name: name, cwd: cwd });
    }
    return terminal;
}

export type MessageDisplayHelper = (message: string, ...items: string[]) => Thenable<string | undefined>;
