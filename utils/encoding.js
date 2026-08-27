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

/**
 * UTF-8文字コード表の近傍スライス（3行×8列=24マス）を生成
 */
const generateUtf8TableSlice = (utf8Bytes, targetChar) => {
    if (!utf8Bytes || utf8Bytes.length === 0) return null;

    if (utf8Bytes.length === 1) {
        const targetByte = utf8Bytes[0];
        const baseRowStart = Math.floor(targetByte / 8) * 8;
        const startByte = Math.max(0, Math.min(128 - 24, baseRowStart - 8));
        const rows = [[], [], []];

        for (let i = 0; i < 24; i++) {
            const b = startByte + i;
            const rowIndex = Math.floor(i / 8);
            let charStr = '·';
            if (b === 0x20) charStr = 'SP';
            else if (b > 0x20 && b <= 0x7E) charStr = String.fromCharCode(b);

            rows[rowIndex].push({
                fullHex: b.toString(16).toUpperCase().padStart(2, '0'),
                shortHex: b.toString(16).toUpperCase().padStart(2, '0'),
                char: charStr,
                isTarget: b === targetByte,
                isValid: b >= 0x20 && b <= 0x7E
            });
        }

        return {
            encoding: 'UTF-8',
            title: 'UTF-8 コード表 (ASCII領域)',
            matchedBytes: toHexString(utf8Bytes),
            targetChar: targetChar,
            startRangeHex: startByte.toString(16).toUpperCase().padStart(2, '0'),
            endRangeHex: (startByte + 23).toString(16).toUpperCase().padStart(2, '0'),
            rows
        };
    }

    const prefix = utf8Bytes.slice(0, -1);
    const lastByte = utf8Bytes[utf8Bytes.length - 1];
    const baseRowStart = Math.floor(lastByte / 8) * 8;
    const startByte = Math.max(0x80, Math.min(0xC0 - 24, baseRowStart - 8));
    const prefixHex = prefix.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');

    const rows = [[], [], []];
    const decoder = new TextDecoder('utf-8', { fatal: false });

    for (let i = 0; i < 24; i++) {
        const b = startByte + i;
        const rowIndex = Math.floor(i / 8);
        const candidateBytes = new Uint8Array([...prefix, b]);
        let charStr = decoder.decode(candidateBytes);
        const isValid = charStr.length > 0 && !charStr.includes('\uFFFD');
        if (!isValid) charStr = '·';

        rows[rowIndex].push({
            fullHex: prefixHex + ' ' + b.toString(16).toUpperCase().padStart(2, '0'),
            shortHex: b.toString(16).toUpperCase().padStart(2, '0'),
            char: charStr,
            isTarget: b === lastByte,
            isValid
        });
    }

    return {
        encoding: 'UTF-8',
        title: `UTF-8 コード表 [${prefixHex} xx] 領域`,
        matchedBytes: toHexString(utf8Bytes),
        targetChar: targetChar,
        startRangeHex: prefixHex + ' ' + startByte.toString(16).toUpperCase().padStart(2, '0'),
        endRangeHex: prefixHex + ' ' + (startByte + 23).toString(16).toUpperCase().padStart(2, '0'),
        rows
    };
};

/**
 * Shift-JIS文字コード表の近傍スライス（3行×8列=24マス）を生成
 */
