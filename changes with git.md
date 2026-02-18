# Changes With Git

## Goal

Every code change must be validated locally, committed cleanly, and pushed in a recoverable way.

## Standard Flow

1. Pull latest changes:
   - `git pull`
2. Create a feature branch:
   - `git checkout -b feature/<short-name>`
3. Make code changes.
4. Run required checks:
   - `npm run typecheck`
   - `npm run test:component`
   - `npm run test:unit`
5. Review local diff:
   - `git status`
   - `git diff`
6. Stage and commit:
   - `git add .`
   - `git commit -m "<clear summary>"`
7. Push branch:
   - `git push -u origin feature/<short-name>`
8. Open a Pull Request into `main`.

## Commit Rules

- Use short, descriptive messages.
- Keep one logical change per commit.
- Do not include unrelated file edits.
- Do not commit secrets, tokens, or local machine config.

## Before Merging

- Ensure all tests pass.
- Confirm app behavior manually on affected screens.
- Rebase or merge latest `main` if branch is stale.

## Hotfix Flow (If Needed)

1. Branch from `main`:
   - `git checkout main`
   - `git pull`
   - `git checkout -b hotfix/<short-name>`
2. Apply fix and run full checks.
3. Commit, push, and PR with high priority.

## Recovery Notes

- If working tree is messy:
  - `git status`
  - `git stash` (only when intentionally pausing work)
- If commit message is wrong and not pushed:
  - `git commit --amend -m "<new message>"`

## Done Criteria

- Tests passed locally.
- Changes pushed to GitHub.
- PR opened (or directly pushed to `main` only when explicitly approved).
