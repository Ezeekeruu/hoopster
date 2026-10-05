# AGENTS.md

Laravel 12 + Vite app (PHP `^8.2`). Single-page basketball canvas game with a scores leaderboard. No CI, no `opencode.json`, no existing instruction files.

## Commands

```powershell
composer setup   # install, copy .env, key:generate, migrate, npm install + build
composer dev     # serve + queue:listen + pail + vite concurrently (use for manual verification)
composer test    # config:clear + artisan test
npm run dev      # vite dev only (needs `php artisan serve` separately)
npm run build    # rebuild `public/build` after editing `resources/js` or `resources/css`
vendor/bin/pint --test   # lint check
vendor/bin/pint          # lint fix
php artisan test --filter=TestName        # single test
php artisan route:list                    # verify routes (no `--compact` flag in this version)
php artisan migrate --force               # apply `database/migrations/*`
```

Tests always use sqlite `:memory:` via `phpunit.xml`, regardless of `.env` DB settings.

## Architecture

- `routes/web.php`: only 2 entrypoints — `GET /` → `GameController@index` → `resources/views/game.blade.php`; `Route::resource('scores', ScoreController::class)`.
- Game is vanilla JS canvas in `resources/js/game.js` (~900 lines, no framework). Physics constants, 15-level `levels` array, scoring, wind/moving-hoop/obstacle logic all live there. Edit that file directly; level tuning = edit the array.
- `resources/views/game.blade.php` is the DOM contract (`start-screen`, `level-select-screen`, `game-screen` + `#game-canvas`, `name-entry-screen`, `leaderboard-screen`, hidden `#score-form`). Keep element IDs in sync with `game.js`.
- Vite inputs are `resources/css/app.css`, `resources/js/app.js`, `resources/js/game.js` (`vite.config.js` + `@vite` in blade).
- `Score` model (`app/Models/Score.php`): `player_name`, `level_reached`, `total_score` only. Migration: `database/migrations/2026_09_19_131927_create_scores_table.php`.

## Gotchas

- `ScoreController@index` returns JSON top-10 by `total_score` (`GET /scores`); all other resource actions (`create/show/edit/update/destroy`) return Blade views/redirects that don't exist as views (no `scores/*.blade.php`) and are unused. Only `index` + `store` are exercised by the game.
- `store` validates `player_name` required/max:255, `level_reached` integer ≥1, `total_score` integer ≥0, then `redirect()->route('scores.index')`. `game.js` POSTs `FormData` from `#score-form` (includes `@csrf` token) via `fetch('/scores')` and ignores the redirect body — it calls `.finally()` to show the leaderboard. Don't "fix" the redirect to JSON without updating the JS flow.
- Level progress is client-side only in `localStorage` key `bb_shooter_progress` (`{unlocked, completed}`); server only persists final leaderboard entries.
- `.env.example` defaults to sqlite; local `.env` here uses MySQL `basketball_shooter_db` on `127.0.0.1:3306`. If MySQL isn't running, switch `.env` to sqlite or tests still pass (they override to `:memory:`).
- Shell is Windows PowerShell: `wc`, `head`, `ls -la`, `cat` glob patterns don't work. Use `Select-Object -First N`, `Get-ChildItem`, `Get-Content`.
