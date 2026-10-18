# A² Kit

Shared design language and runtime for every A² Learning Studio platform.
A² Learning Studio · Dr. Ali Keyvanfar & Dr. Arezou Shafaghat · Kennesaw State University

Live reference: `kit/index.html` (components, color, type, audio manager demo).

## What it gives a platform

| Piece | What it does |
| --- | --- |
| Tokens + components (`a2-kit.css`) | Fraunces / Inter / JetBrains Mono, warm paper surfaces, one accent per platform, buttons, cards, chips, required/optional badges, callouts, stepper, progress, tabs, tables, KPI tiles, dialogs, toasts. Every text token is at least 4.5:1 on every surface. |
| Suite bar | Same top bar everywhere: studio mark, platform name, "where you are", Sound, Captions, Help, Your data, Feedback. On phones the secondary actions move into a More sheet. |
| Audio manager (`A2.audio`) | One rule: at most one sound at a time. Narration and video pre-empt each other (newest wins); sound effects are skipped while voice or video plays. Works with existing `new Audio()`, `<audio>`, `<video>`, native controls, Web Audio and speech synthesis. Shows captions and a full transcript for narration. |
| Interaction log (`A2.log`) | 21 fields per event, random session ID per tab, no names, emails or IDs. Stored in this browser (`a2.log.<platform>`), capped at 6,000 events. |
| Feedback (`A2.feedback`) | Two required 1–5 ratings (useful, clear), optional tags, optional comment (scrubbed of emails, phone numbers and long numbers). |
| Your data (`A2.data`) | Export JSON (events + feedback) or CSV (events, 21 columns); clear data. |

## Add it to a page

```bash
python3 kit/sync.py path/to/page.html     # inlines fonts, CSS and JS between <!-- a2-kit:… --> markers
```

The page stays a single self-contained file. Re-run the script after a kit update; it replaces the blocks in place.
The JS block lands before the page's first `<script>`, so the audio manager is installed before any platform code plays sound.

```html
<main id="main"> … </main>
<script>
A2.init({
  platform: 'buildsim',            // log key and file-name prefix
  name: 'BuildSim', subtitle: 'Job site simulator', version: '2026.10',
  accent: '#b4430c', accentStrong: '#8f3409',
  audio: false,                    // true shows Sound + Captions in the bar
  help: { intro: '…', steps: [{ title: 'Module 1', text: '…', required: true }, { title: 'Leaderboard', optional: true }],
          keys: [['←/→', 'Previous / next slide']] }
});
</script>
```

## Platform accents

| Platform | Accent | Strong |
| --- | --- | --- |
| Studio (hub, Ecosystem, decks) | `#7a1c1c` | `#5e1414` |
| BuildSim | `#b4430c` | `#8f3409` |
| NEXUS-DC (Power Up and Training) | `#0e6e82` | `#0a5463` |
| EVNN-DC | `#5b35c9` | `#4626a3` |
| CM3400 Risk Log | `#1f4a7a` | `#163a61` |
| NanoLCA-DT | `#3f46c4` | `#2f359e` |
| PlayScan | `#0f6b5c` | `#0a5146` |

All pass 4.5:1 with white text and as text on paper surfaces.

## Guided UX pattern (every screen)

1. **Where am I** — `A2.log.view('module-2', { label: 'Module 2 of 6 · Site logistics', step_index: 2, step_total: 6 })` updates the bar and logs the view. Pair it with a visible `.a2-stepper`.
2. **What to do** — one `.a2-callout.is-next` at the top: the task in one sentence.
3. **Required vs optional** — `.a2-badge.is-required` / `.a2-badge.is-optional` on every task, field and section that isn't obvious.
4. **One primary action** — a single `.a2-btn.is-primary` that names the destination ("Continue to module 3"), plus a Back.

## Logging

Every event row has these 21 fields:

`session_id, platform, platform_version, seq, ts, t_ms, view, step_index, step_total, event, target, value, correct, score, attempt, duration_ms, input_mode, audio_state, viewport, reduced_motion, lang`

Automatic: session start, page load/hide, view changes and time on view, clicks on buttons/links/tabs, changes to checkboxes, radios, selects and sliders (values), free-text fields (**length only, never content**), audio play/pause/end, settings, feedback, exports, errors.

Add the meaningful learning events yourself:

```js
A2.log.event('answer',   { target: 'q3', value: 'B', correct: true, attempt: 1 });
A2.log.event('decision', { target: 'crane-location', value: 'NE corner', score: 82 });
A2.log.event('module_complete', { target: 'module-2', score: 88, duration_ms: 540000 });
```

## Personal data (FERPA)

- Never log or export names, emails or student IDs. The kit scrubs emails, phone numbers and 7+ digit numbers from every logged string.
- If a certificate needs a name, label the field "Name for your certificate (optional, stays on this device)", call `A2.privacy.redact(name)` so it can never reach the log, and keep it out of exports and shared leaderboards.

## Audio

- Nothing to change for overlap: every play path goes through the manager.
- Mark sound effects: `<audio data-a2-channel="sfx">` or `A2.audio.sfx(src)`. Web Audio effects are handled automatically.
- Captions for narration: `A2.audio.captions({ 'scene_s1.mp3': { label: 'Slide 2 · Stakeholders', text: '…', cues: [{ start: 0, end: 4.2, text: '…' }] } })`.
- Video: `<track kind="captions" src="captions/1.vtt" srclang="en" label="English" default>`.
- No live text-to-speech; narration is pre-recorded.

## Design rules

- No emoji in UI chrome (buttons, nav, headings, labels, tabs). Use `A2.icon('name')` or `<svg class="a2-ico"><use href="#a2-i-name"></use></svg>`.
- Headings in Fraunces, interface and reading text in Inter, numbers in JetBrains Mono (`.a2-num`).
- 16 px body, nothing under 12 px; 44 px touch targets (24 px minimum).
- Motion is decoration only and stops under `prefers-reduced-motion`.
