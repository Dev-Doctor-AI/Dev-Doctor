import { ProjectPackage } from '../types';
import { marked } from 'marked';

const hasItems = (items?: string[]): items is string[] => Array.isArray(items) && items.length > 0;

const addTextList = (lines: string[], title: string, items?: string[]): void => {
    if (!hasItems(items)) return;
    lines.push(`${title}:`);
    items.forEach(item => lines.push(`- ${item}`));
};

const addMarkdownList = (sections: string[], title: string, items?: string[]): void => {
    if (!hasItems(items)) return;
    sections.push(`#### ${title}`);
    items.forEach(item => sections.push(`- ${item}`));
};

export function exportJSON(pkg: ProjectPackage): string {
    return JSON.stringify(pkg, null, 2);
}

export function exportText(pkg: ProjectPackage): string {
    const lines: string[] = [];
    lines.push(pkg.meta.projectName.toUpperCase());
    lines.push('='.repeat(40));
    lines.push(`Generated: ${new Date(pkg.meta.generatedAt).toLocaleString()}`);
    lines.push('');

    if (pkg.gddContent && pkg.gddContent.length) {
        lines.push('DESIGN DOCUMENT (GDD/PRD)');
        lines.push('----------------------------------------');
        for (const s of pkg.gddContent) {
            lines.push(s.title.toUpperCase());
            lines.push(s.content.replace(/<[^>]*>/g, '').trim());
            lines.push('');
        }
    }

    if (pkg.pitchDeckContent && pkg.pitchDeckContent.length) {
        lines.push('PITCH DECK');
        lines.push('----------------------------------------');
        pkg.pitchDeckContent.forEach((slide, i) => {
            lines.push(`SLIDE ${i + 1}: ${slide.title.toUpperCase()}`);
            lines.push(slide.content.replace(/<[^>]*>/g, '').trim());
            lines.push('');
        });
    }

    if (pkg.mvpDefinition) {
        lines.push('MVP DEFINITION');
        lines.push(pkg.mvpDefinition.summary);
        lines.push('In Scope:');
        pkg.mvpDefinition.inScope.forEach(i => lines.push(`- ${i}`));
        lines.push('Out of Scope:');
        pkg.mvpDefinition.outOfScope.forEach(i => lines.push(`- ${i}`));
        lines.push('');
    }

    if (pkg.generationDiagnostic?.stage === 'mvp-feature-specs') {
        lines.push('MVP FEATURE SPECIFICATIONS — GENERATION DIAGNOSTIC');
        lines.push(pkg.generationDiagnostic.message);
        pkg.generationDiagnostic.validationOutcomes?.filter(outcome => !outcome.valid).forEach(outcome => {
            lines.push(`- ${outcome.requestedFeature}: ${[...outcome.parseErrors, ...outcome.errors, ...outcome.warnings].filter(Boolean).join('; ')}`);
        });
        lines.push('Downstream Final TDD and Freelance Briefs remain locked until valid feature specifications are generated.');
        lines.push('');
    }

    if (pkg.mvpFeatureSpecs?.length) {
        lines.push('MVP FEATURE SPECIFICATIONS (BDD)');
        for (const f of pkg.mvpFeatureSpecs) {
            lines.push(`FEATURE: ${f.feature}`);
            if (f.id) lines.push(`Feature ID: ${f.id}`);
            lines.push(`User Story: ${f.userStory}`);
            lines.push('Scenarios:');
            for (const s of f.scenarios) {
                const scenarioLabel = [s.title, s.type && `[${s.type}]`, s.id && `(ID: ${s.id})`].filter(Boolean).join(' ');
                if (scenarioLabel) lines.push(`- ${scenarioLabel}`);
                if (Array.isArray(s.given)) s.given.forEach(g => lines.push(`    Given ${g}`));
                if (Array.isArray(s.when)) s.when.forEach(w => lines.push(`    When ${w}`));
                if (Array.isArray(s.then)) s.then.forEach(t => lines.push(`    Then ${t}`));
                if (s.notes) lines.push(`    Notes: ${s.notes}`);
            }
            addTextList(lines, 'Acceptance criteria', f.acceptanceCriteria);
            addTextList(lines, 'Failure states', f.failureStates);
            addTextList(lines, 'Invalid inputs', f.invalidInputs);
            addTextList(lines, 'Boundary/Tolerance conditions', f.boundaryConditions);
            if (f.offlineBehavior) {
                lines.push('Offline/Failure behavior:');
                lines.push(f.offlineBehavior);
            }
            addTextList(lines, 'Accessibility / Usability', f.accessibility);
            addTextList(lines, 'Telemetry', f.telemetry);
            addTextList(lines, 'Security considerations', f.securityConsiderations);
            addTextList(lines, 'Performance targets', f.performanceTargets);
            if (f.technicalNotes) {
                lines.push('Technical notes:');
                lines.push(f.technicalNotes);
            }
            addTextList(lines, 'Dependencies', f.dependencies);

            lines.push('');
        }
    }

    if (pkg.tddContent && pkg.tddContent.length) {
        lines.push('MVP FEATURE SPECIFICATIONS');
        for (const f of pkg.tddContent) {
            lines.push(`FEATURE: ${f.feature}`);
            lines.push('User Stories & Acceptance Criteria:');
            if (Array.isArray(f.userStories)) {
                f.userStories.forEach(us => {
                    lines.push(`- ${us.story}`);
                    us.acceptanceCriteria.forEach(ac => lines.push(`  - ${ac}`));
                });
            } else {
                lines.push(String(f.userStories));
            }
            lines.push('Technical Specifications:');
            if (Array.isArray(f.technicalSpecs)) {
                f.technicalSpecs.forEach(ts => lines.push(`- ${ts.component}: ${ts.details}`));
            } else {
                lines.push(String(f.technicalSpecs));
            }
            lines.push('');
        }
    }

    if (pkg.technicalDesignDocument && pkg.technicalDesignDocument.length) {
        lines.push('TECHNICAL DESIGN DOCUMENT');
        pkg.technicalDesignDocument.forEach(s => {
            lines.push(s.title);
            lines.push(s.content.replace(/<[^>]*>/g, '').trim());
            lines.push('');
        });
    }

    if (pkg.modularBreakdown && pkg.modularBreakdown.length) {
        lines.push('FREELANCE BRIEFS');
        pkg.modularBreakdown.forEach(b => {
            lines.push(b.title);
            lines.push(b.content.replace(/<[^>]*>/g, '').trim());
            lines.push('');
        });
    }

    if (pkg.assetList) {
        lines.push('ASSET LIST');
        for (const [cat, items] of Object.entries(pkg.assetList)) {
            lines.push(cat.toUpperCase());
            items.forEach(it => lines.push(`- ${it}`));
            lines.push('');
        }
    }

    if (pkg.scopeReviewContent && pkg.scopeReviewContent.length) {
        lines.push('SCOPE REVIEW');
        pkg.scopeReviewContent.forEach(p => {
            lines.push(`Feature: ${p.feature}`);
            lines.push(`Severity: ${p.severity}`);
            lines.push(`Critique: ${p.critique}`);
            lines.push(`Suggestion: ${p.suggestion}`);
            lines.push('');
        });
    }

    return lines.join('\n');
}

