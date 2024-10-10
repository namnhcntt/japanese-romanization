import * as vscode from 'vscode';
import { RomajiCase } from '../constants';

export class CustomCodeActionProvider implements vscode.CodeActionProvider {
    public provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range,
        context: vscode.CodeActionContext,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<(vscode.CodeAction | vscode.Command)[]> {

        // get vscode setting kanjiToRomanji.enableTransformMode to array
        const enableTransformMode = vscode.workspace.getConfiguration('kanjiToRomanji').get('enableTransformMode') as string[];
        let codeActionData = [];
        if (enableTransformMode.includes('snake case (snake_case)')) {
            codeActionData.push({ title: 'Japanese Romanization: snake case (snake_case)', command: 'extension.japaneseRomanization', executeTitle: 'Convert current text to romanji snake case', case: RomajiCase.SNAKE });
        }
        if (enableTransformMode.includes('upper snake case (UPPER_SNAKE_CASE)')) {
            codeActionData.push({ title: 'Japanese Romanization: upper snake case (UPPER_SNAKE_CASE)', command: 'extension.japaneseRomanization', executeTitle: 'Convert current text to romanji upper snake case', case: RomajiCase.UPPER_SNAKE });
        }

        if (enableTransformMode.includes('pascal case (PascalCase)')) {
            codeActionData.push({ title: 'Japanese Romanization: pascal case (PascalCase)', command: 'extension.japaneseRomanization', executeTitle: 'Convert current text to romanji pascal case', case: RomajiCase.PASCAL });
        }

        if (enableTransformMode.includes('camel case (camelCase)')) {
            codeActionData.push({ title: 'Japanese Romanization: camel case (camelCase)', command: 'extension.japaneseRomanization', executeTitle: 'Convert current text to romanji camel case', case: RomajiCase.CAMEL });
        }

        if (enableTransformMode.includes('kebab case (kebab-case)')) {
            codeActionData.push({ title: 'Japanese Romanization: kebab case (kebab-case)', command: 'extension.japaneseRomanization', executeTitle: 'Convert current text to romanji kebab case', case: RomajiCase.KEBAB });
        }

        if (enableTransformMode.includes('back to japanese (Japanese)')) {
            codeActionData.push({ title: 'Japanese Romanization: back to japanese (Japanese)', command: 'extension.japaneseRomanization', executeTitle: 'Convert current romanji text back to japanese', case: RomajiCase.JAPANESE });
        }

        const op = [];
        for (const data of codeActionData) {
            const codeAction = new vscode.CodeAction(data.title, vscode.CodeActionKind.Refactor);
            codeAction.command = { command: data.command, title: data.executeTitle, arguments: [data.case] };
            op.push(codeAction);
        }
        return op;
    }
}