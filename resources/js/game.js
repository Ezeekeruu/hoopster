// ===== Screens =====
const screens = {
    start: document.getElementById('start-screen'),
    levelSelect: document.getElementById('level-select-screen'),
    nameEntry: document.getElementById('name-entry-screen'),
    leaderboard: document.getElementById('leaderboard-screen'),
    game: document.getElementById('game-screen'),
};

function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active-screen'));
    screens[name].classList.add('active-screen');
}

// ===== Progress (persisted locally) =====
const PROGRESS_KEY = 'bb_shooter_progress';

function loadProgress() {
    try {
        const raw = localStorage.getItem(PROGRESS_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            return {
                unlocked: [...new Set(parsed.unlocked || [0])],
                completed: [...new Set(parsed.completed || [])],
                totalScore: Number.isFinite(parsed.totalScore) ? parsed.totalScore : 0,
                levelScores: parsed.levelScores && typeof parsed.levelScores === 'object' ? parsed.levelScores : {},
            };
        }
    } catch (e) { /* ignore corrupted data */ }
    return { unlocked: [0], completed: [], totalScore: 0, levelScores: {} };
}

function saveProgress() {
    progress.totalScore = totalScore;
    progress.levelScores = levelScores;
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

let progress = loadProgress();

function isUnlocked(i) { return progress.unlocked.includes(i); }
function isCompleted(i) { return progress.completed.includes(i); }

function unlockLevel(i) {
    if (i < levels.length && !isUnlocked(i)) progress.unlocked.push(i);
}

function markCompleted(i) {
    if (!isCompleted(i)) progress.completed.push(i);
}

function allLevelsCompleted() {
    return new Set(progress.completed).size >= levels.length;
}

function renderLevelGrid() {
    const grid = document.getElementById('level-grid');
    grid.innerHTML = '';

    levels.forEach((lvl, i) => {
        const btn = document.createElement('button');
        btn.className = 'level-btn';
        if (!isUnlocked(i)) btn.classList.add('locked');
        if (isCompleted(i)) btn.classList.add('completed');

        const label = document.createElement('div');
        label.textContent = i + 1;
        btn.appendChild(label);

        if (isCompleted(i)) {
            const check = document.createElement('div');
            check.className = 'check-mark';
            check.textContent = '✓';
            btn.appendChild(check);
        } else if (!isUnlocked(i)) {
            const lock = document.createElement('div');
            lock.className = 'lock-shape';
            btn.appendChild(lock);
        }

        if (isUnlocked(i)) {
            btn.addEventListener('click', () => enterLevel(i));
        }

        grid.appendChild(btn);
    });

    const text = document.getElementById('all-complete-text');
    const resetBtn = document.getElementById('reset-all-btn');
    if (allLevelsCompleted()) {
        text.classList.remove('d-none');
        resetBtn.classList.remove('d-none');
    } else {
        text.classList.add('d-none');
        resetBtn.classList.add('d-none');
    }
}

document.getElementById('reset-all-btn').addEventListener('click', () => {
    totalScore = 0;
    levelScores = {};
    progress = { unlocked: [0], completed: [], totalScore: 0, levelScores: {} };
    saveProgress();
    updateHUD();
    renderLevelGrid();
});

document.getElementById('start-btn').addEventListener('click', () => {
    renderLevelGrid();
    showScreen('levelSelect');
});

document.getElementById('back-to-start-btn').addEventListener('click', () => {
    showScreen('start');
});

document.getElementById('back-to-levels-btn').addEventListener('click', () => {
    renderLevelGrid();
    showScreen('levelSelect');
});

// ===== Leaderboard =====

function fetchAndRenderLeaderboard() {
    const list = document.getElementById('leaderboard-list');
    list.innerHTML = '<li class="empty-message">Loading...</li>';

    fetch('/scores')
        .then(res => res.json())
        .then(data => {
            list.innerHTML = '';
            if (!data || data.length === 0) {
                list.innerHTML = '<li class="empty-message">No scores yet — be the first!</li>';
                return;
            }
            data.forEach((entry, i) => {
                const li = document.createElement('li');
                const rank = document.createElement('span');
                rank.className = 'rank';
                rank.textContent = `#${i + 1}`;

                const name = document.createElement('span');
                name.textContent = entry.player_name;

                const score = document.createElement('span');
                score.textContent = `${entry.total_score} pts`;

                li.appendChild(rank);
                li.appendChild(name);
                li.appendChild(score);
                list.appendChild(li);
            });
        })
        .catch(() => {
            list.innerHTML = '<li class="empty-message">Could not load leaderboard.</li>';
        });
}

document.getElementById('view-leaderboard-btn').addEventListener('click', () => {
    fetchAndRenderLeaderboard();
    showScreen('leaderboard');
});

document.getElementById('leaderboard-back-btn').addEventListener('click', () => {
    renderLevelGrid();
    showScreen('levelSelect');
});

let isSubmittingScore = false;

document.getElementById('submit-score-btn').addEventListener('click', () => {
    if (isSubmittingScore) return;
    const btn = document.getElementById('submit-score-btn');
    const field = document.getElementById('player-name-field');
    const name = field.value.trim() || 'Player';

    document.getElementById('player-name-input').value = name.slice(0, 20);
    document.getElementById('level-reached-input').value = Math.min(Math.max(currentLevel + 1, 1), 10);
    document.getElementById('total-score-input').value = Math.min(Math.max(totalScore, 0), 1000);

    const form = document.getElementById('score-form');
    const formData = new FormData(form);

    isSubmittingScore = true;
    btn.disabled = true;

    fetch('/scores', {
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' },
        body: formData,
    })
        .then(res => {
            if (!res.ok) throw new Error(`Save failed (${res.status})`);
            return res.json().catch(() => ({}));
        })
        .then(() => {
            field.value = '';
            fetchAndRenderLeaderboard();
            showScreen('leaderboard');
        })
        .catch(() => {
            const list = document.getElementById('leaderboard-list');
            fetchAndRenderLeaderboard();
            showScreen('leaderboard');
            if (list) list.innerHTML = '<li class="empty-message">Could not save score — please try again.</li>';
        })
        .finally(() => {
            isSubmittingScore = false;
            btn.disabled = false;
        });
});

// ===== Sound effects (Web Audio API — no external files needed) =====
let audioCtx = null;

function getAudioCtx() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function playShootSound() {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
}

function playSwishSound() {
    const ctx = getAudioCtx();
    [880, 1320].forEach((freq, i) => {
        const start = ctx.currentTime + i * 0.08;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.001, start);
        gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.25);
    });
}

