// 定数定義
// 授業で使用する際は、ここにAPIキーを設定してください。
// セキュリティ上の理由から、GitHub等の公開リポジトリにAPIキーを含めたままアップロードしないでください。
export const API_KEY = ""; 

export const FONTS = [
    { name: 'ゴシック体', family: 'font-sans' },
    { name: '明朝体', family: 'font-serif' },
    { name: '手書き風', family: 'font-hand' },
    { name: '等幅', family: 'font-mono' },
];

export const INITIAL_QUIZ_DATA = [
    {
        id: 1,
        question: "次のバイナリ `01000001` (UTF-8) が表す文字は？",
        options: ["A", "a", "1", "B"],
        answer: "A",
        explanation: "UTF-8（ASCII互換）では、`01000001`は16進数で`41`となり、これは「A」を表します。"
    },
    {
        id: 2,
        question: "「あ」のUTF-8表現はどれ？",
        options: ["E3 81 82", "82 A0", "30 42", "41"],
        answer: "E3 81 82",
        explanation: "UTF-8では日本語の多くは3バイトで表現されます。「あ」は `E3 81 82` です。`82 A0` はShift-JISです。"
    }
];