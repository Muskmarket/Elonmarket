# Elon Prediction Game – Project Overview

This document summarizes the codebase and how it maps to the client’s requirements. Use it to align on game logic first, then rewards/Nitter later.

---

## Client requirements (from chat)

1. **Admin sets everything**
   - Admin sets **Question**
   - Admin can **add/remove default prediction options** (Grok, Tesla, Starlink, etc.)
   - Admin **creates new round** → sets **time window** (e.g. 1pm–3pm UTC) → **voting opens immediately**
   - **Only token holders** can vote
   - Admin sets **vote lock** (e.g. 30 minutes before prediction window) → voting closes at that time
   - When **prediction window starts** (e.g. 1pm), backend **monitors Elon’s tweets**; **first tweet containing an option keyword** (exact word) = **winner**
   - If round ends with **no matching tweet** → **no winner**, pool carries over
   - **Only winners** can claim rewards

2. **Tweet source**
   - Currently: **IFTTT** (slow, ~5 min)
   - Desired: **Nitter** (self‑hosted, instant) – client said Nitter is “at login stage”

3. **Scope for now**
   - Focus on **game logic** first; don’t change the frontend
   - Reward pool / Web3: client may do themselves or later

---

## What’s already implemented

### Admin panel (`/admin65131200`)

- **Game settings**: Default prediction options (add/remove), “Posts to display”
- **Create round**: Question, **Prediction window start/end (UTC)**, **Vote lock (minutes before window)**
- On “Create Round & Open Voting”: round is created with **status `open`** and **start_time = now** → voting is open immediately
- **Recent rounds** list with status, vote counts, “End” button for open rounds

### Backend (Supabase)

- **`admin` Edge Function**
  - `create_round`: Inserts round with `start_time`, `end_time`, `prediction_start_time`, `vote_lock_minutes`, `status: "open"`, and options (label + keywords).
  - `update_game_config`: Saves default options, `posts_to_display`, `cooldown_minutes`, `rss_feed_url`.

- **`submit-vote` Edge Function**
  - Verifies **token balance on-chain** (Solana RPC) against `wallet_config.min_token_balance`.
  - Ensures round **status === "open"**.
  - **Vote lock**: If `now >= (prediction_start_time - vote_lock_minutes)` → rejects with “Voting is locked”.
  - One vote per user per round; inserts vote. DB trigger updates `prediction_options.vote_count` and `prediction_rounds.total_votes`.

- **`detect-winner` Edge Function**
  - **Cooldown path**: If a round is in `cooldown` and `cooldown_end_time <= now` → runs winner detection (scan tweets in prediction window; first matching post/quote wins or no_winner).
  - **Open round, prediction window ended**: If `now >= end_time` → sets round to `cooldown` and `cooldown_end_time = now + cooldown_minutes`.
  - **Open round, inside prediction window**: Scans `tweets` in `[prediction_start_time, end_time]`, orders by `created_at_twitter`; **first** tweet (post or quote) that matches an option’s keyword (exact word / @mention) wins → round finalized, winners get `unclaimed_rewards_sol`, vault notified.
  - **Matching**: Exact word/mention; “X” is special (standalone or x.com). First option to appear in text wins.

- **`ifttt-webhook` Edge Function**
  - Receives IFTTT payload (tweet text, url, created_at, etc.), filters replies, parses date (with timezone offset), **upserts into `tweets`**, then **calls `detect-winner`** in background (so winner can be detected on each new tweet).

### Frontend (no changes required for “logic only”)

- **PredictionVoting**: Shows current round, options, vote lock countdown, “Votes locked” when inside lock window, token check, submit vote, “Vote submitted” state.
- **LiveFeed**: Reads `tweets` from Supabase + realtime; shows recent tweets.
- **usePredictionRound**: Fetches open → cooldown → upcoming → latest finalized round; subscribes to `prediction_rounds` / `prediction_options` changes.
- **useVoting**: Calls `submit-vote` with wallet, roundId, optionId, tokenBalance.
- **useTweets**: Fetches and caches tweets; realtime on INSERT/UPDATE.

### Database (from types and migrations)

