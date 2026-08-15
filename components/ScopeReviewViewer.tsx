import React from 'react';
import { CritiquePoint } from '../types';

interface ScopeReviewViewerProps {
    critiquePoints: CritiquePoint[];
    isPrintMode?: boolean;
}

const SeverityBadge: React.FC<{ severity: 'High' | 'Medium' | 'Low' }> = ({ severity }) => {
    const severityStyles = {
        High: {
            bg: 'bg-red-900/50',
            border: 'border-red-500/60',
            text: 'text-red-400',
            dot: 'bg-red-500'
        },
        Medium: {
            bg: 'bg-yellow-900/50',
            border: 'border-yellow-500/60',
            text: 'text-yellow-400',
            dot: 'bg-yellow-500'
        },
        Low: {
            bg: 'bg-green-900/50',
            border: 'border-green-500/60',
            text: 'text-green-400',
            dot: 'bg-green-500'
        }
    };
    const styles = severityStyles[severity] || severityStyles.Medium;
    return (
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${styles.bg} ${styles.border} ${styles.text}`}>
            <span className={`w-2 h-2 rounded-full ${styles.dot}`}></span>
            {severity} Risk
        </div>
    );
};


export const ScopeReviewViewer: React.FC<ScopeReviewViewerProps> = ({ critiquePoints, isPrintMode = false }) => {
    if (!critiquePoints || critiquePoints.length === 0) {
        return (
            <div className="text-center p-8 bg-brand-surface rounded-lg">
                <h3 className="text-xl font-bold text-brand-primary">No Critique Available</h3>
                <p className="mt-2 text-brand-text-muted">The scope review could not be generated or has no points to display.</p>
            </div>
        );
    }
    
    return (
        <div className="w-full">
            {!isPrintMode && (
                <div className="text-center mb-8">
                    <h3 className="text-3xl font-bold text-brand-text">Scope Analysis</h3>
                    <p className="text-brand-text-muted mt-2 max-w-2xl mx-auto">
                        Here is a detailed breakdown of potential risks and suggestions for your project, based on the selected lens. Each point includes the reasoning to help you make an informed decision.
                    </p>
                </div>
            )}
            <div className="space-y-6">
                {critiquePoints.map((point, index) => (
                    <div key={index} className="bg-brand-surface/50 border border-brand-border rounded-lg shadow-lg overflow-hidden">
                        <div className="p-4 bg-brand-surface flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                            <h4 className="text-xl font-bold text-brand-primary truncate">{point.feature}</h4>
                            <SeverityBadge severity={point.severity} />
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <h5 className="font-semibold text-brand-secondary mb-1">Critique</h5>
                                <p className="text-brand-text-muted pl-4 border-l-2 border-brand-secondary/50">{point.critique}</p>
                            </div>
                            <div>
                                <h5 className="font-semibold text-green-400 mb-1">Suggestion</h5>
                                <p className="text-brand-text-muted pl-4 border-l-2 border-green-500/50">{point.suggestion}</p>
                            </div>
                            <div>
                                <h5 className="font-semibold text-yellow-400 mb-1">Reasoning</h5>
                                <p className="text-brand-text-muted pl-4 border-l-2 border-yellow-500/50">{point.reasoning}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};