function playMissSound() {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
}

// ===== Canvas / Physics setup =====
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const GRAVITY = 1000;
const GROUND_Y = 560;
const BALL_RADIUS = 16;
const POWER_SCALE = 6.5;
const MAX_DRAG = 180;
const RIM_RADIUS = 30;
const WIND_SCALE = 3.5;
const AIM_TIME_LIMIT = 5.0;

const levels = [
    { hoopX: 715, hoopY: 372, wind: 0, moving: false },
    { hoopX: 775, hoopY: 347, wind: 0, moving: false },
    { hoopX: 828, hoopY: 318, wind: 25, moving: false },
    { hoopX: 888, hoopY: 283, wind: 35, moving: false },
    { hoopX: 812, hoopY: 322, wind: 60, moving: false },
    { hoopX: 862, hoopY: 297, wind: 100, moving: false },
    { hoopX: 800, hoopY: 320, wind: 70, moving: true, moveRangeX: 110, moveRangeY: 0, freqX: 1.6 },
    { hoopX: 840, hoopY: 300, wind: -90, moving: true, moveRangeX: 130, moveRangeY: 0, freqX: 2.0 },
    { hoopX: 820, hoopY: 290, wind: 40, moving: false, obstacle: { x: 560, y: 70, w: 22, h: 460 } },
    { hoopX: 860, hoopY: 270, wind: 90, moving: true, moveRangeX: 90, moveRangeY: 60, freqX: 1.9, freqY: 2.3, obstacle: { x: 580, y: 50, w: 22, h: 480 } },
];

let currentLevel = 0;
let totalScore = progress.totalScore || 0;
let levelScores = progress.levelScores || {};

let missStreak = 0;

