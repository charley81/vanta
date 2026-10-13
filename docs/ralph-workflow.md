# Ralph feature workflow

This project uses a Ralph loop for feature work: define the end state in a human-approved PRD, let a fresh agent context choose and complete one small item, verify it, commit it, and repeat.

## 1. Start and approve a feature

Begin from a clean base branch:

```bash
pnpm feature:start -- account-settings
```

The command creates `feature/account-settings`, `PRD.md`, and `progress.txt`. Use an interactive Pi session to turn the template into concrete requirements. Include observable acceptance criteria, exclusions, edge cases, stop conditions, and verification for each small work item.

**Planning gate:** present the finished PRD to the human. Implementation starts only after explicit approval. Then set `Status: APPROVED` and commit both active workflow files:

```bash
git add PRD.md progress.txt
git commit -m "docs: define account settings feature"
```

If the feature depends on Figma, inspect the approved frame while planning. Put the frame URL and durable implementation details in the PRD; a sandboxed AFK agent cannot assume access to desktop MCP tools.

## 2. Run human-in-the-loop iterations

Start with one watched iteration:

```bash
pnpm ralph:once
```

Pi opens interactively with the PRD, progress log, and shared iteration prompt. Review the selected item, tool calls, verification, and resulting commit. Repeat until the task sizing and prompt behavior are trustworthy.

Each successful iteration must:

1. complete one small PRD item,
2. run focused checks and `pnpm check`,
3. update `PRD.md` and `progress.txt`,
4. create one commit, and
5. leave a clean worktree.

## 3. Run unattended iterations

AFK mode is capped at 50 iterations and stops on completion, a blocker, command failure, or uncommitted changes. Use a Docker Sandbox so generated commands cannot access unrelated host files or credentials.

Install Docker Desktop with Docker Sandboxes, configure Pi credentials on the host, and create a Pi sandbox from this repository as described in the [Pi isolation guide](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/containerization.md#run-pi-with-docker-sandboxes):

```bash
sbx run --kit "docker.io/sbx/pi-kit:latest" pi
```

Then run a bounded loop against that existing sandbox:

```bash
RALPH_SANDBOX_NAME=<sandbox-name> pnpm ralph -- 5
```

For a short, supervised experiment only, host execution requires an explicit opt-in:

```bash
RALPH_UNSANDBOXED=1 pnpm ralph -- 2
```

Host mode gives generated commands all permissions of your user account. It is not the normal AFK workflow.

## 4. Review and close

When Ralph emits `<promise>COMPLETE</promise>`:

1. Review every commit and the full base-branch diff.
2. Run `pnpm check` yourself and manually review the complete user journey.
3. Move durable product or architecture decisions into permanent documentation.
4. Delete `progress.txt`. Archive `PRD.md` under `docs/features/` if it remains useful; otherwise delete it.
5. Commit the cleanup before opening the pull request.

To revise work mid-loop, edit the PRD, return affected items to incomplete, record why, and commit that scope change before the next iteration.

## Why these guardrails exist

- Small items and fresh contexts reduce context degradation and keep feedback tight.
- Risk-first ordering exposes architectural and integration mistakes before polish accumulates.
- The progress log and Git history restore context between independent runs.
- A clean-worktree preflight prevents an iteration from absorbing unrelated work.
- A human approval gate, bounded iteration count, completion/blocker signals, and sandboxing constrain autonomous execution.

This setup adapts Matt Pocock's [Getting Started With Ralph](https://www.aihero.dev/getting-started-with-ralph) and [11 Tips for AI Coding With Ralph Wiggum](https://www.aihero.dev/tips-for-ai-coding-with-ralph-wiggum) to Pi's [print mode](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/cli.md#invocation-and-output) and security model.
