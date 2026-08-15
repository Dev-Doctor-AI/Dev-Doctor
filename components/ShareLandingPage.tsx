
import React, { useState, useEffect } from 'react';
import { BotIcon, LoaderIcon, ChevronDownIcon } from './icons';
import { ProjectType, GDDSection, PitchDeckSlide, GeneratedImages, MVPDefinition, TDDFeature } from '../types';
import { TDDViewer } from './TDDViewer';
import { MVPViewer } from './MVPViewer';


// Helper function to determine GDD section styling.
// In a larger app, this would live in a shared utils file.
const getGDDSectionStyle = (title: string): { tag: 'h2' | 'h3' | 'h4'; className: string } => {
    const trimmedTitle = title.trim();
    if (/\d+\.0(\s|$)/.test(trimmedTitle)) {
        return { tag: 'h2', className: 'text-2xl font-bold text-brand-secondary mt-8 mb-4' };
    }
    if (/\d+\.\d+\.\d+(\s|$)/.test(trimmedTitle)) {
        return { tag: 'h4', className: 'text-lg font-semibold text-brand-text mt-4 mb-2' };
    }
    if (/\d+\.\d+(\s|$)/.test(trimmedTitle)) {
        return { tag: 'h3', className: 'text-xl font-semibold text-brand-primary mt-6 mb-3' };
    }
    return { tag: 'h4', className: 'text-lg font-semibold text-brand-text mt-4 mb-2' };
};


interface SharePayload {
    projectName: string;
    projectType: ProjectType;
    gddContent: GDDSection[];
    pitchDeckContent: PitchDeckSlide[];
    generatedImages: GeneratedImages;
    mvpDefinition?: MVPDefinition;
    tddContent?: TDDFeature[];
}

