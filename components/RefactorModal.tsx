
import React, { useState } from 'react';
import { LoaderIcon, WandIcon } from './icons';

export type RefactorableDocument = 'gdd' | 'pitch' | 'assets' | 'mvp' | 'tdd_specs' | 'tdd_final' | 'modular_breakdown' | 'scope';

export interface RefactorConfig {
    instruction: string;
    documents: RefactorableDocument[];
}

interface RefactorModalProps {
    onClose: () => void;
    onStartRefactor: (config: RefactorConfig) => void;
    isRefactoring: boolean;
    // Pass in generated status to control checkboxes
    gddGenerated: boolean;
    pitchDeckGenerated: boolean;
    assetListGenerated: boolean;
    mvpGenerated: boolean;
    tddSpecsGenerated: boolean;
    tddDocGenerated: boolean;
    modularBreakdownGenerated: boolean;
    scopeReviewGenerated: boolean;
}

export const RefactorModal: React.FC<RefactorModalProps> = ({ onClose, onStartRefactor, isRefactoring, ...props }) => {
    const [instruction, setInstruction] = useState('');
    const [documents, setDocuments] = useState<RefactorableDocument[]>(['gdd']);

    const handleCheckboxChange = (doc: RefactorableDocument, checked: boolean) => {
        setDocuments(prev => {
            let newDocs = new Set(prev);
            if (checked) {
                newDocs.add(doc);
                // GDD is mandatory if any other doc is selected
                if (doc !== 'gdd') {
                    newDocs.add('gdd');
                }
            } else {
                newDocs.delete(doc);
            }
            return Array.from(newDocs);
        });
    };

    const handleSubmit = () => {
        if (!instruction.trim() || documents.length === 0) {
            alert('Please provide instructions and select at least one document to refactor.');
            return;
        }
        onStartRefactor({ instruction, documents });
    };

    const docOptions: { key: RefactorableDocument, label: string, isGenerated: boolean }[] = [
        { key: 'gdd', label: 'GDD / PRD', isGenerated: props.gddGenerated },
        { key: 'pitch', label: 'Pitch Deck', isGenerated: props.pitchDeckGenerated },
        { key: 'assets', label: 'Asset List', isGenerated: props.assetListGenerated },
        { key: 'scope', label: 'Scope Critique', isGenerated: props.scopeReviewGenerated },
        { key: 'mvp', label: 'MVP Definition', isGenerated: props.mvpGenerated },
        { key: 'tdd_specs', label: 'MVP Feature Specs', isGenerated: props.tddSpecsGenerated },
        { key: 'tdd_final', label: 'Final Technical Design Document', isGenerated: props.tddDocGenerated },
        { key: 'modular_breakdown', label: 'Freelance Briefs', isGenerated: props.modularBreakdownGenerated }
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-brand-surface rounded-xl shadow-2xl w-full max-w-2xl border border-brand-border transform transition-all flex flex-col" style={{maxHeight: '90vh'}} onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-brand-border flex items-center gap-3">
                    <WandIcon className="w-6 h-6 text-brand-secondary" />
                    <h2 className="text-2xl font-bold text-brand-primary">Adjust & Refactor</h2>
                </div>
                <div className="p-6 flex-grow overflow-y-auto space-y-6">
                    <div>
                        <label htmlFor="refactor-instruction" className="block text-lg font-semibold text-brand-text mb-2">1. Provide Correction Instructions</label>
                        <textarea
                            id="refactor-instruction"
                            value={instruction}
                            onChange={(e) => setInstruction(e.target.value)}
                            placeholder="e.g., The AI missed a key step. Between the checkpoint and the basement levels, there must be an intermission area where the player can upgrade their equipment."
                            className="w-full h-32 bg-brand-bg border border-brand-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                            disabled={isRefactoring}
                        />
                    </div>
                    <div>
                        <h3 className="block text-lg font-semibold text-brand-text mb-2">2. Select Documents to Regenerate</h3>
                        <p className="text-sm text-brand-text-muted mb-4">The selected documents will be rebuilt using your instructions. Unselected documents will remain unchanged.</p>
                        <div className="space-y-3">
                            {docOptions.map(doc => (
                                <div key={doc.key} className={`p-3 rounded-lg border transition-opacity ${documents.includes(doc.key) ? 'bg-brand-bg border-brand-primary' : 'bg-brand-surface/50 border-brand-border'} ${!doc.isGenerated ? 'opacity-50' : ''}`}>
                                    <label className={`flex items-center gap-3 ${!doc.isGenerated ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                        <input
                                            type="checkbox"
                                            checked={documents.includes(doc.key)}
                                            onChange={(e) => handleCheckboxChange(doc.key, e.target.checked)}
                                            disabled={!doc.isGenerated || isRefactoring || doc.key === 'gdd' && documents.length > 1 && documents.some(d => d !== 'gdd')}
                                            className="h-5 w-5 rounded bg-brand-surface border-brand-border text-brand-primary focus:ring-brand-primary"
                                        />
                                        <span className="font-medium text-brand-text">{doc.label}</span>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-brand-bg/50 border-t border-brand-border flex justify-end items-center gap-4 flex-shrink-0">
                    <button onClick={onClose} disabled={isRefactoring} className="font-bold py-2 px-6 rounded-lg transition-colors bg-brand-border hover:bg-brand-border/50 disabled:opacity-50">Cancel</button>
                    <button
                        onClick={handleSubmit}
                        disabled={isRefactoring || !instruction.trim()}
                        className="font-bold py-2 px-6 rounded-lg transition-colors bg-brand-secondary hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isRefactoring ? <LoaderIcon className="w-5 h-5 animate-spin" /> : <WandIcon className="w-5 h-5" />}
                        {isRefactoring ? 'Refactoring...' : 'Start Refactor'}
                    </button>
                </div>
            </div>
        </div>
    );
};
