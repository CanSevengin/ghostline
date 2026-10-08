#!/usr/bin/env node
// Ghostline: a self-running publishing agent for busy professionals, built on Claude.
// One run = research what changed this week, write one note in the owner's voice,
// check it, save it as Markdown, and (optionally) publish and ping search engines.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import Anthropic from '@anthropic-ai/sdk';

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};

if (flag('help')) {
  console.log(`ghostline [--config ghostline.config.json] [--out dir] [--mock] [--publish] [--topic "..."]

  --config   Path to the config file (default: ghostline.config.json)
  --out      Where to write the Markdown note (default: config.contentDir)
  --mock     Skip the Claude API and write a sample note (to test the pipeline)
  --publish  git add/commit/push in config.repoDir, then ping IndexNow
  --topic    Optional nudge for this run ("agents in customer support")`);
  process.exit(0);
}

const root = process.cwd();
const config = JSON.parse(fs.readFileSync(path.resolve(root, opt('config', 'ghostline.config.json')), 'utf8'));
const voice = fs.readFileSync(path.resolve(root, config.voiceProfile), 'utf8');
const promptTemplate = fs.readFileSync(new URL('../prompts/agent.md', import.meta.url), 'utf8');
const outDir = path.resolve(root, opt('out', config.contentDir));
fs.mkdirSync(outDir, { recursive: true });

// ---------- helpers ----------

function existingNotes(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const src = fs.readFileSync(path.join(dir, f), 'utf8');
      const title = (src.match(/^title:\s*"?(.+?)"?\s*$/m) || [])[1] || f;
      return { slug: f.replace(/\.md$/, ''), title };
    });
}

const fill = (tpl, vars) => tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '');

// The house style bans em and en dashes between clauses. Repair them deterministically.
function scrubDashes(s) {
  return s.replace(/\s*[—–]\s*/g, ', ').replace(/,\s*,/g, ',');
}

function slugify(s) {
  return s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 70);
}

function validate(post) {
  const problems = [];
  for (const k of ['title', 'description', 'body']) if (!post[k] || typeof post[k] !== 'string') problems.push(`missing ${k}`);
  const words = (post.body || '').split(/\s+/).filter(Boolean).length;
  if (words < config.minWords) problems.push(`too short (${words} words)`);
  if (words > config.maxWords * 1.25) problems.push(`too long (${words} words)`);
  for (const banned of config.bannedPhrases || []) {
    if (`${post.title} ${post.body}`.toLowerCase().includes(banned.toLowerCase())) problems.push(`contains banned phrase "${banned}"`);
  }
  return { ok: problems.length === 0, problems, words };
}

function toMarkdown(post, date) {
  const esc = (s) => s.replace(/"/g, '\\"');
  const sources = (post.sources || []).filter((s) => s && s.url);
  const sourceBlock = sources.length
    ? `\n\n## Sources\n\n${sources.map((s) => `- [${s.title || s.url}](${s.url})`).join('\n')}\n`
    : '\n';
  return `---
title: "${esc(post.title)}"
description: "${esc(post.description)}"
date: ${date}
tags: [${(post.tags || []).map((t) => JSON.stringify(t)).join(', ')}]
draft: ${config.publishAsDraft ? 'true' : 'false'}
---

${post.body.trim()}${sourceBlock}`;
}

function localIsoDate() {
  const tz = config.timezoneOffset || '+00:00';
  const sign = tz[0] === '-' ? -1 : 1;
  const [h, m] = tz.slice(1).split(':').map(Number);
  const d = new Date(Date.now() + sign * (h * 60 + m) * 60000);
  return d.toISOString().replace(/\.\d+Z$/, tz);
}

// ---------- the Claude call ----------

async function writeWithClaude(system, userMsg) {
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY
  const tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: config.maxSearches ?? 8 }];
  const messages = [{ role: 'user', content: userMsg }];

  // Server tools can return stop_reason "pause_turn" on long research turns; continue until done.
  for (let turn = 0; turn < 6; turn++) {
    const res = await client.messages.create({
      model: config.model,
      max_tokens: 16000,
      system,
      tools,
      messages,
    });
    if (res.stop_reason === 'pause_turn') {
      messages.push({ role: 'assistant', content: res.content });
      continue;
    }
    const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
    const json = (text.match(/<post>([\s\S]*?)<\/post>/) || [])[1];
    if (!json) throw new Error('Claude did not return a <post> block:\n' + text.slice(0, 800));
    return JSON.parse(json);
  }
  throw new Error('Research did not finish within the turn budget.');
}

function mockPost() {
  return {
    slug: 'what-a-week-of-ai-news-means-for-export-teams',
    title: 'What a week of AI news means for export teams',
    description: 'A sample note produced in mock mode, to test the Ghostline pipeline end to end without calling the Claude API.',
    tags: ['AI', 'export'],
    body: Array.from({ length: 16 }, (_, i) =>
      `## Point ${i + 1}\n\nThis is mock content used to check that files, front matter, validation and publishing work as expected. It is not a real note, and it never claims facts. Replace mock mode with a real run once an API key is set.`
    ).join('\n\n'),
    sources: [{ title: 'Ghostline on GitHub', url: 'https://github.com/CanSevengin/ghostline' }],
  };
}

// ---------- run ----------

const notes = existingNotes(outDir);
const system = fill(promptTemplate, {
  OWNER: config.owner.name,
  SITE: config.siteUrl,
  TOPICS: config.topics.join(', '),
  MIN_WORDS: String(config.minWords),
  MAX_WORDS: String(config.maxWords),
  RULES: (config.rules || []).map((r) => `- ${r}`).join('\n'),
  VOICE: voice,
  EXISTING: notes.map((n) => `- ${n.title} (${config.siteUrl}/blog/${n.slug}/)`).join('\n') || '- (none yet)',
});
const userMsg = `Today is ${new Date().toDateString()}. Write this run's note.${opt('topic') ? ` Lean towards: ${opt('topic')}.` : ''}`;

let post = flag('mock') ? mockPost() : await writeWithClaude(system, userMsg);

post.title = scrubDashes(post.title);
post.description = scrubDashes(post.description);
post.body = scrubDashes(post.body);
const check = validate(post);
if (!check.ok) {
  console.error('Validation failed:', check.problems.join('; '));
  process.exit(1);
}

const slug = slugify(post.slug || post.title);
const file = path.join(outDir, `${slug}.md`);
if (fs.existsSync(file)) {
  console.error(`A note with slug "${slug}" already exists. Not overwriting.`);
  process.exit(1);
}
fs.writeFileSync(file, toMarkdown(post, localIsoDate()));
console.log(`Wrote ${path.relative(root, file)} (${check.words} words)`);

if (flag('publish')) {
  const repo = path.resolve(root, config.repoDir);
  const git = (...a) => execFileSync('git', a, { cwd: repo, stdio: 'inherit' });
  if (config.buildCommand) execFileSync('sh', ['-c', config.buildCommand], { cwd: repo, stdio: 'inherit' });
  git('add', path.relative(repo, file));
  git('commit', '-m', `Ghostline: ${post.title}`);
  git('push');
  const url = `${config.siteUrl}/blog/${slug}/`;
  if (config.indexNowKey) {
    const r = await fetch(`https://api.indexnow.org/indexnow?url=${encodeURIComponent(url)}&key=${config.indexNowKey}`);
    console.log(`IndexNow: ${r.status}`);
  }
  console.log(`Published: ${url}`);
}
