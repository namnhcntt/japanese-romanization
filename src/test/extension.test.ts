import * as assert from 'assert';
// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { toHepburn, doTransformText } from '../extension';
import { RomajiCase } from '../constants';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Test toHepburn', () => {
		const testCases = [
			{ input: 'はっとり', expected: 'hattori' },
			{ input: 'しんばし', expected: 'shimbashi' },
			{ input: 'あおき', expected: 'aoki' },
			{ input: 'まつおか', expected: 'matsuoka' },
			{ input: 'ゆうか', expected: 'yuka' },
			{ input: 'さとう', expected: 'sato' },
			{ input: 'おおの', expected: 'ono' },
			{ input: 'おおおか', expected: 'ooka' },
			{ input: 'こおりやま', expected: 'koriyama' },
			{ input: 'さんぺい', expected: 'sampei' },
			{ input: 'ほんま', expected: 'homma' },
			{ input: 'かんだ', expected: 'kanda' },
			{ input: 'じゅん', expected: 'jun' },
			{ input: 'きっかわ', expected: 'kikkawa' },
			{ input: 'はっちょうぼり', expected: 'hatchobori' },
			{ input: 'みそのう', expected: 'misono' },
			{ input: 'たかとう', expected: 'takato' },
			{ input: 'せいのお', expected: 'seinoo' },
			{ input: 'ふじた', expected: 'fujita' },
			{ input: 'いけだ', expected: 'ikeda' },
			{ input: 'さとう', expected: 'sato' },
			{ input: 'たかはし', expected: 'takahashi' },
			{ input: 'ふじもと', expected: 'fujimoto' },
			{ input: 'いのうえ', expected: 'inoue' },
			{ input: 'いしい', expected: 'ishii' },
			{ input: 'いわさき', expected: 'iwasaki' },
		];

		for (const testCase of testCases) {
			const result = toHepburn(testCase.input);
			assert.strictEqual(result, testCase.expected);
		}
	});
});

suite('Extension Test Suite', () => {
	test('Test doTransformText', async () => {
		const cache = false;
		const provider = 'offline';

		const testCases = [
			// snake
			{ selectedText: 'はっとり しんばし あおき', selectedRomajiCase: RomajiCase.SNAKE, expected: 'hattori_shimbashi_aoki' },
			{ selectedText: 'まつおか ゆうか さとう', selectedRomajiCase: RomajiCase.SNAKE, expected: 'matsuoka_yuka_sato' },
			{ selectedText: 'おおの おおおか こおりやま', selectedRomajiCase: RomajiCase.SNAKE, expected: 'ono_ooka_koriyama' },
			{ selectedText: 'さんぺい ほんま かんだ', selectedRomajiCase: RomajiCase.SNAKE, expected: 'sampei_homma_kanda' },
			// end snake
			// pascal
			{ selectedText: 'まつおか ゆうか さとう', selectedRomajiCase: RomajiCase.PASCAL, expected: 'MatsuokaYukaSato' },
			{ selectedText: 'おおの おおおか こおりやま', selectedRomajiCase: RomajiCase.PASCAL, expected: 'OnoOokaKoriyama' },
			{ selectedText: 'さんぺい ほんま かんだ', selectedRomajiCase: RomajiCase.PASCAL, expected: 'SampeiHommaKanda' },
			// end pascal
			// camel
			{ selectedText: 'おおの おおおか こおりやま', selectedRomajiCase: RomajiCase.CAMEL, expected: 'onoOokaKoriyama' },
			{ selectedText: 'さんぺい ほんま かんだ', selectedRomajiCase: RomajiCase.CAMEL, expected: 'sampeiHommaKanda' },
			// end camel
			// kebab
			{ selectedText: 'さんぺい ほんま かんだ', selectedRomajiCase: RomajiCase.KEBAB, expected: 'sampei-homma-kanda' },
			{ selectedText: 'おおの おおおか こおりやま', selectedRomajiCase: RomajiCase.KEBAB, expected: 'ono-ooka-koriyama' },
			{ selectedText: 'はっとり しんばし あおき', selectedRomajiCase: RomajiCase.KEBAB, expected: 'hattori-shimbashi-aoki' },
			{ selectedText: 'まつおか ゆうか さとう', selectedRomajiCase: RomajiCase.KEBAB, expected: 'matsuoka-yuka-sato' },
			// end kebab

			// kanji
			{ selectedText: '計算書', selectedRomajiCase: RomajiCase.PASCAL, expected: 'Keisansho' },
			// end kanji

			// others
			{ selectedText: '受付事件コード', selectedRomajiCase: RomajiCase.PASCAL, expected: 'UKETSUKE_JIKEN_KODO' },
			// end others
		];

		for (const testCase of testCases) {
			const result = await doTransformText(testCase.selectedText, cache, provider, testCase.selectedRomajiCase);
			assert.strictEqual(result, testCase.expected);
		}
	});
});
