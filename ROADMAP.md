# Roadmap

## v0: running in production for one user (now)

- Live on [cansevengin.com](https://cansevengin.com) since 8 October 2026.
- Runs as a scheduled Claude agent twice a week: research, write, check, publish, announce, report.
- Site, SEO (structured data, per-post share images, llms.txt, IndexNow) and the agent itself were built with Claude.

## v0.1: Claude API CLI (in this repo)

- `src/ghostline.mjs`: researches with Claude's web search tool, writes one note as structured JSON, validates it and saves Markdown. Optional build, commit, push and IndexNow ping.
- Tested end to end in mock mode. Next: live API runs against cansevengin.com, then moving the scheduled job onto the CLI.

## v1: a hosted version anyone can onboard onto (next)

- A small service on the Claude API (and the Claude Agent SDK where it fits), so the pipeline no longer depends on a personal Claude account or a local setup.
- **Onboarding interview:** a conversation that builds `profile.yml` from the person's CV, LinkedIn export and a few questions about their views.
- **Voice calibration:** learn tone from 3-5 samples the person has written themselves.
- **Approval modes:** auto-publish, or draft-and-approve by email or chat.
- **Reference site template:** Astro + Vercel, deployable in one click, with disclosure and SEO built in.

## v2: beyond the blog

- LinkedIn post drafts generated from each new note, for the person to post themselves.
- Multi-language notes for people working across markets.
- Simple dashboard: notes published, search impressions, what topics resonate.

## Open questions

- Pricing model, if any, for the hosted version.
- How much autonomy people want by default: publish or approve.
