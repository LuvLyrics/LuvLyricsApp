---
description: Activates on keyword 'reportme' to generate the Daily LuvLyricsApp PR Review Report
---
# Daily LuvLyricsApp PR Review Report Workflow

When the USER triggers this workflow by saying `reportme`, the AI Assistant MUST immediately execute the following steps to fetch, analyze, and generate a comprehensive, premium-tier open PR report.

## Step 1: Check GitHub CLI Authentication
Run `gh auth status` to ensure the session is active.

## Step 2: Fetch Active Open PRs
Run:
```bash
gh pr list --repo LuvLyricsApp/LuvLyricsApp --state open --limit 50
```

## Step 3: Fetch Detail and Diff for each Open PR
For each open PR, run:
```bash
gh pr view <number> --repo LuvLyricsApp/LuvLyricsApp
gh pr diff <number> --repo LuvLyricsApp/LuvLyricsApp
```

## Step 4: Perform Deep Code Review and Report Generation
Analyze each PR's diff against the linked issue/problem. You MUST output a private maintainer report (as a markdown artifact) matching the exact structure and criteria detailed below.

### ⚠️ SAFETY CRITICAL MAINTAINER RULES
- **DO NOT** merge any PR.
- **DO NOT** close any PR.
- **DO NOT** approve any PR.
- **DO NOT** request changes on GitHub.
- **DO NOT** post comments on GitHub.
- **DO NOT** push commits.
- This report is strictly a **read-only, private maintainer guide**.

---

### 📋 Required Report Structure & Content

The generated report MUST include the following exact sections:

#### 1. Title & Header
Include the Date, Repository URL, Total Open PR count, and Review Status summary.

#### 2. Summary Table
A high-level markdown table summarizing all open PRs.
- **Columns**: `PR #` | `Title` | `Author` | `Linked Issue` | `Status Checks` | `Changed Files` | `Suggested Decision` | `Priority`
- **Suggested Decision Values**: For the suggested decision column, you MUST write exactly either **`"Can be merged"`** or **`"Nope, it needs work"`**. No other values are allowed.

#### 3. Detailed PR Reviews (for each open PR)
For each PR, provide:
- **Header**: PR # and Title
- **PR Metadata**: Author, PR Link, Linked Issue, Status Check outcomes, and Changed Files Summary (differentiating [NEW], [MODIFY], and [DELETE] files).
- **Core Summary**: What the PR tries to do.
- **Goal Verification**: Does it solve the linked issue/problem?
- **Static Code Review**: Detailed structural findings, type safety review (e.g. checks for raw `any` types or unsafe `@ts-ignore` comments), and compliance with standard coding guides.
- **Suggested Decision**: Explicit status ("Can be merged" or "Nope, it needs work").
- **Copy-Pasteable Review Comment**: A supportive, friendly, natural-sounding, human-style review comment that the maintainer can copy and paste directly into the PR page on GitHub.

#### 4. Maintainer priority order (diagram or list)
Provide a visual dependency chart (using a Mermaid block) or a prioritized list detailing the safe merge order (e.g., merging documentation and simple bugfixes first to prevent downstream git merge conflicts).

#### 5. Overall Repo Notes
A summary of the global repository health, compiler stability, and any general observations.

