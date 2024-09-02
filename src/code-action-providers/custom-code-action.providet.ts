import * as vscode from 'vscode';
import { RomajiCase } from '../constants';

export class CustomCodeActionProvider implements vscode.CodeActionProvider {
    public provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range,
        context: vscode.CodeActionContext,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<(vscode.CodeAction | vscode.Command)[]> {
        const codeActionData = [
            { title: 'Japanese Romanization: snake case (snake-case)', command: 'extension.japaneseRomanization', executeTitle: 'Convert current text to romanji snake case', case: RomajiCase.SNAKE },
            { title: 'Japanese Romanization: pascal case (PascalCase)', command: 'extension.japaneseRomanization', executeTitle: 'Convert current text to romanji pascal case', case: RomajiCase.PASCAL },
            { title: 'Japanese Romanization: camel case (camelCase)', command: 'extension.japaneseRomanization', executeTitle: 'Convert current text to romanji camel case', case: RomajiCase.CAMEL },
            { title: 'Japanese Romanization: kebab case (kebab-case)', command: 'extension.japaneseRomanization', executeTitle: 'Convert current text to romanji kebab case', case: RomajiCase.KEBAB },
        ]

        const op = [];
        for (const data of codeActionData) {
            const codeAction = new vscode.CodeAction(data.title, vscode.CodeActionKind.Refactor);
            codeAction.command = { command: data.command, title: data.executeTitle, arguments: [data.case] };
            op.push(codeAction);
        }
        return op;
    }
}