let ball = { x: 100, y: GROUND_Y, vx: 0, vy: 0, flying: false };
let startX = 100, startY = GROUND_Y;

let mouseX = startX;
let mouseY = startY;
let hovering = false;

let hoopOffsetX = 0;
let hoopOffsetY = 0;
let levelStartTime = performance.now();

let netSwing = 0;
let netSwingActive = false;
let netSwingStart = 0;

let scoring = false;
let scoringStart = 0;
const SCORE_FALL_MS = 400;

let aimTimerStart = performance.now();
let resultShowing = false;
let restTimer = 0;

function getLevel() {
    return levels[currentLevel];
}

function getAimTimeLimit() {
    return getLevel().aimTime || AIM_TIME_LIMIT;
}

function resetBall() {
    ball.x = startX;
    ball.y = startY;
    ball.vx = 0;
    ball.vy = 0;
    ball.flying = false;
    scoring = false;
    restTimer = 0;
    aimTimerStart = performance.now();
}

function manualReset() {
    // Restarting mid-flight counts as a miss so R/Restart can't wipe a bad shot.
    if (scoring) return;
    if (ball.flying && !resultShowing) {
        missShot();
        return;
    }
    if (resultShowing) hideOverlay();
    resetBall();
}

function enterLevel(i) {
    currentLevel = i;
    levelStartTime = performance.now();
    missStreak = 0;
    resetBall();
    updateHUD();
    showScreen('game');
}

document.getElementById('restart-btn').addEventListener('click', () => {
    manualReset();
});

window.addEventListener('keydown', (e) => {
    if ((e.key === 'r' || e.key === 'R') && screens.game.classList.contains('active-screen')) {
        manualReset();
    }
});

function getLaunchVelocity(dragDist, dx, dy) {
    const angle = Math.atan2(dy, dx);
    const speed = dragDist * POWER_SCALE;
    return {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
    };
}

function launchBall(vx, vy) {
    ball.vx = vx;
    ball.vy = vy;
    ball.flying = true;
    document.getElementById('power-bar-fill').style.width = '0%';
    playShootSound();
}

function updateHoopMovement(now) {
    const level = getLevel();
    if (!level.moving) {
        hoopOffsetX = 0;
        hoopOffsetY = 0;
        return;
    }
    const t = (now - levelStartTime) / 1000;
    hoopOffsetX = Math.sin(t * (level.freqX || 1.4)) * (level.moveRangeX || 0);
    hoopOffsetY = Math.sin(t * (level.freqY || 2.0) + 1.1) * (level.moveRangeY || 0);
}

function getHoopCenter() {
    const level = getLevel();
    return {
        hx: level.hoopX + (level.moving ? hoopOffsetX : 0),
        hy: level.hoopY + (level.moving ? hoopOffsetY : 0),
    };
}

function drawBackground() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#3a5a40';
    ctx.fillRect(0, GROUND_Y + BALL_RADIUS, canvas.width, canvas.height - GROUND_Y - BALL_RADIUS);
}

function drawObstacle() {
    const obs = getLevel().obstacle;
    if (!obs) return;
    ctx.fillStyle = '#6c757d';
    ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
    ctx.strokeStyle = '#495057';
    ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
}

function getBackboardRect() {
    const { hx, hy } = getHoopCenter();
    return { x: hx + RIM_RADIUS - 2, y: hy - 42, w: 9, h: 78 };
}

function getRimPosts() {
    const { hx, hy } = getHoopCenter();
    return [
        { x: hx - RIM_RADIUS, y: hy },
        { x: hx + RIM_RADIUS, y: hy },
    ];
}

function drawHoop() {
    const { hx, hy } = getHoopCenter();
    const bb = getBackboardRect();

    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(bb.x, bb.y, bb.w, bb.h);
    ctx.strokeStyle = '#adb5bd';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bb.x, bb.y, bb.w, bb.h);

    ctx.strokeStyle = '#e63946';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(hx, hy, RIM_RADIUS, 8, 0, 0, Math.PI * 2);
    ctx.stroke();

    drawNet(hx, hy);
}

