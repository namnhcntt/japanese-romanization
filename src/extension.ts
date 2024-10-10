import axios from 'axios';
import * as fs from 'fs';
import { HttpsProxyAgent } from 'https-proxy-agent';
import Kuroshiro from 'kuroshiro';
import KuromojiAnalyzer from "kuroshiro-analyzer-kuromoji";
import path from 'path';
import * as vscode from 'vscode';
import { isHiragana, isKanji, isKatakana, tokenize } from 'wanakana';
import { CustomCodeActionProvider } from './code-action-providers/custom-code-action.providet';
import { HIRA_KATA_ROMANJI_MAP, RomajiCase, RomanjiCaseMap } from './constants';

// Load JSON file
let kanjiData: any;
let kanjiFilePath: string;
let kuroshiro: Kuroshiro;
let gooLabApiKey: string;
export function activate(context: vscode.ExtensionContext) {
	const languages = ['javascript', 'typescript', 'csharp', 'json', 'plaintext', 'ini', 'markdown', 'yaml', 'xml', 'html', 'css', 'scss', 'less'];

	for (const language of languages) {
		context.subscriptions.push(
			vscode.languages.registerCodeActionsProvider(language, new CustomCodeActionProvider())
		);
	}

	context.subscriptions.push(
		vscode.commands.registerCommand('extension.customCodeAction', () => {
			vscode.window.showInformationMessage('Custom Code Action Triggered!');
		})
	);

	kanjiFilePath = path.join(context.extensionPath, 'data', 'kanji-hiragana-romainji-dict.json');
	// Read and parse the JSON file
	kanjiData = JSON.parse(fs.readFileSync(kanjiFilePath, 'utf8'));
	// Register the command that is triggered when the extension is used
	let disposable = vscode.commands.registerCommand('extension.japaneseRomanization', async (romanjiCase: RomajiCase) => {
		console.log('japaneseRomanization', romanjiCase);
		// Get the active text editor
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			const selection = editor.selection;
			const selectedText = editor.document.getText(selection);

			if (!selectedText) {
				vscode.window.showErrorMessage('No text selected!');
				return;
			}

			const config = vscode.workspace.getConfiguration('kanjiToRomanji');
			const provider = config.get<string>('provider', 'offline');
			gooLabApiKey = config.get<string>('apiKey', '');
			const cache = config.get<boolean>('cache', true);
			try {
				if (!isJapaneseWord(selectedText)) {
					// Convert the selected text to the selected case
					const transformedText = transformTextToAnotherMode(selectedText, romanjiCase);
					// Replace the selected text with the transformed text
					editor.edit(editBuilder => {
						editBuilder.replace(selection, transformedText);
					});
					return;
				}

				const lines = splitSelectedTextToSingleLine(selectedText);
				if (lines.length > 0) {
					let op = '';
					for (const line of lines) {
						const translatedText = await doTransformText(line, cache, provider, romanjiCase);
						op += '\n' + translatedText;
					}
					if (op.startsWith('\n')) {
						op = op.substring(1);
					}
					// Replace the selected text with the translated text
					editor.edit(editBuilder => {
						editBuilder.replace(selection, op);
					});
					return;
				}
			} catch (error: any) {
				vscode.window.showErrorMessage('Error translating text: ' + error.message);
			}
		}
	});

	context.subscriptions.push(disposable);

	// register command clear cache (clear data in json file)
	let clearCacheDisposable = vscode.commands.registerCommand('extension.clearCache', async () => {
		kanjiData = {};
		fs.writeFileSync(kanjiFilePath, JSON.stringify(kanjiData, null, 2));
		vscode.window.showInformationMessage('Cache cleared!');
	});
	context.subscriptions.push(clearCacheDisposable);

	// register command export cache (export data in json file)
	let exportCacheDisposable = vscode.commands.registerCommand('extension.exportCache', async () => {
		// export path select from file explorer dialog
		const exportPath = await vscode.window.showSaveDialog({
			filters: {
				JSON: ['json']
			}
		});
		if (!exportPath) {
			return;
		}
		fs.writeFileSync(exportPath.fsPath, JSON.stringify(kanjiData, null, 2));
		vscode.window.showInformationMessage('Cache exported!');
	});
	context.subscriptions.push(exportCacheDisposable);

	// register command import cache (import data in json file)
	let importCacheDisposable = vscode.commands.registerCommand('extension.importCache', async () => {
		const importPath = path.join(context.extensionPath, 'data', 'kanji-hiragana-romainji-dict-export.json');
		kanjiData = JSON.parse(fs.readFileSync(importPath, 'utf8'));
		fs.writeFileSync(kanjiFilePath, JSON.stringify(kanjiData, null, 2));
		vscode.window.showInformationMessage('Cache imported!');
	});
	context.subscriptions.push(importCacheDisposable);
}

