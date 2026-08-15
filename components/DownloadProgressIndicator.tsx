

import React from 'react';

export const DownloadProgressIndicator: React.FC<{ progress: number; message: string }> = ({ progress, message }) => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-[100] backdrop-blur-sm">
        <div className="w-full max-w-md p-6 bg-brand-surface rounded-lg shadow-xl text-center">
            <h3 className="text-xl font-bold text-brand-primary mb-4">Exporting PDF...</h3>
            <div className="w-full bg-brand-border rounded-full h-2.5 mb-2">
                <div className="bg-brand-secondary h-2.5 rounded-full" style={{ width: `${progress}%`, transition: 'width 0.3s ease-in-out' }}></div>
            </div>
            <p className="text-sm text-brand-text-muted">{message}</p>
        </div>
    </div>
);