

import React, { useState } from 'react';
import { TDDFeature } from '../types';
import { ChevronDownIcon } from './icons';
import { marked } from 'marked';

// Simple helper to parse the semi-markdown content from the AI
const FormattedContent: React.FC<{ content: string }> = ({ content }) => {
    return (
        <div 
            className="markdown-content text-brand-text-muted" 
            dangerouslySetInnerHTML={{ __html: marked.parse(content) }} 
        />
    );
};

export const TDDViewer: React.FC<{ features: TDDFeature[]; isPrintMode?: boolean }> = ({ features, isPrintMode = false }) => {
    // By using the native <details> element, we no longer need React state for the accordion.
    // This ensures the accordion works in the downloaded static HTML file.

    const safeFeatures = Array.isArray(features) ? features : [];

    return (
        <div className="w-full space-y-2">
            <h3 className="text-xl font-bold text-brand-text mb-3">MVP Feature Specifications</h3>
            {safeFeatures.map((item, index) => (
                <details key={index} className="rounded-lg bg-brand-surface border border-brand-border overflow-hidden group" open={index === 0}>
                    <summary
                        className="w-full flex justify-between items-center p-4 text-left font-semibold text-brand-text hover:bg-brand-border/50 focus:outline-none focus:ring-2 focus:ring-brand-primary list-none cursor-pointer"
                    >
                        <span>{item.feature}</span>
                        <ChevronDownIcon className={`w-5 h-5 transition-transform duration-300 text-brand-text-muted group-open:rotate-180`} />
                    </summary>
                    <div
                        id={`tdd-content-${index}`}
                        className="p-4 md:p-6 border-t border-brand-border bg-brand-surface/30"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="text-lg font-bold text-brand-primary mb-3 pb-2 border-b border-brand-border">User Stories &amp; Criteria</h4>
                                {typeof item.userStories === 'string' ? (
                                    <FormattedContent content={item.userStories} />
                                ) : (
                                    <div className="space-y-4">
                                        {(Array.isArray(item.userStories) ? item.userStories : []).map((story, sIndex) => (
                                            <div key={sIndex} className="text-sm text-brand-text-muted">
                                                <p className="font-semibold text-brand-text">{story.story}</p>
                                                <ul className="list-disc pl-5 mt-1 space-y-1">
                                                    {(Array.isArray(story.acceptanceCriteria) ? story.acceptanceCriteria : []).map((ac, acIndex) => <li key={acIndex}>{ac}</li>)}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-brand-primary mb-3 pb-2 border-b border-brand-border">Technical Specifications</h4>
                                {typeof item.technicalSpecs === 'string' ? (
                                    <FormattedContent content={item.technicalSpecs} />
                                ) : (
                                    <div className="space-y-4">
                                        {(Array.isArray(item.technicalSpecs) ? item.technicalSpecs : []).map((spec, sIndex) => (
                                            <div key={sIndex} className="text-sm text-brand-text-muted">
                                                <p className="font-semibold text-brand-text">{spec.component}</p>
                                                <p className="whitespace-pre-wrap font-mono text-xs mt-1">{spec.details}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </details>
            ))}
        </div>
    );
};