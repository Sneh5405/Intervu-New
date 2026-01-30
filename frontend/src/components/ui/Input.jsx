import React from 'react';

const Input = ({ label, error, className = '', ...props }) => {
    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            {label && (
                <label className="text-sm font-medium text-slate-300 ml-1">
                    {label}
                </label>
            )}
            <input
                className={`bg-slate-800/50 border ${error ? 'border-red-500 focus:ring-red-500/50' : 'border-slate-700 focus:border-indigo-500 focus:ring-indigo-500/50'} 
          rounded-lg px-4 py-2.5 text-white placeholder-slate-500 outline-none focus:ring-2 transition-all duration-200`}
                {...props}
            />
            {error && (
                <span className="text-xs text-red-500 ml-1 animate-pulse">{error}</span>
            )}
        </div>
    );
};

export default Input;
