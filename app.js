/* ═══════════════════════════════════════════════════════════════
   SMART DIGITAL KITCHEN & DESK TIMER — APPLICATION LOGIC
   Pure Vanilla JavaScript — Zero Dependencies
   ═══════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    /* ── CONSTANTS ── */
    const RING_CIRCUMFERENCE = 2 * Math.PI * 42;
    const POMO_PHASES = [
        { name: 'Work',        duration: 25 * 60, color: 'accent' },
        { name: 'Short Break', duration: 5 * 60,  color: 'success' },
        { name: 'Work',        duration: 25 * 60, color: 'accent' },
        { name: 'Long Break',  duration: 15 * 60, color: 'accent2' }
    ];
    const WEATHER_CODES = {
        0:{icon:'☀️',desc:'Clear'},1:{icon:'🌤️',desc:'Mostly Clear'},2:{icon:'⛅',desc:'Partly Cloudy'},
        3:{icon:'☁️',desc:'Overcast'},45:{icon:'🌫️',desc:'Fog'},48:{icon:'🌫️',desc:'Rime Fog'},
        51:{icon:'🌦️',desc:'Light Drizzle'},53:{icon:'🌦️',desc:'Drizzle'},55:{icon:'🌧️',desc:'Dense Drizzle'},
        61:{icon:'🌧️',desc:'Slight Rain'},63:{icon:'🌧️',desc:'Moderate Rain'},65:{icon:'🌧️',desc:'Heavy Rain'},
        71:{icon:'🌨️',desc:'Light Snow'},73:{icon:'🌨️',desc:'Snow'},75:{icon:'❄️',desc:'Heavy Snow'},
        77:{icon:'❄️',desc:'Snow Grains'},80:{icon:'🌦️',desc:'Showers'},81:{icon:'🌧️',desc:'Heavy Showers'},
        82:{icon:'🌧️',desc:'Violent Showers'},85:{icon:'🌨️',desc:'Snow Showers'},86:{icon:'🌨️',desc:'Heavy Snow Showers'},
        95:{icon:'⛈️',desc:'Thunderstorm'},96:{icon:'⛈️',desc:'T-storm + Hail'},99:{icon:'⛈️',desc:'T-storm + Heavy Hail'}
    };
    const WORLD_TIMEZONES = [
        { label: 'NYC', tz: 'America/New_York' },
        { label: 'LDN', tz: 'Europe/London' },
        { label: 'TKY', tz: 'Asia/Tokyo' },
        { label: 'DXB', tz: 'Asia/Dubai' },
        { label: 'SYD', tz: 'Australia/Sydney' }
    ];

    /* ── APPLICATION STATE ── */
    const state = {
        settings: {
            darkMode: true, autoTheme: false, use24h: false, useCelsius: true,
            tickTock: false, alarmSound: true, alarmTone: 0, volume: 70,
            voice: true, haptic: true, notifications: false, wakeLock: false,
            particles: true, miniTimer: true
        },
        timers: [
            { label: 'Oven',    initialDuration: 0, remaining: 0, running: false, startTime: null, endTime: null },
            { label: 'Laundry', initialDuration: 0, remaining: 0, running: false, startTime: null, endTime: null },
            { label: 'Study',   initialDuration: 0, remaining: 0, running: false, startTime: null, endTime: null }
        ],
        activeTimerIndex: 0,
        stopwatch: { elapsed: 0, running: false, startTime: null, laps: [] },
        pomodoro: {
            phaseIndex: 0, remaining: POMO_PHASES[0].duration,
            running: false, startTime: null, endTime: null,
            autoStart: false, cycle: 0,
            stats: { pomodorosDone: 0, focusMinutes: 0, breakMinutes: 0 }
        },
        weather: { tempC: null, code: null, loaded: false },
        alarm: { active: false, timerIndex: -1 },
        history: [],
        customPresets: [],
        miniTimerDismissed: false
    };

    let animationFrameId = null;
    let audioCtx = null;
    let alarmInterval = null;
    let wakeLockSentinel = null;
    let particleAnimId = null;

    /* ── DOM HELPERS ── */
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const dom = {
        clockDisplay: $('#clockDisplay'), dateDisplay: $('#dateDisplay'),
        weatherDisplay: $('#weatherDisplay'), weatherIcon: $('#weatherIcon'),
        weatherTemp: $('#weatherTemp'), tempToggle: $('#tempToggle'),
        settingsBtn: $('#settingsBtn'), settingsModal: $('#settingsModal'),
        settingsCloseBtn: $('#settingsCloseBtn'),
        shortcutsBtn: $('#shortcutsBtn'), shortcutsModal: $('#shortcutsModal'),
        shortcutsCloseBtn: $('#shortcutsCloseBtn'),
        aboutCloseBtn: $('#aboutCloseBtn'), aboutModal: $('#aboutModal'),
        batteryChip: $('#batteryChip'), batteryIcon: $('#batteryIcon'),
        batteryPct: $('#batteryPct'), connectionDot: $('#connectionDot'),
        connectionText: $('#connectionText'), connectionChip: $('#connectionChip'),
        wakeLockChip: $('#wakeLockChip'),
        timerSubtabBtns: $$('.timer-subtab-btn'),
        timerLabelInput: $('#timerLabelInput'),
        timerSubtabLabel0: $('#timerSubtabLabel0'), timerSubtabLabel1: $('#timerSubtabLabel1'), timerSubtabLabel2: $('#timerSubtabLabel2'),
        timerSubtabStatus0: $('#timerSubtabStatus0'), timerSubtabStatus1: $('#timerSubtabStatus1'), timerSubtabStatus2: $('#timerSubtabStatus2'),
        timerRingFill: $('#timerRingFill'), timerDisplay: $('#timerDisplay'),
        timerElapsed: $('#timerElapsed'),
        timerMinDisplay: $('#timerMinDisplay'), timerSecDisplay: $('#timerSecDisplay'),
        timerStartBtn: $('#timerStartBtn'), timerPauseBtn: $('#timerPauseBtn'),
        timerResetBtn: $('#timerResetBtn'), timerClearBtn: $('#timerClearBtn'),
        savePresetBtn: $('#savePresetBtn'), customPresetsArea: $('#customPresetsArea'),
        stopwatchDisplay: $('#stopwatchDisplay'), stopwatchTotalDisplay: $('#stopwatchTotalDisplay'),
        swStartBtn: $('#swStartBtn'), swPauseBtn: $('#swPauseBtn'),
        swLapBtn: $('#swLapBtn'), swResetBtn: $('#swResetBtn'),
        lapList: $('#lapList'), lapStats: $('#lapStats'),
        lapBest: $('#lapBest'), lapWorst: $('#lapWorst'), lapAvg: $('#lapAvg'),
        pomoDisplay: $('#pomoDisplay'), pomoRingFill: $('#pomoRingFill'),
        pomoPhaseLabel: $('#pomoPhaseLabel'), pomoStartBtn: $('#pomoStartBtn'),
        pomoPauseBtn: $('#pomoPauseBtn'), pomoResetBtn: $('#pomoResetBtn'),
        pomoSkipBtn: $('#pomoSkipBtn'), pomoAutoStart: $('#pomoAutoStart'),
        pomoCycleCount: $('#pomoCycleCount'), pomoPhaseIndicator: $('#pomoPhaseIndicator'),
        statPomosDone: $('#statPomosDone'), statFocusTime: $('#statFocusTime'), statBreakTime: $('#statBreakTime'),
        historyContent: $('#historyContent'), clearHistoryBtn: $('#clearHistoryBtn'),
        miniTimer: $('#miniTimer'), miniTimerLabel: $('#miniTimerLabel'),
        miniTimerDisplay: $('#miniTimerDisplay'), miniTimerClose: $('#miniTimerClose'),
        alarmOverlay: $('#alarmOverlay'), alarmLabel: $('#alarmLabel'),
        alarmSubLabel: $('#alarmSubLabel'), stopAlarmBtn: $('#stopAlarmBtn'),
        settingDarkMode: $('#settingDarkMode'), settingAutoTheme: $('#settingAutoTheme'),
        setting24h: $('#setting24h'), settingCelsius: $('#settingCelsius'),
        settingTickTock: $('#settingTickTock'), settingAlarmSound: $('#settingAlarmSound'),
        settingVoice: $('#settingVoice'), settingHaptic: $('#settingHaptic'),
        settingNotifications: $('#settingNotifications'),
        settingWakeLock: $('#settingWakeLock'), settingParticles: $('#settingParticles'),
        settingMiniTimer: $('#settingMiniTimer'),
        settingVolume: $('#settingVolume'), volumeValue: $('#volumeValue'),
        fullscreenBtn: $('#fullscreenBtn'), resetAllBtn: $('#resetAllBtn'),
        exportBtn: $('#exportBtn'), importBtn: $('#importBtn'),
        importFileInput: $('#importFileInput'),
        worldClocks: $('#worldClocks'), toastContainer: $('#toastContainer'),
        particleCanvas: $('#particleCanvas')
    };

    /* ═══════════════════════════════════════════════
       LOCAL STORAGE
       ═══════════════════════════════════════════════ */
    function saveState() {
        try {
            localStorage.setItem('smartTimerState', JSON.stringify({
                settings: state.settings,
                timers: state.timers.map(t => ({ label: t.label, initialDuration: t.initialDuration, remaining: t.remaining })),
                pomodoro: { autoStart: state.pomodoro.autoStart, cycle: state.pomodoro.cycle, stats: state.pomodoro.stats },
                history: state.history.slice(-50),
                customPresets: state.customPresets
            }));
        } catch (e) {}
    }

    function loadState() {
        try {
            const saved = JSON.parse(localStorage.getItem('smartTimerState'));
            if (!saved) return;
            if (saved.settings) Object.assign(state.settings, saved.settings);
            if (saved.timers) saved.timers.forEach((t, i) => {
                if (state.timers[i]) {
                    state.timers[i].label = t.label || state.timers[i].label;
                    state.timers[i].initialDuration = t.initialDuration || 0;
                    state.timers[i].remaining = t.remaining || 0;
                }
            });
            if (saved.pomodoro) {
                state.pomodoro.autoStart = saved.pomodoro.autoStart || false;
                state.pomodoro.cycle = saved.pomodoro.cycle || 0;
                if (saved.pomodoro.stats) Object.assign(state.pomodoro.stats, saved.pomodoro.stats);
            }
            if (saved.history) state.history = saved.history;
            if (saved.customPresets) state.customPresets = saved.customPresets;
        } catch (e) {}
    }

    /* ═══════════════════════════════════════════════
       AUDIO (Web Audio API)
       ═══════════════════════════════════════════════ */
    function getAudioCtx() {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        return audioCtx;
    }

    function playTone(freq, duration, type, volume) {
        if (!state.settings.alarmSound) return;
        const vol = (state.settings.volume / 100) * volume;
        try {
            const ctx = getAudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = type;
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            gain.gain.setValueAtTime(vol, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
            osc.start(ctx.currentTime); osc.stop(ctx.currentTime + duration);
        } catch (e) {}
    }

    function playBeep(f = 800, d = 0.15, t = 'square', v = 0.25) { playTone(f, d, t, v); }

    const ALARM_TONES = [
        () => { playBeep(880,0.2,'square',0.35); setTimeout(()=>playBeep(660,0.2,'square',0.35),250); setTimeout(()=>playBeep(880,0.2,'square',0.35),500); },
        () => { playBeep(523,0.15,'sine',0.4); setTimeout(()=>playBeep(659,0.15,'sine',0.4),150); setTimeout(()=>playBeep(784,0.15,'sine',0.4),300); setTimeout(()=>playBeep(1047,0.3,'sine',0.4),450); },
        () => { playBeep(1000,0.1,'square',0.3); setTimeout(()=>playBeep(1000,0.1,'square',0.3),130); setTimeout(()=>playBeep(800,0.1,'square',0.3),350); setTimeout(()=>playBeep(800,0.1,'square',0.3),480); },
        () => { playBeep(784,0.15,'triangle',0.35); setTimeout(()=>playBeep(988,0.15,'triangle',0.35),200); setTimeout(()=>playBeep(1175,0.15,'triangle',0.35),400); setTimeout(()=>playBeep(1568,0.3,'triangle',0.35),600); }
    ];

    function playAlarmSound() { ALARM_TONES[state.settings.alarmTone](); }
    function startAlarmLoop() { if (alarmInterval) return; playAlarmSound(); alarmInterval = setInterval(playAlarmSound, 1000); }
    function stopAlarmLoop() { if (alarmInterval) { clearInterval(alarmInterval); alarmInterval = null; } }
    function playTickTock() { if (state.settings.tickTock) playTone(1200, 0.02, 'sine', 0.04); }
    function playSuccess() { playBeep(523,0.1,'sine',0.15); setTimeout(()=>playBeep(659,0.1,'sine',0.15),100); setTimeout(()=>playBeep(784,0.15,'sine',0.15),200); }

    /* ═══════════════════════════════════════════════
       SPEECH, HAPTIC, TOAST, NOTIFICATIONS
       ═══════════════════════════════════════════════ */
    function speak(text) {
        if (!state.settings.voice || !window.speechSynthesis) return;
        try {
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(text);
            u.rate = 0.9; u.pitch = 1; u.volume = state.settings.volume / 100;
            window.speechSynthesis.speak(u);
        } catch (e) {}
    }

    function haptic(pattern) { if (state.settings.haptic && navigator.vibrate) try { navigator.vibrate(pattern); } catch (e) {} }

    function showToast(msg, type = 'info') {
        const t = document.createElement('div');
        t.className = `toast toast-${type}`; t.textContent = msg;
        dom.toastContainer.appendChild(t);
        setTimeout(() => { if (t.parentNode) t.remove(); }, 3200);
    }

    async function requestNotificationPermission() {
        if (!('Notification' in window)) return false;
        if (Notification.permission === 'granted') return true;
        if (Notification.permission !== 'denied') return (await Notification.requestPermission()) === 'granted';
        return false;
    }

    function sendNotification(title, body) {
        if (state.settings.notifications && 'Notification' in window && Notification.permission === 'granted')
            try { new Notification(title, { body, icon: '🔔', tag: 'timer-alarm' }); } catch (e) {}
    }

    /* ═══════════════════════════════════════════════
       WAKE LOCK & BATTERY & CONNECTION
       ═══════════════════════════════════════════════ */
    async function requestWakeLock() {
        if (!state.settings.wakeLock || !('wakeLock' in navigator)) { dom.wakeLockChip.style.display = 'none'; return; }
        try {
            wakeLockSentinel = await navigator.wakeLock.request('screen');
            dom.wakeLockChip.style.display = '';
            wakeLockSentinel.addEventListener('release', () => { dom.wakeLockChip.style.display = 'none'; wakeLockSentinel = null; });
        } catch (e) { dom.wakeLockChip.style.display = 'none'; }
    }

    function releaseWakeLock() { if (wakeLockSentinel) { wakeLockSentinel.release(); wakeLockSentinel = null; } dom.wakeLockChip.style.display = 'none'; }

    function updateWakeLock() {
        const anyRunning = state.timers.some(t => t.running) || state.stopwatch.running || state.pomodoro.running;
        if (state.settings.wakeLock && anyRunning) { if (!wakeLockSentinel) requestWakeLock(); }
        else releaseWakeLock();
    }

    function initBattery() {
        if (!navigator.getBattery) return;
        navigator.getBattery().then(b => {
            const u = () => { const p = Math.round(b.level * 100); dom.batteryChip.style.display = ''; dom.batteryPct.textContent = p + '%'; dom.batteryIcon.textContent = b.charging ? '🔌' : (p <= 20 ? '🪫' : '🔋'); };
            u(); b.addEventListener('levelchange', u); b.addEventListener('chargingchange', u);
        }).catch(() => {});
    }

    function updateConnectionStatus() {
        dom.connectionDot.className = 'status-dot ' + (navigator.onLine ? 'online' : 'offline');
        dom.connectionText.textContent = navigator.onLine ? 'ONLINE' : 'OFFLINE';
    }

    /* ═══════════════════════════════════════════════
       PARTICLE BACKGROUND
       ═══════════════════════════════════════════════ */
    let particles = [];
    function initParticles() {
        if (!state.settings.particles) { dom.particleCanvas.style.display = 'none'; return; }
        dom.particleCanvas.style.display = '';
        const canvas = dom.particleCanvas, ctx = canvas.getContext('2d');
        let w, h;
        function resize() { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; }
        resize(); window.addEventListener('resize', resize);
        particles = [];
        const count = Math.min(Math.floor((w * h) / 25000), 50);
        for (let i = 0; i < count; i++) particles.push({ x: Math.random()*w, y: Math.random()*h, vx: (Math.random()-0.5)*0.3, vy: (Math.random()-0.5)*0.3, r: Math.random()*2+1, alpha: Math.random()*0.3+0.05 });
        const style = getComputedStyle(document.documentElement);
        function draw() {
            if (!state.settings.particles) { ctx.clearRect(0,0,w,h); return; }
            ctx.clearRect(0,0,w,h);
            const col = style.getPropertyValue('--accent').trim();
            particles.forEach(p => {
                p.x += p.vx; p.y += p.vy;
                if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
                if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
                ctx.fillStyle = col; ctx.globalAlpha = p.alpha; ctx.fill();
            });
            ctx.globalAlpha = 1;
            particleAnimId = requestAnimationFrame(draw);
        }
        if (particleAnimId) cancelAnimationFrame(particleAnimId);
        draw();
    }

    /* ═══════════════════════════════════════════════
       CLOCK, DATE, WORLD CLOCKS
       ═══════════════════════════════════════════════ */
    function updateClock() {
        const now = new Date();
        let h = now.getHours(); const m = now.getMinutes(), s = now.getSeconds();
        let ampm = '';
        if (!state.settings.use24h) { ampm = h >= 12 ? ' PM' : ' AM'; h = h % 12 || 12; }
        dom.clockDisplay.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}${ampm}`;
        const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
        const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        dom.dateDisplay.textContent = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
        if (state.settings.autoTheme) {
            const shouldBeDark = now.getHours() < 6 || now.getHours() >= 19;
            if (state.settings.darkMode !== shouldBeDark) { state.settings.darkMode = shouldBeDark; applySettings(); }
        }
    }

    function updateWorldClocks() {
        const use24 = state.settings.use24h;
        dom.worldClocks.innerHTML = WORLD_TIMEZONES.map(z => {
            try {
                const t = new Date().toLocaleTimeString('en-US', { timeZone: z.tz, hour: '2-digit', minute: '2-digit', hour12: !use24 });
                return `<span class="world-clock-chip"><span class="world-clock-label">${z.label}</span><span class="world-clock-time">${t}</span></span>`;
            } catch (e) { return ''; }
        }).join('');
    }

    /* ═══════════════════════════════════════════════
       WEATHER (Open-Meteo API)
       ═══════════════════════════════════════════════ */
    async function fetchWeather(lat, lon) {
        try {
            const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
            const d = await r.json();
            if (d.current_weather) { state.weather.tempC = d.current_weather.temperature; state.weather.code = d.current_weather.weathercode; state.weather.loaded = true; updateWeatherDisplay(); }
        } catch (e) {}
    }

    function getWeatherByLocation() {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            p => fetchWeather(p.coords.latitude, p.coords.longitude),
            async () => { try { const r = await fetch('https://ipapi.co/json/'); const d = await r.json(); if (d.latitude && d.longitude) fetchWeather(d.latitude, d.longitude); } catch (e) {} },
            { timeout: 10000 }
        );
    }

    function updateWeatherDisplay() {
        if (!state.weather.loaded) return;
        dom.weatherDisplay.style.display = 'flex';
        const wi = WEATHER_CODES[state.weather.code] || { icon: '🌡️', desc: 'Unknown' };
        dom.weatherIcon.textContent = wi.icon; dom.weatherIcon.title = wi.desc;
        const temp = state.settings.useCelsius ? state.weather.tempC : (state.weather.tempC * 9/5) + 32;
        dom.weatherTemp.textContent = `${Math.round(temp)}°`;
        dom.tempToggle.textContent = state.settings.useCelsius ? '°C' : '°F';
    }

    /* ═══════════════════════════════════════════════
       UTILITY
       ═══════════════════════════════════════════════ */
    function formatMMSS(sec) { return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(Math.floor(sec%60)).padStart(2,'0')}`; }
    function formatStopwatch(ms) { const ts=Math.floor(ms/1000),m=Math.floor(ts/60),s=ts%60,c=Math.floor((ms%1000)/10); return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(c).padStart(2,'0')}`; }
    function formatDuration(sec) { if(sec<60)return`${Math.round(sec)}s`; if(sec<3600)return`${Math.floor(sec/60)}m ${Math.round(sec%60)}s`; return`${Math.floor(sec/3600)}h ${Math.floor((sec%3600)/60)}m`; }
    function setRingProgress(el, frac) { el.setAttribute('stroke-dashoffset', RING_CIRCUMFERENCE * (1 - frac)); }

    function addToHistory(type, label, duration, icon) {
        state.history.unshift({ type, label, duration, icon: icon || (type==='timer'?'⏱️':type==='pomodoro'?'🍅':'🏃'), timestamp: Date.now() });
        if (state.history.length > 100) state.history = state.history.slice(0, 100);
        saveState(); renderHistory();
    }

    /* ═══════════════════════════════════════════════
       COUNTDOWN TIMERS
       ═══════════════════════════════════════════════ */
    function getActiveTimer() { return state.timers[state.activeTimerIndex]; }

    function updateTimerUI() {
        const timer = getActiveTimer(), rem = Math.max(0, Math.ceil(timer.remaining));
        const m = Math.floor(rem / 60), s = rem % 60;
        dom.timerDisplay.textContent = formatMMSS(rem);
        dom.timerMinDisplay.textContent = String(m).padStart(2, '0');
        dom.timerSecDisplay.textContent = String(s).padStart(2, '0');
        dom.timerElapsed.textContent = timer.running && timer.initialDuration > 0 ? `Elapsed: ${formatDuration(timer.initialDuration - rem)}` : '';
        setRingProgress(dom.timerRingFill, timer.initialDuration > 0 ? rem / timer.initialDuration : 0);
        if (timer.running) { dom.timerStartBtn.style.display = 'none'; dom.timerPauseBtn.style.display = ''; }
        else { dom.timerStartBtn.style.display = ''; dom.timerPauseBtn.style.display = 'none'; dom.timerStartBtn.textContent = rem > 0 ? '▶ RESUME' : '▶ START'; }
        state.timers.forEach((t, i) => {
            const l = dom[`timerSubtabLabel${i}`], st = dom[`timerSubtabStatus${i}`];
            if (l) l.textContent = t.label;
            if (st) st.innerHTML = t.running ? `<span class="timer-running-badge"></span>${formatMMSS(Math.ceil(t.remaining))}` : (t.remaining > 0 ? formatMMSS(Math.ceil(t.remaining)) : '');
        });
        dom.timerLabelInput.value = timer.label;
        if (rem <= 10 && rem > 0 && timer.running) { dom.timerRingFill.style.stroke = 'var(--danger)'; dom.timerRingFill.style.filter = 'drop-shadow(0 0 8px rgba(255,68,68,0.6))'; }
        else { dom.timerRingFill.style.stroke = ''; dom.timerRingFill.style.filter = ''; }
        updateMiniTimer();
    }

    function startTimer(i) { const t = state.timers[i]; if (t.running || t.remaining <= 0) return; t.running = true; t.startTime = Date.now(); t.endTime = t.startTime + t.remaining * 1000; if (i === state.activeTimerIndex) updateTimerUI(); updateWakeLock(); haptic(50); saveState(); }
    function pauseTimer(i) { const t = state.timers[i]; if (!t.running) return; t.running = false; t.remaining = Math.max(0, (t.endTime - Date.now()) / 1000); t.startTime = t.endTime = null; if (i === state.activeTimerIndex) updateTimerUI(); updateWakeLock(); haptic(30); saveState(); }
    function resetTimer(i) { const t = state.timers[i]; t.running = false; t.remaining = t.initialDuration; t.startTime = t.endTime = null; if (i === state.activeTimerIndex) updateTimerUI(); updateWakeLock(); saveState(); }
    function clearTimer(i) { const t = state.timers[i]; t.running = false; t.initialDuration = t.remaining = 0; t.startTime = t.endTime = null; if (i === state.activeTimerIndex) updateTimerUI(); updateWakeLock(); saveState(); }
    function setTimerDuration(sec) { const t = getActiveTimer(); if (t.running) return; t.initialDuration = t.remaining = sec; updateTimerUI(); saveState(); }

    function triggerTimerAlarm(index) {
        const t = state.timers[index], label = t.label, dur = t.initialDuration;
        t.running = false; t.remaining = 0; t.startTime = t.endTime = null;
        state.alarm.active = true; state.alarm.timerIndex = index;
        dom.alarmLabel.textContent = `${label} timer is finished!`;
        dom.alarmSubLabel.textContent = `Duration: ${formatDuration(dur)}`;
        dom.alarmOverlay.classList.add('active');
        startAlarmLoop(); speak(`${label} timer is finished`); haptic([200,100,200,100,200]);
        sendNotification('Timer Finished! 🔔', `${label} timer is done (${formatDuration(dur)})`);
        addToHistory('timer', label, dur, '⏱️');
        if (index === state.activeTimerIndex) updateTimerUI(); updateWakeLock(); saveState();
    }

    function dismissAlarm() {
        state.alarm.active = false; state.alarm.timerIndex = -1;
        dom.alarmOverlay.classList.remove('active');
        stopAlarmLoop(); if (window.speechSynthesis) window.speechSynthesis.cancel(); haptic(50);
    }

    /* ── CUSTOM PRESETS ── */
    function renderCustomPresets() {
        if (state.customPresets.length === 0) { dom.customPresetsArea.innerHTML = '<span style="font-size:0.65rem;color:var(--text-muted);">No custom presets</span>'; return; }
        dom.customPresetsArea.innerHTML = state.customPresets.map((p, i) => `<button class="custom-preset-btn" data-index="${i}">${formatDuration(p)}<span class="custom-preset-delete" data-del="${i}">✕</span></button>`).join('');
        dom.customPresetsArea.querySelectorAll('.custom-preset-btn').forEach(b => b.addEventListener('click', e => { if (e.target.classList.contains('custom-preset-delete')) return; setTimerDuration(state.customPresets[parseInt(b.dataset.index)]); }));
        dom.customPresetsArea.querySelectorAll('.custom-preset-delete').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); state.customPresets.splice(parseInt(b.dataset.del), 1); saveState(); renderCustomPresets(); showToast('Preset deleted', 'info'); }));
    }

    /* ═══════════════════════════════════════════════
       STOPWATCH
       ═══════════════════════════════════════════════ */
    function updateStopwatchUI() {
        dom.stopwatchDisplay.textContent = formatStopwatch(state.stopwatch.elapsed);
        if (state.stopwatch.laps.length > 0) {
            const best = Math.min(...state.stopwatch.laps.map(l => l.split));
            const worst = Math.max(...state.stopwatch.laps.map(l => l.split));
            const avg = state.stopwatch.laps.reduce((a, l) => a + l.split, 0) / state.stopwatch.laps.length;
            dom.stopwatchTotalDisplay.textContent = `${state.stopwatch.laps.length} laps`;
            dom.lapStats.style.display = '';
            dom.lapBest.textContent = formatStopwatch(best);
            dom.lapWorst.textContent = formatStopwatch(worst);
            dom.lapAvg.textContent = formatStopwatch(avg);
        } else { dom.stopwatchTotalDisplay.textContent = ''; dom.lapStats.style.display = 'none'; }
        if (state.stopwatch.running) { dom.swStartBtn.style.display = 'none'; dom.swPauseBtn.style.display = ''; dom.swLapBtn.style.display = ''; }
        else { dom.swStartBtn.style.display = ''; dom.swPauseBtn.style.display = 'none'; dom.swLapBtn.style.display = state.stopwatch.elapsed > 0 ? '' : 'none'; dom.swStartBtn.textContent = state.stopwatch.elapsed > 0 ? '▶ RESUME' : '▶ START'; }
        if (state.stopwatch.laps.length > 0) {
            dom.lapList.style.display = '';
            const bestI = state.stopwatch.laps.indexOf(state.stopwatch.laps.reduce((a, b) => a.split < b.split ? a : b));
            dom.lapList.innerHTML = state.stopwatch.laps.map((l, i) => `<div class="lap-item ${i === bestI ? 'lap-best' : ''}"><span class="lap-num">Lap ${i+1}</span><span class="lap-split">+${formatStopwatch(l.split)}</span><span class="lap-time">${formatStopwatch(l.total)}</span></div>`).reverse().join('');
        } else { dom.lapList.style.display = 'none'; dom.lapList.innerHTML = ''; }
    }

    function startStopwatch() { if (state.stopwatch.running) return; state.stopwatch.running = true; state.stopwatch.startTime = Date.now() - state.stopwatch.elapsed; updateStopwatchUI(); updateWakeLock(); haptic(50); }
    function pauseStopwatch() { if (!state.stopwatch.running) return; state.stopwatch.running = false; state.stopwatch.elapsed = Date.now() - state.stopwatch.startTime; state.stopwatch.startTime = null; updateStopwatchUI(); updateWakeLock(); haptic(30); }
    function resetStopwatch() { if (state.stopwatch.elapsed > 0 && state.stopwatch.laps.length > 0) addToHistory('stopwatch', `${state.stopwatch.laps.length} laps`, state.stopwatch.elapsed, '🏃'); state.stopwatch.running = false; state.stopwatch.elapsed = 0; state.stopwatch.startTime = null; state.stopwatch.laps = []; updateStopwatchUI(); updateWakeLock(); }
    function recordLap() { if (!state.stopwatch.running) return; const now = Date.now(), total = now - state.stopwatch.startTime, last = state.stopwatch.laps.length > 0 ? state.stopwatch.laps[state.stopwatch.laps.length-1].total : 0; state.stopwatch.laps.push({ total, split: total - last }); state.stopwatch.elapsed = total; updateStopwatchUI(); playBeep(1200,0.08,'sine',0.15); haptic(20); }

    /* ═══════════════════════════════════════════════
       POMODORO
       ═══════════════════════════════════════════════ */
    function updatePomodoroUI() {
        const p = state.pomodoro, ph = POMO_PHASES[p.phaseIndex], rem = Math.max(0, Math.ceil(p.remaining)), frac = ph.duration > 0 ? rem / ph.duration : 0;
        dom.pomoDisplay.textContent = formatMMSS(rem); setRingProgress(dom.pomoRingFill, frac);
        const names = ['Work Session','Short Break','Work Session','Long Break'];
        const colors = ['var(--accent)','var(--success)','var(--accent)','var(--accent2)'];
        dom.pomoPhaseLabel.textContent = names[p.phaseIndex]; dom.pomoPhaseLabel.style.color = colors[p.phaseIndex];
        dom.pomoRingFill.style.stroke = colors[p.phaseIndex]; dom.pomoRingFill.style.filter = '';
        const dots = dom.pomoPhaseIndicator.querySelectorAll('.pomo-phase-dot');
        dots.forEach((d, i) => { d.className = 'pomo-phase-dot'; if (i < p.phaseIndex) d.classList.add('completed'); else if (i === p.phaseIndex) d.classList.add(['active-work','active-short','active-work','active-long'][p.phaseIndex]); });
        dom.pomoCycleCount.textContent = p.cycle; dom.pomoAutoStart.checked = p.autoStart;
        dom.statPomosDone.textContent = p.stats.pomodorosDone;
        dom.statFocusTime.textContent = p.stats.focusMinutes >= 60 ? `${(p.stats.focusMinutes/60).toFixed(1)}h` : `${p.stats.focusMinutes}m`;
        dom.statBreakTime.textContent = p.stats.breakMinutes >= 60 ? `${(p.stats.breakMinutes/60).toFixed(1)}h` : `${p.stats.breakMinutes}m`;
        if (p.running) { dom.pomoStartBtn.style.display = 'none'; dom.pomoPauseBtn.style.display = ''; }
        else { dom.pomoStartBtn.style.display = ''; dom.pomoPauseBtn.style.display = 'none'; dom.pomoStartBtn.textContent = rem > 0 ? '▶ RESUME' : '▶ START'; }
        updateMiniTimer();
    }

    function startPomodoro() { const p = state.pomodoro; if (p.running || p.remaining <= 0) return; p.running = true; p.startTime = Date.now(); p.endTime = p.startTime + p.remaining * 1000; updatePomodoroUI(); updateWakeLock(); haptic(50); saveState(); }
    function pausePomodoro() { const p = state.pomodoro; if (!p.running) return; p.running = false; p.remaining = Math.max(0, (p.endTime - Date.now()) / 1000); p.startTime = p.endTime = null; updatePomodoroUI(); updateWakeLock(); haptic(30); saveState(); }
    function resetPomodoro() { const p = state.pomodoro; p.running = false; p.phaseIndex = 0; p.remaining = POMO_PHASES[0].duration; p.startTime = p.endTime = null; updatePomodoroUI(); updateWakeLock(); saveState(); }

    function skipPomodoroPhase() {
        const p = state.pomodoro;
        if (p.running && p.startTime) { const el = (Date.now() - p.startTime) / 60000; if (p.phaseIndex % 2 === 0) p.stats.focusMinutes += Math.round(el); else p.stats.breakMinutes += Math.round(el); }
        p.running = false; p.startTime = p.endTime = null; advancePomodoroPhase();
    }

    function advancePomodoroPhase() {
        const p = state.pomodoro;
        if (p.phaseIndex === 3) p.cycle = (p.cycle + 1) % 4;
        const next = (p.phaseIndex + 1) % 4;
        p.phaseIndex = next; p.remaining = POMO_PHASES[next].duration;
        if (p.autoStart) { p.running = true; p.startTime = Date.now(); p.endTime = p.startTime + p.remaining * 1000; }
        updatePomodoroUI(); updateWakeLock(); saveState();
    }

    function triggerPomodoroAlarm() {
        const p = state.pomodoro, name = POMO_PHASES[p.phaseIndex].name, dur = POMO_PHASES[p.phaseIndex].duration;
        if (p.phaseIndex % 2 === 0) { p.stats.pomodorosDone++; p.stats.focusMinutes += Math.round(dur / 60); addToHistory('pomodoro', `Work #${p.stats.pomodorosDone}`, dur, '🍅'); }
        else p.stats.breakMinutes += Math.round(dur / 60);
        state.alarm.active = true;
        dom.alarmLabel.textContent = `${name} is finished!`;
        dom.alarmSubLabel.textContent = p.phaseIndex % 2 === 0 ? 'Great work! Time for a break.' : 'Break over. Ready to focus?';
        dom.alarmOverlay.classList.add('active');
        startAlarmLoop(); speak(`${name} is finished`); haptic([200,100,200,100,200]);
        sendNotification('Pomodoro 🍅', `${name} is finished!`);
        advancePomodoroPhase();
    }

    /* ═══════════════════════════════════════════════
       MINI FLOATING TIMER
       ═══════════════════════════════════════════════ */
    function updateMiniTimer() {
        if (!state.settings.miniTimer || state.miniTimerDismissed) { dom.miniTimer.classList.remove('visible'); return; }
        let label = '', display = '', visible = false;
        const rt = state.timers.filter(t => t.running);
        if (rt.length > 0) { label = rt[0].label; display = formatMMSS(Math.ceil(rt[0].remaining)); visible = true; }
        else if (state.pomodoro.running) { label = 'Pomodoro'; display = formatMMSS(Math.ceil(state.pomodoro.remaining)); visible = true; }
        if (visible) {
            dom.miniTimerLabel.textContent = label; dom.miniTimerDisplay.textContent = display;
            dom.miniTimer.classList.toggle('visible', (window.scrollY || window.pageYOffset) > 200);
        } else { dom.miniTimer.classList.remove('visible'); state.miniTimerDismissed = false; }
    }

    /* ═══════════════════════════════════════════════
       HISTORY
       ═══════════════════════════════════════════════ */
    function renderHistory() {
        if (state.history.length === 0) { dom.historyContent.innerHTML = '<div class="history-empty"><div class="history-empty-icon">📭</div><div style="font-size:0.85rem;margin-bottom:4px;">No completed timers yet</div><div style="font-size:0.7rem;">Finished timers will appear here</div></div>'; return; }
        dom.historyContent.innerHTML = '<div class="history-list">' + state.history.slice(0, 50).map(h => {
            const d = new Date(h.timestamp);
            return `<div class="history-item"><span class="history-icon">${h.icon}</span><div class="history-info"><div class="history-title">${h.label}</div><div class="history-detail">${formatDuration(h.duration)}</div></div><div class="history-time">${d.toLocaleDateString([],{month:'short',day:'numeric'})}<br>${d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div></div>`;
        }).join('') + '</div>';
    }

    /* ═══════════════════════════════════════════════
       MAIN LOOP (requestAnimationFrame + Date.now)
       ═══════════════════════════════════════════════ */
    let lastTickSecond = -1, lastWorldClockUpdate = 0;

    function mainLoop() {
        const now = Date.now();
        for (let i = 0; i < state.timers.length; i++) {
            const t = state.timers[i];
            if (t.running && t.endTime) { t.remaining = Math.max(0, (t.endTime - now) / 1000); if (t.remaining <= 0) triggerTimerAlarm(i); }
        }
        updateTimerUI();
        if (state.stopwatch.running && state.stopwatch.startTime) { state.stopwatch.elapsed = now - state.stopwatch.startTime; updateStopwatchUI(); }
        const p = state.pomodoro;
        if (p.running && p.endTime) { p.remaining = Math.max(0, (p.endTime - now) / 1000); if (p.remaining <= 0) triggerPomodoroAlarm(); updatePomodoroUI(); }
        const cs = Math.floor(now / 1000);
        if (cs !== lastTickSecond) { lastTickSecond = cs; updateClock(); playTickTock(); }
        if (now - lastWorldClockUpdate > 30000) { lastWorldClockUpdate = now; updateWorldClocks(); }
        animationFrameId = requestAnimationFrame(mainLoop);
    }

    /* ═══════════════════════════════════════════════
       TAB SWITCHING
       ═══════════════════════════════════════════════ */
    function switchTab(tab) {
        $$('.tab-btn').forEach(b => { const a = b.dataset.tab === tab; b.classList.toggle('active', a); b.setAttribute('aria-selected', a); });
        $$('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `panel-${tab}`));
        if (tab === 'history') renderHistory();
    }

    /* ═══════════════════════════════════════════════
       SETTINGS APPLY
       ═══════════════════════════════════════════════ */
    function applySettings() {
        document.documentElement.setAttribute('data-theme', state.settings.darkMode ? 'dark' : 'light');
        const mt = document.querySelector('meta[name="theme-color"]');
        if (mt) mt.setAttribute('content', state.settings.darkMode ? '#0a0a0f' : '#f5f0e8');
        dom.settingDarkMode.checked = state.settings.darkMode;
        dom.settingAutoTheme.checked = state.settings.autoTheme;
        dom.setting24h.checked = state.settings.use24h;
        dom.settingCelsius.checked = state.settings.useCelsius;
        dom.settingTickTock.checked = state.settings.tickTock;
        dom.settingAlarmSound.checked = state.settings.alarmSound;
        dom.settingVoice.checked = state.settings.voice;
        dom.settingHaptic.checked = state.settings.haptic;
        dom.settingNotifications.checked = state.settings.notifications;
        dom.settingWakeLock.checked = state.settings.wakeLock;
        dom.settingParticles.checked = state.settings.particles;
        dom.settingMiniTimer.checked = state.settings.miniTimer;
        dom.settingVolume.value = state.settings.volume;
        dom.volumeValue.textContent = state.settings.volume + '%';
        $$('.tone-btn[data-tone]').forEach(b => b.classList.toggle('active', b.dataset.tone >= 0 && parseInt(b.dataset.tone) === state.settings.alarmTone));
        updateWeatherDisplay(); updateClock();
    }

    function openSettings() { dom.settingsModal.classList.add('open'); dom.settingsCloseBtn.focus(); }
    function closeSettings() { dom.settingsModal.classList.remove('open'); dom.settingsBtn.focus(); }
    function openShortcuts() { dom.shortcutsModal.classList.add('open'); dom.shortcutsCloseBtn.focus(); }
    function closeShortcuts() { dom.shortcutsModal.classList.remove('open'); dom.shortcutsBtn.focus(); }
    function openAbout() { dom.aboutModal.classList.add('open'); dom.aboutCloseBtn.focus(); }
    function closeAbout() { dom.aboutModal.classList.remove('open'); }

    /* ═══════════════════════════════════════════════
       HOLD-TO-SCROLL
       ═══════════════════════════════════════════════ */
    function setupHoldButton(btn, cb) {
        let ht = null, hi = null;
        function start(e) { e.preventDefault(); cb(); ht = setTimeout(() => { hi = setInterval(cb, 80); }, 400); }
        function stop(e) { e.preventDefault(); clearTimeout(ht); clearInterval(hi); ht = hi = null; }
        btn.addEventListener('mousedown', start); btn.addEventListener('touchstart', start, { passive: false });
        btn.addEventListener('mouseup', stop); btn.addEventListener('mouseleave', stop);
        btn.addEventListener('touchend', stop); btn.addEventListener('touchcancel', stop);
    }

    /* ═══════════════════════════════════════════════
       FULLSCREEN & EXPORT/IMPORT
       ═══════════════════════════════════════════════ */
    function toggleFullscreen() {
        if (!document.fullscreenElement) { document.documentElement.requestFullscreen().catch(()=>{}); document.body.classList.add('fullscreen-mode'); }
        else { document.exitFullscreen().catch(()=>{}); document.body.classList.remove('fullscreen-mode'); }
    }

    function exportSettings() {
        const blob = new Blob([JSON.stringify({ settings: state.settings, customPresets: state.customPresets, pomodoroStats: state.pomodoro.stats }, null, 2)], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'smart-timer-settings.json'; a.click(); URL.revokeObjectURL(a.href);
        showToast('Settings exported!', 'success');
    }

    function importSettings(file) {
        const r = new FileReader();
        r.onload = e => { try { const d = JSON.parse(e.target.result); if (d.settings) Object.assign(state.settings, d.settings); if (d.customPresets) state.customPresets = d.customPresets; if (d.pomodoroStats) Object.assign(state.pomodoro.stats, d.pomodoroStats); applySettings(); saveState(); renderCustomPresets(); showToast('Settings imported!', 'success'); } catch (err) { showToast('Invalid file', 'warning'); } };
        r.readAsText(file);
    }

    /* ═══════════════════════════════════════════════
       SWIPE GESTURES
       ═══════════════════════════════════════════════ */
    function setupSwipeGestures() {
        let sx = 0, sy = 0, st = 0;
        const tabs = ['timers', 'stopwatch', 'pomodoro', 'history'];
        const main = document.getElementById('mainContent');
        main.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; st = Date.now(); }, { passive: true });
        main.addEventListener('touchend', e => {
            const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy, dt = Date.now() - st;
            if (Math.abs(dx) > 60 && Math.abs(dy) < 40 && dt < 400) {
                const ci = tabs.indexOf(document.querySelector('.tab-btn.active').dataset.tab);
                if (dx < 0 && ci < tabs.length - 1) switchTab(tabs[ci + 1]);
                else if (dx > 0 && ci > 0) switchTab(tabs[ci - 1]);
            }
        }, { passive: true });
    }

    /* ═══════════════════════════════════════════════
       EVENT LISTENERS
       ═══════════════════════════════════════════════ */
    function initEventListeners() {
        // Tabs
        $$('.tab-btn').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));

        // Timer sub-tabs
        dom.timerSubtabBtns.forEach(b => b.addEventListener('click', () => {
            state.activeTimerIndex = parseInt(b.dataset.timer);
            dom.timerSubtabBtns.forEach(x => { const a = x === b; x.classList.toggle('active', a); x.setAttribute('aria-selected', a); });
            updateTimerUI();
        }));

        // Timer label
        dom.timerLabelInput.addEventListener('input', () => {
            const t = getActiveTimer(); t.label = dom.timerLabelInput.value || `Timer ${state.activeTimerIndex + 1}`;
            saveState(); state.timers.forEach((x, i) => { const el = dom[`timerSubtabLabel${i}`]; if (el) el.textContent = x.label; });
        });

        // Presets
        $$('.preset-btn').forEach(b => b.addEventListener('click', () => setTimerDuration(parseInt(b.dataset.seconds))));

        // Save custom preset
        dom.savePresetBtn.addEventListener('click', () => {
            const t = getActiveTimer(), dur = t.running ? Math.ceil(t.remaining) : t.initialDuration;
            if (dur <= 0) { showToast('Set a time first', 'warning'); return; }
            if (state.customPresets.length >= 8) { showToast('Max 8 presets', 'warning'); return; }
            state.customPresets.push(dur); saveState(); renderCustomPresets(); showToast(`Preset ${formatDuration(dur)} saved!`, 'success');
        });

        // Adjust buttons
        $$('.adj-btn').forEach(b => {
            const unit = b.dataset.unit, dir = parseInt(b.dataset.dir);
            setupHoldButton(b, () => {
                const t = getActiveTimer(); if (t.running) return;
                let total = t.initialDuration + (unit === 'min' ? dir * 60 : dir);
                total = Math.max(0, Math.min(total, 12 * 3600));
                t.initialDuration = t.remaining = total; updateTimerUI(); saveState();
            });
        });

        // Timer controls
        dom.timerStartBtn.addEventListener('click', () => startTimer(state.activeTimerIndex));
        dom.timerPauseBtn.addEventListener('click', () => pauseTimer(state.activeTimerIndex));
        dom.timerResetBtn.addEventListener('click', () => resetTimer(state.activeTimerIndex));
        dom.timerClearBtn.addEventListener('click', () => clearTimer(state.activeTimerIndex));

        // Stopwatch
        dom.swStartBtn.addEventListener('click', startStopwatch);
        dom.swPauseBtn.addEventListener('click', pauseStopwatch);
        dom.swLapBtn.addEventListener('click', recordLap);
        dom.swResetBtn.addEventListener('click', resetStopwatch);

        // Pomodoro
        dom.pomoStartBtn.addEventListener('click', startPomodoro);
        dom.pomoPauseBtn.addEventListener('click', pausePomodoro);
        dom.pomoResetBtn.addEventListener('click', resetPomodoro);
        dom.pomoSkipBtn.addEventListener('click', skipPomodoroPhase);
        dom.pomoAutoStart.addEventListener('change', () => { state.pomodoro.autoStart = dom.pomoAutoStart.checked; saveState(); });

        // Alarm
        dom.stopAlarmBtn.addEventListener('click', dismissAlarm);

        // History
        dom.clearHistoryBtn.addEventListener('click', () => { state.history = []; saveState(); renderHistory(); showToast('History cleared', 'info'); });

        // Mini timer
        dom.miniTimerClose.addEventListener('click', () => { state.miniTimerDismissed = true; dom.miniTimer.classList.remove('visible'); });
        dom.miniTimer.addEventListener('click', e => { if (e.target !== dom.miniTimerClose) window.scrollTo({ top: 0, behavior: 'smooth' }); });

        // Settings open/close
        dom.settingsBtn.addEventListener('click', openSettings);
        dom.settingsCloseBtn.addEventListener('click', closeSettings);
        dom.settingsModal.addEventListener('click', e => { if (e.target === dom.settingsModal) closeSettings(); });
        dom.shortcutsBtn.addEventListener('click', openShortcuts);
        dom.shortcutsCloseBtn.addEventListener('click', closeShortcuts);
        dom.shortcutsModal.addEventListener('click', e => { if (e.target === dom.shortcutsModal) closeShortcuts(); });
        dom.aboutCloseBtn.addEventListener('click', closeAbout);
        dom.aboutModal.addEventListener('click', e => { if (e.target === dom.aboutModal) closeAbout(); });

        // ── SETTING TOGGLES (now using <label> wrapper — fully clickable!) ──
        dom.settingDarkMode.addEventListener('change', () => {
            state.settings.darkMode = dom.settingDarkMode.checked;
            state.settings.autoTheme = false; dom.settingAutoTheme.checked = false;
            applySettings(); saveState();
        });

        dom.settingAutoTheme.addEventListener('change', () => {
            state.settings.autoTheme = dom.settingAutoTheme.checked;
            if (state.settings.autoTheme) { const h = new Date().getHours(); state.settings.darkMode = h < 6 || h >= 19; }
            applySettings(); saveState();
        });

        dom.setting24h.addEventListener('change', () => { state.settings.use24h = dom.setting24h.checked; applySettings(); saveState(); updateWorldClocks(); });
        dom.settingCelsius.addEventListener('change', () => { state.settings.useCelsius = dom.settingCelsius.checked; applySettings(); saveState(); });
        dom.settingTickTock.addEventListener('change', () => { state.settings.tickTock = dom.settingTickTock.checked; saveState(); });
        dom.settingAlarmSound.addEventListener('change', () => { state.settings.alarmSound = dom.settingAlarmSound.checked; saveState(); });
        dom.settingVoice.addEventListener('change', () => { state.settings.voice = dom.settingVoice.checked; saveState(); });
        dom.settingHaptic.addEventListener('change', () => { state.settings.haptic = dom.settingHaptic.checked; saveState(); });

        dom.settingNotifications.addEventListener('change', async () => {
            if (dom.settingNotifications.checked) {
                const g = await requestNotificationPermission();
                state.settings.notifications = g; dom.settingNotifications.checked = g;
                if (!g) showToast('Notification permission denied', 'warning');
            } else state.settings.notifications = false;
            saveState();
        });

        dom.settingWakeLock.addEventListener('change', () => {
            state.settings.wakeLock = dom.settingWakeLock.checked;
            if (state.settings.wakeLock) updateWakeLock(); else releaseWakeLock();
            saveState();
        });

        dom.settingParticles.addEventListener('change', () => {
            state.settings.particles = dom.settingParticles.checked;
            if (state.settings.particles) initParticles();
            else { dom.particleCanvas.style.display = 'none'; if (particleAnimId) { cancelAnimationFrame(particleAnimId); particleAnimId = null; } }
            saveState();
        });

        dom.settingMiniTimer.addEventListener('change', () => { state.settings.miniTimer = dom.settingMiniTimer.checked; updateMiniTimer(); saveState(); });

        // Volume
        dom.settingVolume.addEventListener('input', () => { state.settings.volume = parseInt(dom.settingVolume.value); dom.volumeValue.textContent = state.settings.volume + '%'; });
        dom.settingVolume.addEventListener('change', () => saveState());

        // Alarm tone selector
        $$('.tone-btn[data-tone]').forEach(b => b.addEventListener('click', () => {
            if (b.dataset.tone === '-1') { playAlarmSound(); return; }
            state.settings.alarmTone = parseInt(b.dataset.tone);
            applySettings(); saveState(); playAlarmSound();
        }));

        // Export / Import
        dom.exportBtn.addEventListener('click', exportSettings);
        dom.importBtn.addEventListener('click', () => dom.importFileInput.click());
        dom.importFileInput.addEventListener('change', e => { if (e.target.files[0]) importSettings(e.target.files[0]); e.target.value = ''; });

        // Fullscreen & Reset
        dom.fullscreenBtn.addEventListener('click', toggleFullscreen);
        dom.resetAllBtn.addEventListener('click', () => { if (confirm('Reset ALL data? This cannot be undone.')) { localStorage.removeItem('smartTimerState'); location.reload(); } });

        // Weather toggle
        dom.tempToggle.addEventListener('click', () => { state.settings.useCelsius = !state.settings.useCelsius; applySettings(); saveState(); });

        // Scroll listener
        window.addEventListener('scroll', () => updateMiniTimer(), { passive: true });

        // Connection
        window.addEventListener('online', updateConnectionStatus);
        window.addEventListener('offline', updateConnectionStatus);

        // Visibility change for wake lock
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && state.settings.wakeLock) updateWakeLock(); });

        // Keyboard shortcuts
        document.addEventListener('keydown', e => {
            if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') { if (e.key === 'Escape') document.activeElement.blur(); return; }
            if (e.key === 'Escape') { if (state.alarm.active) { dismissAlarm(); return; } if (dom.settingsModal.classList.contains('open')) { closeSettings(); return; } if (dom.shortcutsModal.classList.contains('open')) { closeShortcuts(); return; } if (dom.aboutModal.classList.contains('open')) { closeAbout(); return; } return; }
            if (e.key >= '1' && e.key <= '4') { switchTab(['timers','stopwatch','pomodoro','history'][parseInt(e.key)-1]); return; }
            if (e.key === ' ') {
                e.preventDefault();
                const ap = document.querySelector('.tab-panel.active');
                if (ap.id === 'panel-timers') { const t = getActiveTimer(); t.running ? pauseTimer(state.activeTimerIndex) : startTimer(state.activeTimerIndex); }
                else if (ap.id === 'panel-stopwatch') { state.stopwatch.running ? pauseStopwatch() : startStopwatch(); }
                else if (ap.id === 'panel-pomodoro') { state.pomodoro.running ? pausePomodoro() : startPomodoro(); }
                return;
            }
            if ((e.key === 'l' || e.key === 'L') && document.querySelector('.tab-panel.active').id === 'panel-stopwatch' && state.stopwatch.running) { recordLap(); return; }
            if (e.key === 'r' || e.key === 'R') { const ap = document.querySelector('.tab-panel.active'); if (ap.id === 'panel-timers') resetTimer(state.activeTimerIndex); else if (ap.id === 'panel-stopwatch') resetStopwatch(); else if (ap.id === 'panel-pomodoro') resetPomodoro(); return; }
            if (e.key === 's' || e.key === 'S') { dom.settingsModal.classList.contains('open') ? closeSettings() : openSettings(); return; }
            if (e.key === 'f' || e.key === 'F') { toggleFullscreen(); return; }
            if (e.key === 'd' || e.key === 'D') { state.settings.darkMode = !state.settings.darkMode; state.settings.autoTheme = false; dom.settingAutoTheme.checked = false; applySettings(); saveState(); showToast(state.settings.darkMode ? '🌙 Dark mode' : '☀️ Light mode', 'info'); return; }
            if (e.key === '?') { openShortcuts(); return; }
            if (e.key === 'a' || e.key === 'A') { dom.aboutModal.classList.contains('open') ? closeAbout() : openAbout(); return; }
        });

        // Ripple effect
        document.addEventListener('click', e => {
            const btn = e.target.closest('.btn, .preset-btn, .adj-btn');
            if (!btn) return;
            const r = btn.getBoundingClientRect();
            btn.style.setProperty('--ripple-x', ((e.clientX - r.left) / r.width * 100) + '%');
            btn.style.setProperty('--ripple-y', ((e.clientY - r.top) / r.height * 100) + '%');
            btn.classList.add('ripple');
            setTimeout(() => btn.classList.remove('ripple'), 400);
        });

        // Audio init on first click
        document.addEventListener('click', function initAudio() { getAudioCtx(); document.removeEventListener('click', initAudio); }, { once: true });

        // Fullscreen change
        document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) document.body.classList.remove('fullscreen-mode'); });
    }

    /* ═══════════════════════════════════════════════
       INITIALIZATION
       ═══════════════════════════════════════════════ */
    function init() {
        loadState(); applySettings();
        initEventListeners(); setupSwipeGestures();
        updateClock(); updateTimerUI(); updateStopwatchUI(); updatePomodoroUI();
        renderCustomPresets(); renderHistory(); updateWorldClocks(); updateConnectionStatus();
        initBattery(); getWeatherByLocation(); initParticles();
        animationFrameId = requestAnimationFrame(mainLoop);
        if (state.settings.notifications) requestNotificationPermission();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
