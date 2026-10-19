# Claude Code workspace

| Path | Kind | Purpose |
|---|---|---|
| `CLAUDE.md` | Project memory | Concise shared contract loaded every session |
| `.claude/agents/frontend-ui-engineer.md` | Subagent | UI work in `src/`, `e2e/` |
| `.claude/agents/news-pipeline-engineer.md` | Subagent | Collector in `pipeline/` |
| `.claude/agents/qa-reviewer.md` | Subagent (read-only tools) | Independent phase/release review |
| `.claude/agents/github-deployment-reviewer.md` | Subagent (read-only tools) | Workflow + Pages review |
| `.claude/skills/*/SKILL.md` | Skills | phase-management, design-reference-analysis, news-source-onboarding, news-deduplication-and-ranking, image-attribution, rtl-i18n, github-pages-release, quality-gates |
| `.claude/commands/start-phase.md`, `review-phase.md`, `continue-phase.md` | Slash commands | `/start-phase 4`, `/review-phase 4`, `/continue-phase` |

Formats follow current Claude Code conventions: agents and commands are Markdown with YAML frontmatter (`name`, `description`, `tools` / `description`, `argument-hint`); skills are `SKILL.md` files with `name` + `description` frontmatter inside a folder named after the skill. If your installed version does not recognise one of these, the Markdown still works as a manual checklist.

Reviewer agents are given only `Read, Glob, Grep, Bash` and are instructed not to modify files; Bash is for running checks.
