

import React from 'react';

export const CostDisplay: React.FC<{ report: { totalCostUSD: number } | null }> = ({ report }) => (
    <div className="bg-brand-surface/50 border border-brand-border/50 rounded-lg px-3 py-2 text-center">
        <p className="text-xs text-brand-text-muted">Est. Session Cost</p>
        <p className="text-lg font-bold text-brand-primary">
            ${report?.totalCostUSD.toFixed(4) || '0.0000'}
        </p>
    </div>
);