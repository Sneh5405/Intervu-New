import React from 'react';

const Card = ({ children, className = '', title, subtitle }) => {
    return (
        <div className={`bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl ${className}`}>
            {(title || subtitle) && (
                <div className="mb-6">
                    {title && <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">{title}</h2>}
                    {subtitle && <p className="text-slate-400 mt-1">{subtitle}</p>}
                </div>
            )}
            {children}
        </div>
    );
};

export default Card;