function splitSelectedTextToSingleLine(selectedText: string): string[] {
	const lines = selectedText.split(/\r?\n/);
	return lines.map(line => line.trim());
}

function isJapaneseWord(selectedText: string): boolean {
	return isHiragana(selectedText) || isKatakana(selectedText) || isKanji(selectedText); 1
}

/*
Check if the selected text is already in camel case, snake case, kebab case, pascal case, or upper snake case. Then convert it to the other cases.
*/
function transformTextToAnotherMode(selectedText: string, selectedRomajiCase: RomajiCase): string {
	let op = '';
	// detect source romajiCase of selectedText from content
	let sourceRomajiCase: RomajiCase = RomajiCase.CAMEL;
	if (selectedText.includes('_')) {
		sourceRomajiCase = RomajiCase.SNAKE;
	} else if (selectedText.includes('-')) {
		sourceRomajiCase = RomajiCase.KEBAB;
	} else if (selectedText[0] === selectedText[0].toUpperCase()) {
		sourceRomajiCase = RomajiCase.PASCAL;
	} else if (selectedText[0] === selectedText[0].toLowerCase()) {
		sourceRomajiCase = RomajiCase.CAMEL;
	}

	// convert this text to sentence (replace to space)
	let transformedText = selectedText;
	if (sourceRomajiCase === RomajiCase.SNAKE) {
		transformedText = selectedText.replace(/_/g, ' ');
	} else if (sourceRomajiCase === RomajiCase.KEBAB) {
		transformedText = selectedText.replace(/-/g, ' ');
	} else if (sourceRomajiCase === RomajiCase.PASCAL) {
		transformedText = selectedText.replace(/([A-Z])/g, ' $1').trim();
	} else if (sourceRomajiCase === RomajiCase.CAMEL) {
		transformedText = selectedText.replace(/([A-Z])/g, ' $1').trim();
	}

	// convert this text to selectedRomajiCase
	return RomanjiCaseMap[selectedRomajiCase](transformedText);
}

export async function doTransformText(selectedText: string, cache: boolean, provider: string, selectedRomajiCase: RomajiCase): Promise<string> {
	const standarlized = standarlizedText(selectedText);
	const tokens = tokenize(standarlized);
	console.log('tokens', tokens);
	let op = '';
	for (const token of tokens) {
		let translatedText = token;
		try {
			const tokenStr = token as string;
			if (cache && kanjiData[tokenStr]) {
				translatedText = kanjiData[tokenStr];
			} else {
				if (isHiragana(tokenStr) || isKatakana(tokenStr)) {
					translatedText = await toRomajiTextHepburn(tokenStr);
				} else if (isKanji(tokenStr)) {
					if (provider === 'labs.goo.ne.jp') {
						translatedText = await convertKanjiToRomaji(tokenStr);
						console.log('translated kanji', tokenStr, translatedText);
					} else {
						// offline
						translatedText = await convertKanjiToRomajiOffline(tokenStr);
					}
				}
			}
			// save token - translatedText to cache
			if (cache) {
				kanjiData[tokenStr] = translatedText;
				fs.writeFileSync(kanjiFilePath, JSON.stringify(kanjiData, null, 2));
			}
		} catch (e) {
			// log error
			console.error(`could not translate token ${token}`, e);
		}
		op += ' ' + translatedText;
	}

	if (op.startsWith(' ')) {
		op = op.substring(1);
	}

	// remove multiple space betwwen words
	op = op.replace(/\s+/g, ' ');
	// Convert the translated text to the selected case
	op = RomanjiCaseMap[selectedRomajiCase](op);
	return op;
}

function getDefaultProxy(): string | undefined {
	// Retrieve proxy from VS Code settings
	const vscodeProxy = vscode.workspace.getConfiguration().get<string>('http.proxy');
	if (vscodeProxy) {
		return vscodeProxy;
	}

	// Fallback to OS environment variables
	const httpProxy = process.env.http_proxy || process.env.HTTP_PROXY;
	const httpsProxy = process.env.https_proxy || process.env.HTTPS_PROXY;
	return httpProxy || httpsProxy;
}

async function fetchWithProxy(url: string, body: any, options: any = {}) {
	const proxy = getDefaultProxy();
	if (proxy) {
		const agent = new HttpsProxyAgent(proxy);
		options.httpsAgent = agent;
		options.httpAgent = agent;
	}

	try {
		const response = await axios.post(url, body, options);
		return response.data;
	} catch (error: any) {
		vscode.window.showErrorMessage('Error fetching data: ' + error.message);
		throw error;
	}
}

