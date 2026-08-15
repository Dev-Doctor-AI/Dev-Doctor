

import React from 'react';
import { MVPDefinition } from '../types';
import { CheckIcon } from './icons';

const XIcon = ({ className }: { className?: string }) => (
    // FIX: Corrected the malformed viewBox attribute from 'viewBox="0 0 24" 24"' to 'viewBox="0 0 24 24"' to fix SVG rendering and compilation errors.
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);


export const MVPViewer: React.FC<{ mvp: MVPDefinition }> = ({ mvp }) => {
    return (
        <div className="w-full space-y-4">
            <h3 className="text-xl font-bold text-brand-text mb-2">Minimum Viable Product (MVP) Definition</h3>
            
            <div className="bg-brand-surface/50 p-4 rounded-lg border border-brand-border">
                <p className="text-brand-text-muted">{mvp.summary}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-900/30 p-4 rounded-lg border border-green-500/50">
                    <h4 className="text-lg font-semibold text-green-400 mb-3">In Scope for MVP</h4>
                    <ul className="space-y-2">
                        {(Array.isArray(mvp.inScope) ? mvp.inScope : []).map((item, index) => (
                            <li key={index} className="flex items-start gap-2">
                                <CheckIcon className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                                <span className="text-brand-text-muted">{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="bg-red-900/30 p-4 rounded-lg border border-red-500/50">
                     <h4 className="text-lg font-semibold text-red-400 mb-3">Out of Scope for MVP</h4>
                     <ul className="space-y-2">
                        {(Array.isArray(mvp.outOfScope) ? mvp.outOfScope : []).map((item, index) => (
                            <li key={index} className="flex items-start gap-2">
                                <XIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                <span className="text-brand-text-muted">{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};