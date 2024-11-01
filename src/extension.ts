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
let openAIUrl: string;
let openAIKey: string;
let dictionaryFilePath: string;
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
	dictionaryFilePath = path.join(context.extensionPath, 'data', 'dictionary.json');
	const config = vscode.workspace.getConfiguration('kanjiToRomanji');
	const provider = config.get<string>('provider', 'offline');
	gooLabApiKey = config.get<string>('apiKey', '');
	openAIUrl = config.get<string>('customOpenAIUrl', '');
	openAIKey = config.get<string>('apiKey', '');
	const cache = config.get<boolean>('cache', true);
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

			try {
				const lines = splitSelectedTextToSingleLine(selectedText);
				if (lines.length > 0) {
					let op = '';
					for (const line of lines) {
						if (!isJapaneseWord(line)) {
							// Convert the selected text to the selected case
							const transformedText = transformTextToAnotherMode(line, romanjiCase);
							op += '\n' + transformedText;
						} else {
							const translatedText = await doTransformText(line, cache, provider, romanjiCase);
							op += '\n' + translatedText;
						}
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

	// edit dictionary (if dictionary.json file not exist, create it)
	let editDictionaryDisposable = vscode.commands.registerCommand('extension.editDictionary', async () => {
		// open dictionary.json file in vscode
		const dictionaryFilePath = path.join(context.extensionPath, 'data', 'dictionary.json');
		// if file does not exist, create it, with schema dictionary.schema.json
		if (!fs.existsSync(dictionaryFilePath)) {
			const initData = {
				"$schema": "dictionary.schema.json",
				"data": [
					{
						"sourceText": "",
						"transformedRomaji": ""
					}
				]
			};
			fs.writeFileSync(dictionaryFilePath, JSON.stringify(initData, null, 2));
		}

		vscode.workspace.openTextDocument(dictionaryFilePath).then(doc => {
			vscode.window.showTextDocument(doc);
		});
	});
	context.subscriptions.push(editDictionaryDisposable);

	// importDictionary
	let importDictionaryDisposable = vscode.commands.registerCommand('extension.importDictionary', async () => {
		// import from path select like the import cache
		const importPath = await vscode.window.showOpenDialog({
			filters: {
				JSON: ['json']
			}
		});
		if (!importPath) {
			return;
		}
		const dictionaryData = JSON.parse(fs.readFileSync(importPath[0].fsPath, 'utf8'));
		fs.writeFileSync(dictionaryFilePath, JSON.stringify(dictionaryData, null, 2));
		vscode.window.showInformationMessage('Dictionary imported!');
	});
	context.subscriptions.push(importDictionaryDisposable);
	// exportDictionary
	let exportDictionaryDisposable = vscode.commands.registerCommand('extension.exportDictionary', async () => {
		// export to a file dialog, default file name is dictionary.json
		const exportPath = await vscode.window.showSaveDialog({
			defaultUri: vscode.Uri.file(path.join(context.extensionPath, 'data', 'dictionary.json')),
			filters: {
				JSON: ['json']
			}
		});
		if (!exportPath) {
			return;
		}
		const dictionaryData = JSON.parse(fs.readFileSync(dictionaryFilePath, 'utf8'));
		fs.writeFileSync(exportPath.fsPath, JSON.stringify(dictionaryData, null, 2));
		vscode.window.showInformationMessage('Dictionary exported!');
	});
	context.subscriptions.push(exportDictionaryDisposable);
	// clearDictionary
	let clearDictionaryDisposable = vscode.commands.registerCommand('extension.clearDictionary', async () => {
		fs.writeFileSync(dictionaryFilePath, JSON.stringify({ "$schema": "dictionary.schema.json", "data": [] }, null, 2));
		vscode.window.showInformationMessage('Dictionary cleared!');
	});
	context.subscriptions.push(clearDictionaryDisposable);
}

function transformLineByDictionary(line: string): string {
	let op = line;
	const length = line.length;
	let currentText = '';
	const tokens = [];
	for (let i = 0; i < length; i++) {
		for (let j = i + 1; j <= length; j++) {
			const text = line.substring(i, j);
			tokens.push(text);
		}
	}

	// sort tokens from length from longest to shortest
	tokens.sort((a, b) => b.length - a.length);
	for (const token of tokens) {
		const transformedText = transformTextByDictionary(token);
		if (transformedText !== token) {
			op = op.replace(token, transformedText);
		}
	}

	return op;
}

function transformTextByDictionary(selectedText: string): string {
	// read dictionary.json file
	const dictionaryData = JSON.parse(fs.readFileSync(dictionaryFilePath, 'utf8'));
	// find the item in dictionaryData.data that has sourceText equal to selectedText
	const item = dictionaryData.data.find((item: any) => item.sourceText === selectedText);
	if (item) {
		return item.transformedRomaji;
	}
	return selectedText;
}

function splitSelectedTextToSingleLine(selectedText: string): string[] {
	const lines = selectedText.split(/\r?\n/);
	return lines.map(line => line.trim());
}

function isJapaneseWord(selectedText: string): boolean {
	// convert selectedText to array of character, and check if at least one character is hiragana, katakana, or kanji, then return true
	const selectedTextArray = selectedText.split('');
	for (const char of selectedTextArray) {
		if (isHiragana(char) || isKatakana(char) || isKanji(char)) {
			return true;
		}
	}
	return false;
}

/*
Check if the selected text is already in camel case, snake case, kebab case, pascal case, or upper snake case. Then convert it to the other cases.
*/
function transformTextToAnotherMode(selectedText: string, selectedRomajiCase: RomajiCase): string {
	// detect source romajiCase of selectedText from content
	let sourceRomajiCase: RomajiCase = RomajiCase.CAMEL;
	if (selectedText.includes('_')) {
		sourceRomajiCase = RomajiCase.SNAKE;
	} else if (selectedText.includes('-')) {
		sourceRomajiCase = RomajiCase.KEBAB;
	} else if (selectedText.startsWith(selectedText[0].toUpperCase())) {
		sourceRomajiCase = RomajiCase.PASCAL;
	} else if (selectedText.startsWith(selectedText[0].toLowerCase())) {
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

	// transform part of text by dictionary, then tokenlize the rest
	const dictionaryTransformedText = transformLineByDictionary(standarlized);

	if (!isJapaneseWord(dictionaryTransformedText)) {
		return transformTextToAnotherMode(dictionaryTransformedText, selectedRomajiCase);
	}

	const tokens = tokenize(dictionaryTransformedText);
	console.log('tokens', tokens);
	let op = '';
	for (const token of tokens) {
		let translatedText = token;
		try {
			const tokenStr = token as string;
			if (cache && kanjiData[tokenStr]) {
				translatedText = kanjiData[tokenStr];
			} else {
				const textFromDict = transformTextByDictionary(tokenStr);
				if (textFromDict !== tokenStr) {
					translatedText = transformTextToAnotherMode(textFromDict, selectedRomajiCase);
					console.debug('translatedText from dictionary', tokenStr, translatedText);
				} else if (isHiragana(tokenStr) || isKatakana(tokenStr)) {
					translatedText = await toRomajiTextHepburn(tokenStr);
				} else if (isKanji(tokenStr)) {
					if (provider === 'labs.goo.ne.jp') {
						translatedText = await convertKanjiToRomaji(tokenStr);
						console.log('translated kanji', tokenStr, translatedText);
					} else if (provider === 'OpenAI') {
						translatedText = await convertKanjiToRomajiByOpenAI(tokenStr);
					}
					else {
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
	const hiraganaConverted = await kuroshiro.convert(text, { to: 'katakana', mode: 'spaced' });
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

async function convertKanjiToRomajiByOpenAI(text: string): Promise<string> {
	console.log('convertKanjiToRomajiByOpenAI', text);
	const prompt = `convert text to romaji (hepburn style): ${text} (no need to explain, just give me the output)`;
	const body = JSON.stringify({
		prompt: prompt,
		max_tokens: 60,
		stop: ['\n'],
	});

	const result = await fetchWithProxy(openAIUrl, body, {
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${openAIKey}`,
		},
	});

	return result.choices[0].text;
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

/**
 * Converts a string of Hiragana/Katakana characters to Hepburn Romanization.
 * This function processes the input in two passes: first for basic conversion, 
 * then for handling special Romanization cases.
 * 
 * @param input - The string containing Hiragana/Katakana characters to be converted.
 * @returns The Romanized string in Hepburn format.
 * @throws No exceptions are explicitly thrown, but invalid input may lead to unexpected results.
 */
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