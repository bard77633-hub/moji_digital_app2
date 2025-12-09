import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

// ==========================================
// 1. Constants
// ==========================================

const API_KEY = (typeof process !== 'undefined' && process.env && process.env.API_KEY) ? process.env.API_KEY : '';

const FONTS = [
    { name: 'ゴシック体', family: 'font-sans' },
    { name: '明朝体', family: 'font-serif' },
    { name: '手書き風', family: 'font-hand' },
    { name: '等幅', family: 'font-mono' },
];

// ==========================================
// 2. Utils
// ==========================================

const toUTF8Array = (str) => {
    const encoder = new TextEncoder();
    return Array.from(encoder.encode(str));
};

const toSJISArray = (str) => {
    // ライブラリがロードされているか確認
    const EncodingLib = window.Encoding;
    if (!EncodingLib) return null; // ロード前またはエラー
    
    try {
        const unicodeArray = EncodingLib.stringToCode(str);
        const sjisArray = EncodingLib.convert(unicodeArray, {
            to: 'SJIS',
            from: 'UNICODE',
            type: 'array'
        });
        
        // 逆変換して元の文字に戻るか確認（文字化け/非対応文字の判定）
        // ※絵文字などはSJISに変換すると '?' (0x3F) 等になったり、不正なバイト列になる
        const reversed = EncodingLib.convert(sjisArray, {
            to: 'UNICODE',
            from: 'SJIS',
            type: 'string'
        });

        // 厳密なチェック: 元の文字と異なる、またはSJISで表現できない文字(置換文字など)になった場合
        if (reversed !== str) {
             // 特定のケース: 絵文字などはライブラリによってはHTML実体参照っぽくなるか、?になる
             // ここでは「変換結果のバイト配列」は返すものの、警告フラグ用として扱う手もあるが、
             // 教育的には「SJIS配列」は見せつつ、「正しくないかも」と伝えるのが良い。
             // ただし、完全に非対応な文字（絵文字）は空配列や特定の値になることが多い。
             return sjisArray;
        }
        return sjisArray;
    } catch (e) {
        return null;
    }
};

const toHexString = (byteArray) => {
    if (!byteArray) return "";
    return byteArray.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
};

const toBinaryString = (byteArray) => {
    if (!byteArray) return "";
    return byteArray.map(b => b.toString(2).padStart(8, '0')).join(' ');
};

