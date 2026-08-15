

import React from 'react';
import { BotIcon, LightbulbIcon, LockIcon } from './icons';

interface HomeScreenProps {
    onUnlock: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onUnlock }) => (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-brand-bg font-sans text-brand-text text-center p-4">
        <div className="max-w-3xl w-full p-8 bg-brand-surface/50 rounded-xl border border-brand-border/50 shadow-2xl backdrop-blur-sm">
            <div className="flex justify-center items-center gap-4 mb-6">
                <BotIcon className="w-16 h-16 text-brand-primary" />
                <h1 className="text-4xl md:text-5xl font-bold text-brand-primary">Dev Doctor AI</h1>
            </div>
            <p className="text-lg text-brand-text-muted mb-8">Your personal AI assistant for crafting professional project documents and compelling Pitch Decks.</p>
            <button
                onClick={onUnlock}
                className="bg-brand-secondary hover:bg-purple-700 text-white font-bold py-4 px-8 rounded-lg text-xl transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg flex items-center gap-3 mx-auto"
            >
                <LockIcon className="w-6 h-6"/>
                Unlock Your Session
            </button>
        </div>
         <div className="max-w-3xl w-full mt-8 p-6 bg-brand-surface/30 rounded-lg border border-brand-border/30 text-left">
            <h2 className="text-xl font-bold text-brand-primary mb-4 text-center">How It Works</h2>
            <ol className="space-y-4 text-brand-text-muted">
                <li className="flex items-start gap-3">
                    <div className="flex-shrink-0 bg-brand-secondary text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm mt-1">1</div>
                    <div>
                        <span className="font-semibold text-brand-text">Unlock & Choose:</span> Start by unlocking your session, then select whether you're building a 'Game' or an 'App'.
                    </div>
                </li>
                <li className="flex items-start gap-3">
                    <div className="flex-shrink-0 bg-brand-secondary text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm mt-1">2</div>
                    <div>
                        <span className="font-semibold text-brand-text">Chat with the AI:</span> Answer the Dev Doctor's questions about your project. The questions will be tailored to your project type. Your progress is auto-saved.
                    </div>
                </li>
                <li className="flex items-start gap-3">
                    <div className="flex-shrink-0 bg-brand-secondary text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm mt-1">3</div>
                    <div>
                        <span className="font-semibold text-brand-text">Get Help When Stuck:</span> Press the <LightbulbIcon className="inline-block w-5 h-5 mx-1 text-yellow-400" /> button for a creative suggestion from the AI Helper.
                    </div>
                </li>
                <li className="flex items-start gap-3">
                    <div className="flex-shrink-0 bg-brand-secondary text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm mt-1">4</div>
                    <div>
                        <span className="font-semibold text-brand-text">Review & Download:</span> Once the chat is complete, the AI auto-generates your documents. Download both PDFs to finish and automatically reset the session.
                    </div>
                </li>
            </ol>
        </div>
    </div>
);