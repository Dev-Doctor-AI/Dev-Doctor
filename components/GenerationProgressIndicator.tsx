
import React from 'react';

interface GenerationProgressIndicatorProps {
    isActive: boolean;
    progress: number;
    message: string;
    title?: string;
}

export const GenerationProgressIndicator: React.FC<GenerationProgressIndicatorProps> = ({ isActive, progress, message, title = "Generation in Progress" }) => {
    if (!isActive) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg bg-brand-surface rounded-lg shadow-2xl border border-brand-border p-6 sm:p-8 text-center">
                <h3 className="text-xl sm:text-2xl font-bold text-brand-secondary mb-4">{title}</h3>
                
                {/* The dynamic message is now the prominent status text */}
                <p className="text-lg font-bold text-brand-text h-12 flex items-center justify-center text-center px-2">
                    {message}
                </p>
                
                <div className="flex items-center gap-4 mb-6">
                    <div className="flex-1 w-full bg-brand-border rounded-full h-3">
                        <div 
                            className="bg-brand-primary h-3 rounded-full transition-all duration-500 ease-out" 
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <span className="font-semibold text-brand-primary w-12 text-right">{Math.round(progress)}%</span>
                </div>
                
                <p className="text-sm text-brand-text-muted">Please don't close this window.</p>
            </div>
        </div>
    );
};