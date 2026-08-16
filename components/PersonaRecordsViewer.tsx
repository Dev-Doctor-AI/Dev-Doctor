import React from 'react';
import { ProjectPackage } from '../types';

interface PersonaRecordsViewerProps {
  packageData: ProjectPackage;
}

const RecordList: React.FC<{ items: string[]; empty?: string }> = ({ items, empty = 'None recorded.' }) => (
  items.length ? (
    <ul className="list-disc ml-5 space-y-1 text-brand-text-muted">
      {items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
    </ul>
  ) : <p className="text-brand-text-muted">{empty}</p>
);

export const PersonaRecordsViewer: React.FC<PersonaRecordsViewerProps> = ({ packageData }) => {
  const hasRecords = Boolean(
    packageData.conciergeMode
    || packageData.memoryEntries?.length
    || packageData.userProxy
    || packageData.riskCritique?.risks.length
    || packageData.synthesis
    || packageData.transcriptRecord,
  );

  if (!hasRecords) {
    return <p className="text-brand-text-muted">No memory or persona records have been captured yet.</p>;
  }

  return (
    <div className="space-y-6" data-testid="persona-records-viewer">
      <section>
        <h4 className="text-lg font-bold text-brand-primary">Concierge mode</h4>
        <p className="mt-1 inline-flex rounded-full bg-brand-primary/15 px-3 py-1 text-sm font-semibold text-brand-primary">
          {packageData.conciergeMode || 'Not recorded'}
        </p>
      </section>

      <section>
        <h4 className="text-lg font-bold text-brand-primary">Structured memory</h4>
        {packageData.memoryEntries?.length ? (
          <div className="mt-2 space-y-2">
            {packageData.memoryEntries.map(entry => (
              <div key={entry.id} className="rounded-lg border border-brand-border bg-brand-surface/40 p-3">
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="text-brand-primary">{entry.kind}</span>
                  <span className="text-brand-text-muted">{entry.status}</span>
                  <span className="font-mono text-brand-text-muted">{entry.id}</span>
                </div>
                <p className="mt-1 text-brand-text">{entry.text}</p>
                {entry.sourceReferences.length > 0 && <p className="mt-1 text-xs text-brand-text-muted">Sources: {entry.sourceReferences.join(', ')}</p>}
              </div>
            ))}
          </div>
        ) : <p className="mt-1 text-brand-text-muted">No structured memory recorded.</p>}
      </section>

      {packageData.userProxy && (
        <section>
          <h4 className="text-lg font-bold text-brand-primary">User Proxy</h4>
          <p className="mt-1 text-brand-text-muted">{packageData.userProxy.perspective}</p>
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            <div><h5 className="font-semibold text-brand-secondary">Priorities</h5><RecordList items={packageData.userProxy.priorities} /></div>
            <div><h5 className="font-semibold text-brand-secondary">Concerns</h5><RecordList items={packageData.userProxy.concerns} /></div>
          </div>
        </section>
      )}

      {packageData.riskCritique?.risks.length ? (
        <section>
          <h4 className="text-lg font-bold text-brand-primary">Senior Technical Analyst risks</h4>
          <div className="mt-2 space-y-2">
            {packageData.riskCritique.risks.map(risk => (
              <div key={risk.id} className="rounded-lg border border-brand-border bg-brand-surface/40 p-3">
                <p className="font-semibold text-brand-text">{risk.severity}: {risk.risk}</p>
                <p className="mt-1 text-brand-text-muted">{risk.consequence}</p>
                {risk.decision && <p className="mt-1 text-sm text-green-400">Decision: {risk.decision}</p>}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {packageData.synthesis && (
        <section>
          <h4 className="text-lg font-bold text-brand-primary">Synthesis</h4>
          <p className="mt-1 text-brand-text-muted">{packageData.synthesis.summary}</p>
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            <div><h5 className="font-semibold text-brand-secondary">Accepted decisions</h5><RecordList items={packageData.synthesis.acceptedDecisions} /></div>
            <div><h5 className="font-semibold text-brand-secondary">Unresolved questions</h5><RecordList items={packageData.synthesis.unresolvedQuestions} /></div>
          </div>
        </section>
      )}

      {packageData.transcriptRecord && (
        <section>
          <h4 className="text-lg font-bold text-brand-primary">Full transcript status</h4>
          <p className="mt-1 text-brand-text-muted">
            {packageData.transcriptRecord.preservedInFull ? 'Preserved in full' : 'Not preserved in full'} · {packageData.transcriptRecord.messages.length} messages
          </p>
        </section>
      )}
    </div>
  );
};