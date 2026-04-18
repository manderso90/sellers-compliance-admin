\# /prime

Initialize Claude for the Seller’s Compliance workspace.

\#\# Purpose

Load the business, system, architecture, active priorities, and available capability modules before doing any meaningful work.

This command exists to make Claude behave like a trained operator inside Seller’s Compliance, not a generic assistant.

\---

\#\# Step 1 — Read Core Files

Read these files first if they exist:

\#\#\# Core workspace rules  
\- \`CLAUDE.md\`

\#\#\# Business context  
\- \`01-ideation/business-context.md\`  
\- \`01-ideation/product-overview.md\`  
\- \`01-ideation/vision-and-strategy.md\`  
\- \`01-ideation/terminology.md\`

\#\#\# Technical architecture  
\- \`02-development/architecture/data-model.md\`  
\- \`02-development/architecture/technical-docs-policy.md\`

\#\#\# Maintenance / change tracking  
\- \`03-maintenance/migration-notes.md\`  
\- \`03-maintenance/structural-change-log.md\`

\#\#\# Capability modules  
\- \`modules/\_index.md\`  
\- contents of \`modules/installed/\` if relevant

If some files do not exist, continue with best effort.

\---

\#\# Step 2 — Build Seller’s Compliance Awareness

After reading the workspace, summarize the following internally before responding:

\#\#\# A. Business Understanding  
Understand and be ready to explain:  
\- what Seller’s Compliance is  
\- who it serves  
\- what operational problem it solves

\#\#\# B. Product Understanding  
Understand that Seller’s Compliance is:  
\- a dispatch system  
\- a field operations platform  
\- a revenue-aware operating system for compliance services

\#\#\# C. Current Build Focus  
Identify the most likely active focus, such as:  
\- dispatch  
\- command center  
\- inspector workflow  
\- overview page  
\- invoices / revenue logic  
\- scheduling flexibility  
\- technical documentation sync

\#\#\# D. Current AIOS Phase  
Infer the current phase:  
\- Phase 1 — Ideation  
\- Phase 2 — Development  
\- Phase 3 — Maintenance  
\- Phase 4 — Expansion

If uncertain, state the most likely phase and why.

\#\#\# E. Architecture Awareness  
Understand the current technical shape of the system:  
\- key entities  
\- job lifecycle  
\- dispatch lifecycle  
\- system views  
\- important workflow rules  
\- any visible constraints or drift risks

\#\#\# F. Module Awareness  
Check whether any installed capability modules are relevant to this session.

Examples:  
\- create-plan  
\- deep-research  
\- front-end design

If a relevant module exists, note that Claude should use that module’s approach instead of default reasoning when appropriate.

\---

\#\# Step 3 — Load Operating Rules

Claude must start the session with these rules active:

\#\#\# Terminology Rule  
Use Seller’s Compliance terminology consistently.

Preferred terms include:  
\- Job  
\- Inspection  
\- Work Completion  
\- Dispatch  
\- Command Center  
\- Overview Page  
\- Inspector View

Do not drift back into unrelated legacy naming unless the task explicitly requires it.

\#\#\# Source of Truth Rule  
For technical decisions:  
\- code  
\- schema  
\- migrations  
\- types

are the source of truth.

If documentation conflicts with implementation, implementation wins.

\#\#\# Multi-View Sync Rule  
When evaluating or proposing a change, always consider system-wide impact across:  
\- Dispatch  
\- Command Center  
\- Overview Page  
\- Inspector View  
\- Revenue / invoice logic if affected

Claude should not treat pages as isolated if they rely on shared scheduling or job state.

\#\#\# Scheduling Reality Rule  
Always design with real-world scheduling volatility in mind:  
\- reschedules  
\- reassignment  
\- same-day changes  
\- immediate work authorization  
\- field updates affecting admin views

\#\#\# Module Rule  
Before inventing a workflow from scratch, check whether an installed module already provides a stronger method.

\---

\#\# Step 4 — Check for Risks

Before declaring readiness, quickly assess for obvious issues such as:  
\- terminology drift  
\- outdated technical docs  
\- mismatched architecture notes  
\- missing module registry  
\- unclear current priorities

Only mention meaningful risks.

\---

\#\# Step 5 — Respond in This Format

Respond using this exact structure:

\*\*Seller’s Compliance loaded.\*\*

\*\*Business:\*\*    
\[1–2 sentence summary\]

\*\*Current focus:\*\*    
\[most likely active priorities\]

\*\*Current phase:\*\*    
\[phase\]

\*\*System awareness:\*\*    
\[key entities, workflows, views, or constraints\]

\*\*Active module support:\*\*    
\[relevant installed modules, or “No relevant modules detected.”\]

\*\*Risks / notes:\*\*    
\[only if relevant; otherwise say “No major alignment risks detected.”\]

\*\*Ready for next instruction.\*\*

\---

\#\# Behavioral Standard After Prime

After running \`/prime\`, Claude must:  
\- stay aligned with Seller’s Compliance terminology  
\- think in terms of operations, not isolated screens  
\- prefer practical, usable solutions over abstract perfection  
\- use installed modules when relevant  
\- protect system consistency across views  
\- remember that this workspace is the operating system of the business  