export function exportMarkdown(pkg: ProjectPackage): string {
    const sections: string[] = [];
    if (pkg.chatHistory?.length) {
        sections.push('## Conversation and Critique');
        sections.push('### Chat History');
        pkg.chatHistory.forEach((message, index) => sections.push(`**${index + 1}. ${message.sender}:**\n${message.text}`));
        if (pkg.critiqueRecord) {
            sections.push('### Technical Critique Record');
            sections.push(`**Summary:** ${pkg.critiqueRecord.summary}`);
            addMarkdownList(sections, 'Questions', pkg.critiqueRecord.questions);
            addMarkdownList(sections, 'Answers', pkg.critiqueRecord.answers);
        } else if (pkg.critiqueQA?.summary) {
            sections.push(`**Summary:** ${pkg.critiqueQA.summary}`);
            addMarkdownList(sections, 'Questions', pkg.critiqueQA.questions);
            addMarkdownList(sections, 'Answers', pkg.critiqueQA.answers);
        }
        sections.push('---');
    }
    if (pkg.memoryEntries?.length || pkg.userProxy || pkg.riskCritique || pkg.synthesis) {
        sections.push('## Memory and Persona Records');
        if (pkg.memoryEntries?.length) {
            sections.push('### Structured Memory');
            pkg.memoryEntries.forEach(entry => sections.push(`- **${entry.kind}/${entry.status}** ${entry.text} _(Sources: ${entry.sourceReferences.join(', ') || 'unspecified'})_`));
        }
        if (pkg.userProxy) {
            sections.push('### User Proxy');
            sections.push(pkg.userProxy.perspective);
            addMarkdownList(sections, 'Priorities', pkg.userProxy.priorities);
            addMarkdownList(sections, 'Concerns', pkg.userProxy.concerns);
        }
        if (pkg.riskCritique) {
            sections.push('### Senior Technical Analyst Risks');
            pkg.riskCritique.risks.forEach(risk => sections.push(`- **${risk.severity}: ${risk.risk}** — ${risk.consequence}`));
        }
        if (pkg.synthesis) {
            sections.push('### Synthesis');
            sections.push(pkg.synthesis.summary);
            addMarkdownList(sections, 'Accepted decisions', pkg.synthesis.acceptedDecisions);
            addMarkdownList(sections, 'Unresolved questions', pkg.synthesis.unresolvedQuestions);
        }
        sections.push('---');
    }
    if (pkg.transcriptRecord) {
        sections.push('## Full Transcript Record');
        sections.push(`**Preserved in full:** ${pkg.transcriptRecord.preservedInFull ? 'Yes' : 'No'}`);
        sections.push(`**Updated:** ${new Date(pkg.transcriptRecord.updatedAt).toLocaleString()}`);
        sections.push(`**Messages:** ${pkg.transcriptRecord.messages.length}`);
        sections.push('---');
    }
    if (pkg.generationMetadata) {
        sections.push('## Generation Metadata');
        sections.push(`- **Run ID:** ${pkg.generationMetadata.runId}`);
        if (pkg.generationMetadata.provider) sections.push(`- **Provider:** ${pkg.generationMetadata.provider}`);
        if (pkg.generationMetadata.model) sections.push(`- **Model:** ${pkg.generationMetadata.model}`);
        sections.push(`- **Stages:** ${pkg.generationMetadata.stages.length}`);
        sections.push('---');
    }
    sections.push(`# ${pkg.meta.projectName}`);
    sections.push(`*Generated: ${new Date(pkg.meta.generatedAt).toLocaleString()}*`);
    sections.push('\n---\n');

    if (pkg.gddContent && pkg.gddContent.length) {
        sections.push('## Design Document (GDD/PRD)');
        pkg.gddContent.forEach(s => {
            sections.push(`### ${s.title}`);
            sections.push(s.content);
        });
        sections.push('---');
    }

    if (pkg.pitchDeckContent && pkg.pitchDeckContent.length) {
        sections.push('## Pitch Deck');
        pkg.pitchDeckContent.forEach((slide, i) => {
            sections.push(`### SLIDE ${i + 1}: ${slide.title}`);
            sections.push(slide.content);
        });
        sections.push('---');
    }

    if (pkg.mvpDefinition) {
        sections.push('## MVP Definition');
        sections.push(`### Summary\n${pkg.mvpDefinition.summary}`);
        sections.push('### In Scope');
        pkg.mvpDefinition.inScope.forEach(i => sections.push(`- ${i}`));
        sections.push('### Out of Scope');
        pkg.mvpDefinition.outOfScope.forEach(i => sections.push(`- ${i}`));
        sections.push('---');
    }

    if (pkg.generationDiagnostic?.stage === 'mvp-feature-specs') {
        sections.push('## MVP Feature Specifications — Generation Diagnostic');
        sections.push(pkg.generationDiagnostic.message);
        const failures = pkg.generationDiagnostic.validationOutcomes?.filter(outcome => !outcome.valid) || [];
        if (failures.length) {
            sections.push('### Validation details');
            failures.forEach(outcome => sections.push(`- **${outcome.requestedFeature}:** ${[...outcome.parseErrors, ...outcome.errors, ...outcome.warnings].filter(Boolean).join('; ')}`));
        }
        sections.push('Downstream Final TDD and Freelance Briefs remain locked until valid feature specifications are generated.');
        sections.push('---');
    }

    if (pkg.mvpFeatureSpecs?.length) {
        sections.push('## MVP Feature Specifications (BDD)');
        for (const f of pkg.mvpFeatureSpecs) {
            sections.push(`### Feature: ${f.feature}`);
            if (f.id) sections.push(`**Feature ID:** \`${f.id}\``);
            sections.push(`**User story:** ${f.userStory}`);
            sections.push('#### Scenarios');
            for (const s of f.scenarios) {
                const scenarioLabel = [s.title, s.type && `[${s.type}]`, s.id && `(ID: \`${s.id}\`)`].filter(Boolean).join(' ');
                if (scenarioLabel) sections.push(`**${scenarioLabel}**`);
                if (Array.isArray(s.given)) {
                    sections.push('*Given*');
                    s.given.forEach(g => sections.push(`- ${g}`));
                }
                if (Array.isArray(s.when)) {
                    sections.push('*When*');
                    s.when.forEach(w => sections.push(`- ${w}`));
                }
                if (Array.isArray(s.then)) {
                    sections.push('*Then*');
                    s.then.forEach(t => sections.push(`- ${t}`));
                }
                if (s.notes) sections.push(`Notes: ${s.notes}`);
            }
            addMarkdownList(sections, 'Acceptance criteria', f.acceptanceCriteria);
            addMarkdownList(sections, 'Failure states', f.failureStates);
            addMarkdownList(sections, 'Invalid / Wrong-input behavior', f.invalidInputs);
            addMarkdownList(sections, 'Boundary / Tolerance conditions', f.boundaryConditions);
            if (f.offlineBehavior) {
                sections.push('#### Offline / Failure behavior');
                sections.push(f.offlineBehavior);
            }
            addMarkdownList(sections, 'Accessibility / Usability', f.accessibility);
            addMarkdownList(sections, 'Telemetry', f.telemetry);
            addMarkdownList(sections, 'Security considerations', f.securityConsiderations);
            addMarkdownList(sections, 'Performance targets', f.performanceTargets);
            if (f.technicalNotes) {
                sections.push('#### Technical notes & dependencies');
                sections.push(f.technicalNotes);
            }
            addMarkdownList(sections, 'Dependencies', f.dependencies);
            sections.push('---');
        }
    }

    if (pkg.tddContent && pkg.tddContent.length) {
        sections.push('## MVP Feature Specifications');
        pkg.tddContent.forEach(f => {
            sections.push(`### Feature: ${f.feature}`);
            if (Array.isArray(f.userStories)) {
                f.userStories.forEach(us => {
                    sections.push(`- As a player, I want to ${us.story}`);
                    us.acceptanceCriteria.forEach(ac => sections.push(`  - ${ac}`));
                });
            } else {
                sections.push(String(f.userStories));
            }
            sections.push('#### Technical Specifications');
            if (Array.isArray(f.technicalSpecs)) {
                f.technicalSpecs.forEach(ts => sections.push(`- **${ts.component}**: ${ts.details}`));
            } else {
                sections.push(String(f.technicalSpecs));
            }
        });
        sections.push('---');
    }

    if (pkg.mvpFeatureSpecValidation?.length) {
        sections.push('## MVP Feature Specification Validation');
        pkg.mvpFeatureSpecValidation.forEach(outcome => {
            sections.push(`### ${outcome.featureId || outcome.requestedFeature}`);
            sections.push(`- **Valid:** ${outcome.valid ? 'Yes' : 'No'}`);
            sections.push(`- **Repaired:** ${outcome.repaired ? 'Yes' : 'No'}`);
            addMarkdownList(sections, 'Errors', outcome.errors);
            addMarkdownList(sections, 'Warnings', outcome.warnings);
        });
        sections.push('---');
    }

    if (pkg.technicalDesignDocument && pkg.technicalDesignDocument.length) {
        sections.push('## Technical Design Document (TDD)');
        pkg.technicalDesignDocument.forEach(s => {
            sections.push(`### ${s.title}`);
            sections.push(s.content);
        });
        sections.push('---');
    }

    if (pkg.modularBreakdown && pkg.modularBreakdown.length) {
        sections.push('## Freelance Briefs');
        pkg.modularBreakdown.forEach(b => {
            sections.push(`### ${b.title}`);
            sections.push(b.content);
        });
        sections.push('---');
    }

    if (pkg.productionBriefs?.length) {
        sections.push('## Structured Production Handoffs');
        pkg.productionBriefs.forEach(brief => {
            sections.push(`### ${brief.title}`);
            sections.push(`**Role:** ${brief.role}  `);
            sections.push(`**Category:** ${brief.category}`);
            sections.push(brief.taskOverview);
            addMarkdownList(sections, 'Deliverables', brief.deliverables);
            addMarkdownList(sections, 'Acceptance criteria', brief.acceptanceCriteria);
            addMarkdownList(sections, 'Dependencies', brief.dependencies);
        });
        sections.push('---');
    }

    if (pkg.assetMetadata?.length || pkg.visualPromptContracts?.length) {
        sections.push('## Asset Metadata and Visual Prompt Contracts');
        pkg.assetMetadata?.forEach(asset => {
            sections.push(`### ${asset.name}`);
            sections.push(`**Asset ID:** \`${asset.id}\``);
            sections.push(`**Category:** ${asset.category}  `);
            sections.push(`**Purpose:** ${asset.purpose}`);
            if (asset.format) sections.push(`**Format:** ${asset.format}  `);
            if (asset.resolution) sections.push(`**Resolution:** ${asset.resolution}`);
            addMarkdownList(sections, 'Acceptance criteria', asset.acceptanceCriteria);
        });
        pkg.visualPromptContracts?.forEach(prompt => {
            sections.push(`### Visual prompt: ${prompt.assetId}`);
            sections.push(prompt.prompt);
            if (prompt.aspectRatio) sections.push(`**Aspect ratio:** ${prompt.aspectRatio}`);
            addMarkdownList(sections, 'Style constraints', prompt.styleConstraints);
        });
        sections.push('---');
    }

    if (pkg.assetList) {
        sections.push('## Asset List');
        for (const [cat, items] of Object.entries(pkg.assetList)) {
            sections.push(`### ${cat.replace(/_/g, ' ').toUpperCase()}`);
            items.forEach(it => sections.push(`- ${it}`));
        }
        sections.push('---');
    }

    if (pkg.scopeReviewContent && pkg.scopeReviewContent.length) {
        sections.push('## Scope Review');
        pkg.scopeReviewContent.forEach(p => {
            sections.push(`### Feature: ${p.feature}`);
            sections.push(`**Severity:** ${p.severity}`);
            sections.push(`**Critique:** ${p.critique}`);
            sections.push(`**Suggestion:** ${p.suggestion}`);
            sections.push('');
        });
    }

    return sections.join('\n\n');
}