- **prediction_rounds**: `start_time`, `end_time`, `prediction_start_time`, `vote_lock_minutes`, `status` (e.g. open, cooldown, finalized, no_winner), `cooldown_end_time`, `winning_option_id`, `winning_tweet_*`, etc.
- **prediction_options**: per-round options with `keywords[]`, `vote_count`, `is_winner`.
- **votes**: one per (round_id, user_id); trigger increments option and round vote counts.
- **tweets**: stores tweet text, `created_at_twitter`, `tweet_type` (post/quote), `matched_option_id`, etc.
- **game_config**: `default_options`, `posts_to_display`, `cooldown_minutes`, `rss_feed_url` (for future Nitter/RSS).
- **profiles**, **claims**, **wallet_config**, **wallet_balances**, **leaderboard**, **recent_winners**, etc. for rewards and display.

---

## Gaps / things to confirm

1. **Schema vs code**
   - **TypeScript** and **detect-winner** use `round_status = 'cooldown
   '` and `cooldown_end_time` on `prediction_rounds`.
   - **Migrations in repo** only define `round_status` as `('upcoming', 'open', 'finalizing', 'finalized', 'paid', 'no_winner')` and do not add `cooldown` or `cooldown_end_time`.
   - If the live DB was updated outside these migrations (e.g. Lovable/dashboard), things may already work. Otherwise, a **migration** is needed to:
     - Add `'cooldown'` to `round_status` enum.
     - Add `cooldown_end_time` to `prediction_rounds`.
   - **game_config** exists in TypeScript types but not in the migrations in the repo; it may have been created elsewhere. If it’s missing in DB, admin “Save Game Settings” / create round will fail until that table exists.

2. **When does the round move to cooldown / winner?**
   - **On each tweet**: IFTTT webhook → insert tweet → call `detect-winner` → if in prediction window and tweet matches, round finalizes; if `now >= end_time`, round goes to cooldown.
   - **When prediction window ends with no new tweet**: Nothing automatically calls `detect-winner`. So if the last tweet was at 12:50 and the window ends at 1pm, the round won’t move to cooldown until something calls `detect-winner` again (e.g. next IFTTT tweet or admin “End”).
   - To make “round ends at end_time” reliable without relying on the next tweet, you need a **scheduled caller** (e.g. Supabase cron or external cron) that hits `detect-winner` every 1–2 minutes. Then when `now >= end_time`, that call will transition the round to cooldown (and after cooldown, run winner detection).

3. **“Has already voted” on refresh**
   - After a user votes and refreshes the page, **hasVoted** is only set in React state after a successful submit. So the UI can show the vote button again until they click and get “You have already voted” from the API. This is logic-correct but a small UX gap. Fix would be: when wallet is connected and there is a current round, fetch “my vote for this round” and set `hasVoted` (minimal frontend change if you decide to do it later).

4. **Nitter**
   - Not in this repo yet. When you’re ready: replace or supplement IFTTT with a Nitter-based flow (e.g. poll Nitter RSS or use a Nitter webhook if available), insert into `tweets` the same way, and keep calling `detect-winner` on each new tweet. The rest of the game logic can stay as is.

---

## Suggested order of work (game logic first)

1. **Ensure DB schema**
   - Add migration (if needed) for `round_status` = `cooldown` and `prediction_rounds.cooldown_end_time`.
   - Ensure `game_config` table exists (add migration if not).

2. **Scheduled `detect-winner`**
   - Add a cron (e.g. every 1–2 min) that POSTs to `detect-winner` so rounds reliably transition to cooldown when `end_time` passes and then run winner detection after cooldown, even when no new tweet arrives.

3. **Test full flow**
   - Admin: create round (question, options, window, vote lock) → voting open.
   - User: vote (with token wallet) → vote lock countdown → lock → prediction window.
   - IFTTT (or test insert): one tweet in window matching an option → round should finalize and winners get unclaimed rewards.
   - Case: no tweet in window → after `end_time` and cooldown, round should go to `no_winner`.

4. **Later**
   - Nitter integration (feed → `tweets` → same `detect-winner` flow).
   - Reward pool / Web3 (client may provide endpoints).

---

## Quick reference – important files

| Area            | Path |
|-----------------|------|
| Admin rounds    | `src/components/admin/RoundManager.tsx` |
| Vote lock + UI  | `src/components/PredictionVoting.tsx`, `src/hooks/usePredictionRound.ts` |
| Submit vote API | `supabase/functions/submit-vote/index.ts` |
| Winner detection| `supabase/functions/detect-winner/index.ts` |
| Tweet ingest    | `supabase/functions/ifttt-webhook/index.ts` |
| Admin API       | `supabase/functions/admin/index.ts` |
| DB types        | `src/integrations/supabase/types.ts` |

If you tell me your priority (e.g. “add migration + cron only” or “migration + cron + hasVoted”), I can outline the exact code changes next without touching the rest of the frontend.
