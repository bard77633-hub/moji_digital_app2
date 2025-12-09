import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { analyzeText } from './utils/encoding.js';
import { askAITeacher, generateQuiz } from './services/gemini.js';
import { Card, Button, BitVisualizer, HexBadge } from './components/ui.js';
import { FONTS, INITIAL_QUIZ_DATA, API_KEY } from './constants.js';

const App = () => {
    const [view, setView] = useState('converter'); // converter, quiz, about
    
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                            <i className="fa-solid fa-code"></i>
                        </div>
                        <h1 className="font-bold text-xl tracking-tight text-slate-800 hidden md:block">デジ文字ラボ</h1>
                        <h1 className="font-bold text-xl tracking-tight text-slate-800 md:hidden">デジ文字</h1>
                    </div>
                    
                    <nav className="flex gap-1 md:gap-2">
                        <NavButton active={view === 'converter'} onClick={() => setView('converter')} icon="fa-keyboard">ラボ</NavButton>
                        <NavButton active={view === 'quiz'} onClick={() => setView('quiz')} icon="fa-puzzle-piece">クイズ</NavButton>
                        <NavButton active={view === 'about'} onClick={() => setView('about')} icon="fa-book">解説</NavButton>
                    </nav>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-4 py-8">
                {view === 'converter' && <ConverterView />}
                {view === 'quiz' && <QuizView />}
                {view === 'about' && <AboutView />}
            </main>
        </div>
    );
};

const NavButton = ({ active, onClick, icon, children }) => (
    <button 
        onClick={onClick}
        className={`
            px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2
            ${active 
                ? 'bg-brand-50 text-brand-700' 
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}
        `}
    >
        <i className={`fa-solid ${icon}`}></i>
        <span>{children}</span>
    </button>
);

// --- Converter View ---

const ConverterView = () => {
    const [input, setInput] = useState('');
    const [analysis, setAnalysis] = useState([]);
    const [selectedFont, setSelectedFont] = useState(FONTS[0]);

    useEffect(() => {
        setAnalysis(analyzeText(input));
    }, [input]);

    return (
        <div className="space-y-8">
            <section className="text-center space-y-4 py-8">
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
                    文字は<span className="text-brand-600">0と1</span>でできている
                </h2>
                <p className="text-slate-600 max-w-2xl mx-auto">
                    私たちが普段見ている文字は、コンピュータの中では「数字（コード）」として扱われています。
                    好きな文字を入力して、その裏側の姿を覗いてみましょう。
                </p>
            </section>

            <Card className="border-brand-100 shadow-lg shadow-brand-100/50">
                <div className="space-y-4">
                    <label className="block text-sm font-bold text-slate-700">文字を入力してください</label>
                    <div className="relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="ここに入力（例：A、あ、🚀）"
                            className="w-full text-2xl p-4 pl-12 rounded-xl border-2 border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 outline-none transition-all"
                        />
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                            <i className="fa-solid fa-pen"></i>
                        </div>
                    </div>
                </div>
            </Card>

            {analysis.length > 0 && (
                <div className="grid md:grid-cols-3 gap-6 animate-[fadeIn_0.5s_ease-out]">
                    <div className="md:col-span-2 space-y-6">
                        {analysis.map((item, idx) => (
                            <CharacterDetailCard key={idx} item={item} fontClass={selectedFont.family} />
                        ))}
                    </div>
                    
                    <div className="space-y-6">
                        <Card title="フォント比較" className="sticky top-24">
                            <p className="text-xs text-slate-500 mb-4">
                                文字コードが同じでも、フォント（書体）によって見た目は変わります。
                            </p>
                            <div className="space-y-2">
                                {FONTS.map(font => (
                                    <button
                                        key={font.name}
                                        onClick={() => setSelectedFont(font)}
                                        className={`w-full text-left px-4 py-3 rounded-lg border transition-all flex items-center justify-between group
                                            ${selectedFont.name === font.name 
                                                ? 'bg-brand-50 border-brand-200 ring-2 ring-brand-500/20' 
                                                : 'bg-white border-slate-200 hover:border-brand-300'}
                                        `}
                                    >
                                        <span className={`text-xl ${font.family}`}>{input || 'あ'}</span>
                                        <span className="text-xs text-slate-400 group-hover:text-brand-500">{font.name}</span>
                                    </button>
                                ))}
                            </div>
                        </Card>
                        
                        <AITutorPanel input={input} />
                    </div>
                </div>
            )}
        </div>
    );
};

