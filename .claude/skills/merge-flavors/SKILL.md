---
name: merge-flavors
description: Merge near-duplicate ice-cream flavor names (OCR typos, case/spelling/word-order/separator variants, English vs German renderings) into a single canonical flavor. Use when asked to consolidate, merge, dedupe, or clean up flavor names, or when the stats show the same flavor split across multiple entries.
---

# Merge similar flavors

Flavor identity for stats is keyed on `normalizeName(flavor.name)` (`src/lib/stats.ts`), and `normalizeName` (`packages/scraper/src/normalize.ts`) does **not** lowercase. So case/spelling/word-order/OCR variants of one flavor fragment into separate flavors in the UI. Merging is done **by you (the LLM)**, using judgment — the bundled script only reports candidates; it never edits data.

Each merge is a **two-step** change, both required:

1. **Rewrite history** — replace variant `name`s with the canonical name in `data/history.json` and `data/current.json`. Aliases are write-time only, so they never retroactively fix already-stored entries.
2. **Add an alias** — add a lowercase-keyed entry to `ALIASES` in `packages/scraper/src/normalize.ts` so future scrapes canonicalize automatically.

## Workflow

1. **Report candidates (read-only).**
   `bun run .claude/skills/merge-flavors/scripts/list-flavors.ts`
   Prints the full `count name` table plus heuristic hints split into **HIGH** confidence (same words — case/word-order/spelling-typo/marker) and **LOW** confidence (one name adds a real word — often a *different* flavor). Also scan the table yourself for semantic duplicates the script can't detect (e.g. German↔English renderings like `Kaffee Karamel` vs `Caffé Caramel`).

2. **Auto-merge HIGH-confidence candidates.** These are safe — apply them without asking. For borderline ones, confirm with
   `bun run .claude/skills/merge-flavors/scripts/list-flavors.ts --detail "Variant Name"` (dates, tags, English).

3. **Ask before LOW-confidence merges.** Present the LOW list (and any semantic dupes you spotted) with a one-line rationale each, and let the user approve/reject. Keep genuinely different flavors apart — lime vs lemon (`Limette`/`Zitrone`), strawberry vs raspberry (`Erdbeer`/`Himbeer`), `Schwarzer Sesam` vs `…White Choc` are **not** duplicates. When unsure, don't merge.

4. **Perform each approved merge (you edit the files):**
   - Pick the canonical form already used by the majority / matching sibling flavors.
   - In `data/history.json` and `data/current.json`, replace the variant `"name": "…"` with the canonical (use Edit `replace_all`). Strip any trailing parenthetical marker like `(alc)` from that entry's `nameEnglish` too — markers `(vegan)`/`(Nuss)` are already handled in `buildLocationUpdate`; others are not.
   - Add one `ALIASES` entry per merge in `normalize.ts`, keyed on the **lowercased** variant, with a short comment. Skip the alias only for a genuinely ambiguous key that shouldn't always map (e.g. a bare `???`) — rewrite that data but leave it out of `ALIASES`.

5. **Verify & commit.** Re-run the reporter and confirm the distinct count dropped and the variants are gone, then:
   `bun run lint && bun run knip && bun run typecheck`
   Commit with a conventional message listing the merges. CI's Deploy workflow publishes to GitHub Pages.

## Related

Adding a new flavor tag is a different 4-file change — see the `project_flavor_tag_touchpoints` memory.
