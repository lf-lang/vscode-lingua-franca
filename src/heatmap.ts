'use strict';

import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient';

let heatMapEnabled = true;
let statusBarItem: vscode.StatusBarItem;

/**
 * Register the heat map notification handler, status bar indicator, and toggle command.
 * Listens for `notify/heatMapUpdate` from the language server and triggers a KLighD
 * diagram refresh so the heat map coloring is shown in the diagram view.
 */
export function registerHeatMapHandler(
    context: vscode.ExtensionContext,
    client: LanguageClient
) {
    // Status bar item for heat map state
    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right, 100
    );
    statusBarItem.command = 'linguafranca.toggleHeatMap';
    updateStatusBar();
    context.subscriptions.push(statusBarItem);

    // Toggle command
    context.subscriptions.push(
        vscode.commands.registerCommand('linguafranca.toggleHeatMap', () => {
            heatMapEnabled = !heatMapEnabled;
            updateStatusBar();
            if (heatMapEnabled) {
                vscode.window.showInformationMessage(
                    'Lingua Franca: Heat map visualization enabled.'
                );
            } else {
                vscode.window.showInformationMessage(
                    'Lingua Franca: Heat map visualization disabled.'
                );
            }
        })
    );

    // Register the notification handler once the client is ready
    client.onReady().then(() => {
        client.onNotification('notify/heatMapUpdate', (params: any) => {
            if (!heatMapEnabled) {
                return;
            }
            console.log('[LF Heat Map] Received heat map update');

            // Update status bar to reflect incoming data
            statusBarItem.text = '$(flame) Heat Map: Updated';
            // Reset the status bar text after a short delay
            setTimeout(() => {
                if (heatMapEnabled) {
                    statusBarItem.text = '$(flame) Heat Map: On';
                }
            }, 3000);

            // Trigger a KLighD diagram refresh so the updated coloring is rendered
            vscode.commands.executeCommand('klighd-vscode.diagram.refresh')
                .then(undefined, () => {
                    // Command may not exist in older KLighD versions; the language
                    // server will push diagram updates through KLighD's built-in
                    // protocol as a fallback.
                    console.log(
                        '[LF Heat Map] klighd-vscode.diagram.refresh unavailable; '
                        + 'relying on server-side diagram push.'
                    );
                });
        });
    });
}

function updateStatusBar() {
    if (heatMapEnabled) {
        statusBarItem.text = '$(flame) Heat Map: On';
        statusBarItem.tooltip = 'Click to disable heat map visualization';
    } else {
        statusBarItem.text = '$(flame) Heat Map: Off';
        statusBarItem.tooltip = 'Click to enable heat map visualization';
    }
    statusBarItem.show();
}