const CharacterDetailCard = ({ item, fontClass }) => (
    <Card className="overflow-hidden">
        <div className="flex flex-col md:flex-row gap-6">
            {/* Left: Visual Character */}
            <div className="flex-shrink-0 flex flex-col items-center justify-center bg-slate-50 rounded-xl p-6 min-w-[120px] border border-slate-100">
                <span className={`text-6xl text-slate-800 ${fontClass} leading-none`}>{item.char}</span>
                <span className="mt-4 text-xs font-mono text-slate-500 bg-white px-2 py-1 rounded border">{item.codePoint}</span>
            </div>

            {/* Right: Codes */}
            <div className="flex-1 space-y-6">
                {/* UTF-8 Section */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                            <i className="fa-solid fa-globe"></i> UTF-8 (世界標準)
                        </span>
                        <HexBadge hex={item.utf8.hex} />
                    </div>
                    <div className="bg-slate-900 rounded-lg p-3 overflow-x-auto">
                        <BitVisualizer binaryString={item.utf8.binary} />
                    </div>
                </div>

                {/* SJIS Section */}
                <div className="pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                            <i className="fa-solid fa-flag"></i> Shift-JIS (日本独自)
                        </span>
                        {item.sjis.length > 0 ? (
                            <HexBadge hex={item.sjis.hex} />
                        ) : (
                            <span className="text-xs text-red-400">変換不可</span>
                        )}
                    </div>
                    {item.sjis.length > 0 ? (
                        <div className="bg-slate-100 rounded-lg p-3 overflow-x-auto border border-slate-200">
                            <div className="flex gap-2">
                                {item.sjis.binary.split(' ').map((b, i) => (
                                    <span key={i} className="font-mono text-slate-600">{b}</span>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs text-slate-400">この文字はShift-JISに含まれていません。</p>
                    )}
                </div>
            </div>
        </div>
    </Card>
);

const AITutorPanel = ({ input }) => {
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAsk = async () => {
        if (!question.trim()) return;
        setLoading(true);
        try {
            const context = `ユーザーが入力した文字: 「${input}」。これについての変換結果を表示中。`;
            const response = await askAITeacher(question, context);
            setAnswer(response);
        } catch (e) {
            setAnswer("ごめんなさい、うまく答えられませんでした。APIキーが設定されているか確認してください。");
        } finally {
            setLoading(false);
        }
    };

    if (!API_KEY) return null;

    return (
        <Card title="AI先生に質問" className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-100">
            <div className="space-y-3">
                <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                        <i className="fa-solid fa-robot"></i>
                    </div>
                    <div className="text-sm text-indigo-900 font-medium pt-1">
                        文字コードについて分からないことがあったら聞いてね！
                    </div>
                </div>
                
                <textarea 
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="例：なぜUTF-8の方がバイト数が多いの？"
                    className="w-full p-3 rounded-lg border border-indigo-200 text-sm focus:ring-2 focus:ring-indigo-400 outline-none bg-white/50"
                    rows="2"
                />
                
                <Button 
                    onClick={handleAsk} 
                    disabled={loading || !question} 
                    className="w-full text-sm bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                    {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-solid fa-paper-plane"></i> 質問する</>}
                </Button>

                {answer && (
                    <div className="mt-3 p-3 bg-white rounded-lg border border-indigo-100 text-sm text-slate-700 leading-relaxed animate-[fadeIn_0.3s]">
                        {answer}
                    </div>
                )}
            </div>
        </Card>
    );
};

// --- Quiz View ---

const QuizView = () => {
    const [quiz, setQuiz] = useState(null);
    const [selectedOption, setSelectedOption] = useState(null);
    const [showResult, setShowResult] = useState(false);
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState('static'); // static or ai

    const loadStaticQuiz = () => {
        const randomQuiz = INITIAL_QUIZ_DATA[Math.floor(Math.random() * INITIAL_QUIZ_DATA.length)];
        setQuiz(randomQuiz);
        resetState();
    };

    const loadAIQuiz = async () => {
        if (!API_KEY) {
            alert("APIキーが設定されていないため、固定問題を使用します。");
            setMode('static');
            loadStaticQuiz();
            return;
        }
        setLoading(true);
        try {
            const aiQuiz = await generateQuiz();
            if (aiQuiz) {
                setQuiz(aiQuiz);
                resetState();
            } else {
                throw new Error("Failed to generate");
            }
        } catch (e) {
            console.error(e);
            loadStaticQuiz(); // Fallback
        } finally {
            setLoading(false);
        }
    };

    const resetState = () => {
        setSelectedOption(null);
        setShowResult(false);
    };

    useEffect(() => {
        loadStaticQuiz();
    }, []);

    const handleAnswer = (option) => {
        setSelectedOption(option);
        setShowResult(true);
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">理解度チェック</h2>
                {API_KEY && (
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button 
                            onClick={() => setMode('static')} 
                            className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${mode === 'static' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
                        >
                            基本問題
                        </button>
                        <button 
                            onClick={() => setMode('ai')} 
                            className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${mode === 'ai' ? 'bg-brand-500 shadow text-white' : 'text-slate-500'}`}
                        >
                            AI生成
                        </button>
                    </div>
                )}
            </div>

            {loading ? (
                <Card className="py-12 text-center text-slate-500">
                    <i className="fa-solid fa-spinner fa-spin text-3xl mb-4 text-brand-500"></i>
                    <p>AIが新しい問題を考案中...</p>
                </Card>
            ) : quiz ? (
                <Card className="relative overflow-hidden">
                    <div className="mb-6">
                        <span className="bg-brand-100 text-brand-700 text-xs font-bold px-2 py-1 rounded mb-2 inline-block">Q.</span>
                        <h3 className="text-lg md:text-xl font-bold text-slate-900 leading-snug">
                            {quiz.question}
                        </h3>
                    </div>

                    <div className="space-y-3">
                        {quiz.options.map((option, idx) => {
                            let stateClass = "border-slate-200 hover:bg-slate-50";
                            if (showResult) {
                                if (option === quiz.answer) stateClass = "bg-green-50 border-green-500 text-green-700 ring-1 ring-green-500";
                                else if (option === selectedOption) stateClass = "bg-red-50 border-red-300 text-red-700";
                                else stateClass = "opacity-50";
                            } else if (selectedOption === option) {
                                stateClass = "bg-brand-50 border-brand-500";
                            }

                            return (
                                <button
                                    key={idx}
                                    onClick={() => !showResult && handleAnswer(option)}
                                    disabled={showResult}
                                    className={`w-full text-left p-4 rounded-xl border-2 font-medium transition-all ${stateClass}`}
                                >
                                    {option}
                                </button>
                            );
                        })}
                    </div>

                    {showResult && (
                        <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200 animate-[fadeIn_0.3s]">
                            <div className="flex items-center gap-2 mb-2">
                                {selectedOption === quiz.answer ? (
                                    <span className="text-green-600 font-bold text-lg"><i className="fa-solid fa-circle-check"></i> 正解！</span>
                                ) : (
                                    <span className="text-red-500 font-bold text-lg"><i className="fa-solid fa-circle-xmark"></i> 残念...</span>
                                )}
                            </div>
                            <p className="text-slate-700 text-sm leading-relaxed">
                                {quiz.explanation}
                            </p>
                            <div className="mt-4 flex justify-end">
                                <Button onClick={mode === 'ai' ? loadAIQuiz : loadStaticQuiz}>
                                    次の問題へ <i className="fa-solid fa-arrow-right"></i>
                                </Button>
                            </div>
                        </div>
                    )}
                </Card>
            ) : (
                <div className="text-center py-10">問題がありません</div>
            )}
        </div>
    );
};

// --- About View ---

const AboutView = () => (
    <div className="max-w-3xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">文字のデジタル化について学ぼう</h2>
        
        <TopicSection 
            title="1. 文字コードとは？" 
            icon="fa-list-ol"
        >
            <p>
                コンピュータは「0」と「1」しか理解できません。そこで、「あ」は番号「12354」、「A」は番号「65」のように、
                <strong>文字と番号の対応表</strong>を決めておく必要があります。これを「文字コード」と呼びます。
            </p>
        </TopicSection>

        <TopicSection 
            title="2. UTF-8 と Shift-JIS の違い" 
            icon="fa-right-left"
        >
            <div className="grid md:grid-cols-2 gap-4 mt-2">
                <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-bold text-blue-800 mb-2">UTF-8</h4>
                    <p className="text-sm text-blue-900">
                        世界標準の文字コード。英語、日本語、絵文字など世界中の文字を扱える。
                        Webサイトの98%以上で使用されている。
                    </p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                    <h4 className="font-bold text-orange-800 mb-2">Shift-JIS</h4>
                    <p className="text-sm text-orange-900">
                        日本独自の文字コード。昔のWindowsなどで標準的だった。
                        日本語のデータ量はUTF-8より少なくて済む場合があるが、海外の文字は苦手。
                    </p>
                </div>
            </div>
        </TopicSection>

        <TopicSection 
            title="3. 文字化けの原因" 
            icon="fa-bug"
        >
            <p>
                「UTF-8」で書かれた手紙を、「Shift-JIS」の辞書を使って読もうとすると、
                全く違う文字（意味不明な記号の羅列）になってしまいます。これが<strong>文字化け</strong>です。
                正しいルール（エンコーディング）で読み取ることが大切です。
            </p>
        </TopicSection>
    </div>
);

const TopicSection = ({ title, icon, children }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
            <i className={`fa-solid ${icon} text-brand-500`}></i> {title}
        </h3>
        <div className="text-slate-600 leading-relaxed">
            {children}
        </div>
    </div>
);

// Mount the app
const root = createRoot(document.getElementById('root'));
root.render(<App />);