const generateSjisTableSlice = (sjisBytes, targetChar) => {
    if (!sjisBytes || sjisBytes.length === 0) return null;

    if (sjisBytes.length === 1) {
        const targetByte = sjisBytes[0];
        const baseRowStart = Math.floor(targetByte / 8) * 8;
        const startByte = Math.max(0, Math.min(256 - 24, baseRowStart - 8));
        const rows = [[], [], []];

        for (let i = 0; i < 24; i++) {
            const b = startByte + i;
            const rowIndex = Math.floor(i / 8);
            let charStr = '·';
            try {
                const converted = Encoding.convert([b], { to: 'UNICODE', from: 'SJIS', type: 'string' });
                if (converted && converted !== '?') charStr = converted;
            } catch {
                charStr = '·';
            }

            rows[rowIndex].push({
                fullHex: b.toString(16).toUpperCase().padStart(2, '0'),
                shortHex: b.toString(16).toUpperCase().padStart(2, '0'),
                char: charStr,
                isTarget: b === targetByte,
                isValid: charStr !== '·'
            });
        }

        return {
            encoding: 'Shift-JIS',
            title: 'Shift-JIS コード表 (1バイト領域)',
            matchedBytes: toHexString(sjisBytes),
            targetChar: targetChar,
            startRangeHex: startByte.toString(16).toUpperCase().padStart(2, '0'),
            endRangeHex: (startByte + 23).toString(16).toUpperCase().padStart(2, '0'),
            rows
        };
    }

    const lead = sjisBytes[0];
    const trail = sjisBytes[1];
    const baseRowStart = Math.floor(trail / 8) * 8;
    const startTrail = Math.max(0x40, Math.min(0xFC - 23, baseRowStart - 8));
    const leadHex = lead.toString(16).toUpperCase().padStart(2, '0');

    const rows = [[], [], []];

    for (let i = 0; i < 24; i++) {
        const b = startTrail + i;
        const rowIndex = Math.floor(i / 8);
        let charStr = '·';
        let isValid = false;

        // Shift-JISの2バイト目範囲は 0x40..0x7E, 0x80..0xFC
        if ((b >= 0x40 && b <= 0x7E) || (b >= 0x80 && b <= 0xFC)) {
            try {
                const converted = Encoding.convert([lead, b], { to: 'UNICODE', from: 'SJIS', type: 'string' });
                if (converted && converted.length > 0 && converted !== '?') {
                    charStr = converted;
                    isValid = true;
                }
            } catch {
                charStr = '·';
            }
        }

        rows[rowIndex].push({
            fullHex: leadHex + ' ' + b.toString(16).toUpperCase().padStart(2, '0'),
            shortHex: b.toString(16).toUpperCase().padStart(2, '0'),
            char: charStr,
            isTarget: b === trail,
            isValid
        });
    }

    return {
        encoding: 'Shift-JIS',
        title: `Shift-JIS コード表 [${leadHex} xx] 領域`,
        matchedBytes: toHexString(sjisBytes),
        targetChar: targetChar,
        startRangeHex: leadHex + ' ' + startTrail.toString(16).toUpperCase().padStart(2, '0'),
        endRangeHex: leadHex + ' ' + (startTrail + 23).toString(16).toUpperCase().padStart(2, '0'),
        rows
    };
};

/**
 * UTF-8バイト列をShift-JISとして解釈した際のコード表スライス
 */
