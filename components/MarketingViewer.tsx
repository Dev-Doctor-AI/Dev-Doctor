

import React from 'react';
import { MarketingPlan } from '../types';
import { GlobeIcon, CheckIcon } from './icons';

export const MarketingViewer: React.FC<{ plans: MarketingPlan[] }> = ({ plans }) => {
    return (
        <div className="w-full space-y-4">
            <h3 className="text-xl font-bold text-brand-text mb-2">Marketing Strategy Options</h3>
            <p className="text-brand-text-muted mb-4">Four tailored marketing plans based on your project's details.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(Array.isArray(plans) ? plans : []).map((plan, index) => (
                    <div key={index} className="bg-brand-surface border border-brand-border rounded-lg p-4 flex flex-col">
                        <div className="mb-3">
                            <h4 className="text-lg font-bold text-brand-primary">{plan.title}</h4>
                            <p className="text-sm font-semibold text-brand-secondary">{plan.budget}</p>
                        </div>
                        <p className="text-brand-text-muted text-sm mb-4 flex-grow">{plan.description}</p>
                        <div>
                            <h5 className="font-semibold text-brand-text mb-2 text-sm">Channels:</h5>
                            <div className="flex flex-wrap gap-2">
                                {(Array.isArray(plan.channels) ? plan.channels : []).map((channel, cIndex) => (
                                    <span key={cIndex} className="bg-brand-bg text-brand-text-muted text-xs font-medium px-2 py-1 rounded-full border border-brand-border">
                                        {channel}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};