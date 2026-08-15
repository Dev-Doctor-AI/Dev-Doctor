

import React, { useState } from 'react';
import { KeyIcon } from './icons';

interface UnlockModalProps {
    onClose: () => void;
    onUnlockWithCode: (code: string) => { success: boolean; error?: string };
    onUnlockWithPayment: () => void;
}

export const UnlockModal: React.FC<UnlockModalProps> = ({ onClose, onUnlockWithCode, onUnlockWithPayment }) => {
    const [unlockCode, setUnlockCode] = useState('');
    const [unlockError, setUnlockError] = useState<string | null>(null);

    const handleCodeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const result = onUnlockWithCode(unlockCode);
        if (!result.success) {
            setUnlockError(result.error || 'Invalid code.');
            setUnlockCode('');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-brand-surface rounded-xl shadow-2xl w-full max-w-md border border-brand-border transform transition-all p-8" onClick={e => e.stopPropagation()}>
                <div className="text-center">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <KeyIcon className="w-8 h-8 text-brand-secondary"/>
                        <h2 className="text-2xl font-bold text-brand-primary">Unlock Your Session</h2>
                    </div>
                    <p className="text-brand-text-muted mb-6">Choose an option to begin.</p>
                </div>
                
                <form onSubmit={handleCodeSubmit} className="space-y-4">
                     <div>
                        <label htmlFor="unlockCode" className="block text-sm font-medium text-brand-text-muted mb-2 text-left">Enter Access Code</label>
                        <input
                            id="unlockCode"
                            type="text"
                            value={unlockCode}
                            onChange={(e) => {
                                setUnlockCode(e.target.value);
                                if (unlockError) setUnlockError(null);
                            }}
                            placeholder="e.g., FREEBIE123"
                            className="w-full text-center bg-brand-bg border border-brand-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                        />
                    </div>
                     {unlockError && <p className="text-red-500 text-sm">{unlockError}</p>}
                    <button 
                        type="submit"
                        className="w-full bg-brand-primary hover:bg-teal-500 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        Unlock with Code
                    </button>
                </form>

                <div className="relative flex py-5 items-center">
                    <div className="flex-grow border-t border-brand-border"></div>
                    <span className="flex-shrink mx-4 text-brand-text-muted text-sm">OR</span>
                    <div className="flex-grow border-t border-brand-border"></div>
                </div>

                <button 
                    onClick={onUnlockWithPayment}
                    className="w-full bg-brand-secondary hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                    Simulated Unlock with One-Time Fee ($0.99)
                </button>
            </div>
        </div>
    );
};