const generateSjisFromForeignBytes = (utf8Bytes) => {
    if (!utf8Bytes || utf8Bytes.length === 0) return null;

    const b1 = utf8Bytes[0];
    const b2 = utf8Bytes.length > 1 ? utf8Bytes[1] : 0x00;
    const isLeadByte = (b1 >= 0x81 && b1 <= 0x9F) || (b1 >= 0xE0 && b1 <= 0xFC);

    if (isLeadByte && utf8Bytes.length > 1) {
        const lead = b1;
        const trail = b2;
        const baseRowStart = Math.floor(trail / 8) * 8;
        const startTrail = Math.max(0x40, Math.min(0xFC - 23, baseRowStart - 8));
        const leadHex = lead.toString(16).toUpperCase().padStart(2, '0');
        const rows = [[], [], []];
        let targetDecoded = '·';

        for (let i = 0; i < 24; i++) {
            const b = startTrail + i;
            const rowIndex = Math.floor(i / 8);
            let charStr = '·';
            let isValid = false;

            if ((b >= 0x40 && b <= 0x7E) || (b >= 0x80 && b <= 0xFC)) {
                try {
                    const converted = Encoding.convert([lead, b], { to: 'UNICODE', from: 'SJIS', type: 'string' });
                    if (converted && converted.length > 0 && converted !== '?') {
                        charStr = converted;
                        isValid = true;
                        if (b === trail) targetDecoded = converted;
                    }
                } catch {
                    charStr = '·';
                }
            }

            rows[rowIndex].push({
                fullHex: leadHex + ' ' + b.toString(16).toUpperCase().padStart(2, '0'),
                shortHex: b.toString(16).toUpperCase().padStart(2, '0'),
                char: charStr,
                isTarget: b === trail,
                isValid
            });
        }

        return {
            encoding: 'Shift-JIS',
            title: `Shift-JIS コード表 [${leadHex} xx] 領域`,
            readBytes: toHexString([b1, b2]),
            resultChar: targetDecoded,
            statusDesc: `先頭2バイト [${toHexString([b1, b2])}] をShift-JISの2バイト文字として参照`,
            startRangeHex: leadHex + ' ' + startTrail.toString(16).toUpperCase().padStart(2, '0'),
            endRangeHex: leadHex + ' ' + (startTrail + 23).toString(16).toUpperCase().padStart(2, '0'),
            rows
        };
    }

    // 1バイトとして解釈
    const baseRowStart = Math.floor(b1 / 8) * 8;
    const startByte = Math.max(0, Math.min(256 - 24, baseRowStart - 8));
    const rows = [[], [], []];
    let targetDecoded = '·';

    for (let i = 0; i < 24; i++) {
        const b = startByte + i;
        const rowIndex = Math.floor(i / 8);
        let charStr = '·';
        try {
            const converted = Encoding.convert([b], { to: 'UNICODE', from: 'SJIS', type: 'string' });
            if (converted && converted !== '?') {
                charStr = converted;
                if (b === b1) targetDecoded = converted;
            }
        } catch {
            charStr = '·';
        }

        rows[rowIndex].push({
            fullHex: b.toString(16).toUpperCase().padStart(2, '0'),
            shortHex: b.toString(16).toUpperCase().padStart(2, '0'),
            char: charStr,
            isTarget: b === b1,
            isValid: charStr !== '·'
        });
    }

    return {
        encoding: 'Shift-JIS',
        title: 'Shift-JIS コード表 (1バイト領域)',
        readBytes: toHexString([b1]),
        resultChar: targetDecoded,
        statusDesc: `先頭バイト [${b1.toString(16).toUpperCase().padStart(2, '0')}] をShift-JISの1バイト文字として参照`,
        startRangeHex: startByte.toString(16).toUpperCase().padStart(2, '0'),
        endRangeHex: (startByte + 23).toString(16).toUpperCase().padStart(2, '0'),
        rows
    };
};

/**
 * Shift-JISバイト列をUTF-8として解釈した際のコード表スライス
 */
