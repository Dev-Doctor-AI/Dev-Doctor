import React from 'react';
import { ProjectType } from '../types';
import { FileCodeIcon, CheckIcon, GlobeIcon, TargetIcon, DownloadIcon, LoaderIcon, BriefcaseIcon, WandIcon } from './icons';

interface OutputPanelProps {
    projectType: ProjectType;
    onGenerateGDD: () => void;
    onRunUnifiedPipeline: () => void;
    onGeneratePitchDeck: () => void;
    onGenerateMvp: () => void;
    onGenerateTddSpecs: () => void;
    onGenerateTddDoc: () => void;
    onGenerateAssetList: () => void;
    onGenerateScopeReview: () => void;
    onGenerateModularBreakdown: () => void;
    onRefactor: () => void; // New prop for refactoring
    gddGenerated: boolean;
    pitchDeckGenerated: boolean;
    mvpGenerated: boolean;
    tddSpecsGenerated: boolean;
    tddDocGenerated: boolean;
    assetListGenerated: boolean;
    scopeReviewGenerated: boolean;
    modularBreakdownGenerated: boolean;
    isGeneratingKey: string | null;
    workflowError?: string | null;
    critiqueCompleted: boolean;
}

const OutputButton = ({ icon, title, description, isGenerated, onClick, disabled, isLoading }: { icon: React.ReactNode, title: string, description: string, isGenerated: boolean, onClick: () => void, disabled?: boolean, isLoading?: boolean }) => (
    <button
        onClick={onClick}
        disabled={isGenerated || disabled || isLoading}
        className="w-full text-left p-3 rounded-lg flex items-start gap-3 transition-colors bg-brand-surface hover:bg-brand-border/50 disabled:opacity-60 disabled:cursor-not-allowed border border-brand-border"
    >
        <div className="flex-shrink-0 mt-1">
            {isLoading ? <LoaderIcon className="w-6 h-6 text-brand-primary animate-spin" /> : 
             isGenerated ? <CheckIcon className="w-6 h-6 text-green-400" /> : 
             icon}
        </div>
        <div>
            <h4 className={`font-bold ${isGenerated ? 'text-green-400' : 'text-brand-text'}`}>{title}</h4>
            <p className="text-xs text-brand-text-muted">{description}</p>
        </div>
    </button>
);


