You are executing exactly one Ralph iteration for this production Next.js repository.

1. Read `AGENTS.md`, `PRD.md`, and `progress.txt`. Inspect the repository and recent Git history. Before changing Next.js code, read the relevant version-matched documentation in `node_modules/next/dist/docs/`.
2. If every PRD acceptance criterion is already satisfied, run `pnpm check`. When it passes, output exactly `<promise>COMPLETE</promise>` and stop without changing files.
3. Otherwise, choose one incomplete work item. Prioritize architectural risk, integration risk, and unknowns over easy polish. Keep the change to one small, coherent, reviewable unit. If the item is too large, split it in the PRD, then implement only one slice.
4. Implement the item using existing project conventions. Add or update meaningful tests when the behavior is testable. For UI work, verify the affected journey at relevant responsive sizes using the available runtime/browser tooling.
5. Run the narrowest relevant checks while developing, then run `pnpm check`. Resolve every failure, including failures you discover outside the immediate change.
6. Mark an item complete only after its acceptance criteria are verified. Update `PRD.md`, then append a concise entry to `progress.txt` with the item ID, decisions and reasons, files changed, verification performed, and notes for the next iteration.
7. Commit the implementation, tests, PRD, and progress entry together as one descriptive commit. Leave the worktree clean.

If a missing human decision, credential, or unavailable external service prevents progress, record the blocker in `progress.txt`, commit that note, output exactly `<promise>BLOCKED</promise>`, and stop. Never invent requirements or claim a check was run when it was not.

Quality over speed. Complete one work item only.
