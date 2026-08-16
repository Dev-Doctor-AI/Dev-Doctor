import React, { useMemo } from 'react';
import { ProjectPackage } from '../types';
import { exportHTML } from '../services/packageExporter';

interface RichPackagePreviewProps {
  packageData: ProjectPackage;
  className?: string;
}

/** In-app read-only preview using the same renderer as the downloadable HTML package. */
export const RichPackagePreview: React.FC<RichPackagePreviewProps> = ({ packageData, className = '' }) => {
  const html = useMemo(() => exportHTML(packageData), [packageData]);
  return (
    <iframe
      title={`${packageData.meta.projectName} rich package preview`}
      srcDoc={html}
      className={`w-full min-h-[75vh] rounded-xl border border-brand-border bg-white ${className}`}
      sandbox="allow-same-origin"
    />
  );
};