export const ShareLandingPage: React.FC = () => {
    const [shareData, setShareData] = useState<SharePayload | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isInvalidOrLegacyLink, setInvalidOrLegacyLink] = useState(false);
    const [openSection, setOpenSection] = useState<string | null>('gdd');
    
    useEffect(() => {
        const hash = window.location.hash;
        let shareIdFromHash: string | null = null;

        if (hash && hash.startsWith('#share_id=')) {
            shareIdFromHash = hash.substring('#share_id='.length);
        }

        if (shareIdFromHash) {
            setIsLoading(true);
            setError(null);
            const fetchUrl = `/api/get-share/${shareIdFromHash}`;
            
            fetch(fetchUrl)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Could not retrieve project data from the sharing service.');
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.projectName) { // Simple validation
                        setShareData(data);
                    } else {
                        throw new Error('The data in the shared link is invalid.');
                    }
                })
                .catch(e => {
                    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
                    console.error("Failed to load shared project:", e);
                    setError(`Could not load the project. ${errorMessage}`);
                })
                .finally(() => setIsLoading(false));
        } else {
            // This handles cases with no hash, an invalid hash, or legacy links.
            setInvalidOrLegacyLink(true);
            setIsLoading(false);
        }
    }, []);

    const handleStart = () => {
        const url = new URL(window.location.href);
        url.search = '';
        url.hash = '';
        window.location.href = url.toString();
    };
    
    if (isLoading) {
        return (
             <div className="flex flex-col items-center justify-center min-h-screen w-full bg-brand-bg text-center p-4">
                <LoaderIcon className="w-12 h-12 animate-spin text-brand-primary" />
                <p className="mt-4 text-brand-text-muted">Loading shared project...</p>
            </div>
        )
    }

    if (error || isInvalidOrLegacyLink) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen w-full bg-brand-bg text-center p-4">
                <div className="max-w-2xl w-full p-8 bg-brand-surface/50 rounded-xl border border-brand-border/50 shadow-2xl backdrop-blur-sm">
                    <div className="flex justify-center items-center gap-4 mb-6">
                        <BotIcon className="w-16 h-16 text-brand-primary" />
                        <h1 className="text-4xl font-bold text-brand-primary">Dev Doctor AI</h1>
                    </div>
                    {error ? (
                         <p className="text-lg text-red-500 mb-8">{error}</p>
                    ) : (
                        <p className="text-lg text-brand-text-muted mb-8">
                            A friend is using Dev Doctor AI to create professional project documents and compelling Pitch Decks.
                        </p>
                    )}

                    <p className="text-md text-brand-text mb-8">You can use it to turn your ideas into reality, too.</p>
                    
                    <button
                        onClick={handleStart}
                        className="bg-brand-secondary hover:bg-purple-700 text-white font-bold py-4 px-8 rounded-lg text-xl transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg flex items-center gap-3 mx-auto"
                    >
                        Create Your Own Project
                    </button>
                </div>
            </div>
        );
    }
    
    if (!shareData) return null; // Should not happen if logic is correct

    const { projectName, projectType, gddContent, pitchDeckContent, generatedImages, mvpDefinition, tddContent } = shareData;
    const documentTypeName = projectType === ProjectType.GAME ? 'Game Design Document' : 'Product Requirements Document';

    return (
        <div className="w-full min-h-screen bg-brand-bg font-sans text-brand-text">
            <header className="p-4 bg-brand-surface border-b border-brand-border sticky top-0 z-20 backdrop-blur-sm bg-opacity-80">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-center sm:text-left">
                        <h1 className="text-2xl font-bold text-brand-primary">Dev Doctor AI</h1>
                        <p className="text-sm text-brand-text-muted">Viewing shared project: <span className="font-semibold text-brand-text">{projectName}</span></p>
                    </div>
                    <button
                        onClick={handleStart}
                        className="bg-brand-secondary hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-lg flex-shrink-0"
                    >
                        Create Your Own Project
                    </button>
                </div>
            </header>
            
            <main className="max-w-7xl mx-auto p-2 sm:p-4 lg:p-6">
                 <div className="space-y-4">
                    {/* GDD/PRD Accordion */}
                    <div className="bg-brand-surface rounded-lg border border-brand-border overflow-hidden">
                        <button
                            onClick={() => setOpenSection(openSection === 'gdd' ? null : 'gdd')}
                            className="w-full flex justify-between items-center p-4 text-left hover:bg-brand-border/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                        >
                            <h3 className="text-xl font-bold text-brand-secondary">{documentTypeName}</h3>
                            <ChevronDownIcon className={`w-6 h-6 text-brand-text-muted transition-transform duration-300 ${openSection === 'gdd' ? 'rotate-180' : ''}`} />
                        </button>
                        {openSection === 'gdd' && (
                             <div className="p-4 sm:p-8 border-t border-brand-border">
                                <div className="space-y-2">
                                    {(Array.isArray(gddContent) && gddContent.length > 0) ? gddContent.map((section, index) => {
                                        const { tag: Tag, className } = getGDDSectionStyle(section.title);
                                        const finalClassName = index === 0 ? className.replace(/mt-\d+/, 'mt-0') : className;
                                        return (
                                            <div key={index}>
                                                <Tag className={finalClassName}>{section.title}</Tag>
                                                <p className="mt-2 text-brand-text-muted whitespace-pre-wrap">{section.content.replace(/<!--.*?-->/g, '').trim()}</p>
                                            </div>
                                        );
                                    }) : <p className="text-brand-text-muted italic">No {documentTypeName} content was shared.</p>}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Pitch Deck Accordion */}
                    <div className="bg-brand-surface rounded-lg border border-brand-border overflow-hidden">
                         <button
                            onClick={() => setOpenSection(openSection === 'pitch' ? null : 'pitch')}
                            className="w-full flex justify-between items-center p-4 text-left hover:bg-brand-border/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                        >
                            <h3 className="text-xl font-bold text-brand-secondary">Pitch Deck</h3>
                            <ChevronDownIcon className={`w-6 h-6 text-brand-text-muted transition-transform duration-300 ${openSection === 'pitch' ? 'rotate-180' : ''}`} />
                        </button>
                        {openSection === 'pitch' && (
                             <div className="p-4 sm:p-8 space-y-8 border-t border-brand-border">
                                {(Array.isArray(pitchDeckContent) && pitchDeckContent.length > 0) ? pitchDeckContent.map((slide, index) => {
                                     const slideWithVisual = slide.visualPrompt && generatedImages && generatedImages[slide.visualPrompt];
                                     return (
                                        <div 
                                            key={index} 
                                            className="bg-brand-bg border border-brand-border rounded-lg shadow-lg overflow-hidden flex flex-col min-h-[60vh] md:min-h-[70vh] relative"
                                        >
                                            <div className="px-6 py-4 flex-shrink-0 bg-brand-surface/50">
                                                <h4 className="text-xl font-bold text-brand-primary">
                                                    SLIDE {index + 1}: {slide.title}
                                                </h4>
                                            </div>
                                            
                                            {slideWithVisual ? (
                                                <div className="flex-grow flex flex-col min-h-0">
                                                    <div className="flex-[3_3_0%] p-4 flex items-center justify-center min-h-0">
                                                        {generatedImages[slide.visualPrompt!] ? (
                                                            <img 
                                                                src={`data:image/jpeg;base64,${generatedImages[slide.visualPrompt!]}`} 
                                                                alt={slide.title} 
                                                                className="w-auto h-auto max-w-full max-h-full object-contain rounded-md shadow-md"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full bg-gray-800 rounded-lg flex items-center justify-center text-brand-text-muted">
                                                                <span>Image not available</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-[2_2_0%] p-6 md:p-8 flex flex-col justify-center text-left overflow-y-auto">
                                                        <p className="text-xl lg:text-2xl text-brand-text-muted whitespace-pre-wrap break-words">
                                                            {slide.content.replace(/<!--.*?-->/g, '').trim()}
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex-grow p-6 flex flex-col items-center justify-center text-center">
                                                     <p className="text-2xl lg:text-3xl text-brand-text-muted whitespace-pre-wrap break-words">
                                                        {slide.content.replace(/<!--.*?-->/g, '').trim()}
                                                    </p>
                                                </div>
                                            )}
                                            
                                            <div className="absolute bottom-2 right-4 text-xs text-brand-text-muted opacity-60 pointer-events-none">
                                                Shared via Dev Doctor AI
                                            </div>
                                        </div>
                                    );
                                }) : <p className="text-brand-text-muted italic">No Pitch Deck content was shared.</p>}
                            </div>
                        )}
                    </div>
                    
                    {/* MVP Accordion */}
                    {mvpDefinition && (
                         <div className="bg-brand-surface rounded-lg border border-brand-border overflow-hidden">
                            <button
                                onClick={() => setOpenSection(openSection === 'mvp' ? null : 'mvp')}
                                className="w-full flex justify-between items-center p-4 text-left hover:bg-brand-border/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                            >
                                <h3 className="text-xl font-bold text-brand-secondary">Minimum Viable Product (MVP)</h3>
                                <ChevronDownIcon className={`w-6 h-6 text-brand-text-muted transition-transform duration-300 ${openSection === 'mvp' ? 'rotate-180' : ''}`} />
                            </button>
                            {openSection === 'mvp' && (
                                <div className="p-4 sm:p-8 border-t border-brand-border">
                                    <MVPViewer mvp={mvpDefinition} />
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* TDD Accordion */}
                    {tddContent && (
                         <div className="bg-brand-surface rounded-lg border border-brand-border overflow-hidden">
                            <button
                                onClick={() => setOpenSection(openSection === 'tdd' ? null : 'tdd')}
                                className="w-full flex justify-between items-center p-4 text-left hover:bg-brand-border/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                            >
                                <h3 className="text-xl font-bold text-brand-secondary">Technical Design Specs</h3>
                                <ChevronDownIcon className={`w-6 h-6 text-brand-text-muted transition-transform duration-300 ${openSection === 'tdd' ? 'rotate-180' : ''}`} />
                            </button>
                            {openSection === 'tdd' && (
                                <div className="p-4 sm:p-8 border-t border-brand-border">
                                    <TDDViewer features={tddContent} />
                                </div>
                            )}
                        </div>
                    )}
                 </div>
            </main>
        </div>
    );
};