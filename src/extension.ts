'use strict';

import * as vscode from 'vscode';
import Linter, { LinterError } from './linter';

const commandId = 'extension.protolint';

function doLint(
  { fileName, languageId, uri }: vscode.TextDocument,
  collection: vscode.DiagnosticCollection,
  didOpen: boolean = false
): void {
  const linter = new Linter();
  collection.clear();

  linter.lint(fileName, { didOpen, languageId }, (errors: LinterError[]): void => {
    if (!errors.length) {
      return;
    }
    const diagnostics = errors.map(error => {
      const range = new vscode.Range(
        new vscode.Position(error.line - 1, error.range.start - 1),
        new vscode.Position(error.line - 1, error.range.end - 1)
      );

      return new vscode.Diagnostic(range, error.reason, vscode.DiagnosticSeverity.Warning);
    });

    collection.set(uri, diagnostics);
  });
}

export function activate(context: vscode.ExtensionContext) {
  const diagnosticCollection = vscode.languages.createDiagnosticCollection(commandId);

  let disposable = vscode.commands.registerCommand(commandId, () => {
    vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
      doLint(document, diagnosticCollection);
    });

    vscode.workspace.onDidOpenTextDocument(() => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        doLint(editor.document, diagnosticCollection, true);
      }
    });
  });

  vscode.commands.executeCommand(commandId);
  context.subscriptions.push(disposable);
}

export function deactivate() {
}
