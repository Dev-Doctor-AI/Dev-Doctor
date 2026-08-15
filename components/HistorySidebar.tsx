import React from 'react';
import { ProjectSession } from '../types';
import { PlusIcon, TrashIcon } from './icons';

// A helper to format timestamps nicely
const formatTimestamp = (timestamp: number) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffSeconds < 60) return 'Just now';
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
};


interface HistorySidebarProps {
    projects: ProjectSession[];
    activeProjectId: string | null;
    onNewProject: () => void;
    onLoadProject: (id: string) => void;
    onDeleteProject: (id: string) => void;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({ projects, activeProjectId, onNewProject, onLoadProject, onDeleteProject }) => {
    const sortedProjects = [...projects].sort((a, b) => b.lastModified - a.lastModified);
    
    return (
        <aside className="w-64 bg-brand-bg border-r border-brand-border flex flex-col flex-shrink-0">
            <div className="p-4 border-b border-brand-border">
                <button
                    onClick={onNewProject}
                    className="w-full flex items-center justify-center gap-2 font-bold py-2 px-4 rounded-lg transition-colors bg-brand-primary hover:bg-teal-500 text-white"
                >
                    <PlusIcon className="w-5 h-5"/> New Project
                </button>
            </div>
            <div className="flex-1 overflow-y-auto">
                <nav className="p-2 space-y-1">
                    {sortedProjects.map(project => (
                        <div
                            role="button"
                            tabIndex={0}
                            key={project.id}
                            onClick={() => onLoadProject(project.id)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    onLoadProject(project.id);
                                }
                            }}
                            className={`group flex items-center justify-between w-full p-3 rounded-md text-sm font-medium transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
                                activeProjectId === project.id 
                                ? 'bg-brand-surface text-brand-text' 
                                : 'text-brand-text-muted hover:bg-brand-surface/50 hover:text-brand-text'
                            }`}
                        >
                            <div className="flex flex-col truncate">
                                <span className="truncate font-semibold">{project.projectName}</span>
                                <span className="text-xs text-brand-text-muted">{formatTimestamp(project.lastModified)}</span>
                            </div>
                            {/* Only show the delete button for "Untitled Project"s to prevent accidental deletion of named projects. */}
                            {project.projectName === 'Untitled Project' && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteProject(project.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 p-1 rounded-full transition-opacity flex-shrink-0"
                                    aria-label={`Delete project ${project.projectName}`}
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ))}
                </nav>
            </div>
        </aside>
    );
};