'use strict';

import * as vscode from 'vscode';
import Linter, { LinterError, LinterHandler } from './linter';


function doLint(document: vscode.TextDocument, diagnosticCollection: vscode.DiagnosticCollection): LinterHandler {
    return function(errors: LinterError[]) {
        diagnosticCollection.clear();
        const diagnostics = errors.map(error => {
            const range = new vscode.Range(
                new vscode.Position(error.line - 1, error.range.start - 1),
                new vscode.Position(error.line - 1, error.range.end - 1)
            );
            
            return new vscode.Diagnostic(range, error.reason, vscode.DiagnosticSeverity.Warning);
        });

        diagnosticCollection.set(document.uri, diagnostics);
    };
}

export function activate(context: vscode.ExtensionContext) {
    const diagnosticCollection = vscode.languages.createDiagnosticCollection("protoc-gen-lint");

    let disposable = vscode.commands.registerCommand('extension.protolint', () => {
        const linter = new Linter();
        
        vscode.workspace.onDidSaveTextDocument(linter.lint);
        vscode.workspace.onDidOpenTextDocument(function() {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                linter.lint(editor.document, doLint(editor.document, diagnosticCollection), true);
            }
        });

        vscode.workspace.onWillSaveTextDocument(function(event: vscode.TextDocumentWillSaveEvent) {
            linter.lint(event.document, doLint(event.document, diagnosticCollection));
        });
    });

    vscode.commands.executeCommand("extension.protolint");
    context.subscriptions.push(disposable);
}

export function deactivate() {
}