export const OutputPanel: React.FC<OutputPanelProps> = (props) => {

    return (
        <div className="p-4 h-full flex flex-col">
            <h3 className="text-xl font-bold text-brand-primary mb-4 pb-2 border-b border-brand-border">Output Control Panel</h3>
            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                 <p className="text-sm text-brand-text-muted">
                    Generate project assets on-demand. Start with the GDD/PRD, then unlock other documents sequentially.
                </p>
                 <OutputButton
                    icon={<WandIcon className="w-6 h-6 text-brand-primary" />}
                    title="Run Full Recovery Pipeline"
                    description="Runs canonical synthesis through GDD, MVP, BDD, TDD, production, pitch, and scope in dependency order."
                    isGenerated={false}
                    isLoading={props.isGeneratingKey === 'pipeline'}
                    onClick={props.onRunUnifiedPipeline}
                    disabled={!props.critiqueCompleted}
                 />
                 {props.workflowError && (
                    <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-200" role="alert" data-testid="workflow-error">
                        <p className="font-semibold">Generation needs attention</p>
                        <p className="mt-1 text-red-100/90">{props.workflowError}</p>
                        <p className="mt-2 text-xs text-red-100/80">Correct the displayed contract issue and retry this stage. Downstream stages remain locked until the required output validates.</p>
                    </div>
                 )}

                <div>
                    <h4 className="text-lg font-semibold text-brand-secondary mb-3 mt-4">Core Workflow</h4>
                    <div className="space-y-3">
                        <OutputButton
                            icon={<FileCodeIcon className="w-6 h-6 text-brand-secondary" />}
                            title="1. Generate GDD / PRD"
                            description="Starts a technical review to gather details, then generates the main design document."
                            isGenerated={props.gddGenerated}
                            isLoading={props.isGeneratingKey === 'gdd'}
                            onClick={props.onGenerateGDD}
                        />
                        <OutputButton
                            icon={<TargetIcon className="w-6 h-6 text-brand-secondary" />}
                            title="2. Define MVP"
                            description="Defines the Minimum Viable Product, separating core features from post-launch content."
                            isGenerated={props.mvpGenerated}
                            isLoading={props.isGeneratingKey === 'mvp'}
                            onClick={props.onGenerateMvp}
                            disabled={!props.gddGenerated}
                        />
                        <OutputButton
                            icon={<TargetIcon className="w-6 h-6 text-brand-secondary" />}
                            title="3. Generate MVP Feature Specs"
                            description="Creates user stories and technical specs for each MVP feature."
                            isGenerated={props.tddSpecsGenerated}
                            isLoading={props.isGeneratingKey === 'tdd_specs'}
                            onClick={props.onGenerateTddSpecs}
                            disabled={!props.mvpGenerated}
                        />
                        <OutputButton
                            icon={<TargetIcon className="w-6 h-6 text-brand-secondary" />}
                            title="4. Assemble Final TDD"
                            description="Assembles the final, formal Technical Design Document from the specs."
                            isGenerated={props.tddDocGenerated}
                            isLoading={props.isGeneratingKey === 'tdd_doc'}
                            onClick={props.onGenerateTddDoc}
                            disabled={!props.tddSpecsGenerated}
                        />
                        <OutputButton
                            icon={<BriefcaseIcon className="w-6 h-6 text-brand-secondary" />}
                            title="5. Generate Freelance Briefs"
                            description="Generates production briefs and dependencies for the freelance toolkit."
                            isGenerated={props.modularBreakdownGenerated}
                            isLoading={props.isGeneratingKey === 'modular'}
                            onClick={props.onGenerateModularBreakdown}
                            disabled={!props.tddDocGenerated}
                        />
                        <OutputButton
                            icon={<FileCodeIcon className="w-6 h-6 text-brand-secondary" />}
                            title="6. Generate Asset List"
                            description="Compiles a comprehensive list of required production assets from the production briefs."
                            isGenerated={props.assetListGenerated}
                            isLoading={props.isGeneratingKey === 'assets'}
                            onClick={props.onGenerateAssetList}
                            disabled={!props.modularBreakdownGenerated}
                        />
                        <OutputButton
                            icon={<FileCodeIcon className="w-6 h-6 text-brand-secondary" />}
                            title="7. Generate Pitch Deck"
                            description="Creates a 10-slide deck grounded in the completed design, MVP, TDD, production, and assets."
                            isGenerated={props.pitchDeckGenerated}
                            isLoading={props.isGeneratingKey === 'pitch'}
                            onClick={props.onGeneratePitchDeck}
                            disabled={!props.tddDocGenerated || !props.modularBreakdownGenerated || !props.assetListGenerated}
                        />
                        <OutputButton
                            icon={<TargetIcon className="w-6 h-6 text-brand-secondary" />}
                            title="8. Run Scope Critique"
                            description="Reviews the completed project scope for studio and indie production."
                            isGenerated={props.scopeReviewGenerated}
                            isLoading={props.isGeneratingKey === 'scope'}
                            onClick={props.onGenerateScopeReview}
                            disabled={!props.pitchDeckGenerated}
                        />
                    </div>
                </div>

                <div>
                    <h4 className="text-lg font-semibold text-brand-secondary mb-3 mt-4">Adjust Outputs</h4>
                     <div className="space-y-3">
                        <OutputButton
                            icon={<WandIcon className="w-6 h-6 text-brand-secondary" />}
                            title="Refactor Documents"
                            description="Provide feedback to correct and regenerate selected documents."
                            isGenerated={false} 
                            isLoading={props.isGeneratingKey === 'refactor'}
                            onClick={props.onRefactor}
                            disabled={!props.gddGenerated}
                        />
                    </div>
                     {!props.gddGenerated && (
                         <div className="mt-2 text-xs text-brand-text-muted bg-brand-surface p-2 rounded-md">
                           You must generate the GDD/PRD before you can refactor documents.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};