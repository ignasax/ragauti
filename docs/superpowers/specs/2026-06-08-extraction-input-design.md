# Extraction Input — Design Spec
_2026-06-08_

## What we're building

Replacing the single-purpose URL input + camera button on the Add Recipe page with a unified extraction input that accepts URLs, long text, photos (multi-select), and YouTube links — all funnelling into one Extract button.

## Layout

```
┌─────────────────────────────────────────┐
│ Paste a URL, YouTube link, or the full  │
│ recipe text…                            │
│                                         │
└─────────────────────────────────────────┘
[📷] [🖼] [thumb1 ✕] [thumb2 ✕]   [⚡ Extract]
```

- **Textarea** (replaces single-line input) — auto-grows, accepts any text
- **Camera button** (left) — `capture="environment"`, opens camera directly
- **Gallery button** (next) — `accept="image/*"` no capture, opens photo picker
- **Thumbnails** — appear inline as files are added; each has an ✕ to remove
- **Extract button** — right-aligned, disabled when nothing is in textarea AND no files

## Input detection (on Extract)

Priority order when user presses Extract:

1. **YouTube URL** — matches `youtube.com/watch` or `youtu.be/` → call `/api/youtube` serverless function to fetch transcript → pass transcript text to AI
2. **Any other URL** — matches `https://` → existing `/api/scrape` → Jina → AI
3. **Files only** — no text → send all images to AI in a single multi-image call
4. **Text only** — doesn't look like a URL → send text directly to AI (no scrape)
5. **Text + files** — text used as additional context alongside images

## YouTube transcript

New Vercel serverless function `/api/youtube.ts`:
- Uses `youtube-transcript` npm package (no API key required — uses YouTube's public caption endpoint)
- Returns transcript as plain text
- Same auth guard as `/api/scrape` (Bearer token)
- Falls back to error if video has no captions

## Multi-image AI call

For Gemini: already supported via `extractRecipeFromImage` — extend to accept `Array<{base64, mimeType}>` and pass all parts in one `generateContent` call.

For Groq: Groq vision (`llama-4-scout-17b-16e-instruct` or `meta-llama/llama-4-maverick-17b-128e-instruct-fp8`) supports multiple image parts in one message — extend `extractRecipeFromImageWithGroq` to accept an array.

Max 5 files enforced in the UI (reasonable limit for both providers).

## Files changed

- `src/pages/AddRecipePage.tsx` — replace URL input + camera button with new input area
- `src/hooks/useGeminiExtract.ts` — add `extractFromText`, update `extractFromImage` to accept array, add `extractFromYoutube`
- `src/lib/gemini.ts` — update image function to accept image array
- `src/lib/groq.ts` — update image function to accept image array
- `api/youtube.ts` — new serverless function
- `package.json` — add `youtube-transcript` dependency

## Out of scope

- Editing/cropping attached images
- Progress per-image
- Drag-and-drop reordering of attachments
- Instagram (blocked by design, no fix possible)
