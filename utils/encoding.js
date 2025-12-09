/**
 * 文字列をUTF-8のバイト配列に変換
 */
export const toUTF8Array = (str) => {
    const encoder = new TextEncoder();
    return Array.from(encoder.encode(str));
};

/**
 * 文字列をShift-JISのバイト配列に変換
 * (encoding-japanese ライブラリを使用)
 */
export const toSJISArray = (str) => {
    if (!window.Encoding) return [];
    // Unicode -> SJIS
    const unicodeArray = Encoding.stringToCode(str);
    const sjisArray = Encoding.convert(unicodeArray, {
        to: 'SJIS',
        from: 'UNICODE'
    });
    return sjisArray;
};

/**
 * バイト配列を16進数文字列に変換 (例: [227, 129, 130] -> "E3 81 82")
 */
export const toHexString = (byteArray) => {
    return byteArray.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
};

/**
 * バイト配列を2進数文字列に変換 (例: [65] -> "01000001")
 */
export const toBinaryString = (byteArray) => {
    return byteArray.map(b => b.toString(2).padStart(8, '0')).join(' ');
};

/**
 * 1文字ごとの詳細データを生成する
 */
export const analyzeText = (text) => {
    if (!text) return [];
    
    // 文字列を1文字ずつ分割（サロゲートペア対応）
    const chars = Array.from(text);
    
    return chars.map(char => {
        const utf8 = toUTF8Array(char);
        const sjis = toSJISArray(char);
        
        return {
            char: char,
            codePoint: 'U+' + char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'),
            utf8: {
                bytes: utf8,
                hex: toHexString(utf8),
                binary: toBinaryString(utf8)
            },
            sjis: {
                bytes: sjis,
                hex: toHexString(sjis),
                binary: toBinaryString(sjis)
            }
        };
    });
};