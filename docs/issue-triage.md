# Issue Triage Guide

This guide helps maintainers and contributors manage issues consistently and efficiently.

The goal is to keep issue tracking simple, clear, and contributor-friendly.

---

# Quick Triage Checklist

Use this checklist before assigning an issue or marking it ready for contributors.

- Reproducibility: Is the problem observable, or is the documentation/task goal clear enough to verify?
- Scope: Can the issue be handled in one focused PR without unrelated refactors?
- Labels: Does the issue have type labels such as `bug`, `enhancement`, `documentation`, or `testing`?
- Difficulty: Is the expected effort marked with `good first issue`, `medium`, or `hard` where useful?
- Contributor readiness: Are expected files, commands, screenshots, logs, or acceptance criteria included?
- Escalation: Does the issue involve security, secrets, data loss, or a release blocker?

If the answer is unclear, ask for clarification before encouraging work on the issue.

---

# Label Dictionary

## bug
Used when something is broken, incorrect, or behaving unexpectedly.

Examples:
- App crashes
- UI not rendering properly
- Incorrect functionality

---

## enhancement
Used for improvements, optimizations, or new feature requests.

Examples:
- Performance improvements
- UX enhancements
- New functionality

---

## documentation
Used for documentation-related updates or fixes.

Examples:
- README improvements
- Missing setup instructions
- Typo corrections

---

## testing
Used for tasks related to tests and quality assurance.

Examples:
- Adding unit tests
- Improving test coverage
- Fixing failing tests

---

## security
Used for vulnerabilities, sensitive issues, or security-related improvements.

Examples:
- Secret exposure
- Authentication flaws
- Unsafe data handling

Avoid discussing sensitive vulnerabilities publicly. Follow `SECURITY.md`.

---

## good first issue
Beginner-friendly tasks suitable for first-time contributors.

These issues should:
- Have clear requirements
- Have limited scope
- Require minimal project context

---

## help wanted
Issues where maintainers are actively looking for community contributions.

These tasks may require:
- Additional feedback
- Investigation
- Contributor collaboration

---

## medium
Tasks with moderate complexity requiring some understanding of the codebase.

Examples:
- Refactoring small modules
- Improving existing features
- Adding non-trivial UI behavior

---

## hard
Complex tasks requiring deeper architectural or domain understanding.

Examples:
- Core system redesigns
- Multi-module changes
- Advanced optimization work

---

# Issue Triage Flow

When reviewing a new issue:

1. Read the issue carefully.
2. Check for duplicates or related issues.
3. Verify the issue is understandable and actionable.
4. Check whether reproduction steps, expected behavior, or acceptance criteria are missing.
5. Request clarification if information is missing.
6. Apply the appropriate labels.
7. Determine approximate difficulty and priority.
8. Assign the issue or mark it as ready for contributors.

Keep triage lightweight and practical.

---

# Contributor Readiness

An issue is ready for contributors when it has enough detail for a focused PR.

Ready issues usually include:

- A clear goal or bug description
- The expected files or area of the codebase
- Reproduction steps for bugs
- Local commands to run when relevant
- Acceptance criteria or a definition of done

If the scope is too large, split it into smaller issues before adding `good first issue`.

---

# Priority Guidelines

## High Priority
Issues involving:
- Security vulnerabilities
- Crashes or data loss
- Broken core functionality

These should be escalated quickly.

---

## Medium Priority
Issues involving:
- Feature improvements
- Non-critical bugs
- Reliability improvements

---

## Low Priority
Issues involving:
- Minor UI adjustments
- Documentation updates
- Small cleanup tasks

---

# Escalation Guidance

Escalate issues immediately if they involve:
- Security concerns
- Sensitive credentials or secrets
- Data corruption or loss
- Major breaking regressions
- Release-blocking failures

For security issues, avoid asking for exploit details in public issue comments.
Follow the responsible disclosure process described in `SECURITY.md`.

For non-security blockers, add a short maintainer note explaining:

- What is blocked
- Which command, screen, or workflow is affected
- Whether contributors should wait for maintainer direction

---

# Issue Quality Checklist

Before assigning or working on an issue, ensure it includes:

- Clear problem description
- Expected behavior
- Reproduction steps (if applicable)
- Relevant screenshots or logs
- Defined acceptance criteria
- Clear and limited scope

Well-written issues help contributors work more efficiently and reduce review overhead.

---

# Triage Examples

These examples apply the checklist to existing issues so future triage stays consistent.

## Issue #31: issue triage guide

- Reproducibility: Not applicable; documentation goal is clear.
- Scope: Small docs-only change in `docs/issue-triage.md` and `CONTRIBUTING.md`.
- Labels: `documentation`, `good first issue`, and `help wanted` fit.
- Priority: Low, because it improves contributor workflow without changing app behavior.
- Ready: Yes; expected files and definition of done are listed.

## Issue #32: smoke test instructions

- Reproducibility: Verifiable by following the documented smoke test commands.
- Scope: Small docs-only change.
- Labels: `documentation`, `good first issue`, and `help wanted` fit.
- Priority: Low to medium, depending on whether release testing currently lacks a checklist.
- Ready: Yes if expected output and platform notes are included.

## Issue #29: low-risk TypeScript suppressions

- Reproducibility: Verifiable with `npm run typecheck` and `npm run lint`.
- Scope: Ready only if limited to low-risk suppressions in a few files.
- Labels: `good first issue` and `help wanted` fit; add `testing` only if tests change.
- Priority: Low to medium, because it improves maintainability without changing features.
- Ready: Yes if the issue names target files or asks contributors to keep the PR narrow.
