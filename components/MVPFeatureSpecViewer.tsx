import React from 'react';
import Markdown from 'react-markdown';
import { MVPFeatureSpec } from '../types';

export const MVPFeatureSpecViewer: React.FC<{ features: MVPFeatureSpec[] | null; projectName?: string }> = ({ features, projectName }) => {
    if (!features || features.length === 0) return <div className="text-center text-brand-text-muted">No feature specifications have been generated.</div>;

    return (
        <div className="space-y-8 font-sans">
            <div className="text-center mb-10">
                <h2 className="text-4xl font-bold text-brand-primary tracking-tight">MVP Feature Specifications (BDD)</h2>
                {projectName && <p className="text-xl text-brand-text-muted mt-2">{projectName} (MVP-Focused)</p>}
            </div>

            {features.map((f, idx) => (
                <article key={f.id || idx} className="space-y-6">
                    <header>
                        <h3 className="text-3xl font-bold text-brand-secondary border-b border-brand-border pb-2">Feature: {f.feature}</h3>
                        <p className="text-sm text-brand-text-muted mt-2">User story: <strong>{f.userStory}</strong></p>
                    </header>

                    <section className="space-y-4">
                        <h4 className="text-xl font-bold text-brand-primary mb-2">Scenarios (Given / When / Then)</h4>
                        <div className="space-y-3">
                            {f.scenarios.map((s, sIdx) => (
                                <div key={sIdx} className="p-3 rounded-lg border border-brand-border bg-brand-surface/40">
                                    {s.title && <div className="font-semibold text-brand-text">{s.title}</div>}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                                        <div>
                                            <div className="text-xs font-semibold text-brand-text-muted">Given</div>
                                            <ul className="list-disc ml-4 mt-1">
                                                {s.given.map((g, gi) => <li key={gi} className="text-brand-text-muted">{g}</li>)}
                                            </ul>
                                        </div>
                                        <div>
                                            <div className="text-xs font-semibold text-brand-text-muted">When</div>
                                            <ul className="list-disc ml-4 mt-1">
                                                {s.when.map((w, wi) => <li key={wi} className="text-brand-text-muted">{w}</li>)}
                                            </ul>
                                        </div>
                                        <div>
                                            <div className="text-xs font-semibold text-brand-text-muted">Then</div>
                                            <ul className="list-disc ml-4 mt-1">
                                                {s.then.map((t, ti) => <li key={ti} className="text-brand-text-muted">{t}</li>)}
                                            </ul>
                                        </div>
                                    </div>
                                    {s.notes && <div className="mt-2 text-sm text-brand-text-muted">Notes: {s.notes}</div>}
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="space-y-2">
                        <h4 className="text-lg font-bold text-brand-primary">Invalid / Wrong-input behavior</h4>
                        <div className="prose prose-invert prose-sm markdown-content pl-4 border-l-2 border-brand-primary/20">
                            {f.invalidInputs && f.invalidInputs.length > 0 ? (
                                <ul className="list-disc ml-4">{f.invalidInputs.map((it, i) => <li key={i}>{it}</li>)}</ul>
                            ) : (<p className="text-brand-text-muted">No explicit invalid input behaviors specified.</p>)}
                        </div>
                    </section>

                    <section className="space-y-2">
                        <h4 className="text-lg font-bold text-brand-primary">Boundary / Tolerance conditions</h4>
                        <div className="prose prose-invert prose-sm markdown-content pl-4 border-l-2 border-brand-primary/20">
                            {f.boundaryConditions && f.boundaryConditions.length > 0 ? (
                                <ul className="list-disc ml-4">{f.boundaryConditions.map((b, i) => <li key={i}>{b}</li>)}</ul>
                            ) : (<p className="text-brand-text-muted">No boundary conditions specified.</p>)}
                        </div>
                    </section>

                    <section className="space-y-2">
                        <h4 className="text-lg font-bold text-brand-primary">Offline / Failure behavior</h4>
                        <div className="prose prose-invert prose-sm markdown-content pl-4 border-l-2 border-brand-primary/20">
                            {f.offlineBehavior ? <Markdown>{f.offlineBehavior}</Markdown> : <p className="text-brand-text-muted">No offline behavior specified.</p>}
                        </div>
                    </section>

                    <section className="space-y-2">
                        <h4 className="text-lg font-bold text-brand-primary">Accessibility / Usability</h4>
                        <div className="prose prose-invert prose-sm markdown-content pl-4 border-l-2 border-brand-primary/20">
                            {f.accessibility && f.accessibility.length > 0 ? (
                                <ul className="list-disc ml-4">{f.accessibility.map((a, i) => <li key={i}>{a}</li>)}</ul>
                            ) : (<p className="text-brand-text-muted">No accessibility conditions specified.</p>)}
                        </div>
                    </section>

                    <section className="space-y-2">
                        <h4 className="text-lg font-bold text-brand-primary">Technical notes & dependencies</h4>
                        <div className="prose prose-invert prose-sm markdown-content pl-4 border-l-2 border-brand-primary/20">
                            {f.technicalNotes ? <Markdown>{f.technicalNotes}</Markdown> : <p className="text-brand-text-muted">No technical notes provided.</p>}
                            {f.dependencies && f.dependencies.length > 0 && (
                                <div className="mt-2">
                                    <p className="text-sm font-semibold">Dependencies:</p>
                                    <ul className="list-disc ml-4">{f.dependencies.map((d, i) => <li key={i}>{d}</li>)}</ul>
                                </div>
                            )}
                        </div>
                    </section>

                    {idx < features.length - 1 && <hr className="border-brand-border my-12" />}
                </article>
            ))}
        </div>
    );
};
