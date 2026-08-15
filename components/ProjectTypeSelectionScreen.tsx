

import React from 'react';
import { ProjectType } from '../types';
import { MessageSquareIcon } from './icons';

interface ProjectTypeSelectionScreenProps {
    onSelect: (type: ProjectType) => void;
}

export const ProjectTypeSelectionScreen: React.FC<ProjectTypeSelectionScreenProps> = ({ onSelect }) => (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-brand-bg text-center p-4">
        <div className="max-w-4xl w-full p-8 bg-brand-surface/50 rounded-xl border border-brand-border/50 shadow-2xl backdrop-blur-sm">
            <h2 className="text-3xl font-bold text-brand-primary mb-4">Select Your Goal</h2>
            <p className="text-brand-text-muted mb-8">Choose a structured workflow or have a direct conversation with the specialist agent.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 justify-center">
                <button 
                    onClick={() => onSelect(ProjectType.GAME)}
                    className="group flex flex-col items-center justify-center bg-brand-secondary hover:bg-purple-700 text-white font-bold py-6 px-8 rounded-lg text-xl transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg"
                >
                    <span className="text-5xl mb-2">🎮</span>
                    <span>Game Project</span>
                    <span className="text-xs font-normal opacity-70 mt-1">Guided GDD Workflow</span>
                </button>
                <button 
                    onClick={() => onSelect(ProjectType.APP)}
                    className="group flex flex-col items-center justify-center bg-brand-primary hover:bg-teal-500 text-white font-bold py-6 px-8 rounded-lg text-xl transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg"
                >
                     <span className="text-5xl mb-2">📱</span>
                    <span>Software App</span>
                     <span className="text-xs font-normal opacity-70 mt-1">Guided PRD Workflow</span>
                </button>
                 <button 
                    onClick={() => onSelect(ProjectType.DIRECT_CHAT)}
                    className="group flex flex-col items-center justify-center md:col-span-2 lg:col-span-1 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-6 px-8 rounded-lg text-xl transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg"
                >
                     <div className="relative mb-2">
                         <MessageSquareIcon className="w-12 h-12"/>
                         <span className="absolute -top-1 -right-2 text-xs bg-red-500 text-white font-bold px-1.5 py-0.5 rounded-full">PRO</span>
                     </div>
                    <span>Chat with Agent</span>
                     <span className="text-xs font-normal opacity-70 mt-1">Premium Direct Q&A</span>
                </button>
            </div>
        </div>
    </div>
);