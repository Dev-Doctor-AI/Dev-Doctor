

import React, { useState, useEffect, useMemo } from 'react';
import { ProjectType, GDDSection, PitchDeckSlide, GeneratedImages, MVPDefinition, TDDFeature, ProjectPackage } from '../types';
import { EmailIcon, ClipboardIcon, LinkIcon, CheckIcon, LoaderIcon } from './icons';
import { createSharePayload } from '../services/sharePackage';

interface ShareButtonProps {
    projectName: string;
    projectType: ProjectType;
    gddContent: GDDSection[];
    pitchDeckContent: PitchDeckSlide[];
    generatedImages: GeneratedImages;
    mvpDefinition: MVPDefinition | null;
    tddContent: TDDFeature[] | null;
    projectPackage?: ProjectPackage;
}

const ShareModal: React.FC<{
    payload: any;
    onClose: () => void;
    projectName: string;
    projectType: ProjectType;
}> = ({ payload, onClose, projectName, projectType }) => {
    const [isCreatingLink, setIsCreatingLink] = useState(true);
    const [shareableLink, setShareableLink] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isCopied, setIsCopied] = useState(false);

    const createShareLink = async () => {
        setIsCreatingLink(true);
        setError(null);
        setShareableLink(null);
        try {
            // Assumes a backend endpoint exists to handle share data persistence.
            const response = await fetch('/api/create-share', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error(`The backend service returned an error: ${response.statusText}`);
            }

            const { id } = await response.json();
            if (!id) {
                throw new Error('Could not get a valid ID from the backend service.');
            }

            const finalUrl = new URL(window.location.origin);
            finalUrl.hash = `share_id=${id}`;
            setShareableLink(finalUrl.toString());

        } catch (e: any) {
            console.error("Failed to create share link:", e);
            setError(e.message || "An unknown error occurred while creating the link.");
        } finally {
            setIsCreatingLink(false);
        }
    };

    // Automatically create the link when the modal opens
    useEffect(() => {
        createShareLink();
    }, []);

    const handleCopyLink = () => {
        if (!shareableLink) return;
        navigator.clipboard.writeText(shareableLink);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2500);
    };

    const handleShareViaEmail = () => {
        if (!shareableLink) return;
        const subject = `Check out my new project: ${projectName}!`;
        const documentTypeName = projectType === ProjectType.APP ? 'app' : 'game';
        const body = `I used Dev Doctor AI to create project assets for my ${documentTypeName} project, "${projectName}".\n\nYou can view everything here: ${shareableLink}`;
        const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoLink;
    };
    
    const renderContent = () => {
        if (isCreatingLink) {
            return (
                <div className="text-center p-8">
                    <LoaderIcon className="w-12 h-12 text-brand-primary animate-spin mx-auto" />
                    <p className="mt-4 text-brand-text-muted">Generating your secure share link...</p>
                    <p className="text-xs text-brand-text-muted mt-2">This includes all documents and images.</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="text-center p-4">
                    <h3 className="text-lg font-bold text-red-500 mb-2">Failed to Create Link</h3>
                    <p className="text-brand-text-muted mb-4">{error}</p>
                    <button 
                        onClick={createShareLink}
                        className="font-bold py-2 px-4 rounded-lg transition-colors bg-brand-primary hover:bg-teal-500"
                    >
                        Retry
                    </button>
                </div>
            );
        }
        
        if (shareableLink) {
            return (
                <div>
                    <h3 className="text-lg font-bold text-green-400 mb-2">Your link is ready!</h3>
                    <p className="text-brand-text-muted mb-4">Anyone with this link can view a read-only version of your project.</p>
                    <div className="bg-brand-bg p-2 rounded-lg flex flex-col sm:flex-row items-center gap-2">
                        <LinkIcon className="w-5 h-5 text-brand-text-muted flex-shrink-0 hidden sm:block" />
                        <input type="text" readOnly value={shareableLink} className="flex-grow bg-transparent p-2 w-full truncate" aria-label="Shareable Link"/>
                        <button onClick={handleCopyLink} className="w-full sm:w-auto flex-shrink-0 flex items-center justify-center gap-2 font-bold py-2 px-4 rounded-lg transition-colors bg-brand-primary hover:bg-teal-500 disabled:opacity-50" aria-label={isCopied ? 'Copied' : 'Copy Link'}>
                            {isCopied ? <CheckIcon className="w-5 h-5"/> : <ClipboardIcon className="w-5 h-5" />}
                            {isCopied ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                     <button onClick={handleShareViaEmail} className="mt-4 w-full flex items-center justify-center gap-2 font-bold py-3 px-4 rounded-lg transition-colors bg-brand-secondary hover:bg-purple-700">
                        <EmailIcon className="w-5 h-5" />
                        Share via Email
                    </button>
                </div>
            )
        }
        
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-brand-surface rounded-xl shadow-2xl w-full max-w-xl border border-brand-border transform transition-all p-6 sm:p-8" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-brand-primary mb-4">Share Project</h2>
                {renderContent()}
            </div>
        </div>
    );
};


const ShareButton: React.FC<ShareButtonProps> = ({ projectName, projectType, gddContent, pitchDeckContent, generatedImages, mvpDefinition, tddContent, projectPackage }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const legacyPayload = {
        projectName,
        projectType,
        gddContent,
        pitchDeckContent,
        generatedImages,
        mvpDefinition,
        tddContent,
    };
    const payload = useMemo(() => projectPackage ? createSharePayload(projectPackage) : legacyPayload, [projectPackage, projectName, projectType, gddContent, pitchDeckContent, generatedImages, mvpDefinition, tddContent]);
    
    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                disabled={isModalOpen}
                className="flex items-center justify-center gap-2 font-bold py-2 px-4 rounded-lg transition-colors w-full sm:w-auto text-white bg-brand-primary hover:bg-teal-500 disabled:opacity-50"
            >
                <EmailIcon className="w-5 h-5" />
                Share Project
            </button>
            {isModalOpen && (
                <ShareModal 
                    payload={payload} 
                    onClose={() => setIsModalOpen(false)} 
                    projectName={projectName}
                    projectType={projectType}
                />
            )}
        </>
    );
};

export default ShareButton;