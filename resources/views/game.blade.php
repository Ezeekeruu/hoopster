<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hoopster</title>
    @vite(['resources/css/app.css', 'resources/js/app.js', 'resources/js/game.js'])
</head>
<body>

    <section id="start-screen" class="screen active-screen">
        <div class="badge-icon">
            <div class="badge-ball">
                <div class="seam-v"></div>
                <div class="seam-h"></div>
            </div>
        </div>
        <h1 class="game-title">BASKETBALL<br>SHOOTER</h1>
        <button id="start-btn" class="btn-flat btn-game">Start</button>
    </section>

    <section id="level-select-screen" class="screen">
        <h2 class="game-title small">Select a Level</h2>
        <div id="level-grid"></div>

        <p id="all-complete-text" class="d-none">All levels completed</p>

        <div class="level-select-buttons">
            <button id="back-to-start-btn" class="btn-flat btn-flat-secondary btn-game">Back</button>
            <button id="view-leaderboard-btn" class="btn-flat btn-flat-secondary btn-game">Leaderboard</button>
            <button id="reset-all-btn" class="btn-flat btn-flat-dark btn-game d-none">Reset All Levels</button>
        </div>
    </section>

    <section id="name-entry-screen" class="screen">
        <h2 class="game-title small">You Finished All 10 Levels!</h2>
        <p class="subtext">Enter your name for the leaderboard</p>
        <input type="text" id="player-name-field" class="text-field" placeholder="Player" maxlength="20">
        <button id="submit-score-btn" class="btn-flat btn-game mt-3">Submit Score</button>
    </section>

    <section id="leaderboard-screen" class="screen">
        <h2 class="game-title small">Leaderboard</h2>
        <ol id="leaderboard-list"></ol>
        <button id="leaderboard-back-btn" class="btn-flat btn-flat-secondary btn-game mt-3">Back to Levels</button>
    </section>

    <section id="game-screen" class="screen">
        <div id="game-wrapper">

            <div id="hud">
                <span>Level: <span id="level-display">1</span> / 10</span>
                <span>Score: <span id="score-display">0</span></span>
                <span id="aim-timer-display">Time: 5.0s</span>
                <div id="wind-indicator">
                    Wind: <span id="wind-arrow">→</span>
                    <span id="wind-value">0</span>
                </div>
            </div>

            <canvas id="game-canvas" width="1100" height="600"></canvas>

            <div id="power-bar-container">
                <div id="power-bar-fill"></div>
            </div>

            <div id="controls">
                <button id="restart-btn" class="btn-flat btn-flat-secondary btn-game">Restart</button>
                <button id="back-to-levels-btn" class="btn-flat btn-flat-secondary btn-game">Back to Levels</button>
            </div>

            <div id="result-overlay">
                <h2 id="result-title"></h2>
                <div id="result-buttons">
                    <button id="result-primary-btn" class="btn-flat btn-game"></button>
                    <button id="result-secondary-btn" class="btn-flat btn-flat-secondary btn-game"></button>
                </div>
            </div>

        </div>
    </section>

    <form id="score-form" class="d-none">
        @csrf
        <input type="text" name="player_name" id="player-name-input">
        <input type="hidden" name="level_reached" id="level-reached-input">
        <input type="hidden" name="total_score" id="total-score-input">
    </form>

</body>
</html>