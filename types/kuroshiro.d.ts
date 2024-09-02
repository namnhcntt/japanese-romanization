declare module 'kuroshiro' {
    export interface ConvertOptions {
        mode?: 'normal' | 'spaced' | 'okurigana' | 'furigana',
        delimiter_start?: string,
        delimiter_end?: string,
        romajiSystem?: 'passport' | 'hepburn' | 'nippon' | 'kunrei' | 'unicode',
    }

    class Kuroshiro {
        init(analyzer: any): Promise<void>;
        convert(text: string, options?: any): Promise<string>;
        // Type definitions for kuroshiro.js
        // Project: https://github.com/Shadowlauch/kuroshiro.js
        // Definitions by: Lars Naurath <https://github.com/Shadowlauch>

        init(options?: { dicPath?: string }, callback?: (err?: any) => void): void;
        init(callback?: (err?: any) => void): void;

        convert(str: string, options?: { to?: 'hiragana' | 'katakana' | 'romaji', } & ConvertOptions): string;

        toHiragana(str: string, options?: ConvertOptions): string;

        toKatakana(str: string, options?: ConvertOptions): string;

        toRomaji(str: string, options?: ConvertOptions): string;

        toKana(str: string, options?: ConvertOptions): string;

        isHiragana(str: string): boolean;

        isKatakana(str: string): boolean;

        isRomaji(str: string): boolean;

        isKanji(str: string): boolean;

        hasHiragana(str: string): boolean;

        hasKatakana(str: string): boolean;

        hasKanji(str: string): boolean;
    }
    export default Kuroshiro;
}