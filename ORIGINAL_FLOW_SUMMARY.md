# Original Dev Doctor AI Flow Summary

This document captures the original design intent for the conversation flow and persona architecture before the project was migrated to LM Studio.

## 1. How Context Was Maintained Throughout the Session

Context persistence happened at two levels: the prompt-level context window and the session storage layer.

### A. Prompt-Level Context Propagation

In chat mode, the entire accumulated conversation history was formatted directly into the prompt on every turn:

```text
Conversation so far:
---
${conversationHistory}
---
```

If a user uploaded a document (TXT, PDF, DOCX, or image), its extracted text or data was injected alongside the conversation history, with the instruction that the document was the single source of truth.

When the conversation ended, `getExpandedText()` synthesized the full conversation into a unified project brief (`expandedText`).

Downstream generation functions then received this synthesized source text, along with project name and structured schemas as input parameters.

### B. Session Persistence

Project state was saved in localStorage under `devDoctorAiProjectHistories`.

This preserved:
- chat history
- workflow state
- project name
- expanded text
- generated GDD sections
- pitch deck content
- MVP, TDD, asset lists, and scope reviews
- browser reload / multi-project switching continuity

## 2. Primary Persona: The Concierge

The Concierge was the primary chat and brainstorming persona.

### Identity and System Prompt

The Concierge was framed as an experienced game designer and creative partner for Dev Doctor AI.

Core persona traits included:
- professional, friendly, curious, encouraging
- efficient and insightful
- focused on gathering only the next useful fact
- collaborative and creative

The core prompt described the Concierge as a specialist system for software and game development whose job was to guide the user through initial project setup in a collaborative, creative partnership.

### Dual Modes of Operation

#### Information Gatherer (default mode)
- summarize understanding in 1–2 sentences
- then ask a single, specific, insightful question to move forward

#### Creative Brainstormer (when prompted)
- break the request into its smallest logical subtopics
- address only the first subtopic
- propose a single creative idea and ask for feedback on that specific point
- once the user confirms, immediately propose the next subtopic without waiting for more instructions

### Primary Responsibilities

- establish `projectName` first
- never keep asking for info the user explicitly asked the AI to help create
- avoid stuck loops

## 3. Hand-off and Completion Detection

### A. When the Concierge Knows the Job Is Complete

The Concierge was meant to detect when the project name and high-level concept were clear enough to move on, and then ask a completion gate question such as:

> This is fantastic. I believe I have a clear vision for [Project Name] now. Are you ready for me to compile this and begin the formal design critique?

### B. The Handoff Sequence Across Workflow Steps

```text
CONVERSATION STEP
    │ Concierge asks for permission to compile
    ▼
CRITIQUE STEP -> Senior Technical Analyst Persona
    │ Generates 3–5 critical technical questions
    │ User provides answers / AI suggests draft answers
    ▼
BRIEF SYNTHESIS
    │ Synthesizes conversation + answers into expandedText
    ▼
DOCUMENT GENERATION STEP -> Specialist Personas
    │ 1. Table of Contents Generator
    │ 2. Lead Project Designer
    │ 3. Product Manager (MVP)
    │ 4. Technical Architect
    │ 5. Technical PM (modular breakdown)
    │ 6. Art Director (visual prompts / image generation)
    │ 7. Pitch Deck Writer
    │ 8. Scope Reviewer
    ▼
FINAL DOCS / OUTPUT PANEL
```

## 4. Specialist Personas (Generation Stage)

Once the handoff happened, specialized personas executed specific document and analysis tasks.

| Specialist Role | Objective | Function |
| --- | --- | --- |
| Senior Technical Analyst | Review the project concept and identify technical ambiguities | `performTechnicalCritique` |
| Lead Project Designer | Create a comprehensive GDD/PRD | `generateFullGDDV2` / `refactorGDD` |
| Technical Project Manager | Break the project down into role-specific freelance briefs | `generateModularBreakdown` |
| Senior Product Manager | Define a Minimum Viable Product | `defineMVP` |
| Critical Scope Reviewer | Review the project from a specific lens | `generateScopeReview` |
| Creative Art Director | Generate cinematic visual prompts | `generateAllVisualPrompts` |
| Pitch Deck Writer | Write a compelling pitch deck | `generateFullPitchDeck` |

## 5. Design Intent That Matters for the Current Flow

This original design established a clear orchestration pattern:

1. The Concierge gathers project facts one question at a time.
2. The project is considered valid only once there is actual project detail, not a default placeholder.
3. The app compiles a single brief only after a meaningful conversation exists.
4. Only then do specialist personas produce documents, reviews, and pitch materials.
5. Generation should never run from a blank or default project state.

That orchestration is the principal behavior the current LM Studio-enabled implementation should preserve.
