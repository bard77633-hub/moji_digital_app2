import Encoding from 'encoding-japanese';

/**
 * 文字列をUTF-8のバイト配列に変換
 */
export const toUTF8Array = (str) => {
    const encoder = new TextEncoder();
    return Array.from(encoder.encode(str));
};

/**
 * 文字列をShift-JISのバイト配列に変換
 */
export const toSJISArray = (str) => {
    try {
        const unicodeArray = Encoding.stringToCode(str);
        const sjisArray = Encoding.convert(unicodeArray, {
            to: 'SJIS',
            from: 'UNICODE',
            type: 'array'
        });
        
        return sjisArray;
    } catch (e) {
        return null;
    }
};

/**
 * バイト配列を16進数文字列に変換
 */
export const toHexString = (byteArray) => {
    if (!byteArray) return "";
    return byteArray.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
};

/**
 * バイト配列を2進数文字列に変換
 */
export const toBinaryString = (byteArray) => {
    if (!byteArray) return "";
    return byteArray.map(b => b.toString(2).padStart(8, '0')).join(' ');
};

/**
 * 1文字ごとの詳細データを生成する
 */
export const analyzeText = (text) => {
    if (!text) return [];
    
    const chars = Array.from(text);
    
    return chars.map((char, index) => {
        const utf8 = toUTF8Array(char);
        const sjis = toSJISArray(char);
        
        const isSjisValid = sjis && !(sjis.length === 1 && sjis[0] === 0x3F && char !== '?');

        return {
            id: index,
            char: char,
            codePoint: 'U+' + char.codePointAt(0)?.toString(16).toUpperCase().padStart(4, '0'),
            utf8: {
                bytes: utf8,
                length: utf8.length,
                hex: toHexString(utf8),
                binary: toBinaryString(utf8)
            },
            sjis: {
                bytes: sjis || [],
                length: isSjisValid ? sjis.length : 0,
                hex: toHexString(sjis || []),
                binary: toBinaryString(sjis || []),
                isValid: isSjisValid
            }
        };
    });
};
