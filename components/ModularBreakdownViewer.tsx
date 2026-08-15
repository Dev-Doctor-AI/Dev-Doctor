

import React, { useState } from 'react';
import { FreelanceBrief } from '../types';
import { ChevronDownIcon } from './icons';
import { marked } from 'marked';

interface ModularBreakdownViewerProps {
    breakdown: FreelanceBrief[];
    isPrintMode?: boolean;
}

// Renders markdown content from the brief.
const FormattedMarkdown: React.FC<{ content: string }> = ({ content }) => {
    return (
        <div 
            className="markdown-content text-brand-text-muted" 
            dangerouslySetInnerHTML={{ __html: marked.parse(content) }} 
        />
    );
};


export const ModularBreakdownViewer: React.FC<ModularBreakdownViewerProps> = ({ breakdown, isPrintMode = false }) => {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    const toggleAccordion = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <div className="w-full space-y-4">
            <h3 className="text-xl font-bold text-brand-text mb-2">Freelance Briefs</h3>
             <p className="text-brand-text-muted mb-4">A complete set of role-specific briefs, generated from the project document. Each brief is a self-contained scope of work.</p>
            {(Array.isArray(breakdown) ? breakdown : []).map((brief, index) => (
                <div key={index} className="rounded-lg bg-brand-surface border border-brand-border overflow-hidden">
                    <button
                        onClick={() => toggleAccordion(index)}
                        disabled={isPrintMode}
                        className="w-full flex justify-between items-center p-4 text-left font-semibold text-brand-text hover:bg-brand-border/50 focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:cursor-default disabled:hover:bg-transparent"
                    >
                        <span className="truncate">{brief.title}</span>
                        {!isPrintMode && <ChevronDownIcon className={`w-5 h-5 transition-transform duration-300 text-brand-text-muted ${openIndex === index ? 'rotate-180' : ''}`} />}
                    </button>
                    {(isPrintMode || openIndex === index) && (
                        <div className="p-4 md:p-6 border-t border-brand-border bg-brand-surface/30">
                           <FormattedMarkdown content={brief.content} />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};