function standarlizedText(text: string): string {
	let op = text;
	const regexArray: any[] = [];
	regexArray.forEach(regex => {
		op = op.replace(regex, '');
	});
	return op;
}

async function convertKanjiToRomajiOffline(text: string): Promise<string> {
	console.log('convertKanjiToRomajiOffline', text);
	let op = '';
	const kuroshiro = await getKuroshiroInstance();
	const hiraganaConverted = await kuroshiro.convert(text, { to: 'katakana' });
	op = await toRomajiTextHepburn(hiraganaConverted);
	return op;
}

async function convertKanjiToRomaji(text: string): Promise<string> {
	console.log('convertKanjiToRomaji', text);
	let op = '';

	const requestUrl = 'https://labs.goo.ne.jp/api/katakana';
	const body = JSON.stringify({
		app_id: gooLabApiKey,
		sentence: text,
		output_type: 'katakana',
	});

	const result = await fetchWithProxy(requestUrl, body, {
		headers: {
			'Content-Type': 'application/json',
		},
	});

	const hiraganaConverted = result.converted;
	op = await toRomajiTextHepburn(hiraganaConverted);
	return op;
}

async function convertToRomanjiUsingGooLab(text: string): Promise<string> {
	const requestUrl = 'https://labs.goo.ne.jp/api/katakana';
	const body = JSON.stringify({
		app_id: gooLabApiKey,
		sentence: text,
		output_type: 'katakana',
	});

	const result = await fetchWithProxy(requestUrl, body, {
		headers: {
			'Content-Type': 'application/json',
		},
	});

	return result.converted;
}

async function toRomajiTextHepburn(text: string): Promise<string> {
	return toHepburn(text);
}

async function getKuroshiroInstance() {
	if (kuroshiro) {
		return kuroshiro;
	}

	const newKuroshiro = new Kuroshiro();
	let currentDistDir = path.join(__dirname, '..', 'node_modules', 'kuromoji', 'dict');
	// currentDistDir if in prod, in ./kuromoji/dict in prod
	if (process.env.NODE_ENV === 'production') {
		currentDistDir = path.join(__dirname, 'kuromoji', 'dict');
	}
	const analyzer = new KuromojiAnalyzer({ dictPath: currentDistDir });
	await newKuroshiro.init(analyzer);
	kuroshiro = newKuroshiro;
	return newKuroshiro;
}

export function toHepburn(input: string) {
	const map: any = HIRA_KATA_ROMANJI_MAP;
	let romaData = "";
	let resultData = "";
	const sourceData = input;

	// First pass: Convert Hiragana/Katakana to Romanji
	for (let i = 0; i < sourceData.length; i++) {
		const tempData = sourceData.substring(i, i + 1);
		const tempData2 = sourceData.substring(i, i + 2);
		if (map[tempData2] !== undefined) {
			romaData += map[tempData2];
			i++;
		} else if (map[tempData] !== undefined) {
			romaData += map[tempData];
		} else {
			romaData += tempData;
		}
	}

	// Second pass: Handle special cases in Romanji
	for (let i = 0; i < romaData.length; i++) {
		const tempData = romaData.substring(i, i + 1);
		const tempData2 = romaData.substring(i, i + 2);
		const tempData3 = romaData.substring(i, i + 3);
		const tempData4 = romaData.substring(i, i + 4);
		const tempData6 = romaData.substring(i, i + 6);
		const subStr2 = tempData2.substring(1, 2);

		if (tempData4 === "noue") {
			resultData += "noue";
			i += 3;
		} else if (tempData6 === "touchi") {
			resultData += "touchi";
			i += 5;
		} else if (tempData2 === "uu" || tempData2 === "ee" || tempData2 === "ou" || tempData2 === "oo") {
			// check if tempData2 is oo and this is the last character, then keep it as oo
			if (i === romaData.length - 2 && tempData2 === "oo") {
				resultData += tempData2;
			} else {
				resultData += tempData;
			}
			i++;
		} else if (tempData2 === "nb" || tempData2 === "nm" || tempData2 === "np") {
			resultData += "m";
		} else if (tempData === "っ" || tempData === "ッ") {
			if (tempData3 === "っch" || tempData3 === "ッch") {
				resultData += "t";
			} else if (subStr2.match(/[a-z]/gi)) {
				resultData += subStr2;
			} else {
				resultData += "tsu";
			}
		} else {
			resultData += tempData;
		}
	}

	return resultData;
}

// This method is called when your extension is deactivated
export function deactivate() { }