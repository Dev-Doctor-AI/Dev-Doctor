import React, { useState } from 'react';
import { BotIcon, RefreshCwIcon, TrashIcon } from './icons';

export const DataCorruptionErrorScreen: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleWipeAndRestart = () => {
        localStorage.removeItem('devDoctorAiProjectHistories');
        window.location.reload();
    };
    
    return (
        <div className="flex h-screen w-screen items-center justify-center bg-brand-bg p-4">
            <div className="max-w-2xl w-full p-8 bg-brand-surface rounded-xl border border-red-500/50 shadow-2xl text-center">
                <BotIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-red-400">Critical Data Error</h1>
                <p className="text-brand-text-muted my-4">
                    We were unable to read your saved project data. This can sometimes happen if the browser closes unexpectedly or if the saved file becomes corrupted.
                </p>
                <p className="text-brand-text-muted mb-6">
                    To protect your work, the application has been stopped to prevent any accidental overwrites.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={() => window.location.reload()}
                        className="flex items-center justify-center gap-2 font-bold py-3 px-6 rounded-lg transition-colors text-white bg-brand-primary hover:bg-teal-500"
                    >
                        <RefreshCwIcon className="w-5 h-5"/>
                        Try Reloading
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center justify-center gap-2 font-bold py-3 px-6 rounded-lg transition-colors text-white bg-red-600 hover:bg-red-700"
                    >
                        <TrashIcon className="w-5 h-5" />
                        Wipe Data & Start Fresh
                    </button>
                </div>
                 <p className="text-xs text-brand-text-muted mt-6">
                    Note: "Wipe Data" is a last resort and will clear all projects stored in this browser.
                </p>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] backdrop-blur-sm p-4" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-brand-surface rounded-xl shadow-2xl w-full max-w-md border border-brand-border transform transition-all p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="text-center">
                            <TrashIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-brand-primary mb-2">Wipe All Data?</h2>
                            <p className="text-brand-text-muted mb-6">
                                Are you sure you want to delete ALL projects and start fresh? This will permanently clear all saved history. This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-3 px-4 rounded-lg font-bold text-brand-text bg-brand-bg hover:bg-brand-border transition-colors border border-brand-border"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleWipeAndRestart}
                                    className="flex-1 py-3 px-4 rounded-lg font-bold text-white bg-red-600 hover:bg-red-700 transition-colors"
                                >
                                    Yes, Wipe Everything
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
