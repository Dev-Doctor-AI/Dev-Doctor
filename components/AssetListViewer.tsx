

import React, { useState } from 'react';
import { AssetList } from '../types';
import { ChevronDownIcon } from './icons';

export const AssetListViewer: React.FC<{ assets: AssetList; isPrintMode?: boolean }> = ({ assets, isPrintMode = false }) => {
    const safeAssets = assets || {};
    const categories = Object.keys(safeAssets);
    const [openCategory, setOpenCategory] = useState<string | null>(categories[0] || null);

    const toggleCategory = (category: string) => {
        setOpenCategory(openCategory === category ? null : category);
    };

    return (
        <div className="w-full space-y-4">
            <h3 className="text-xl font-bold text-brand-text mb-2">Preliminary Asset List</h3>
            <p className="text-brand-text-muted mb-4">A checklist of assets inferred from the design document.</p>
            <div className="space-y-2">
                {categories.map((category) => (
                    <div key={category} className="rounded-lg bg-brand-surface border border-brand-border overflow-hidden">
                        <button
                            onClick={() => toggleCategory(category)}
                            disabled={isPrintMode}
                            className="w-full flex justify-between items-center p-4 text-left font-semibold text-brand-text hover:bg-brand-border/50 focus:outline-none focus:ring-2 focus:ring-brand-primary disabled:cursor-default disabled:hover:bg-transparent"
                        >
                            <span>{category.replace(/_/g, ' ')}</span>
                            {!isPrintMode && <ChevronDownIcon className={`w-5 h-5 transition-transform duration-300 text-brand-text-muted ${openCategory === category ? 'rotate-180' : ''}`} />}
                        </button>
                        {(isPrintMode || openCategory === category) && (
                            <div className="p-4 border-t border-brand-border bg-brand-surface/30">
                                <ul className="list-disc list-inside space-y-1 text-brand-text-muted">
                                    {(Array.isArray(safeAssets[category]) ? safeAssets[category] : []).map((item, index) => (
                                        <li key={index}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