function drawNet(hx, hy) {
    const netHeight = 34;
    const strands = 7;

    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 1.3;

    const topXs = [];
    const bottomXs = [];
    for (let i = 0; i <= strands; i++) {
        const t = i / strands;
        topXs.push(hx - RIM_RADIUS + 5 + t * (RIM_RADIUS * 2 - 10));
        bottomXs.push(hx - 9 + t * 18 + netSwing);
    }

    for (let i = 0; i <= strands; i++) {
        ctx.beginPath();
        ctx.moveTo(topXs[i], hy);
        ctx.lineTo(bottomXs[i], hy + netHeight);
        ctx.stroke();
    }

    for (let j = 1; j <= 2; j++) {
        ctx.beginPath();
        for (let i = 0; i <= strands; i++) {
            const yPos = hy + (netHeight * j) / 3;
            const xPos = topXs[i] + (bottomXs[i] - topXs[i]) * (j / 3);
            if (i === 0) ctx.moveTo(xPos, yPos);
            else ctx.lineTo(xPos, yPos);
        }
        ctx.stroke();
    }
}

function drawBall() {
    let alpha = 1;
    if (scoring) {
        const elapsed = performance.now() - scoringStart;
        const fadeStart = SCORE_FALL_MS * 0.5;
        if (elapsed > fadeStart) {
            alpha = Math.max(1 - (elapsed - fadeStart) / (SCORE_FALL_MS - fadeStart), 0);
        }
    }

    ctx.save();
    ctx.globalAlpha = alpha;

    const grad = ctx.createRadialGradient(
        ball.x - 6, ball.y - 6, 3,
        ball.x, ball.y, BALL_RADIUS
    );
    grad.addColorStop(0, '#ff9f45');
    grad.addColorStop(1, '#c9530c');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#3b1f0d';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(ball.x, ball.y - BALL_RADIUS);
    ctx.lineTo(ball.x, ball.y + BALL_RADIUS);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(ball.x - BALL_RADIUS, ball.y);
    ctx.lineTo(ball.x + BALL_RADIUS, ball.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(ball.x, ball.y - BALL_RADIUS);
    ctx.quadraticCurveTo(ball.x + BALL_RADIUS, ball.y, ball.x, ball.y + BALL_RADIUS);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(ball.x, ball.y - BALL_RADIUS);
    ctx.quadraticCurveTo(ball.x - BALL_RADIUS, ball.y, ball.x, ball.y + BALL_RADIUS);
    ctx.stroke();

    ctx.restore();
}

function drawTrajectoryPreview() {
    if (!hovering || ball.flying) return;

    const dx = mouseX - startX;
    const dy = mouseY - startY;
    const dragDist = Math.min(Math.sqrt(dx * dx + dy * dy), MAX_DRAG);

    if (dragDist < 3) return;

    const { vx, vy } = getLaunchVelocity(dragDist, dx, dy);

    let simX = startX;
    let simY = startY;
    let simVx = vx;
    let simVy = vy;

    const level = getLevel();
    const wind = level.wind * WIND_SCALE;
    const obs = level.obstacle;
    const bb = getBackboardRect();
    const dt = 0.035;
    const maxSteps = 70;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';

    for (let i = 0; i < maxSteps; i++) {
        simVy += GRAVITY * dt;
        simVx += wind * dt;
        simX += simVx * dt;
        simY += simVy * dt;

        if (simY - BALL_RADIUS > GROUND_Y || simX > canvas.width || simX < 0) break;
        // Stop the preview where the real ball would stop: obstacle / backboard.
        if (obs && simX + BALL_RADIUS > obs.x && simX - BALL_RADIUS < obs.x + obs.w
            && simY + BALL_RADIUS > obs.y && simY - BALL_RADIUS < obs.y + obs.h) break;
        if (simX + BALL_RADIUS > bb.x && simX - BALL_RADIUS < bb.x + bb.w
            && simY + BALL_RADIUS > bb.y && simY - BALL_RADIUS < bb.y + bb.h) break;

        if (i % 2 === 0) {
            const radius = Math.max(4 - i * 0.05, 1.5);
            ctx.beginPath();
            ctx.arc(simX, simY, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function getAutoAimVelocity() {
    // Aim at the current hoop with an upward arc instead of a blind fixed shot.
    const { hx, hy } = getHoopCenter();
    const dx = (hx - startX);
    const dy = (hy - startY) - 150;
    const dragDist = Math.min(Math.sqrt(dx * dx + dy * dy), MAX_DRAG);
    return getLaunchVelocity(dragDist, dx, dy);
}

function updateWindUI() {
    const wind = getLevel().wind;
    const arrow = document.getElementById('wind-arrow');
    const valueEl = document.getElementById('wind-value');
    arrow.style.transform = wind >= 0 ? 'rotate(0deg)' : 'rotate(180deg)';
    valueEl.textContent = Math.abs(wind);
}

function updateHUD() {
    document.getElementById('level-display').textContent = currentLevel + 1;
    document.getElementById('score-display').textContent = totalScore;
    updateWindUI();
}

function updateAimTimerUI(remaining) {
    document.getElementById('aim-timer-display').textContent = `Time: ${remaining.toFixed(1)}s`;
}

function autoFireIfExpired() {
    if (resultShowing || ball.flying || scoring) {
        if (!resultShowing) {
            document.getElementById('aim-timer-display').textContent = 'Time: —';
        }
        return;
    }

    const limit = getAimTimeLimit();
    const elapsed = (performance.now() - aimTimerStart) / 1000;
    const remaining = Math.max(limit - elapsed, 0);
    updateAimTimerUI(remaining);

    if (remaining <= 0) {
        let dx = mouseX - startX;
        let dy = mouseY - startY;
        let dragDist = Math.min(Math.sqrt(dx * dx + dy * dy), MAX_DRAG);

        if (dragDist < 3) {
            const auto = getAutoAimVelocity();
            launchBall(auto.vx, auto.vy);
            return;
        }

        const { vx, vy } = getLaunchVelocity(dragDist, dx, dy);
        launchBall(vx, vy);
    }
}

function stepPhysics(dt) {
    if (scoring) {
        ball.vy += GRAVITY * dt;
        ball.y += ball.vy * dt;

        const { hx } = getHoopCenter();
        ball.x += (hx - ball.x) * 0.15;

        if (ball.y > GROUND_Y) ball.y = GROUND_Y;

        if (performance.now() - scoringStart > SCORE_FALL_MS) {
            finalizeMadeShot();
        }
        return;
    }

    const wind = getLevel().wind * WIND_SCALE;
    const prevY = ball.y;

    ball.vy += GRAVITY * dt;
    ball.vx += wind * dt;

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (checkObstacleHit()) return;
    if (checkHoopScore(prevY)) return;
    handleRimBounce();
    handleBackboardCollision();
    handleGroundCollision(dt);
    checkOffscreenMiss();

    if (ball.y > GROUND_Y) ball.y = GROUND_Y;
}

function checkObstacleHit() {
    const level = getLevel();
    if (!level.obstacle) return false;
    const obs = level.obstacle;

    if (
        ball.x + BALL_RADIUS > obs.x &&
        ball.x - BALL_RADIUS < obs.x + obs.w &&
        ball.y + BALL_RADIUS > obs.y &&
        ball.y - BALL_RADIUS < obs.y + obs.h
    ) {
        // Push out along the smallest penetration axis so the ball
        // doesn't freeze visibly inside the block after the miss.
        const penLeft = (ball.x + BALL_RADIUS) - obs.x;
        const penRight = (obs.x + obs.w) - (ball.x - BALL_RADIUS);
        const penTop = (ball.y + BALL_RADIUS) - obs.y;
        const penBottom = (obs.y + obs.h) - (ball.y - BALL_RADIUS);
        const pen = Math.min(penLeft, penRight, penTop, penBottom);

        if (pen === penLeft) ball.x = obs.x - BALL_RADIUS;
        else if (pen === penRight) ball.x = obs.x + obs.w + BALL_RADIUS;
        else if (pen === penTop) ball.y = obs.y - BALL_RADIUS;
        else ball.y = obs.y + obs.h + BALL_RADIUS;

        ball.vx = 0;
        ball.vy = 0;
        missShot();
        return true;
    }
    return false;
}

function handleRimBounce() {
    const minDist = BALL_RADIUS + 5;

    for (const post of getRimPosts()) {
        const dx = ball.x - post.x;
        const dy = ball.y - post.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < minDist && dist > 0.001) {
            const nx = dx / dist;
            const ny = dy / dist;

            ball.x = post.x + nx * minDist;
            ball.y = post.y + ny * minDist;

            const dot = ball.vx * nx + ball.vy * ny;
            ball.vx = (ball.vx - 2 * dot * nx) * 0.55;
            ball.vy = (ball.vy - 2 * dot * ny) * 0.55;
        }
    }
}

function handleBackboardCollision() {
    const bb = getBackboardRect();

    const overlapX = ball.x + BALL_RADIUS > bb.x && ball.x - BALL_RADIUS < bb.x + bb.w;
    const overlapY = ball.y + BALL_RADIUS > bb.y && ball.y - BALL_RADIUS < bb.y + bb.h;
    if (!overlapX || !overlapY) return;

    const penLeft = (ball.x + BALL_RADIUS) - bb.x;
    const penRight = (bb.x + bb.w) - (ball.x - BALL_RADIUS);
    const penTop = (ball.y + BALL_RADIUS) - bb.y;
    const penBottom = (bb.y + bb.h) - (ball.y - BALL_RADIUS);
    const pen = Math.min(penLeft, penRight, penTop, penBottom);

    if (pen === penLeft) {
        ball.x = bb.x - BALL_RADIUS;
        if (ball.vx > 0) {
            ball.vx = -ball.vx * 0.6;
            ball.vy *= 0.9;
        }
    } else if (pen === penRight) {
        ball.x = bb.x + bb.w + BALL_RADIUS;
        if (ball.vx < 0) {
            ball.vx = -ball.vx * 0.6;
            ball.vy *= 0.9;
        }
    } else if (pen === penTop) {
        ball.y = bb.y - BALL_RADIUS;
        if (ball.vy > 0) {
            ball.vy = -ball.vy * 0.5;
            ball.vx *= 0.9;
        }
    } else {
        ball.y = bb.y + bb.h + BALL_RADIUS;
        if (ball.vy < 0) {
            ball.vy = -ball.vy * 0.5;
            ball.vx *= 0.9;
        }
    }
}

function checkHoopScore(prevY) {
    const { hx, hy } = getHoopCenter();
    const dx = ball.x - hx;

    if (Math.abs(dx) >= RIM_RADIUS - 12) return false;
    if (ball.vy <= 0) return false;

    // Require a real downward crossing of the rim plane — no proximity-only makes.
    if (prevY <= hy && ball.y >= hy) {
        scoring = true;
        scoringStart = performance.now();
        return true;
    }
    return false;
}

function handleGroundCollision(dt) {
    if (ball.y < GROUND_Y) {
        restTimer = 0;
        return;
    }

    ball.y = GROUND_Y;

    if (Math.abs(ball.vy) > 50) {
        ball.vy = -ball.vy * 0.45;
        ball.vx *= 0.7;
        restTimer = 0;
        return;
    }

    ball.vy = 0;
    ball.vx *= 0.85;

    // Settle using physics time: slow AND settled, not slow OR briefly touched.
    if (Math.abs(ball.vx) < 15) {
        restTimer += dt;
    } else {
        restTimer = 0;
    }

    if (restTimer > 0.35) {
        ball.vx = 0;
        restTimer = 0;
        missShot();
    }
}

function checkOffscreenMiss() {
    if (ball.x > canvas.width || ball.x < 0) {
        missShot();
    }
}

function finalizeMadeShot() {
    scoring = false;
    ball.flying = false;

    // No replay farming: an already-completed level awards no extra points.
    const alreadyCounted = isCompleted(currentLevel);
    const points = alreadyCounted ? 0 : Math.max(100 - missStreak * 20, 20);
    if (!alreadyCounted) {
        totalScore += points;
        levelScores[currentLevel] = points;
    }
    missStreak = 0;

    netSwingActive = true;
    netSwingStart = performance.now();
    playSwishSound();

    markCompleted(currentLevel);
    unlockLevel(currentLevel + 1);
    saveProgress();

    showResult(true);
}

function missShot() {
    if (!ball.flying) return;
    ball.flying = false;
    missStreak++;
    playMissSound();
    showResult(false);
}

function updateNetSwing(now) {
    if (!netSwingActive) {
        netSwing = 0;
        return;
    }
    const elapsed = now - netSwingStart;
    if (elapsed > 400) {
        netSwingActive = false;
        netSwing = 0;
        return;
    }
    netSwing = Math.sin(elapsed * 0.03) * 8 * (1 - elapsed / 400);
}

function showResult(made) {
    const overlay = document.getElementById('result-overlay');
    const title = document.getElementById('result-title');
    const primaryBtn = document.getElementById('result-primary-btn');
    const secondaryBtn = document.getElementById('result-secondary-btn');

    resultShowing = true;
    document.getElementById('aim-timer-display').textContent = 'Time: —';
    updateHUD();

    if (made) {
        const isLastLevel = currentLevel === levels.length - 1;
        title.textContent = 'Nice Shot!';

        if (isLastLevel) {
            primaryBtn.textContent = 'Finish';
            primaryBtn.onclick = () => {
                hideOverlay();
                resetBall();
                showScreen('nameEntry');
            };
        } else {
            primaryBtn.textContent = 'Next Level';
            primaryBtn.onclick = () => {
                hideOverlay();
                enterLevel(currentLevel + 1);
            };
        }

        secondaryBtn.textContent = 'Reset';
        secondaryBtn.onclick = () => {
            hideOverlay();
            resetBall();
        };
    } else {
        title.textContent = 'Missed';

        primaryBtn.textContent = 'Restart';
        primaryBtn.onclick = () => {
            hideOverlay();
            resetBall();
        };

        secondaryBtn.textContent = 'Back to Levels';
        secondaryBtn.onclick = () => {
            hideOverlay();
            resetBall();
            renderLevelGrid();
            showScreen('levelSelect');
        };
    }

    overlay.classList.add('show');
}

function hideOverlay() {
    resultShowing = false;
    document.getElementById('result-overlay').classList.remove('show');
}

function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
    };
}

function getTouchCoords(touch) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
    };
}

