import React from 'react';

export const Card = ({ children, className = "", title }) => (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${className}`}>
        {title && (
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">{title}</h3>
            </div>
        )}
        <div className="p-4 md:p-6">
            {children}
        </div>
    </div>
);

export const Button = ({ onClick, children, variant = "primary", className = "", disabled = false }) => {
    const base = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 justify-center";
    const variants = {
        primary: "bg-brand-600 text-white hover:bg-brand-500 shadow-md shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed",
        secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:text-brand-600",
        ghost: "text-slate-500 hover:text-brand-600 hover:bg-brand-50",
    };
    
    return (
        <button 
            onClick={onClick} 
            className={`${base} ${variants[variant]} ${className}`}
            disabled={disabled}
        >
            {children}
        </button>
    );
};

export const BitVisualizer = ({ binaryString }) => {
    // Remove spaces and split
    const bits = binaryString.replace(/\s/g, '').split('');
    
    return (
        <div className="flex flex-wrap gap-1 max-w-full">
            {bits.map((bit, idx) => (
                <div 
                    key={idx}
                    className={`
                        w-6 h-8 md:w-8 md:h-10 flex items-center justify-center rounded text-xs font-mono font-bold
                        ${bit === '1' 
                            ? 'bg-brand-500 text-white shadow-sm' 
                            : 'bg-slate-100 text-slate-400 border border-slate-200'}
                    `}
                    title={`Bit ${idx}`}
                >
                    {bit}
                </div>
            ))}
        </div>
    );
};

export const HexBadge = ({ hex }) => (
    <span className="font-mono bg-slate-800 text-yellow-400 px-2 py-1 rounded text-sm tracking-wider">
        {hex}
    </span>
);