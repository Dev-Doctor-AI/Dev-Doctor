import { ProjectPackage, GDDSection, PitchDeckSlide, TDDFeature, TechnicalDesignSection, FreelanceBrief, AssetList, CritiquePoint } from '../types';

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

    if ((pkg as any).mvpFeatureSpecs && Array.isArray((pkg as any).mvpFeatureSpecs) && (pkg as any).mvpFeatureSpecs.length) {
        lines.push('MVP FEATURE SPECIFICATIONS (BDD)');
        for (const f of (pkg as any).mvpFeatureSpecs) {
            lines.push(`FEATURE: ${f.feature}`);
            lines.push(`User Story: ${f.userStory}`);
            lines.push('Scenarios:');
            for (const s of (f.scenarios || [])) {
                if (s.title) lines.push(`- ${s.title}`);
                if (Array.isArray(s.given)) s.given.forEach(g => lines.push(`    Given ${g}`));
                if (Array.isArray(s.when)) s.when.forEach(w => lines.push(`    When ${w}`));
                if (Array.isArray(s.then)) s.then.forEach(t => lines.push(`    Then ${t}`));
                if (s.notes) lines.push(`    Notes: ${s.notes}`);
            }
            if (f.invalidInputs) {
                lines.push('Invalid inputs:');
                f.invalidInputs.forEach(ii => lines.push(`- ${ii}`));
            }
            if (f.boundaryConditions) {
                lines.push('Boundary/Tolerance conditions:');
                f.boundaryConditions.forEach(bc => lines.push(`- ${bc}`));
            }
            if (f.offlineBehavior) {
                lines.push('Offline/Failure behavior:');
                lines.push(f.offlineBehavior);
            }
            if (f.accessibility) {
                lines.push('Accessibility / Usability:');
                f.accessibility.forEach(a => lines.push(`- ${a}`));
            }
            if (f.technicalNotes) {
                lines.push('Technical notes:');
                lines.push(f.technicalNotes);
            }
            if (f.dependencies) {
                lines.push('Dependencies:');
                f.dependencies.forEach(d => lines.push(`- ${d}`));
            }

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

    if ((pkg as any).mvpFeatureSpecs && Array.isArray((pkg as any).mvpFeatureSpecs) && (pkg as any).mvpFeatureSpecs.length) {
        sections.push('## MVP Feature Specifications (BDD)');
        for (const f of (pkg as any).mvpFeatureSpecs) {
            sections.push(`### Feature: ${f.feature}`);
            sections.push(`**User story:** ${f.userStory}`);
            sections.push('#### Scenarios');
            for (const s of (f.scenarios || [])) {
                if (s.title) sections.push(`**${s.title}**`);
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
            if (f.invalidInputs) {
                sections.push('#### Invalid / Wrong-input behavior');
                f.invalidInputs.forEach(ii => sections.push(`- ${ii}`));
            }
            if (f.boundaryConditions) {
                sections.push('#### Boundary / Tolerance conditions');
                f.boundaryConditions.forEach(bc => sections.push(`- ${bc}`));
            }
            if (f.offlineBehavior) {
                sections.push('#### Offline / Failure behavior');
                sections.push(f.offlineBehavior);
            }
            if (f.accessibility) {
                sections.push('#### Accessibility / Usability');
                f.accessibility.forEach(a => sections.push(`- ${a}`));
            }
            if (f.technicalNotes) {
                sections.push('#### Technical notes & dependencies');
                sections.push(f.technicalNotes);
            }
            if (f.dependencies && f.dependencies.length) {
                sections.push('Dependencies:');
                f.dependencies.forEach(d => sections.push(`- ${d}`));
            }
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
    // Minimal HTML wrapper; keep styling light so consumers can post-process
    return `<!doctype html><html><head><meta charset="utf-8"><title>${pkg.meta.projectName}</title></head><body><pre>${escapeHtml(md)}</pre></body></html>`;
}

function escapeHtml(s: string) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
