# Ghostline

**A self-running personal publishing agent, built on Claude.**

Ghostline learns who you are, what you know and how you sound, then keeps your personal site alive: it researches what's happening in your field, writes a note in your voice, checks it, publishes it, tells search engines, and sends you the link. You stay in control: you can edit or remove anything, any time.

It's for people with real expertise and no time to write: export and sales managers, operators, founders.

> **Status: v0, in production for one user.** Ghostline currently runs [cansevengin.com](https://cansevengin.com) as a scheduled Claude agent, publishing twice a week since 8 October 2026. A Claude API version that other people can onboard onto is in progress. See [ROADMAP.md](ROADMAP.md).

## How it works

```
Research ─► Write ─► Check ─► Publish ─► Announce ─► Report
```

1. **Research.** Searches the last 1-2 weeks of news in your topics and picks one question people actually ask.
2. **Write.** Drafts a 600-900 word note in your voice, grounded in your real background ([profile.example.yml](profile.example.yml)).
3. **Check.** Verifies every fact against its source, removes anything that sounds like a pitch, follows your [writing rules](WRITING_RULES.md), and runs a full build of your site.
4. **Publish.** Commits to your site's repo. Your host (e.g. Vercel) deploys it.
5. **Announce.** Pings Bing and other engines via IndexNow; Google picks it up from your sitemap.
6. **Report.** Sends you a short summary with the live link. Reply to change or remove it.

## What's in this repo

| File | What it is |
|---|---|
| [`AGENT.md`](AGENT.md) | The agent's full instructions. Reads your profile and rules, then runs the pipeline. |
| [`profile.example.yml`](profile.example.yml) | Who you are: background, topics, voice, things the agent must never write about. |
| [`WRITING_RULES.md`](WRITING_RULES.md) | Style and honesty rules every note must pass. |
| [`examples/cansevengin.profile.yml`](examples/cansevengin.profile.yml) | The real profile behind cansevengin.com. |
| [`ROADMAP.md`](ROADMAP.md) | Where this is going, including the Claude API version. |

## Run it yourself (v0)

v0 is a set of instructions, not a hosted service. You need:

- A static site in a Git repo with Markdown posts (the reference setup is [Astro](https://astro.build) on [Vercel](https://vercel.com)).
- Claude with scheduled tasks (or Claude Code on a schedule) and push access to your site's repo.

Steps:

1. Copy `profile.example.yml` to `profile.yml` and fill it in honestly. The agent only writes what it can ground in this file and in real sources.
2. Adjust `WRITING_RULES.md` to your taste.
3. Create a scheduled task (e.g. Monday and Thursday mornings) whose prompt is the contents of `AGENT.md`, with `profile.yml` and `WRITING_RULES.md` pasted in or reachable from the repo.
4. Optional: add an [IndexNow](https://www.indexnow.org) key file to your site and put the key in `profile.yml`.

## Principles

- **Your voice, your facts.** No invented stories, numbers, quotes or clients. Every claim has a source.
- **Disclosed, not disguised.** Notes say they were drafted with Claude. See [how cansevengin.com does it](https://cansevengin.com/how-it-works/).
- **You stay in control.** Every note can be edited or removed with a one-line reply.
- **Off-limits stays off-limits.** Employer confidentials and topics you exclude never appear.

## License

MIT. Built by [Can Sevengin](https://cansevengin.com) with Claude.
