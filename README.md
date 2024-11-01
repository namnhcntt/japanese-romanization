# japanese-romanization

Help the developer to convert Japanese text to Romanization.

The published extension can be found at [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=vietprogrammer.japanese-romanization).

![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/vietprogrammer.japanese-romanization)
![Visual Studio Marketplace Downloads](https://img.shields.io/visual-studio-marketplace/d/vietprogrammer.japanese-romanization)
![Visual Studio Marketplace Rating](https://img.shields.io/visual-studio-marketplace/stars/vietprogrammer.japanese-romanization)
![Visual Studio Marketplace Installs](https://img.shields.io/visual-studio-marketplace/i/vietprogrammer.japanese-romanization)
![License](https://img.shields.io/github/license/namnhcntt/vscode-japanese-romanization)


## Features

* Convert Japanese text (Hiragana, Katakana and Kanji) to Romanization (Hepburn style).

## Requirements

The language modes support by this extension are:
- javascript
- typescript
- csharp
- json
- plaintext
- ini
- markdown
- yaml
- xml
- html
- css
- scss
- less

## Usage

Select the text you want to convert and press ***control .*** (**control + period**) to convert the text.

![Screenshot demo 1](./data/Screenshot_1.png)

![Screenshot demo 2](./data/Screenshot_2.gif)

## Command

* `extension.japaneseRomanization`: Transform the selected text.
* `extension.importCache`: Import cache from a file.
* `extension.exportCache`: Export cache to a file.
* `extension.clearCache`: Clear cache.
* `extension.importDictionary`: Import dictionary from a file.
* `extension.exportDictionary`: Export dictionary to a file.
* `extension.clearDictionary`: Clear dictionary.
* `extension.editDictionary`: Edit dictionary.

## Extension Settings

This extension contributes the following settings:

* `provider`: Provider for convert Kanji text.
    * `offline` (**default**): Use the kuroshiro library to convert the text.
    * `goo`: Use the labs.goo.ne.jp API to convert the text.
    * `OpenAI` (Beta): Use the OpenAI API to convert the text and OpenAI-like endpoint.
* `apiKey`: API key for the labs.goo.ne.jp API. (Only required if the provider is goo)
* `customOpenAIUrl`: Custom OpenAI URL (Only required if the provider is OpenAI)
* `cache` (default **false**): Cache the result of the conversion. (Faster convert for goo provider)
* `enableTransformMode`: Enable transform mode in the suggestion list.

## Known Issues

N/A

## Development

```bash
yarn install
```

Then press F5 from visual studio code. If you get the warning: "The task 'npm: watch' cannot be tracked. Make sure to have a problem matcher defined." then click debug anyway.

## Release Notes

### 0.0.1

First draft version. Conversion using https://labs.goo.ne.jp

### 0.0.2

Support offline convertion.
Using kuroshiro: https://github.com/sglkc/kuroshiro-ts 

### 0.0.3

* Add settings to allow user to choose the provider.
* New command: import cache, export cache, clear cache.

### 0.1.0

* Allow user transform japanese to romaji using custom action.

### 0.2.0

* Update readme
* Update icon

### 0.2.1

* Add screenshort demo.

### 0.3.0

* Support transform multiple lines of text.
* Transform mode can be customized in setting. (kanjiToRomanji.enableTransformMode)
* Add new transform mode: upper snake case (UPPER_SNAKE_CASE), back to japanese (Japanese) (only available if exist in dictionary or transformed before)
* Beta support OpenAI provider (and OpenAI API-like endpoint)
* Add command to import, export, clear, edit dictionary.
* Fix some issue when transform.

### 0.4.0

* Fix issue when transform with dictionary.

---
**Enjoy!**