export function exportHTML(pkg: ProjectPackage): string {
    const md = exportMarkdown(pkg);
    const html = marked.parse(md) as string;
    const headings = [...html.matchAll(/<h([1-3])>(.*?)<\/h\1>/g)].map((match, index) => ({
        id: `section-${index + 1}`,
        level: Number(match[1]),
        title: match[2].replace(/<[^>]*>/g, ''),
    }));
    let headingIndex = 0;
    const navigableHtml = html.replace(/<h([1-3])>(.*?)<\/h\1>/g, (_match, level, title) => {
        const heading = headings[headingIndex++];
        return `<h${level} id="${heading.id}">${title}</h${level}>`;
    });
    const collapsibleHtml = navigableHtml.replace(/<h2 id="(section-[^"]+)">(.*?)<\/h2>([\s\S]*?)(?=<h2 id="|$)/g, (_match, id, title, body) => (
        `<details id="${id}-panel" class="package-section" open><summary><h2 id="${id}">${title}</h2><span aria-hidden="true">▼</span></summary>${body}</details>`
    ));
    const toc = headings.length ? `<nav class="toc"><h2>Contents</h2><ul>${headings.map(heading => `<li class="level-${heading.level}"><a href="#${heading.id}">${heading.title}</a></li>`).join('')}</ul></nav>` : '';
    const imageHtml = Object.entries(pkg.generatedImages || {}).map(([key, source]) => {
        if (!source || source === 'Image generation coming soon') return '';
        return `<figure class="generated-image"><img src="${escapeHtml(source)}" alt="${escapeHtml(key)}"><figcaption>${escapeHtml(key)}</figcaption></figure>`;
    }).join('');
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(pkg.meta.projectName)}</title><style>
body{font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#202124;background:#f7f7f8;margin:0}.page{max-width:1100px;margin:auto;background:white;padding:2rem 3rem}h1,h2,h3{line-height:1.25;color:#17202a}pre{background:#17202a;color:#f7f7f8;padding:1rem;border-radius:.5rem;overflow:auto}code{background:#eef0f2;padding:.1rem .3rem;border-radius:.25rem}.toc{background:#eef7f5;border:1px solid #b7ddd5;border-radius:.5rem;padding:1rem;margin:1rem 0 2rem}.toc ul{list-style:none;padding:0}.toc .level-2{margin-left:1rem}.toc .level-3{margin-left:2rem}.toc a{color:#087f70;text-decoration:none}.package-section{border:1px solid #d5e8e4;border-radius:.5rem;margin:1rem 0;padding:0 1rem}.package-section summary{cursor:pointer;display:flex;align-items:center;justify-content:space-between;list-style:none}.package-section summary::-webkit-details-marker{display:none}.package-section summary span{color:#087f70}.generated-image{display:inline-block;vertical-align:top;width:45%;margin:1rem}.generated-image img{max-width:100%;max-height:22rem;object-fit:contain}.generated-image figcaption{text-align:center;color:#5f6368}@media(max-width:700px){.page{padding:1rem}.generated-image{width:100%;margin:.5rem 0}}
</style></head><body><main class="page"><h1>${escapeHtml(pkg.meta.projectName)}</h1>${toc}${collapsibleHtml}${imageHtml ? `<details id="generated-images-panel" class="package-section" open><summary><h2 id="generated-images">Generated Images</h2><span aria-hidden="true">▼</span></summary>${imageHtml}</details>` : ''}</main></body></html>`;
}

function escapeHtml(s: string) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