const generateUtf8FromForeignBytes = (sjisBytes) => {
    if (!sjisBytes || sjisBytes.length === 0) return null;

    const b1 = sjisBytes[0];
    const b1Hex = b1.toString(16).toUpperCase().padStart(2, '0');

    // UTF-8の先頭バイト範囲チェック
    if (b1 >= 0x80 && b1 <= 0xBF) {
        return {
            encoding: 'UTF-8',
            title: 'UTF-8 コード表 (無効な先頭バイト)',
            readBytes: toHexString([b1]),
            resultChar: ' (未定義)',
            isInvalidLead: true,
            invalidReason: `バイト [${b1Hex}] はUTF-8では「2バイト目以降の継続バイト(0x80〜0xBF)」専用です。先頭文字としては文字コード表に存在しないため、変換エラー()となります。`,
            rows: null
        };
    }

    if (b1 <= 0x7F) {
        // ASCIIとして読める
        const baseRowStart = Math.floor(b1 / 8) * 8;
        const startByte = Math.max(0, Math.min(128 - 24, baseRowStart - 8));
        const rows = [[], [], []];

        for (let i = 0; i < 24; i++) {
            const b = startByte + i;
            const rowIndex = Math.floor(i / 8);
            let charStr = '·';
            if (b === 0x20) charStr = 'SP';
            else if (b > 0x20 && b <= 0x7E) charStr = String.fromCharCode(b);

            rows[rowIndex].push({
                fullHex: b.toString(16).toUpperCase().padStart(2, '0'),
                shortHex: b.toString(16).toUpperCase().padStart(2, '0'),
                char: charStr,
                isTarget: b === b1,
                isValid: b >= 0x20 && b <= 0x7E
            });
        }

        return {
            encoding: 'UTF-8',
            title: 'UTF-8 コード表 (ASCII領域)',
            readBytes: b1Hex,
            resultChar: String.fromCharCode(b1),
            statusDesc: `先頭バイト [${b1Hex}] はASCII領域のためUTF-8でも一致`,
            startRangeHex: startByte.toString(16).toUpperCase().padStart(2, '0'),
            endRangeHex: (startByte + 23).toString(16).toUpperCase().padStart(2, '0'),
            rows
        };
    }

    // 0xC2以降のマルチバイト先頭
    const prefix = [b1];
    const b2 = sjisBytes.length > 1 ? sjisBytes[1] : 0x80;
    const baseRowStart = Math.floor(b2 / 8) * 8;
    const startByte = Math.max(0x80, Math.min(0xC0 - 24, baseRowStart - 8));
    const rows = [[], [], []];
    const decoder = new TextDecoder('utf-8', { fatal: false });
    let targetDecoded = '·';

    for (let i = 0; i < 24; i++) {
        const b = startByte + i;
        const rowIndex = Math.floor(i / 8);
        const candidateBytes = new Uint8Array([...prefix, b]);
        let charStr = decoder.decode(candidateBytes);
        const isValid = charStr.length > 0 && !charStr.includes('\uFFFD');
        if (!isValid) charStr = '·';
        if (b === b2) targetDecoded = charStr;

        rows[rowIndex].push({
            fullHex: b1Hex + ' ' + b.toString(16).toUpperCase().padStart(2, '0'),
            shortHex: b.toString(16).toUpperCase().padStart(2, '0'),
            char: charStr,
            isTarget: b === b2,
            isValid
        });
    }

    return {
        encoding: 'UTF-8',
        title: `UTF-8 コード表 [${b1Hex} xx] 領域`,
        readBytes: toHexString(sjisBytes.slice(0, 2)),
        resultChar: targetDecoded,
        statusDesc: `先頭バイト [${b1Hex}] からUTF-8として読込`,
        startRangeHex: b1Hex + ' ' + startByte.toString(16).toUpperCase().padStart(2, '0'),
        endRangeHex: b1Hex + ' ' + (startByte + 23).toString(16).toUpperCase().padStart(2, '0'),
        rows
    };
};

/**
 * 1文字目から、UTF-8およびShift-JISの近傍文字コード表（3行×8列 = 24マス）を比較生成
 */
export const getCodeTableComparison = (input, saveMode, openMode) => {
    if (!input || input.length === 0) return null;

    const firstChar = Array.from(input)[0];
    const utf8Bytes = toUTF8Array(firstChar);
    const sjisBytes = toSJISArray(firstChar);

    // 1. 保存形式のコード表 (Save Table)
    let saveTable = null;
    if (saveMode === 'UTF8') {
        saveTable = generateUtf8TableSlice(utf8Bytes, firstChar);
    } else {
        saveTable = generateSjisTableSlice(sjisBytes, firstChar);
    }

    // 2. 表示（開く）形式のコード表 (Open Table)
    const savedBytes = saveMode === 'UTF8' ? utf8Bytes : (sjisBytes || []);
    let openTable = null;

    if (openMode === 'UTF8') {
        if (saveMode === 'UTF8') {
            openTable = generateUtf8TableSlice(utf8Bytes, firstChar);
        } else {
            openTable = generateUtf8FromForeignBytes(savedBytes);
        }
    } else {
        // openMode === 'SJIS'
        if (saveMode === 'SJIS') {
            openTable = generateSjisTableSlice(sjisBytes, firstChar);
        } else {
            openTable = generateSjisFromForeignBytes(savedBytes);
        }
    }

    return {
        firstChar,
        saveMode,
        openMode,
        saveTable,
        openTable
    };
};

