# Working on claude-looks

Notes for any agent (Claude Code or other) working in this repository.

## Secrets: gitleaks, always

This repo is public. Every commit and every push is checked with [gitleaks](https://github.com/gitleaks/gitleaks),
and both checks must come back clean:

```bash
gitleaks dir .     # before every commit: the working tree
gitleaks git .     # before every push: the whole history
```

If either reports a finding, stop: do not commit or push, and tell the owner what was found and where.

## Other rules

- Commit and push only when the owner asks. Leave the git author email as it is (the GitHub noreply address).
- Code, comments, commits and the README are in English.
- Before a commit, `claude plugin validate .claude-plugin/plugin.json` and `claude plugin test .` must pass, and so
  must `npx -p typescript tsc -p .` once the engine has written `.claude-plugin/types/`.
- `hooks/make-colors.js` and `.d.ts` are copies from Claude Code's plugin-authoring skill: never edit them by hand,
  only copy them again.
- How to add a look is in the README, under "Make a look".
