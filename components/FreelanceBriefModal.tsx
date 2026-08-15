

import React, { useState } from 'react';
import { LoaderIcon, ClipboardIcon, CheckIcon, DownloadIcon } from './icons';

interface FreelanceBriefModalProps {
    content: string | null;
    isLoading: boolean;
    onClose: () => void;
    onDownloadPdf: () => void;
    isDownloading: boolean;
}

const FormattedMarkdown: React.FC<{ content: string }> = ({ content }) => {
    const lines = content.split('\n');
    const elements = lines.map((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('### ')) {
            return <h4 key={i} className="text-lg font-semibold text-brand-secondary mt-4 mb-2">{trimmed.substring(4)}</h4>;
        }
        if (trimmed.startsWith('## ')) {
            return <h3 key={i} className="text-xl font-bold text-brand-primary mt-5 mb-3">{trimmed.substring(3)}</h3>;
        }
        if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
            return <p key={i} className="font-bold my-1">{trimmed.replace(/\*\*/g, '')}</p>;
        }
        if (trimmed.startsWith('- ')) {
            const gherkinMatch = trimmed.substring(2).match(/^(GIVEN|WHEN|THEN|AND|BUT)\s/i);
             if (gherkinMatch) {
                const keyword = gherkinMatch[1];
                const rest = trimmed.substring(2 + keyword.length + 1);
                return (
                    <p key={i} className="ml-4 text-brand-text-muted">
                        <span className="font-semibold text-brand-primary">{keyword}</span> {rest}
                    </p>
                );
            }
            return <li key={i} className="ml-4 text-brand-text-muted list-disc list-inside">{trimmed.substring(2)}</li>;
        }
        if (trimmed === '') {
            return <br key={i} />;
        }
        return <p key={i} className="text-brand-text-muted">{trimmed}</p>;
    });
    return <div className="space-y-1">{elements}</div>;
};

export const FreelanceBriefModal: React.FC<FreelanceBriefModalProps> = ({ content, isLoading, onClose, onDownloadPdf, isDownloading }) => {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = () => {
        if (content) {
            navigator.clipboard.writeText(content);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-brand-surface rounded-xl shadow-2xl w-full max-w-3xl border border-brand-border transform transition-all flex flex-col" style={{maxHeight: '90vh'}}>
                <div className="p-6 border-b border-brand-border flex justify-between items-center flex-shrink-0">
                    <h2 className="text-2xl font-bold text-brand-primary">Generated Freelance Brief</h2>
                    <div className="flex items-center gap-2">
                         <button
                            onClick={onDownloadPdf}
                            disabled={!content || isLoading || isDownloading}
                            className="flex items-center justify-center gap-2 font-bold py-2 px-4 rounded-lg transition-colors bg-brand-primary hover:bg-teal-500 disabled:opacity-50"
                        >
                            <DownloadIcon className="w-5 h-5"/> PDF
                        </button>
                         <button
                            onClick={handleCopy}
                            disabled={!content || isLoading}
                            className="flex items-center justify-center gap-2 font-bold py-2 px-4 rounded-lg transition-colors bg-brand-secondary hover:bg-purple-700 disabled:opacity-50"
                        >
                            {isCopied ? <CheckIcon className="w-5 h-5"/> : <ClipboardIcon className="w-5 h-5" />}
                            {isCopied ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                </div>
                <div className="p-6 flex-grow overflow-y-auto">
                    {isLoading && (
                        <div className="text-center p-8">
                            <LoaderIcon className="w-10 h-10 text-brand-primary animate-spin mx-auto" />
                            <p className="mt-4 text-brand-text-muted">Generating brief...</p>
                        </div>
                    )}
                    {content && !isLoading && (
                        <FormattedMarkdown content={content} />
                    )}
                </div>
                <div className="p-4 bg-brand-bg/50 border-t border-brand-border text-right flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="font-bold py-2 px-6 rounded-lg transition-colors bg-brand-primary hover:bg-teal-500"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};