const analyzeText = (text) => {
    if (!text) return [];
    
    const chars = Array.from(text);
    
    return chars.map((char, index) => {
        const utf8 = toUTF8Array(char);
        const sjis = toSJISArray(char);
        
        // SJIS判定: ライブラリがない、または変換結果が怪しい場合
        // 絵文字などはSJISに変換すると、多くの場合 [63] ('?') になる
        const isSjisValid = sjis && !(sjis.length === 1 && sjis[0] === 0x3F && char !== '?');

        return {
            id: index,
            char: char,
            codePoint: 'U+' + char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'),
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

// ==========================================
// 3. Services
// ==========================================

let aiClient = null;

const getClient = () => {
    if (!API_KEY) return null;
    if (!aiClient) {
        aiClient = new GoogleGenAI({ apiKey: API_KEY });
    }
    return aiClient;
};

const askAITeacher = async (question, context = "") => {
    const client = getClient();
    if (!client) throw new Error("APIキー未設定");

    try {
        const prompt = `
        あなたは高校「情報I」の先生です。
        文脈: ${context}
        質問: ${question}
        回答ルール: 300文字以内。専門用語は例え話で解説。フレンドリーに。
        `;
        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Gemini Error:", error);
        throw new Error("AI先生が応答しませんでした。");
    }
};

// ==========================================
// 4. Components
// ==========================================

const Card = ({ children, className = "", title, headerAction }) => (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${className}`}>
        {title && (
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">{title}</h3>
                {headerAction}
            </div>
        )}
        <div className="p-4 md:p-6">
            {children}
        </div>
    </div>
);

const Button = ({ onClick, children, variant = "primary", className = "", disabled = false }) => {
    const base = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 justify-center";
    const variants = {
        primary: "bg-brand-600 text-white hover:bg-brand-500 shadow-md shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed",
        secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:text-brand-600",
        ghost: "text-slate-500 hover:text-brand-600 hover:bg-brand-50",
    };
    return (
        <button onClick={onClick} className={`${base} ${variants[variant]} ${className}`} disabled={disabled}>
            {children}
        </button>
    );
};

const BitVisualizer = ({ binaryString, isDarkBg = false }) => {
    if (!binaryString) return null;
    // スペース区切りでバイトごとに分割 (例: "11100011 10000001" -> ["11100011", "10000001"])
    const bytes = binaryString.trim().split(/\s+/);
    
    return (
        <div className="flex flex-col gap-2 items-start">
            {bytes.map((byteStr, rowIdx) => (
                <div key={rowIdx} className="flex items-center gap-3">
                    <span className={`text-[10px] font-mono w-4 text-right select-none ${isDarkBg ? 'text-slate-500' : 'text-slate-400'}`}>
                        {rowIdx + 1}
                    </span>
                    <div className="flex gap-1">
                        {byteStr.split('').map((bit, colIdx) => (
                            <div 
                                key={colIdx}
                                className={`
                                    w-7 h-9 flex items-center justify-center rounded text-sm font-mono font-bold transition-all
                                    ${bit === '1' 
                                        ? 'bg-brand-500 text-white shadow-sm' 
                                        : (isDarkBg 
                                            ? 'bg-slate-800 text-slate-600 border border-slate-700' 
                                            : 'bg-white text-slate-300 border border-slate-200')}
                                `}
                            >
                                {bit}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

const HexBadge = ({ hex }) => (
    <span className="font-mono bg-slate-800 text-yellow-400 px-2 py-1 rounded text-sm tracking-wider shadow-sm">
        {hex}
    </span>
);

const MojibakeSimulator = ({ input }) => {
    const [utf8ToSjis, setUtf8ToSjis] = useState('');
    const [sjisToUtf8, setSjisToUtf8] = useState('');

    useEffect(() => {
        if (!input || !window.Encoding) return;

        // 1. UTF-8で保存されたファイルを、Shift-JISで開いた場合
        const utf8Bytes = toUTF8Array(input);
        try {
            const garbled = window.Encoding.convert(utf8Bytes, {
                to: 'UNICODE',
                from: 'SJIS',
                type: 'string'
            });
            setUtf8ToSjis(garbled);
        } catch (e) {
            setUtf8ToSjis('（変換エラー）');
        }

        // 2. Shift-JISで保存されたファイルを、UTF-8で開いた場合
        const sjisBytes = toSJISArray(input);
        if (sjisBytes && sjisBytes.length > 0) {
            try {
                const garbled = window.Encoding.convert(sjisBytes, {
                    to: 'UNICODE',
                    from: 'UTF8',
                    type: 'string'
                });
                setSjisToUtf8(garbled);
            } catch (e) {
                setSjisToUtf8('（変換エラー）');
            }
        } else {
             setSjisToUtf8('（Shift-JIS非対応）');
        }

    }, [input]);

    return (
        <Card title="体験！文字化けシミュレーター" className="border-red-100 bg-red-50/10">
            <div className="mb-4 text-sm text-slate-600">
                <p>「文字化け」は、保存時のルール（文字コード）と、開く時のルールが食い違うことで発生します。下のボックスで結果を確認してみよう。</p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
                {/* Case 1 */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 bg-slate-100 text-[10px] px-2 py-1 text-slate-500 font-mono rounded-bl">Scenario A</div>
                    <h4 className="font-bold text-slate-700 mb-1 flex items-center gap-2">
                        <span className="w-6 h-6 rounded bg-brand-100 text-brand-600 flex items-center justify-center text-xs"><i className="fa-solid fa-file-pen"></i></span>
                        UTF-8 保存
                        <i className="fa-solid fa-arrow-right text-slate-300 text-xs"></i>
                        <span className="w-6 h-6 rounded bg-orange-100 text-orange-600 flex items-center justify-center text-xs"><i className="fa-solid fa-glasses"></i></span>
                        Shift-JIS 表示
                    </h4>
                    <p className="text-xs text-slate-400 mb-3">最近のWebサイトを古いソフトで開いた時など</p>
                    
                    <div className="bg-slate-900 rounded-lg p-4 relative">
                        <div className="text-slate-400 text-xs mb-1 font-mono">結果:</div>
                        <div className="text-yellow-400 font-mono text-lg break-all min-h-[2rem]">
                            {utf8ToSjis}
                        </div>
                    </div>
                </div>

                {/* Case 2 */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 bg-slate-100 text-[10px] px-2 py-1 text-slate-500 font-mono rounded-bl">Scenario B</div>
                    <h4 className="font-bold text-slate-700 mb-1 flex items-center gap-2">
                         <span className="w-6 h-6 rounded bg-orange-100 text-orange-600 flex items-center justify-center text-xs"><i className="fa-solid fa-file-pen"></i></span>
                        Shift-JIS 保存
                        <i className="fa-solid fa-arrow-right text-slate-300 text-xs"></i>
                         <span className="w-6 h-6 rounded bg-brand-100 text-brand-600 flex items-center justify-center text-xs"><i className="fa-solid fa-glasses"></i></span>
                        UTF-8 表示
                    </h4>
                    <p className="text-xs text-slate-400 mb-3">古いメモ帳のファイルをブラウザで開いた時など</p>

                    <div className="bg-slate-900 rounded-lg p-4 relative">
                        <div className="text-slate-400 text-xs mb-1 font-mono">結果:</div>
                        <div className="text-yellow-400 font-mono text-lg break-all min-h-[2rem]">
                            {sjisToUtf8}
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
};

// ==========================================
// 5. Main Application Logic
// ==========================================

const App = () => {
    const [view, setView] = useState('converter');
    
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 font-sans">
            <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-brand-500/30">
                            <i className="fa-solid fa-code"></i>
                        </div>
                        <h1 className="font-bold text-xl tracking-tight text-slate-800">デジ文字ラボ</h1>
                    </div>
                    
                    <nav className="flex gap-1">
                        <NavButton active={view === 'converter'} onClick={() => setView('converter')} icon="fa-keyboard">ラボ</NavButton>
                        <NavButton active={view === 'about'} onClick={() => setView('about')} icon="fa-book">解説</NavButton>
                    </nav>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 py-8">
                {view === 'converter' && <ConverterView />}
                {view === 'about' && <AboutView />}
            </main>
        </div>
    );
};

const NavButton = ({ active, onClick, icon, children }) => (
    <button 
        onClick={onClick}
        className={`
            px-3 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2
            ${active 
                ? 'bg-brand-50 text-brand-700' 
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}
        `}
    >
        <i className={`fa-solid ${icon}`}></i>
        <span className="hidden sm:inline">{children}</span>
    </button>
);

// --- Converter View ---

const ConverterView = () => {
    const [input, setInput] = useState('こんにちは');
    const [analysis, setAnalysis] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [selectedFont, setSelectedFont] = useState(FONTS[0]);

    useEffect(() => {
        setAnalysis(analyzeText(input));
        if (input.length === 0) setSelectedIndex(-1);
        else if (selectedIndex >= input.length) setSelectedIndex(0);
        else if (selectedIndex === -1 && input.length > 0) setSelectedIndex(0);
    }, [input]);

    const selectedCharData = analysis[selectedIndex];

    // 全体のバイト数計算
    const totalUtf8 = analysis.reduce((acc, item) => acc + item.utf8.length, 0);
    const totalSjis = analysis.reduce((acc, item) => acc + item.sjis.length, 0);
    const canFullSjis = analysis.every(item => item.sjis.isValid);

    return (
        <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
            {/* Input Area */}
            <Card className="border-brand-100 shadow-md">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex-1 w-full relative">
                        <label className="text-xs font-bold text-slate-500 mb-1 block">変換したい文字（最大10文字）</label>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            maxLength={10}
                            placeholder="ここに入力..."
                            className="w-full text-2xl p-3 pl-4 rounded-lg border-2 border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all font-sans"
                        />
                        <div className="absolute right-3 top-9 text-xs text-slate-400">
                            {input.length}/10
                        </div>
                    </div>
                    {/* Data Size Comparison Badge */}
                    {input.length > 0 && (
                        <div className="flex-shrink-0 flex gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <div className="text-center">
                                <div className="text-xs text-slate-500 font-bold">UTF-8</div>
                                <div className="text-xl font-bold text-brand-600">{totalUtf8}<span className="text-xs text-slate-400 ml-1">B</span></div>
                            </div>
                            <div className="w-px bg-slate-300"></div>
                            <div className="text-center">
                                <div className="text-xs text-slate-500 font-bold">Shift-JIS</div>
                                <div className={`text-xl font-bold ${canFullSjis ? 'text-orange-600' : 'text-slate-300'}`}>
                                    {canFullSjis ? totalSjis : '?'}<span className="text-xs text-slate-400 ml-1">B</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                {!canFullSjis && input.length > 0 && (
                    <div className="mt-2 text-xs text-red-500 flex items-center gap-1">
                        <i className="fa-solid fa-triangle-exclamation"></i>
                        一部の文字はShift-JISで表現できないため、正しいバイト数になりません。
                    </div>
                )}
            </Card>

            {input.length > 0 ? (
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Left Column: Selector & Details */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* Character Selector (Horizontal Scroll) */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">文字を選択して詳細を確認</h3>
                            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                {analysis.map((item, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedIndex(idx)}
                                        className={`
                                            flex-shrink-0 w-12 h-14 rounded-lg flex flex-col items-center justify-center transition-all border-2
                                            ${selectedIndex === idx 
                                                ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-md scale-105' 
                                                : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-brand-200 hover:bg-white'}
                                        `}
                                    >
                                        <span className="text-lg font-bold leading-none mb-1">{item.char}</span>
                                        <span className="text-[10px] font-mono opacity-60">{idx + 1}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Selected Character Detail */}
                        {selectedCharData && (
                            <CharacterDetailCard 
                                item={selectedCharData} 
                                fontClass={selectedFont.family} 
                            />
                        )}
                    </div>

                    {/* Right Column: Tools & AI */}
                    <div className="space-y-6">
                        <Card title="フォント比較">
                            <div className="space-y-2">
                                {FONTS.map(font => (
                                    <button
                                        key={font.name}
                                        onClick={() => setSelectedFont(font)}
                                        className={`w-full text-left px-3 py-2 rounded-lg border transition-all flex items-center justify-between group
                                            ${selectedFont.name === font.name 
                                                ? 'bg-brand-50 border-brand-200 ring-1 ring-brand-500/30' 
                                                : 'bg-white border-slate-200 hover:border-brand-300'}
                                        `}
                                    >
                                        <span className={`text-lg ${font.family}`}>{selectedCharData?.char || 'あ'}</span>
                                        <span className="text-xs text-slate-400 group-hover:text-brand-500">{font.name}</span>
                                    </button>
                                ))}
                            </div>
                        </Card>

                        <AITutorPanel input={input} selectedChar={selectedCharData?.char} />
                    </div>
                    
                    {/* Mojibake Simulator (Full width at bottom) */}
                    <div className="lg:col-span-3">
                        <MojibakeSimulator input={input} />
                    </div>
                </div>
            ) : (
                <div className="text-center py-20 text-slate-400">
                    <i className="fa-solid fa-keyboard text-4xl mb-4 text-slate-300"></i>
                    <p>文字を入力して分析を開始しましょう</p>
                </div>
            )}
        </div>
    );
};

const CharacterDetailCard = ({ item, fontClass }) => (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden animate-[fadeIn_0.3s]">
        <div className="flex flex-col sm:flex-row">
            {/* Visual */}
            <div className="sm:w-1/3 bg-slate-50 p-8 flex flex-col items-center justify-center border-b sm:border-b-0 sm:border-r border-slate-100">
                <span className={`text-8xl text-slate-800 ${fontClass} leading-none drop-shadow-sm`}>{item.char}</span>
                <span className="mt-6 font-mono text-sm text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                    {item.codePoint}
                </span>
            </div>

            {/* Data */}
            <div className="sm:w-2/3 p-6 space-y-8">
                {/* UTF-8 */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-8 bg-brand-500 rounded-full"></span>
                            <div>
                                <h4 className="font-bold text-slate-800 leading-none">UTF-8</h4>
                                <p className="text-xs text-slate-500">世界標準 (Web, スマホ)</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <HexBadge hex={item.utf8.hex} />
                            <div className="text-xs text-slate-400 mt-1 font-mono">{item.utf8.length} bytes</div>
                        </div>
                    </div>
                    <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto shadow-inner">
                        <BitVisualizer binaryString={item.utf8.binary} isDarkBg={true} />
                    </div>
                </div>

                {/* SJIS */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-8 rounded-full ${item.sjis.isValid ? 'bg-orange-500' : 'bg-slate-300'}`}></span>
                            <div>
                                <h4 className="font-bold text-slate-800 leading-none">Shift-JIS</h4>
                                <p className="text-xs text-slate-500">日本独自 (古いWindows等)</p>
                            </div>
                        </div>
                        <div className="text-right">
                            {item.sjis.isValid ? (
                                <>
                                    <HexBadge hex={item.sjis.hex} />
                                    <div className="text-xs text-slate-400 mt-1 font-mono">{item.sjis.length} bytes</div>
                                </>
                            ) : (
                                <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded">変換不可</span>
                            )}
                        </div>
                    </div>
                    
                    {item.sjis.isValid ? (
                        <div className="bg-orange-50 rounded-lg p-4 overflow-x-auto border border-orange-100">
                            <BitVisualizer binaryString={item.sjis.binary} isDarkBg={false} />
                        </div>
                    ) : (
                        <div className="bg-slate-100 rounded-lg p-4 text-center border-2 border-dashed border-slate-300">
                            <p className="text-xs text-slate-500">
                                <i className="fa-solid fa-ban mr-1"></i>
                                この文字（{item.char}）はShift-JISの文字コード表に存在しません。
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
);

const AITutorPanel = ({ input, selectedChar }) => {
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [loading, setLoading] = useState(false);

    // AIへの質問コンテキストを動的に生成
    const context = useMemo(() => {
        return `現在、生徒は「${input}」という文字列を分析中。
        特に「${selectedChar || input[0]}」という文字の詳細画面を見ている。`;
    }, [input, selectedChar]);

    const handleAsk = async () => {
        if (!question.trim()) return;
        setLoading(true);
        try {
            const response = await askAITeacher(question, context);
            setAnswer(response);
        } catch (e) {
            setAnswer("通信エラーが発生しました。");
        } finally {
            setLoading(false);
        }
    };

    if (!API_KEY) return null;

    return (
        <Card title="AI先生に質問" className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-100">
            <div className="space-y-3">
                <div className="flex gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                        <i className="fa-solid fa-robot"></i>
                    </div>
                    <div className="text-xs text-indigo-800 font-medium pt-1 leading-snug">
                        「なぜShift-JISだとバイト数が少ないの？」「文字化けって何？」など聞いてみてね。
                    </div>
                </div>
                
                <textarea 
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="質問を入力..."
                    className="w-full p-3 rounded-lg border border-indigo-200 text-sm focus:ring-2 focus:ring-indigo-400 outline-none bg-white/80"
                    rows="2"
                />
                
                <Button 
                    onClick={handleAsk} 
                    disabled={loading || !question} 
                    className="w-full text-sm bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-200"
                >
                    {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-solid fa-paper-plane"></i> 質問する</>}
                </Button>

                {answer && (
                    <div className="mt-3 p-3 bg-white rounded-lg border border-indigo-100 text-sm text-slate-700 leading-relaxed animate-[fadeIn_0.3s] shadow-sm">
                        {answer}
                    </div>
                )}
            </div>
        </Card>
    );
};

// --- About View ---

const AboutView = () => (
    <div className="max-w-3xl mx-auto space-y-8 animate-[fadeIn_0.5s]">
        <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-800">文字のデジタル化の仕組み</h2>
            <p className="text-slate-500 mt-2">コンピュータが文字を扱う「裏側」を見てみよう</p>
        </div>
        
        <TopicSection title="1. 文字コードとは？" icon="fa-list-ol" color="text-brand-500">
            <p>
                コンピュータは「0」と「1」しか理解できません。そこで、「あ」は「12354」、「A」は「65」のように、
                <strong>文字と番号の対応表</strong>を決めておく必要があります。これを「文字コード」と呼びます。
            </p>
        </TopicSection>

        <TopicSection title="2. なぜUTF-8とShift-JISがあるの？" icon="fa-right-left" color="text-orange-500">
            <div className="grid md:grid-cols-2 gap-6 mt-4">
                <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
                    <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                        <i className="fa-solid fa-globe"></i> UTF-8
                    </h4>
                    <ul className="text-sm text-blue-900 space-y-2 list-disc list-inside">
                        <li><strong>世界標準</strong>。どの国の言葉も混在できる。</li>
                        <li>Webサイトの98%以上で使用されている。</li>
                        <li>日本語は基本的に<strong>3バイト</strong>必要。</li>
                    </ul>
                </div>
                <div className="bg-orange-50 p-5 rounded-xl border border-orange-100">
                    <h4 className="font-bold text-orange-800 mb-2 flex items-center gap-2">
                        <i className="fa-solid fa-flag"></i> Shift-JIS
                    </h4>
                    <ul className="text-sm text-orange-900 space-y-2 list-disc list-inside">
                        <li><strong>日本独自</strong>。昔のWindowsで標準だった。</li>
                        <li>日本語を<strong>2バイト</strong>で表現できるため、昔はデータ節約に役立った。</li>
                        <li>絵文字や外国語は扱えないことが多い。</li>
                    </ul>
                </div>
            </div>
        </TopicSection>

        <TopicSection title="3. 文字化けの原因" icon="fa-bug" color="text-red-500">
            <p className="mb-4">
                「UTF-8」で書かれたデータを、「Shift-JIS」のルールで読もうとすると、
                ビットの区切り位置がずれてしまい、全く違う文字（意味不明な記号）になります。
            </p>
            <div className="bg-slate-100 p-4 rounded-lg font-mono text-center text-slate-600">
                UTF-8: [E3 81 82] (あ) <br/>
                ↓ <span className="text-xs text-red-500 font-bold">Shift-JISとして無理やり読む</span> ↓<br/>
                Shift-JIS: [E3 81] [82 ..] → 「縺」 (文字化け！)
            </div>
        </TopicSection>
    </div>
);

const TopicSection = ({ title, icon, color, children }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-3 border-b border-slate-100 pb-2">
            <div className={`w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center ${color}`}>
                <i className={`fa-solid ${icon}`}></i>
            </div>
            {title}
        </h3>
        <div className="text-slate-600 leading-relaxed pl-2">
            {children}
        </div>
    </div>
);

const root = createRoot(document.getElementById('root'));
root.render(<App />);