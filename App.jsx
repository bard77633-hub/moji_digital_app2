import React, { useState, useEffect, useMemo } from 'react';
import { 
  Code, 
  Keyboard, 
  Book, 
  CheckCircle2, 
  Lightbulb, 
  AlertTriangle, 
  FileDown, 
  FileUp, 
  Ban,
  Globe,
  Flag,
  Bug
} from 'lucide-react';
import { FONTS } from './constants';
import { analyzeText, toUTF8Array, toSJISArray, toHexString, toBinaryString } from './utils/encoding';
import Encoding from 'encoding-japanese';

// ==========================================
// 1. Components
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
    const base = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 justify-center cursor-pointer";
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
    const [saveMode, setSaveMode] = useState('UTF8');
    const [openMode, setOpenMode] = useState('SJIS');

    const { savedBytes, resultText } = useMemo(() => {
        if (!input) return { savedBytes: [], resultText: '' };

        let bytes = [];
        if (saveMode === 'UTF8') {
            bytes = toUTF8Array(input);
        } else {
            bytes = toSJISArray(input) || [];
        }

        let text = '';
        if (bytes.length > 0) {
            try {
                text = Encoding.convert(bytes, {
                    to: 'UNICODE',
                    from: openMode,
                    type: 'string'
                });
            } catch (e) {
                text = '（エラー：変換できませんでした）';
            }
        } else if (saveMode === 'SJIS' && input.length > 0) {
            text = '（Shift-JIS非対応文字）';
        }

        return { savedBytes: bytes, resultText: text };
    }, [input, saveMode, openMode]);

    let status = 'failure';
    if (saveMode === openMode) {
        status = 'success';
    } else if (resultText === input) {
        status = 'lucky';
    }

    const hexString = toHexString(savedBytes);
    const displayHex = hexString.length > 30 ? hexString.substring(0, 30) + "..." : hexString;

    const styles = {
        success: {
            bg: 'bg-green-50',
            border: 'border-green-200',
            text: 'text-green-700',
            icon: <CheckCircle2 className="w-5 h-5 mr-2" />,
            title: '成功！正しい文字コードを選びました。',
            desc: null
        },
        lucky: {
            bg: 'bg-blue-50',
            border: 'border-blue-200',
            text: 'text-blue-700',
            icon: <Lightbulb className="w-5 h-5 mr-2" />,
            title: 'おや？文字化けしませんでした！',
            desc: '設定は合っていませんが、英数字（ASCII文字）はUTF-8でもShift-JISでも同じデータになるため、偶然正しく表示されました。'
        },
        failure: {
            bg: 'bg-red-50',
            border: 'border-red-200',
            text: 'text-red-600',
            icon: <AlertTriangle className="w-5 h-5 mr-2" />,
            title: '文字化け発生！',
            desc: `${saveMode}で保存されたデータ(${savedBytes.length}バイト)を、無理やり${openMode}のルールで読もうとしたため、区切り位置がずれて別の文字になってしまいました。`
        }
    };

    const currentStyle = styles[status];

    return (
        <Card title="実験室：文字化けを発生させよう" className="border-indigo-100 bg-indigo-50/10">
            <div className="mb-6 text-sm text-slate-600">
                <p>
                    「文字コード」が違うと、同じ「0と1のデータ」でも全く違う文字として表示されてしまいます。<br/>
                    保存する形式と開く形式をあえて変えて、どのような文字化けが起こるか実験してみましょう。
                </p>
            </div>

            <div className="flex flex-col lg:flex-row gap-4 items-stretch justify-center">
                <div className="flex-1 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">STEP 1. 保存</div>
                    <div className="flex-1 flex flex-col justify-center gap-3">
                        <p className="text-sm font-bold text-slate-700">"{input}" をどう保存する？</p>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setSaveMode('UTF8')}
                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all border-2 cursor-pointer
                                    ${saveMode === 'UTF8' 
                                        ? 'border-brand-500 bg-brand-50 text-brand-700' 
                                        : 'border-slate-100 bg-slate-50 text-slate-500 hover:bg-white hover:border-slate-300'}
                                `}
                            >
                                UTF-8
                            </button>
                            <button 
                                onClick={() => setSaveMode('SJIS')}
                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all border-2 cursor-pointer
                                    ${saveMode === 'SJIS' 
                                        ? 'border-orange-500 bg-orange-50 text-orange-700' 
                                        : 'border-slate-100 bg-slate-50 text-slate-500 hover:bg-white hover:border-slate-300'}
                                `}
                            >
                                Shift-JIS
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center gap-1 text-slate-400 px-2">
                    <FileDown className="w-6 h-6" />
                    <div className="bg-slate-800 text-yellow-400 font-mono text-[10px] px-2 py-1 rounded shadow-sm max-w-[120px] overflow-hidden text-center whitespace-nowrap">
                        {displayHex || "00 00..."}
                    </div>
                    <div className="text-[10px] text-slate-500">ファイル(バイト列)</div>
                    <FileUp className="w-6 h-6 mt-1" />
                </div>

                <div className="flex-1 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">STEP 2. 表示</div>
                    <div className="flex-1 flex flex-col justify-center gap-3">
                        <p className="text-sm font-bold text-slate-700">どのルールで開く？</p>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setOpenMode('UTF8')}
                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all border-2 cursor-pointer
                                    ${openMode === 'UTF8' 
                                        ? 'border-brand-500 bg-brand-50 text-brand-700' 
                                        : 'border-slate-100 bg-slate-50 text-slate-500 hover:bg-white hover:border-slate-300'}
                                `}
                            >
                                UTF-8
                            </button>
                            <button 
                                onClick={() => setOpenMode('SJIS')}
                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all border-2 cursor-pointer
                                    ${openMode === 'SJIS' 
                                        ? 'border-orange-500 bg-orange-50 text-orange-700' 
                                        : 'border-slate-100 bg-slate-50 text-slate-500 hover:bg-white hover:border-slate-300'}
                                `}
                            >
                                Shift-JIS
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className={`mt-6 rounded-xl p-6 text-center border-2 transition-all duration-500 ${currentStyle.bg} ${currentStyle.border}`}>
                <div className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">画面の表示結果</div>
                <div className={`text-3xl font-bold font-mono break-all min-h-[3rem] flex items-center justify-center ${currentStyle.text}`}>
                    {resultText}
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-200/50">
                    <div className={`text-sm ${status === 'failure' ? 'text-red-800' : (status === 'lucky' ? 'text-blue-800' : 'text-green-800')}`}>
                        <div className="flex items-center justify-center font-bold mb-1">
                            {currentStyle.icon}
                            {currentStyle.title}
                        </div>
                        {currentStyle.desc && (
                            <p className="opacity-90">
                                {currentStyle.desc}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
};

// ==========================================
// 3. Main Application Logic
// ==========================================

const App = () => {
    const [view, setView] = useState('converter');
    
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 font-sans">
            <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-brand-500/30">
                            <Code className="w-5 h-5" />
                        </div>
                        <h1 className="font-bold text-xl tracking-tight text-slate-800">デジ文字ラボ</h1>
                    </div>
                    
                    <nav className="flex gap-1">
                        <NavButton active={view === 'converter'} onClick={() => setView('converter')} icon={<Keyboard className="w-4 h-4" />}>ラボ</NavButton>
                        <NavButton active={view === 'about'} onClick={() => setView('about')} icon={<Book className="w-4 h-4" />}>解説</NavButton>
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
            px-3 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 cursor-pointer
            ${active 
                ? 'bg-brand-50 text-brand-700' 
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}
        `}
    >
        {icon}
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
        const result = analyzeText(input);
        setAnalysis(result);
        if (input.length === 0) setSelectedIndex(-1);
        else if (selectedIndex >= input.length) setSelectedIndex(0);
        else if (selectedIndex === -1 && input.length > 0) setSelectedIndex(0);
    }, [input]);

    const selectedCharData = analysis[selectedIndex];

    const totalUtf8 = analysis.reduce((acc, item) => acc + item.utf8.length, 0);
    const totalSjis = analysis.reduce((acc, item) => acc + item.sjis.length, 0);
    const canFullSjis = analysis.every(item => item.sjis.isValid);

    return (
        <div className="space-y-6">
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
                        <AlertTriangle className="w-3 h-3" />
                        一部の文字はShift-JISで表現できないため、正しいバイト数になりません。
                    </div>
                )}
            </Card>

            {input.length > 0 ? (
                <div className="grid lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">文字を選択して詳細を確認</h3>
                            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                {analysis.map((item, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedIndex(idx)}
                                        className={`
                                            flex-shrink-0 w-12 h-14 rounded-lg flex flex-col items-center justify-center transition-all border-2 cursor-pointer
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

                        {selectedCharData && (
                            <CharacterDetailCard 
                                item={selectedCharData} 
                                fontClass={selectedFont.family} 
                            />
                        )}
                    </div>

                    <div className="space-y-6">
                        <Card title="フォント比較">
                            <div className="space-y-2">
                                {FONTS.map(font => (
                                    <button
                                        key={font.name}
                                        onClick={() => setSelectedFont(font)}
                                        className={`w-full text-left px-3 py-2 rounded-lg border transition-all flex items-center justify-between group cursor-pointer
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
                    </div>
                    
                    <div className="lg:col-span-3">
                        <MojibakeSimulator input={input} />
                    </div>
                </div>
            ) : (
                <div className="text-center py-20 text-slate-400">
                    <Keyboard className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p>文字を入力して分析を開始しましょう</p>
                </div>
            )}
        </div>
    );
};

const CharacterDetailCard = ({ item, fontClass }) => (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="flex flex-col sm:flex-row">
            <div className="sm:w-1/3 bg-slate-50 p-8 flex flex-col items-center justify-center border-b sm:border-b-0 sm:border-r border-slate-100">
                <span className={`text-8xl text-slate-800 ${fontClass} leading-none drop-shadow-sm`}>{item.char}</span>
                <span className="mt-6 font-mono text-sm text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                    {item.codePoint}
                </span>
            </div>

            <div className="sm:w-2/3 p-6 space-y-8">
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
                                <Ban className="w-4 h-4 inline mr-1" />
                                この文字（{item.char}）はShift-JISの文字コード表に存在しません。
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
);

// --- About View ---

const AboutView = () => (
    <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-800">文字のデジタル化の仕組み</h2>
            <p className="text-slate-500 mt-2">コンピュータが文字を扱う「裏側」を見てみよう</p>
        </div>
        
        <TopicSection title="1. 文字コードとは？" icon={<Keyboard className="w-5 h-5" />} color="text-brand-500">
            <p>
                コンピュータは「0」と「1」しか理解できません。そこで、「あ」は「12354」、「A」は「65」のように、
                <strong>文字と番号の対応表</strong>を決めておく必要があります。これを「文字コード」と呼びます。
            </p>
        </TopicSection>

        <TopicSection title="2. なぜUTF-8とShift-JISがあるの？" icon={<Globe className="w-5 h-5" />} color="text-orange-500">
            <div className="grid md:grid-cols-2 gap-6 mt-4">
                <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
                    <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                        <Globe className="w-4 h-4" /> UTF-8
                    </h4>
                    <ul className="text-sm text-blue-900 space-y-2 list-disc list-inside">
                        <li><strong>世界標準</strong>。どの国の言葉も混在できる。</li>
                        <li>Webサイトの98%以上で使用されている。</li>
                        <li>日本語は基本的に<strong>3バイト</strong>必要。</li>
                    </ul>
                </div>
                <div className="bg-orange-50 p-5 rounded-xl border border-orange-100">
                    <h4 className="font-bold text-orange-800 mb-2 flex items-center gap-2">
                        <Flag className="w-4 h-4" /> Shift-JIS
                    </h4>
                    <ul className="text-sm text-orange-900 space-y-2 list-disc list-inside">
                        <li><strong>日本独自</strong>。昔のWindowsで標準だった。</li>
                        <li>日本語を<strong>2バイト</strong>で表現できるため、昔はデータ節約に役立った。</li>
                        <li>絵文字や外国語は扱えないことが多い。</li>
                    </ul>
                </div>
            </div>
        </TopicSection>

        <TopicSection title="3. 文字化けの原因" icon={<Bug className="w-5 h-5" />} color="text-red-500">
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
                {icon}
            </div>
            {title}
        </h3>
        <div className="text-slate-600 leading-relaxed pl-2">
            {children}
        </div>
    </div>
);

export default App;
