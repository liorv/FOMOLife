# STEP-10 — Repeatable template for next tab extraction

## Goal
Create a reusable playbook to extract each next tab app quickly and safely.

## Prompt for LLM
Create a template workflow for extracting the next tab app (e.g., projects, tasks, dreams).

Tasks:
1. Produce a checklist with fixed sequence:
   - scaffold app
   - extract types/utils
   - move UI + CSS modules
   - wire data/auth
   - verify tests/build/deploy
2. Include a risk matrix and rollback steps.
3. Include command set for each sub-step.
4. Keep template concise enough for repeated execution.

Acceptance criteria:
- Team can run next extraction with minimal ad hoc decisions.
- Same boundaries and quality gates are preserved.