function updateAimFromPoint(x, y) {
    mouseX = x;
    mouseY = y;
    hovering = true;

    if (!ball.flying) {
        const dx = mouseX - startX;
        const dy = mouseY - startY;
        const power = Math.min(Math.sqrt(dx * dx + dy * dy), MAX_DRAG);
        document.getElementById('power-bar-fill').style.width = `${(power / MAX_DRAG) * 100}%`;
    }
}

function shootFromPoint(x, y) {
    if (ball.flying || resultShowing) return;

    const dx = x - startX;
    const dy = y - startY;
    const dragDist = Math.min(Math.sqrt(dx * dx + dy * dy), MAX_DRAG);

    if (dragDist < 3) return;

    const { vx, vy } = getLaunchVelocity(dragDist, dx, dy);
    launchBall(vx, vy);
}

canvas.addEventListener('mousemove', (e) => {
    const coords = getCanvasCoords(e);
    updateAimFromPoint(coords.x, coords.y);
});

canvas.addEventListener('mouseleave', () => {
    hovering = false;
});

canvas.addEventListener('click', (e) => {
    const coords = getCanvasCoords(e);
    mouseX = coords.x;
    mouseY = coords.y;
    hovering = true;
    shootFromPoint(coords.x, coords.y);
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const coords = getTouchCoords(e.touches[0]);
    updateAimFromPoint(coords.x, coords.y);
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const coords = getTouchCoords(e.touches[0]);
    updateAimFromPoint(coords.x, coords.y);
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (ball.flying || resultShowing) {
        hovering = false;
        return;
    }
    shootFromPoint(mouseX, mouseY);
    hovering = false;
}, { passive: false });

let lastTime = performance.now();

function loop(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.033);
    lastTime = now;

    if (screens.game.classList.contains('active-screen')) {
        updateHoopMovement(now);
        autoFireIfExpired();

        if (ball.flying) {
            stepPhysics(dt);
        }

        updateNetSwing(now);

        drawBackground();
        drawObstacle();
        drawHoop();
        drawTrajectoryPreview();
        drawBall();
    }

    requestAnimationFrame(loop);
}

resetBall();
updateHUD();
requestAnimationFrame(loop);