

// ============================================================
// STORAGE, PLAYER, AUDIO E CONFIGURAÇÕES
// ============================================================

const StorageManager = {
    get(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    },
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            return false;
        }
    }
};

// ============================================================
// SISTEMA DE BLOQUEIO DE NÍVEIS
// ============================================================

const LEVEL_UNLOCK_COSTS = {
    6: 100000,
    7: 120998,
    8: 141996,
    9: 162994,
    10: 183992,
    11: 204990,
    12: 504990,
    13: 579990,
    14: 654990,
    15: 729990,
    16: 804990,
    17: 650990,
    18: 789990,
    19: 997490,
    20: 1204990
};

const BLOCKED_LEVELS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

const LevelUnlockManager = {
    getUnlockedLevels() {
        return StorageManager.get('unlockedLevels', [1, 2, 3, 4, 5]);
    },
    
    saveUnlockedLevels(levels) {
        return StorageManager.set('unlockedLevels', levels);
    },
    
    isLevelUnlocked(level) {
        const unlocked = this.getUnlockedLevels();
        return unlocked.includes(level);
    },
    
    unlockLevel(level) {
        const unlocked = this.getUnlockedLevels();
        if (!unlocked.includes(level)) {
            unlocked.push(level);
            unlocked.sort((a, b) => a - b);
            return this.saveUnlockedLevels(unlocked);
        }
        return true;
    },
    
    getUnlockCost(level) {
        return LEVEL_UNLOCK_COSTS[level] || Infinity;
    },
    
    canUnlock(level, coins) {
        const cost = this.getUnlockCost(level);
        return coins >= cost && !this.isLevelUnlocked(level);
    },
    
    getMaxUnlockedLevel() {
        const unlocked = this.getUnlockedLevels();
        if (unlocked.length === 0) return 0;
        return Math.max(...unlocked);
    },
    
    getNextBlockedLevel() {
        const unlocked = this.getUnlockedLevels();
        const maxUnlocked = Math.max(...unlocked);
        for (let i = maxUnlocked + 1; i <= 20; i++) {
            if (BLOCKED_LEVELS.includes(i)) {
                return i;
            }
        }
        return null;
    },
    
    getLevelStatus(level) {
        if (this.isLevelUnlocked(level)) {
            return 'unlocked';
        }
        if (BLOCKED_LEVELS.includes(level)) {
            return 'blocked';
        }
        return 'free';
    },
    
    getProgressToUnlock(level, coins) {
        const cost = this.getUnlockCost(level);
        if (!cost || cost === Infinity) return 100;
        const progress = Math.min(100, (coins / cost) * 100);
        return Math.round(progress);
    }
};

// ============================================================
// PLAYER MANAGER
// ============================================================

const PlayerManager = {
    getPlayer() {
        return StorageManager.get('playerData', null);
    },
    getPlayerName() {
        const player = this.getPlayer();
        return player ? player.name : null;
    },
    getPlayerCoins() {
        const player = this.getPlayer();
        return player ? player.totalCoins || 0 : 0;
    },
    getPlayerLevel() {
        const player = this.getPlayer();
        return player ? player.level || 1 : 1;
    },
    createPlayer(name) {
        const playerData = {
            name: name,
            totalCoins: 0,
            level: 1,
            levelCoins: {},
            created: new Date().toISOString(),
            lastUpdate: new Date().toISOString()
        };
        const saved = StorageManager.set('playerData', playerData);
        LevelUnlockManager.saveUnlockedLevels([1, 2, 3, 4, 5]);
        return saved;
    },
    updatePlayerCoins(coins, level = null) {
        const player = this.getPlayer();
        if (!player) return false;
        player.totalCoins = coins;
        if (level !== null) player.level = level;
        player.lastUpdate = new Date().toISOString();
        return StorageManager.set('playerData', player);
    },
    updateLevelCoins(level, coins) {
        const player = this.getPlayer();
        if (!player) return false;
        if (!player.levelCoins) player.levelCoins = {};
        player.levelCoins[level] = (player.levelCoins[level] || 0) + coins;
        player.lastUpdate = new Date().toISOString();
        return StorageManager.set('playerData', player);
    },
    saveProgress(coins, level, levelCoinsEarned) {
        const player = this.getPlayer();
        if (!player) return false;
        player.totalCoins = coins;
        player.level = level;
        if (!player.levelCoins) player.levelCoins = {};
        player.levelCoins[level] = (player.levelCoins[level] || 0) + levelCoinsEarned;
        player.lastUpdate = new Date().toISOString();
        return StorageManager.set('playerData', player);
    }
};

function checkPlayerAndStart() {
    const player = PlayerManager.getPlayer();
    const overlay = document.getElementById('playerCheckOverlay');

    if (player) {
        overlay.classList.remove('active');
        startGame();
        return;
    }

    overlay.classList.add('active');
    document.getElementById('playerNameInput').focus();

    document.getElementById('confirmPlayerBtn').addEventListener('click', function() {
        const nameInput = document.getElementById('playerNameInput');
        const name = nameInput.value.trim();
        const errorMsg = document.getElementById('errorMsg');

        if (!name || name.length < 2) {
            errorMsg.textContent = '⚠️ Enter a valid name (minimum 2 characters)';
            errorMsg.classList.add('show');
            nameInput.style.borderColor = '#ff4444';
            return;
        }

        errorMsg.classList.remove('show');
        nameInput.style.borderColor = '';

        PlayerManager.createPlayer(name);
        overlay.classList.remove('active');
        startGame();

        console.log(`👋 Bem-vindo(a), ${name}!`);
    });

    document.getElementById('playerNameInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('confirmPlayerBtn').click();
        }
    });

    document.getElementById('playerNameInput').addEventListener('focus', function() {
        this.style.borderColor = '#FFD700';
        document.getElementById('errorMsg').classList.remove('show');
    });

    document.getElementById('playerNameInput').addEventListener('blur', function() {
        if (!this.value.trim()) {
            this.style.borderColor = 'rgba(255,215,0,0.3)';
        }
    });
}

function savePlayerProgress() {
    const player = PlayerManager.getPlayer();
    if (!player) return;
    PlayerManager.saveProgress(coins, currentLevel, levelCoinsEarned);
    console.log('✅ Progress saved automatically!');
}

// ============================================================
// FUNÇÕES DA TELA DE BLOQUEIO
// ============================================================

let blockOverlayActive = false;
let pendingUnlockLevel = null;

function showLevelBlockScreen(level) {
    const overlay = document.getElementById('levelBlockOverlay');
    
    if (LevelUnlockManager.isLevelUnlocked(level)) {
        hideLevelBlockScreen();
        startLevel(level);
        return;
    }
    
    pendingUnlockLevel = level;
    blockOverlayActive = true;
    
    const cost = LevelUnlockManager.getUnlockCost(level);
    const playerCoins = coins || PlayerManager.getPlayerCoins();
    const canUnlock = LevelUnlockManager.canUnlock(level, playerCoins);
    const progress = LevelUnlockManager.getProgressToUnlock(level, playerCoins);
    const status = LevelUnlockManager.getLevelStatus(level);
    
    document.getElementById('blockLevelTitle').textContent = `Nível ${level} Bloqueado`;
    document.getElementById('blockSubtitle').textContent = `Desbloqueie o Nível ${level} para continuar sua jornada!`;
    document.getElementById('blockLevelNumber').textContent = level;
    document.getElementById('blockUnlockCost').textContent = cost.toLocaleString('pt-BR');
    document.getElementById('blockPlayerCoins').textContent = playerCoins.toLocaleString('pt-BR');
    document.getElementById('blockPlayerCoins').className = 'stat-value ' + (canUnlock ? 'sufficient' : 'insufficient');
    
    const statusEl = document.getElementById('blockStatus');
    const statusLabel = document.getElementById('blockStatusLabel');
    if (status === 'unlocked') {
        statusEl.textContent = '✅ Unlocked';
        statusEl.className = 'stat-value unlock-status unlocked';
        statusLabel.textContent = '✅ Status';
    } else {
        statusEl.textContent = '🔒 Blocked';
        statusEl.className = 'stat-value unlock-status locked';
        statusLabel.textContent = '🔐 Status';
    }
    
    document.getElementById('blockProgressFill').style.width = progress + '%';
    document.getElementById('blockProgressText').textContent = progress + '%';
    
    const btnUnlock = document.getElementById('btnUnlockLevel');
    if (canUnlock) {
        btnUnlock.disabled = false;
        btnUnlock.textContent = `🔓 DESBLOQUEAR (${cost.toLocaleString('pt-BR')})`;
        btnUnlock.className = 'game-button orange large btn-unlock';
    } else {
        btnUnlock.disabled = true;
        btnUnlock.textContent = `❌ INSUFFICIENT COINS (${cost.toLocaleString('pt-BR')})`;
        btnUnlock.className = 'game-button red large btn-unlock';
    }
    
    const btnBack = document.getElementById('btnBackLevel');
    if (level > 1 && !canUnlock) {
        btnBack.classList.remove('hidden');
        btnBack.textContent = `⬅ VOLTAR AO NÍVEL ${level - 1}`;
    } else {
        btnBack.classList.add('hidden');
    }
    
    overlay.classList.add('active');
    
    if (gameActive) {
        gameActive = false;
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        audioManager.toggleMusicPause(true);
    }
}

function hideLevelBlockScreen() {
    const overlay = document.getElementById('levelBlockOverlay');
    overlay.classList.remove('active');
    blockOverlayActive = false;
    pendingUnlockLevel = null;
    
    if (!gameOver && gameActive === false && !levelTransitionActive) {
        gameActive = true;
        startTimer();
        audioManager.toggleMusicPause(false);
    }
}

function handleUnlockLevel() {
    if (!pendingUnlockLevel) return;
    
    const level = pendingUnlockLevel;
    const cost = LevelUnlockManager.getUnlockCost(level);
    const playerCoins = coins || PlayerManager.getPlayerCoins();
    
    if (LevelUnlockManager.canUnlock(level, playerCoins)) {
        coins -= cost;
        totalCoinsAccumulated = coins;
        coinVal.innerText = String(coins).padStart(4, '0');
        updatePauseCoinBalance();
        
        LevelUnlockManager.unlockLevel(level);
        savePlayerProgress();
        
        const btnUnlock = document.getElementById('btnUnlockLevel');
        btnUnlock.textContent = '✅ LEVEL UNLOCKED!';
        btnUnlock.className = 'game-button green large btn-unlock';
        btnUnlock.disabled = true;
        
        document.getElementById('blockStatus').textContent = '✅ Unlocked';
        document.getElementById('blockStatus').className = 'stat-value unlock-status unlocked';
        document.getElementById('blockStatusLabel').textContent = '✅ Status';
        document.getElementById('blockProgressFill').style.width = '100%';
        document.getElementById('blockProgressText').textContent = '100%';
        
        document.getElementById('btnBackLevel').classList.add('hidden');
        
        createUnlockConfetti();
        
        document.getElementById('blockPlayerCoins').textContent = coins.toLocaleString('pt-BR');
        document.getElementById('blockPlayerCoins').className = 'stat-value sufficient';
        
        setTimeout(() => {
            hideLevelBlockScreen();
            if (gameActive === false && !gameOver) {
                startLevel(level);
            }
        }, 2000);
        
    } else {
        const btnUnlock = document.getElementById('btnUnlockLevel');
        btnUnlock.textContent = '❌ INSUFFICIENT COINS';
        btnUnlock.className = 'game-button red large btn-unlock';
        btnUnlock.disabled = true;
        
        setTimeout(() => {
            const cost2 = LevelUnlockManager.getUnlockCost(level);
            const canUnlock2 = LevelUnlockManager.canUnlock(level, coins);
            if (!canUnlock2) {
                btnUnlock.textContent = `❌ INSUFFICIENT COINS (${cost2.toLocaleString('pt-BR')})`;
                btnUnlock.className = 'game-button red large btn-unlock';
                btnUnlock.disabled = true;
            } else {
                btnUnlock.textContent = `🔓 DESBLOQUEAR (${cost2.toLocaleString('pt-BR')})`;
                btnUnlock.className = 'game-button orange large btn-unlock';
                btnUnlock.disabled = false;
            }
        }, 2000);
    }
}

function handleBackToPreviousLevel() {
    if (!pendingUnlockLevel) return;
    
    const currentBlockedLevel = pendingUnlockLevel;
    const previousLevel = currentBlockedLevel - 1;
    
    if (previousLevel < 1) return;
    
    hideLevelBlockScreen();
    
    setTimeout(() => {
        startLevel(previousLevel);
        console.log(`⬅ Voltando ao nível ${previousLevel} para coletar mais moedas!`);
    }, 300);
}

function createUnlockConfetti() {
    const container = document.createElement('div');
    container.className = 'unlock-confetti';
    container.id = 'unlockConfettiContainer';
    document.body.appendChild(container);
    
    const colors = ['#FFD700', '#ff6b6b', '#2ecc71', '#3498db', '#e74c3c', '#f1c40f', '#9b59b6', '#1abc9c'];
    const shapes = ['square', 'circle', 'rectangle'];
    
    for (let i = 0; i < 60; i++) {
        const piece = document.createElement('div');
        piece.className = 'unlock-confetti-piece';
        const color = colors[Math.floor(Math.random() * colors.length)];
        const shape = shapes[Math.floor(Math.random() * shapes.length)];
        const size = 6 + Math.random() * 10;
        const left = Math.random() * 100;
        const duration = 1.5 + Math.random() * 2;
        const delay = Math.random() * 1.5;
        
        let borderRadius = '50%';
        let width = size;
        let height = size;
        if (shape === 'rectangle') {
            width = size * 0.6;
            height = size * 0.3;
            borderRadius = '2px';
        } else if (shape === 'square') {
            borderRadius = '2px';
        }
        
        piece.style.cssText = `
            left: ${left}%;
            width: ${width}px;
            height: ${height}px;
            background: ${color};
            border-radius: ${borderRadius};
            animation-duration: ${duration}s;
            animation-delay: ${delay}s;
            box-shadow: 0 0 6px ${color}40;
        `;
        container.appendChild(piece);
    }
    
    setTimeout(() => {
        const el = document.getElementById('unlockConfettiContainer');
        if (el) el.remove();
    }, 4000);
}

// ============================================================
// CANVAS E CONFIGURAÇÕES INICIAIS
// ============================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let W, H;

function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    resizeAndRecalculate();
}

function resizeAndRecalculate() {
    if (typeof enemies !== 'undefined' && enemies && Array.isArray(enemies) && enemies.length > 0) {
        for (const enemy of enemies) {
            if (enemy && enemy.radius !== undefined) {
                const lvlData = LEVELS[currentLevel - 1] || LEVELS[0];
                enemy.radius = Math.max(12, Math.min(38, lvlData.radius * 0.75 + Math.random() * 7 + (W * 0.01875)));
            }
        }
    }
    
    if (typeof boss !== 'undefined' && boss && !boss.defeated) {
        boss.radius = Math.max(24, Math.min(90, 36 + (currentLevel * 0.9) + (W * 0.036)));
    }
    
    if (typeof bossAttacks !== 'undefined' && bossAttacks && Array.isArray(bossAttacks) && bossAttacks.length > 0) {
        for (const attack of bossAttacks) {
            if (attack && attack.radius !== undefined) {
                attack.radius = Math.max(6, Math.min(14, 9 + (W * 0.012)));
            }
        }
    }
    
    if (typeof projectiles !== 'undefined' && projectiles && Array.isArray(projectiles) && projectiles.length > 0) {
        for (const proj of projectiles) {
            if (proj && proj.radius !== undefined) {
                proj.radius = Math.max(3, Math.min(8, 5 + (W * 0.006)));
            }
        }
    }
    
    if (typeof floatingCoins !== 'undefined' && floatingCoins && Array.isArray(floatingCoins) && floatingCoins.length > 0) {
        for (const coin of floatingCoins) {
            if (coin && coin.radius !== undefined) {
                coin.radius = Math.max(12, Math.min(28, 16 + (W * 0.02)));
            }
        }
    }
}

// ============================================================
// AUDIO MANAGER - COM SISTEMA DE MÚSICAS POR NÍVEL
// ============================================================

class AudioManager {
    constructor() {
        this.audioCache = {};
        this.globalVolume = 0.5;
        this.musicTracks = {};
        this.currentMusic = null;
        this.currentLevel = 1;
        this.isMusicPlaying = false;
        this.audioContext = null;
        this.musicLoaded = false;
        this.isLoading = false;
        this.audioStarted = false;
        this.pendingMusic = null;
        this.fadeInterval = null;
        
        this.soundEffects = {
            shoot: null,
            hitTarget: null,
            bossDefeat: null,
            bossHit: null,
            coinSound: null,
            bossShoot: null,
            bossAttacks: {}
        };
    }

    initAudioContext() {
        if (!this.audioContext) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.warn('Web Audio API não suportada');
            }
        }
        return this.audioContext;
    }

    ensureAudioStarted() {
        if (this.audioStarted) return;
        try {
            this.initAudioContext();
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            this.audioStarted = true;
            if (this.pendingMusic) {
                const level = this.pendingMusic;
                this.pendingMusic = null;
                this.loadAndPlayMusicForLevel(level);
            }
        } catch (e) {
            console.warn('Erro ao iniciar áudio:', e);
        }
    }

    loadAudio(filePath, callback) {
        if (this.audioCache[filePath]) {
            if (callback) callback(this.audioCache[filePath]);
            return this.audioCache[filePath];
        }

        const audio = new Audio();
        audio.preload = 'auto';
        audio.volume = this.globalVolume;

        audio.addEventListener('canplaythrough', () => {
            if (callback) callback(audio);
        });

        audio.addEventListener('error', (e) => {
            console.warn(`Erro ao carregar áudio: ${filePath}`, e);
            if (callback) callback(null);
        });

        audio.src = filePath;
        audio.load();

        this.audioCache[filePath] = audio;
        return audio;
    }

    setMusicForLevel(level, filePath) {
        this.musicTracks[level] = filePath;
    }

    loadAndPlayMusicForLevel(level) {
        if (!this.audioStarted) {
            this.pendingMusic = level;
            return;
        }

        if (this.isLoading) return;

        const filePath = this.musicTracks[level];
        if (!filePath) {
            console.warn(`🎵 Música para o nível ${level} não encontrada!`);
            return;
        }

        if (this.currentMusic && this.isMusicPlaying) {
            this.fadeOutMusic(() => {
                this.loadNewMusic(level, filePath);
            });
        } else {
            this.loadNewMusic(level, filePath);
        }
    }

    fadeOutMusic(callback) {
        if (!this.currentMusic) {
            if (callback) callback();
            return;
        }

        if (this.fadeInterval) {
            clearInterval(this.fadeInterval);
            this.fadeInterval = null;
        }

        let volume = this.currentMusic.volume;
        const fadeStep = 0.05;
        
        this.fadeInterval = setInterval(() => {
            if (this.currentMusic) {
                volume -= fadeStep;
                if (volume <= 0) {
                    volume = 0;
                    clearInterval(this.fadeInterval);
                    this.fadeInterval = null;
                    if (this.currentMusic) {
                        this.currentMusic.pause();
                        this.currentMusic.currentTime = 0;
                        this.isMusicPlaying = false;
                    }
                    if (callback) callback();
                } else {
                    this.currentMusic.volume = Math.max(0, volume);
                }
            } else {
                clearInterval(this.fadeInterval);
                this.fadeInterval = null;
                if (callback) callback();
            }
        }, 50);
    }

    loadNewMusic(level, filePath) {
        this.isLoading = true;
        this.musicLoaded = false;

        this.loadAudio(filePath, (audio) => {
            this.isLoading = false;
            if (audio) {
                this.currentMusic = audio;
                this.currentMusic.loop = true;
                this.currentMusic.volume = 0;
                this.musicLoaded = true;
                this.currentLevel = level;
                
                if (gameActive && !pauseActive) {
                    this.playMusic();
                }
            } else {
                console.warn(`❌ Erro ao carregar música: ${filePath}`);
                this.musicLoaded = false;
            }
        });
    }

    forceStopAllAudio() {
        try {
            if (this.fadeInterval) {
                clearInterval(this.fadeInterval);
                this.fadeInterval = null;
            }
            
            if (this.currentMusic) {
                this.currentMusic.pause();
                this.currentMusic.currentTime = 0;
                this.currentMusic = null;
            }
            this.isMusicPlaying = false;
            this.musicLoaded = false;
            
            for (const key in this.audioCache) {
                try {
                    const audio = this.audioCache[key];
                    if (audio) {
                        audio.pause();
                        audio.currentTime = 0;
                    }
                } catch (e) {}
            }
        } catch (e) {
            console.warn('Erro ao parar áudios:', e);
        }
    }

    playMusic() {
        if (this.currentMusic && !this.isMusicPlaying && this.musicLoaded) {
            try {
                this.currentMusic.volume = 0;
                const playPromise = this.currentMusic.play();
                if (playPromise) {
                    playPromise.catch(e => {
                        this.isMusicPlaying = false;
                    });
                }
                
                if (this.fadeInterval) {
                    clearInterval(this.fadeInterval);
                    this.fadeInterval = null;
                }
                
                let volume = 0;
                const targetVolume = this.globalVolume * 0.5;
                this.fadeInterval = setInterval(() => {
                    volume += 0.05;
                    if (this.currentMusic) {
                        this.currentMusic.volume = Math.min(volume, targetVolume);
                    }
                    if (volume >= targetVolume) {
                        clearInterval(this.fadeInterval);
                        this.fadeInterval = null;
                    }
                }, 50);
                
                this.isMusicPlaying = true;
            } catch (e) {
                this.isMusicPlaying = false;
            }
        }
    }

    stopMusic() {
        if (this.fadeInterval) {
            clearInterval(this.fadeInterval);
            this.fadeInterval = null;
        }
        if (this.currentMusic) {
            try {
                this.currentMusic.pause();
                this.currentMusic.currentTime = 0;
                this.isMusicPlaying = false;
            } catch (e) {}
        }
    }

    pauseMusic() {
        if (this.currentMusic && this.isMusicPlaying) {
            try {
                if (this.fadeInterval) {
                    clearInterval(this.fadeInterval);
                    this.fadeInterval = null;
                }
                this.currentMusic.pause();
                this.isMusicPlaying = false;
            } catch (e) {}
        }
    }

    resumeMusic() {
        if (this.currentMusic && !this.isMusicPlaying && this.musicLoaded) {
            this.playMusic();
        } else if (this.pendingMusic) {
            const level = this.pendingMusic;
            this.pendingMusic = null;
            this.loadAndPlayMusicForLevel(level);
        }
    }

    toggleMusicPause(pause) {
        if (this.currentMusic) {
            if (pause) {
                this.pauseMusic();
            } else if (gameActive) {
                this.resumeMusic();
            }
        } else if (!pause && this.pendingMusic) {
            this.ensureAudioStarted();
            const level = this.pendingMusic;
            this.pendingMusic = null;
            this.loadAndPlayMusicForLevel(level);
        }
    }

    setSoundEffect(type, filePath) {
        if (type === 'shoot') this.soundEffects.shoot = filePath;
        else if (type === 'hitTarget') this.soundEffects.hitTarget = filePath;
        else if (type === 'bossDefeat') this.soundEffects.bossDefeat = filePath;
        else if (type === 'bossHit') this.soundEffects.bossHit = filePath;
        else if (type === 'coin') this.soundEffects.coinSound = filePath;
        else if (type === 'bossShoot') this.soundEffects.bossShoot = filePath;
    }

    setBossAttackSound(attackType, filePath) {
        this.soundEffects.bossAttacks[attackType] = filePath;
    }

    playBossAttackSound(attackType) {
        const filePath = this.soundEffects.bossAttacks[attackType];
        if (!filePath) return;
        try {
            const audio = new Audio(filePath);
            audio.volume = this.globalVolume * 0.6;
            audio.play().catch(e => {});
        } catch (e) {}
    }

    playBossHitSound() {
        const filePath = this.soundEffects.bossHit;
        if (!filePath) return;
        try {
            const audio = new Audio(filePath);
            audio.volume = this.globalVolume * 0.6;
            audio.play().catch(e => {});
        } catch (e) {}
    }

    playCoinSound() {
        const filePath = this.soundEffects.coinSound;
        if (!filePath) return;
        try {
            const audio = new Audio(filePath);
            audio.volume = this.globalVolume * 0.6;
            audio.play().catch(e => {});
        } catch (e) {}
    }

    playSoundEffect(type) {
        let filePath = null;
        if (type === 'shoot') filePath = this.soundEffects.shoot;
        else if (type === 'hitTarget') filePath = this.soundEffects.hitTarget;
        else if (type === 'bossDefeat') filePath = this.soundEffects.bossDefeat;
        else if (type === 'bossShoot') filePath = this.soundEffects.bossShoot;
        if (!filePath) return;
        try {
            const audio = new Audio(filePath);
            audio.volume = this.globalVolume * 0.6;
            audio.play().catch(e => {});
        } catch (e) {}
    }

    setVolume(volume) {
        this.globalVolume = Math.max(0, Math.min(1, volume));
        if (this.currentMusic) {
            this.currentMusic.volume = this.globalVolume * 0.5;
        }
    }

    setLevel(level) {
        if (this.currentLevel !== level || !this.musicLoaded) {
            this.currentLevel = level;
            this.loadAndPlayMusicForLevel(level);
        }
    }

    reset() {
        if (this.fadeInterval) {
            clearInterval(this.fadeInterval);
            this.fadeInterval = null;
        }
        this.forceStopAllAudio();
        this.isMusicPlaying = false;
        this.musicLoaded = false;
        this.isLoading = false;
        this.currentLevel = 1;
        this.pendingMusic = null;
        this.audioStarted = false;
    }
}

// ============================================================
// CONFIGURAÇÕES DE ÁUDIO - MÚSICAS POR NÍVEL
// ============================================================

const audioManager = new AudioManager();

audioManager.setMusicForLevel(1, 'musicas/nivel1.mp3');
audioManager.setMusicForLevel(2, 'musicas/nivel2.mp3');
audioManager.setMusicForLevel(3, 'musicas/nivel1.mp3');
audioManager.setMusicForLevel(4, 'musicas/nivel1.mp3');
audioManager.setMusicForLevel(5, 'musicas/nivel1.mp3');
audioManager.setMusicForLevel(6, 'musicas/nivel2.mp3');
audioManager.setMusicForLevel(7, 'musicas/nivel1.mp3');
audioManager.setMusicForLevel(8, 'musicas/nivel1.mp3');
audioManager.setMusicForLevel(9, 'musicas/nivel2.mp3');
audioManager.setMusicForLevel(10, 'musicas/nivel2.mp3');
audioManager.setMusicForLevel(11, 'musicas/nivel1.mp3');
audioManager.setMusicForLevel(12, 'musicas/nivel2.mp3');
audioManager.setMusicForLevel(13, 'musicas/nivel1.mp3');
audioManager.setMusicForLevel(14, 'musicas/nivel1.mp3');
audioManager.setMusicForLevel(15, 'musicas/nivel2.mp3');
audioManager.setMusicForLevel(16, 'musicas/nivel1.mp3');
audioManager.setMusicForLevel(17, 'musicas/nivel1.mp3');
audioManager.setMusicForLevel(18, 'musicas/nivel2.mp3');
audioManager.setMusicForLevel(19, 'musicas/nivel1.mp3');
audioManager.setMusicForLevel(20, 'musicas/nivel1.mp3');

audioManager.setSoundEffect('shoot', 'sons/disparo3.mp3');
audioManager.setSoundEffect('hitTarget', 'sons/acerto.mp3');
audioManager.setSoundEffect('bossDefeat', 'sons/chefaoderrotado.mp3');
audioManager.setSoundEffect('bossHit', 'sons/chefao-dano1.mp3');
audioManager.setSoundEffect('coin', 'sons/moeda.mp3');
audioManager.setSoundEffect('bossShoot', 'sons/disparo-chefao.mp3');

const BOSS_ATTACK_SOUNDS = ['rain', 'sniper', 'spread', 'bomb', 'laser', 'homing', 'burst', 'meteor', 'spiral', 'shotgun', 'mine', 'beam', 'wave', 'tornado', 'supernova', 'apocalypse', 'default'];
BOSS_ATTACK_SOUNDS.forEach(type => {
    audioManager.setBossAttackSound(type, `sons/chefao-ataque-${type}.mp3`);
});

// ============================================================
// SISTEMA DE BALÃO - LÓGICA IMPREVISÍVEL COM GARANTIA DOS 7 TIPOS
// ============================================================

// Configurações dos 7 balões
const BALLOON_TYPES = {
    double_shot: {
        id: 'double_shot',
        name: 'Double Shot',
        color: '#FF6B35',
        secondaryColor: '#FF9F1C',
        icon: '⚡',
        projectiles: 2,
        damage: 1,
        duration: 25,
        collectTime: 10,
        shape: 'star',
        trailColor: '#FF6B35',
        killWeight: 1 // Peso para spawn (quanto maior, mais fácil de aparecer)
    },
    triple_shot: {
        id: 'triple_shot',
        name: 'Triple Shot',
        color: '#9B59B6',
        secondaryColor: '#8E44AD',
        icon: '🔱',
        projectiles: 3,
        damage: 1,
        duration: 20,
        collectTime: 10,
        shape: 'diamond',
        trailColor: '#9B59B6',
        killWeight: 1
    },
    quintuple_shot: {
        id: 'quintuple_shot',
        name: 'Quintuple Shot',
        color: '#00D4FF',
        secondaryColor: '#00A8CC',
        icon: '💥',
        projectiles: 5,
        damage: 1,
        duration: 18,
        collectTime: 10,
        shape: 'hexagon',
        trailColor: '#00D4FF',
        killWeight: 2
    },
    boss_style_1: {
        id: 'boss_style_1',
        name: 'Boss Style Lv.1',
        color: '#FF4444',
        secondaryColor: '#CC0000',
        icon: '👹',
        projectiles: 4,
        damage: 2,
        duration: 15,
        collectTime: 10,
        shape: 'skull',
        trailColor: '#FF4444',
        killWeight: 3
    },
    boss_style_8: {
        id: 'boss_style_8',
        name: 'Boss Style Lv.8',
        color: '#FF6B00',
        secondaryColor: '#CC5500',
        icon: '🔥',
        projectiles: 5,
        damage: 2,
        duration: 14,
        collectTime: 10,
        shape: 'flame',
        trailColor: '#FF6B00',
        killWeight: 3
    },
    boss_style_15: {
        id: 'boss_style_15',
        name: 'Boss Style Lv.15',
        color: '#FF00FF',
        secondaryColor: '#CC00CC',
        icon: '💀',
        projectiles: 6,
        damage: 3,
        duration: 12,
        collectTime: 10,
        shape: 'crown',
        trailColor: '#FF00FF',
        killWeight: 4
    },
    boss_style_20: {
        id: 'boss_style_20',
        name: 'Boss Style Lv.20',
        color: '#FFD700',
        secondaryColor: '#FFA500',
        icon: '👑',
        projectiles: 8,
        damage: 3,
        duration: 10,
        collectTime: 10,
        shape: 'crown_glow',
        trailColor: '#FFD700',
        killWeight: 4
    }
};

const ALL_BALLOON_TYPES = Object.keys(BALLOON_TYPES);

// Controle de balões
let activeBalloons = [];
const MAX_ACTIVE_BALLOONS = 1; // Apenas 1 balão por vez
let balloonEffectActive = false;
let balloonEffectTimeLeft = 0;
let balloonEffectData = null;
let balloonWeaponTimer = null;
let balloonActiveWeapon = null;

// Sistema de spawn inteligente
let totalKills = 0;
let killsSinceLastBalloon = 0;
let balloonSpawnQueue = []; // Fila de tipos que ainda não apareceram
let spawnedBalloons = new Set(); // Tipos que já apareceram
let balloonSpawnCooldown = 0;
let totalBalloonsSpawned = 0;
const MIN_KILLS_BETWEEN_BALLOONS = 5; // Mínimo de kills entre balões
const MAX_KILLS_BETWEEN_BALLOONS = 20; // Máximo de kills entre balões

// Níveis e frequência de spawn
function getBaseKillInterval(level) {
    // Níveis mais altos = balões aparecem com mais frequência (menos kills)
    if (level <= 3) return 14;
    if (level <= 6) return 12;
    if (level <= 9) return 10;
    if (level <= 12) return 8;
    if (level <= 15) return 7;
    if (level <= 18) return 6;
    return 5;
}

function getKillIntervalForLevel(level) {
    const base = getBaseKillInterval(level);
    // Adiciona aleatoriedade para imprevisibilidade
    const variation = Math.floor(Math.random() * 5) - 2;
    return Math.max(MIN_KILLS_BETWEEN_BALLOONS, base + variation);
}

function initializeBalloonQueue() {
    // Cria uma fila com todos os 7 tipos em ordem aleatória
    const types = [...ALL_BALLOON_TYPES];
    for (let i = types.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [types[i], types[j]] = [types[j], types[i]];
    }
    balloonSpawnQueue = types;
    spawnedBalloons = new Set();
    console.log('🎈 Fila de balões inicializada:', balloonSpawnQueue.map(t => BALLOON_TYPES[t].name).join(' → '));
}

function getNextBalloonType() {
    // Se a fila estiver vazia, reinicia com todos os tipos em nova ordem aleatória
    if (balloonSpawnQueue.length === 0) {
        const types = [...ALL_BALLOON_TYPES];
        for (let i = types.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [types[i], types[j]] = [types[j], types[i]];
        }
        balloonSpawnQueue = types;
        console.log('🔄 Fila de balões reiniciada em nova ordem aleatória');
    }
    
    // Pega o próximo tipo da fila
    const typeId = balloonSpawnQueue.shift();
    spawnedBalloons.add(typeId);
    return typeId;
}

function spawnBalloon() {
    if (activeBalloons.length >= MAX_ACTIVE_BALLOONS) return false;
    if (!gameActive || gameOver || levelTransitionPaused) return false;
    if (balloonSpawnCooldown > 0) return false;
    
    // Verifica se é hora de spawnar baseado em kills
    const killInterval = getKillIntervalForLevel(currentLevel);
    if (killsSinceLastBalloon < killInterval) return false;
    
    // Obtém o próximo tipo da fila (garantindo que todos os 7 apareçam)
    const typeId = getNextBalloonType();
    if (!typeId) return false;
    
    const config = BALLOON_TYPES[typeId];
    if (!config) return false;
    
    const x = 80 + Math.random() * (W - 160);
    const y = 80 + Math.random() * (H - 160);
    
    // Verifica sobreposição
    for (const existing of activeBalloons) {
        if (existing.getDistanceTo(x, y) < 80) return false;
    }

    const balloon = new Balloon(x, y, typeId);
    activeBalloons.push(balloon);
    totalBalloonsSpawned++;
    killsSinceLastBalloon = 0;
    
    // Define cooldown para o próximo balão (imprevisibilidade)
    balloonSpawnCooldown = Math.floor(Math.random() * 3) + 1; // 1-3 kills de cooldown
    
    console.log(`🎈 Balão ${config.name} apareceu! (${totalBalloonsSpawned}º balão)`);
    console.log(`📊 Fila restante: ${balloonSpawnQueue.length} tipos`);
    return true;
}

// Classe do Balão (mantida igual)
class Balloon {
    constructor(x, y, typeId) {
        const config = BALLOON_TYPES[typeId];
        this.type = typeId;
        this.config = config;
        this.x = x;
        this.y = y;
        this.radius = 32;
        this.life = config.collectTime * 60;
        this.collected = false;
        this.collectTimer = 0;
        this.alpha = 1;
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.glowPhase = 0;
        this.rotation = 0;
        this.vy = -0.6 - Math.random() * 0.4;
        this.vx = (Math.random() - 0.5) * 0.8;
        this.spawnTime = Date.now();
        this.bobPhase = Math.random() * Math.PI * 2;
        this.trail = [];
        this.particles = [];
    }

    update() {
        if (this.collected) {
            this.collectTimer++;
            this.alpha = Math.max(0, 1 - this.collectTimer / 20);
            return this.alpha > 0;
        }

        this.life--;
        this.pulsePhase += 0.05;
        this.glowPhase += 0.03;
        this.bobPhase += 0.025;
        this.rotation += 0.005;

        this.x += this.vx + Math.sin(this.bobPhase) * 0.12;
        this.y += this.vy + Math.sin(this.bobPhase * 0.7) * 0.15;

        if (this.x < this.radius) { this.x = this.radius; this.vx *= -0.5; }
        if (this.x > W - this.radius) { this.x = W - this.radius; this.vx *= -0.5; }
        if (this.y < this.radius) { this.y = this.radius; this.vy *= -0.5; }
        if (this.y > H - this.radius) { this.y = H - this.radius; this.vy *= -0.5; }

        if (Math.random() < 0.3) {
            this.particles.push({
                x: this.x + (Math.random() - 0.5) * this.radius * 0.8,
                y: this.y + (Math.random() - 0.5) * this.radius * 0.8,
                life: 20 + Math.random() * 20,
                maxLife: 40,
                size: 2 + Math.random() * 4,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5 - 0.5
            });
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
        if (this.particles.length > 30) {
            this.particles.splice(0, this.particles.length - 30);
        }

        return this.life > 0;
    }

    drawShape(ctx, x, y, radius, rotation, config) {
        const shape = config.shape;
        const color = config.color;
        const secondaryColor = config.secondaryColor || color;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);

        ctx.shadowColor = color;
        ctx.shadowBlur = 30;

        switch(shape) {
            case 'star':
                this.drawStar(ctx, 0, 0, radius, color, secondaryColor);
                break;
            case 'diamond':
                this.drawDiamond(ctx, 0, 0, radius, color, secondaryColor);
                break;
            case 'hexagon':
                this.drawHexagon(ctx, 0, 0, radius, color, secondaryColor);
                break;
            case 'skull':
                this.drawSkull(ctx, 0, 0, radius, color, secondaryColor);
                break;
            case 'flame':
                this.drawFlame(ctx, 0, 0, radius, color, secondaryColor);
                break;
            case 'crown':
            case 'crown_glow':
                this.drawCrown(ctx, 0, 0, radius, color, secondaryColor, shape === 'crown_glow');
                break;
            default:
                this.drawDefault(ctx, 0, 0, radius, color, secondaryColor);
        }

        ctx.shadowBlur = 0;
        ctx.restore();
    }

    drawStar(ctx, x, y, radius, color, secondaryColor) {
        const spikes = 5;
        const outerRadius = radius * 0.9;
        const innerRadius = radius * 0.4;
        let rot = -Math.PI / 2;
        const step = Math.PI / spikes;

        const grad = ctx.createRadialGradient(-radius*0.2, -radius*0.2, 0, 0, 0, radius);
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(0.2, secondaryColor);
        grad.addColorStop(0.7, color);
        grad.addColorStop(1, '#00000044');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(x, y - outerRadius);
        for (let i = 0; i < spikes; i++) {
            ctx.lineTo(x + Math.cos(rot) * outerRadius, y + Math.sin(rot) * outerRadius);
            rot += step;
            ctx.lineTo(x + Math.cos(rot) * innerRadius, y + Math.sin(rot) * innerRadius);
            rot += step;
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    drawDiamond(ctx, x, y, radius, color, secondaryColor) {
        const grad = ctx.createRadialGradient(-radius*0.2, -radius*0.3, 0, 0, 0, radius);
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(0.3, secondaryColor);
        grad.addColorStop(0.8, color);
        grad.addColorStop(1, '#00000044');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(x, y - radius);
        ctx.lineTo(x + radius * 0.7, y);
        ctx.lineTo(x, y + radius);
        ctx.lineTo(x - radius * 0.7, y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    drawHexagon(ctx, x, y, radius, color, secondaryColor) {
        const grad = ctx.createRadialGradient(-radius*0.2, -radius*0.3, 0, 0, 0, radius);
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(0.3, secondaryColor);
        grad.addColorStop(0.8, color);
        grad.addColorStop(1, '#00000044');

        ctx.fillStyle = grad;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
            const px = x + Math.cos(angle) * radius;
            const py = y + Math.sin(angle) * radius;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    drawSkull(ctx, x, y, radius, color, secondaryColor) {
        const grad = ctx.createRadialGradient(-radius*0.2, -radius*0.3, 0, 0, 0, radius);
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(0.2, secondaryColor);
        grad.addColorStop(0.7, color);
        grad.addColorStop(1, '#00000044');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.85, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(x - radius * 0.3, y - radius * 0.15, radius * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + radius * 0.3, y - radius * 0.15, radius * 0.25, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(x - radius * 0.25, y - radius * 0.1, radius * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + radius * 0.35, y - radius * 0.1, radius * 0.12, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y + radius * 0.15, radius * 0.3, 0.1, Math.PI - 0.1);
        ctx.stroke();
    }

    drawFlame(ctx, x, y, radius, color, secondaryColor) {
        const grad = ctx.createRadialGradient(-radius*0.1, -radius*0.4, 0, 0, 0, radius);
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(0.2, secondaryColor);
        grad.addColorStop(0.6, color);
        grad.addColorStop(1, '#00000044');

        ctx.fillStyle = grad;
        const points = 8;
        ctx.beginPath();
        for (let i = 0; i <= points; i++) {
            const angle = (i / points) * Math.PI * 2 - Math.PI / 2;
            const variation = 0.7 + 0.3 * Math.sin(i * 1.5 + this.pulsePhase);
            const r = radius * variation;
            const px = x + Math.cos(angle) * r;
            const py = y + Math.sin(angle) * r;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    drawCrown(ctx, x, y, radius, color, secondaryColor, glow) {
        const grad = ctx.createRadialGradient(-radius*0.2, -radius*0.4, 0, 0, 0, radius);
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(0.2, secondaryColor);
        grad.addColorStop(0.7, color);
        grad.addColorStop(1, '#00000044');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(x - radius * 0.9, y + radius * 0.4);
        ctx.quadraticCurveTo(x - radius * 0.8, y + radius * 0.1, x - radius * 0.9, y - radius * 0.1);
        ctx.lineTo(x - radius * 0.6, y - radius * 0.4);
        ctx.lineTo(x - radius * 0.3, y - radius * 0.1);
        ctx.lineTo(x, y - radius * 0.7);
        ctx.lineTo(x + radius * 0.3, y - radius * 0.1);
        ctx.lineTo(x + radius * 0.6, y - radius * 0.4);
        ctx.lineTo(x + radius * 0.9, y - radius * 0.1);
        ctx.quadraticCurveTo(x + radius * 0.8, y + radius * 0.1, x + radius * 0.9, y + radius * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();

        if (glow) {
            ctx.shadowColor = color;
            ctx.shadowBlur = 40;
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        ctx.shadowBlur = 0;
        const jewelColors = ['#FF0000', '#00FF00', '#FFD700', '#00BFFF', '#FF00FF'];
        for (let i = 0; i < 5; i++) {
            const jx = x - radius * 0.6 + i * radius * 0.3;
            const jy = y + radius * 0.1;
            ctx.fillStyle = jewelColors[i % jewelColors.length];
            ctx.beginPath();
            ctx.arc(jx, jy, radius * 0.08, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawDefault(ctx, x, y, radius, color, secondaryColor) {
        const grad = ctx.createRadialGradient(-radius*0.2, -radius*0.3, 0, 0, 0, radius);
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(0.2, secondaryColor);
        grad.addColorStop(0.7, color);
        grad.addColorStop(1, '#00000044');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.85, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    draw() {
        if (this.collected && this.alpha <= 0) return;

        const pulse = 1 + Math.sin(this.pulsePhase) * 0.05;
        const radius = this.radius * pulse;
        const config = this.config;

        ctx.save();
        ctx.globalAlpha = this.alpha;

        for (const p of this.particles) {
            const alpha = p.life / p.maxLife;
            ctx.globalAlpha = alpha * this.alpha;
            ctx.fillStyle = config.color;
            ctx.shadowColor = config.color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = this.alpha;

        const glowSize = 1 + Math.sin(this.glowPhase) * 0.1;
        const glow = ctx.createRadialGradient(this.x, this.y, radius * 0.2, this.x, this.y, radius * 2.5 * glowSize);
        glow.addColorStop(0, `${config.color}40`);
        glow.addColorStop(0.3, `${config.color}20`);
        glow.addColorStop(1, `${config.color}00`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius * 2.5 * glowSize, 0, Math.PI * 2);
        ctx.fill();

        this.drawShape(ctx, this.x, this.y, radius, this.rotation, config);

        ctx.shadowColor = config.color;
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${radius * 0.5}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(config.icon, this.x, this.y);

        ctx.shadowBlur = 10;
        ctx.fillStyle = config.color;
        ctx.font = `bold ${radius * 0.3}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(config.name, this.x, this.y + radius * 0.6);

        ctx.shadowBlur = 0;

        // Mostra o número de balões coletados / total na partida
        ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.3 * Math.sin(this.pulsePhase)})`;
        ctx.font = `bold ${radius * 0.25}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`🎈 ${totalBalloonsSpawned}º`, this.x, this.y - radius - 4);

        // Mostra o próximo balão da fila (se houver)
        if (balloonSpawnQueue.length > 0) {
            const nextType = balloonSpawnQueue[0];
            const nextConfig = BALLOON_TYPES[nextType];
            if (nextConfig) {
                ctx.fillStyle = `rgba(255,255,255,0.3)`;
                ctx.font = `${radius * 0.2}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillText(`Próximo: ${nextConfig.icon} ${nextConfig.name}`, this.x, this.y + radius * 0.8);
            }
        }

        ctx.restore();
    }

    collect() {
        if (this.collected) return false;
        this.collected = true;
        this.collectTimer = 0;
        return true;
    }

    isExpired() {
        return this.life <= 0 || (this.collected && this.alpha <= 0);
    }

    getDistanceTo(x, y) {
        return Math.hypot(this.x - x, this.y - y);
    }
}

// Funções de gerenciamento de balões
function checkBalloonCollection(mx, my) {
    if (!gameActive || gameOver || levelTransitionPaused || pauseActive || blockOverlayActive) return;
    
    for (let i = activeBalloons.length - 1; i >= 0; i--) {
        const balloon = activeBalloons[i];
        if (balloon.collected) continue;
        
        const dist = balloon.getDistanceTo(mx, my);
        if (dist < balloon.radius + 30) {
            if (balloon.collect()) {
                activateBalloonEffect(balloon.type);
                createExplosion(balloon.x, balloon.y, balloon.config.color, 1.0, 30);
                activeBalloons.splice(i, 1);
                return;
            }
        }
    }
}

function activateBalloonEffect(typeId) {
    const config = BALLOON_TYPES[typeId];
    if (!config) return;

    if (balloonEffectActive) {
        clearBalloonEffect();
    }

    balloonEffectActive = true;
    balloonEffectTimeLeft = config.duration;
    balloonEffectData = {
        type: typeId,
        config: config,
        projectiles: config.projectiles,
        damage: config.damage
    };
    balloonActiveWeapon = typeId;

    if (balloonWeaponTimer) {
        clearInterval(balloonWeaponTimer);
    }
    balloonWeaponTimer = setInterval(() => {
        balloonEffectTimeLeft--;
        if (balloonEffectTimeLeft <= 0) {
            clearBalloonEffect();
        }
        updateBalloonIndicator();
    }, 1000);

    updateBalloonIndicator();
    console.log(`⚡ ${config.name} ATIVADO por ${config.duration} segundos!`);
    showCoinFloatText(W/2 - 80, H/2 - 40, `${config.icon} ${config.name}!`);
}

function clearBalloonEffect() {
    balloonEffectActive = false;
    balloonEffectTimeLeft = 0;
    balloonEffectData = null;
    balloonActiveWeapon = null;
    if (balloonWeaponTimer) {
        clearInterval(balloonWeaponTimer);
        balloonWeaponTimer = null;
    }
    const indicator = document.getElementById('balloonIndicator');
    if (indicator) indicator.remove();
}

function updateBalloonIndicator() {
    const oldIndicator = document.getElementById('balloonIndicator');
    if (oldIndicator) oldIndicator.remove();

    if (!balloonEffectActive || !balloonEffectData) return;

    const config = balloonEffectData.config;
    const indicator = document.createElement('div');
    indicator.id = 'balloonIndicator';
    indicator.style.cssText = `
        position: fixed;
        top: clamp(100px, 14vh, 160px);
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.85);
        backdrop-filter: blur(8px);
        border: 2px solid ${config.color};
        border-radius: 16px;
        padding: 6px 18px;
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 120;
        box-shadow: 0 0 30px ${config.color}40;
        font-family: 'Carter One', sans-serif;
        animation: indicatorPulse 1s ease-in-out infinite;
        pointer-events: none;
    `;
    indicator.innerHTML = `
        <span style="font-size: clamp(18px, 2.5vw, 30px);">${config.icon}</span>
        <span style="color: white; font-size: clamp(12px, 1.6vw, 20px);">${config.name}</span>
        <span style="color: ${config.color}; font-size: clamp(14px, 2vw, 24px); font-weight: bold;">${balloonEffectTimeLeft}s</span>
    `;
    document.body.appendChild(indicator);

    if (!document.getElementById('indicatorPulseStyle')) {
        const style = document.createElement('style');
        style.id = 'indicatorPulseStyle';
        style.textContent = `
            @keyframes indicatorPulse {
                0%, 100% { transform: translateX(-50%) scale(1); }
                50% { transform: translateX(-50%) scale(1.03); }
            }
        `;
        document.head.appendChild(style);
    }
}

function updateBalloons() {
    // Atualiza cooldown
    if (balloonSpawnCooldown > 0) {
        balloonSpawnCooldown--;
    }
    
    // Atualiza balões ativos
    for (let i = activeBalloons.length - 1; i >= 0; i--) {
        const balloon = activeBalloons[i];
        const keep = balloon.update();
        if (!keep || balloon.isExpired()) {
            activeBalloons.splice(i, 1);
        }
    }
}

function drawBalloons() {
    for (const balloon of activeBalloons) {
        balloon.draw();
    }
}

function getBalloonWeaponData() {
    if (balloonEffectActive && balloonEffectData) {
        return balloonEffectData;
    }
    return null;
}

// ============================================================
// SISTEMA DE CORAÇÃO VERDE (VIDA)
// ============================================================

let heartObjects = [];
let maxHearts = 5;
let currentHearts = 3;
let heartSpawnCount = 0;
const MAX_HEARTS_ACTIVE = 3;
const HEART_SPAWN_INTERVAL = 20;

class HeartObject {
    constructor(x, y) {
        this.x = x || 80 + Math.random() * (W - 160);
        this.y = y || 80 + Math.random() * (H - 160);
        this.radius = 22;
        this.life = 9999;
        this.collected = false;
        this.collectTimer = 0;
        this.alpha = 1;
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.vy = (Math.random() - 0.5) * 1.2;
        this.vx = (Math.random() - 0.5) * 1.2;
        this.bobPhase = Math.random() * Math.PI * 2;
        this.glowPhase = 0;
        this.rotation = 0;
    }

    update() {
        if (this.collected) {
            this.collectTimer++;
            this.alpha = Math.max(0, 1 - this.collectTimer / 20);
            return this.alpha > 0;
        }

        this.pulsePhase += 0.05;
        this.glowPhase += 0.03;
        this.bobPhase += 0.02;
        this.rotation += 0.01;

        this.x += this.vx;
        this.y += this.vy;
        
        if (this.x < this.radius) { this.x = this.radius; this.vx *= -1; }
        if (this.x > W - this.radius) { this.x = W - this.radius; this.vx *= -1; }
        if (this.y < this.radius) { this.y = this.radius; this.vy *= -1; }
        if (this.y > H - this.radius) { this.y = H - this.radius; this.vy *= -1; }

        return true;
    }

    draw() {
        if (this.collected && this.alpha <= 0) return;

        const pulse = 1 + Math.sin(this.pulsePhase) * 0.07;
        const radius = this.radius * pulse;

        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        const glowSize = 1 + Math.sin(this.glowPhase) * 0.1;
        const glow = ctx.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius * 2.5 * glowSize);
        glow.addColorStop(0, 'rgba(46, 204, 113, 0.3)');
        glow.addColorStop(0.3, 'rgba(46, 204, 113, 0.1)');
        glow.addColorStop(1, 'rgba(46, 204, 113, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 2.5 * glowSize, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowColor = 'rgba(46, 204, 113, 0.6)';
        ctx.shadowBlur = 25;

        const scale = radius / 22;
        const grad = ctx.createRadialGradient(-radius * 0.2, -radius * 0.3, radius * 0.1, 0, 0, radius);
        grad.addColorStop(0, '#88ff88');
        grad.addColorStop(0.3, '#2ecc71');
        grad.addColorStop(0.7, '#1a9c54');
        grad.addColorStop(1, '#0d6b3a');

        ctx.fillStyle = grad;
        ctx.shadowBlur = 25;
        ctx.shadowColor = 'rgba(46, 204, 113, 0.5)';

        ctx.beginPath();
        ctx.moveTo(0, radius * 0.35);
        ctx.bezierCurveTo(-radius * 0.8, -radius * 0.3, -radius * 0.6, -radius * 0.8, 0, -radius * 0.6);
        ctx.bezierCurveTo(radius * 0.6, -radius * 0.8, radius * 0.8, -radius * 0.3, 0, radius * 0.35);
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.strokeStyle = `rgba(46, 204, 113, ${0.3 + Math.sin(this.pulsePhase) * 0.2})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.arc(-radius * 0.2, -radius * 0.3, radius * 0.15, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
        ctx.shadowBlur = 8;
        ctx.font = `bold ${radius * 0.5}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+', 0, radius * 0.05);

        ctx.shadowBlur = 0;
        ctx.fillStyle = `rgba(46, 204, 113, ${0.6 + Math.sin(this.pulsePhase) * 0.2})`;
        ctx.font = `bold ${radius * 0.4}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('20%', 0, radius + 4);

        ctx.shadowBlur = 0;
        ctx.restore();
    }

    collect() {
        if (this.collected) return false;
        this.collected = true;
        this.collectTimer = 0;
        return true;
    }

    isExpired() {
        return this.collected && this.alpha <= 0;
    }

    getDistanceTo(x, y) {
        return Math.hypot(this.x - x, this.y - y);
    }
}

function spawnHeart() {
    if (heartSpawnCount >= maxHearts) return false;
    if (!gameActive || gameOver || levelTransitionPaused) return false;
    
    const activeHearts = heartObjects.filter(h => !h.collected).length;
    if (activeHearts >= MAX_HEARTS_ACTIVE) return false;

    const x = 80 + Math.random() * (W - 160);
    const y = 80 + Math.random() * (H - 160);
    
    for (const existing of heartObjects) {
        if (!existing.collected && existing.getDistanceTo(x, y) < 60) return false;
    }

    const heart = new HeartObject(x, y);
    heartObjects.push(heart);
    heartSpawnCount++;
    console.log(`❤️ Coração #${heartSpawnCount} apareceu!`);
    return true;
}

function collectHeart(heart) {
    if (!heart || heart.collected) return false;
    
    if (heart.collect()) {
        const healAmount = Math.ceil(barrierMaxHealth * 0.2);
        const oldHealth = barrierHealth;
        barrierHealth = Math.min(barrierMaxHealth, barrierHealth + healAmount);
        const actualHeal = barrierHealth - oldHealth;
        
        updateBarrierUI();
        createExplosion(heart.x, heart.y, '#2ecc71', 0.8, 20);
        showCoinFloatText(heart.x - 30, heart.y - 50, `❤️ +${actualHeal} HP`);
        
        setTimeout(() => {
            const index = heartObjects.indexOf(heart);
            if (index !== -1) heartObjects.splice(index, 1);
        }, 500);
        
        console.log(`❤️ Coração coletado! Recuperou ${actualHeal} HP`);
        return true;
    }
    return false;
}

function checkHeartCollection(mx, my) {
    if (!gameActive || gameOver || levelTransitionPaused || pauseActive || blockOverlayActive) return;
    
    for (let i = heartObjects.length - 1; i >= 0; i--) {
        const heart = heartObjects[i];
        if (heart.collected) continue;
        
        const dist = heart.getDistanceTo(mx, my);
        if (dist < heart.radius + 25) {
            collectHeart(heart);
            return;
        }
    }
}

function updateHearts() {
    for (let i = heartObjects.length - 1; i >= 0; i--) {
        const heart = heartObjects[i];
        const keep = heart.update();
        if (!keep || heart.isExpired()) {
            heartObjects.splice(i, 1);
        }
    }
}

function drawHearts() {
    for (const heart of heartObjects) {
        heart.draw();
    }
}

// ============================================================
// IMAGENS, CORES E CONFIGURAÇÕES DO JOGO
// ============================================================

const BOSS_IMAGES = {
    1: 'boss1.png', 2: 'boss2.png', 3: 'img/boss3.png', 4: 'img/boss4.png',
    5: null, 6: null, 7: null, 8: null, 9: null, 10: null,
    11: null, 12: null, 13: null, 14: null, 15: null, 16: null,
    17: null, 18: null, 19: null, 20: null
};

const loadedImages = {};

function loadBossImages() {
    for (let i = 1; i <= 20; i++) {
        const imgPath = BOSS_IMAGES[i];
        if (imgPath) {
            const img = new Image();
            img.onload = function() {};
            img.onerror = function() {};
            img.src = imgPath;
            loadedImages[i] = img;
        }
    }
}
loadBossImages();

const BALL_COLORS = [
    { main: '#ff3b30', dark: '#9b111e', light: '#ff9f94' },
    { main: '#007aff', dark: '#003366', light: '#74b9ff' },
    { main: '#ff9500', dark: '#cc5500', light: '#ffbe76' },
    { main: '#af52de', dark: '#5b2c91', light: '#d1a3f1' },
    { main: '#2ecc71', dark: '#1a7a3a', light: '#82e0aa' },
    { main: '#e74c3c', dark: '#922b21', light: '#f1948a' },
    { main: '#f1c40f', dark: '#b7950b', light: '#f7dc6f' },
    { main: '#1abc9c', dark: '#0e6655', light: '#76d7c4' },
    { main: '#e67e22', dark: '#935e16', light: '#f0b27a' }
];

const BONUS_VALUES = {
    0: 28, 1: 45, 2: 12, 3: 67, 4: 33, 5: 82, 6: 19, 7: 56, 8: 74
};

function getBonusForColor(colorIndex) {
    return BONUS_VALUES[colorIndex] || 28;
}

const COIN_VALUES = {
    '🤑': 199, '💰': 199, '💴': 249, '💵': 263,
    '💶': 289, '💷': 983, '🪙': 1260
};
const COIN_EMOJIS = ['🤑', '💰', '💴', '💵', '💶', '💷', '🪙'];

// ============================================================
// CONFIGURAÇÕES DOS CHEFÕES - VALORES RESTAURADOS
// ============================================================

const BOSS_HP = {
    1: 219, 2: 279, 3: 355, 4: 468, 5: 460,
    6: 444, 7: 432, 8: 406, 9: 388, 10: 364,
    11: 320, 12: 302, 13: 290, 14: 284, 15: 276,
    16: 270, 17: 266, 18: 260, 19: 250, 20: 236
};

const BOSS_NAMES = {
    1: '💀 BOSS 1', 2: '💀 BOSS 2', 3: '💀 BOSS 3', 4: '💀 BOSS 4', 5: '💀 BOSS 5',
    6: '💀 BOSS 6', 7: '💀 BOSS 7', 8: '💀 BOSS 8', 9: '💀 BOSS 9', 10: '💀 BOSS 10',
    11: '💀 BOSS 11', 12: '💀 BOSS 12', 13: '💀 BOSS 13', 14: '💀 BOSS 14', 15: '💀 BOSS 15',
    16: '💀 BOSS 16', 17: '💀 BOSS 17', 18: '💀 BOSS 18', 19: '💀 BOSS 19', 20: '👑 BOSS FINAL'
};

// ============================================================
// CONFIGURAÇÕES DOS ALVOS - VALORES RESTAURADOS
// ============================================================

const LEVEL_TARGETS = {
    1: 389, 2: 377, 3: 595, 4: 588, 5: 571,
    6: 566, 7: 551, 8: 538, 9: 522, 10: 503,
    11: 1, 12: 1, 13: 1, 14: 1, 15: 1,
    16: 489, 17: 444, 18: 422, 19: 408, 20: 379
};

// ============================================================
// CONFIGURAÇÕES DOS NÍVEIS
// ============================================================

const LEVELS = [];
for (let i = 1; i <= 20; i++) {
    let enemyDamage;
    let enemyHp;
    
    if (i >= 1 && i <= 5) {
        enemyDamage = Math.floor(Math.random() * 27) + 13;
        enemyHp = Math.min(3 + Math.floor(i / 4), 7);
    } else if (i >= 6 && i <= 10) {
        enemyDamage = Math.floor(Math.random() * 5) + 39;
        enemyHp = Math.floor(Math.random() * 4) + 9;
    } else if (i >= 11 && i <= 15) {
        enemyDamage = Math.floor(Math.random() * 11) + 56;
        enemyHp = Math.floor(Math.random() * 4) + 13;
    } else if (i >= 16 && i <= 20) {
        enemyDamage = Math.floor(Math.random() * 76) + 75;
        enemyHp = Math.floor(Math.random() * 11) + 20;
    } else {
        enemyDamage = 20;
        enemyHp = 3;
    }
    
    const baseEnemies = 8 + Math.floor(i * 0.9);
    LEVELS.push({
        enemies: Math.min(baseEnemies, 21),
        hp: enemyHp,
        speed: (3 + (i * 0.15)) * 1.5,
        radius: 42 - (i * 0.4),
        targetCount: LEVEL_TARGETS[i] || 2,
        damage: enemyDamage
    });
}

// ============================================================
// CONFIGURAÇÕES DA BARREIRA
// ============================================================

const BARRIER_CONFIG = {
    maxHealth: 5600,
    initialHealth: 5600,
    getDamage: function(level) {
        const lvlData = LEVELS[level - 1] || LEVELS[0];
        return lvlData.damage || 1;
    },
    getBossDamage: function(level) {
        if (level >= 1 && level <= 20) {
            return Math.floor(Math.random() * 12) + 19;
        }
        return 1;
    }
};

let barrierHealth = BARRIER_CONFIG.initialHealth;
let barrierMaxHealth = BARRIER_CONFIG.maxHealth;

// ============================================================
// ESTRATÉGIAS DE ATAQUE DOS CHEFÕES
// ============================================================

const BOSS_ATTACK_STRATEGIES = {};
const attackTypes = ['rain', 'sniper', 'spread', 'bomb', 'shotgun', 'meteor', 'spiral', 'mine', 'beam', 'wave', 'tornado', 'supernova', 'apocalypse'];
for (let i = 1; i <= 20; i++) {
    const typeIndex = (i - 1) % attackTypes.length;
    const damage = Math.max(5, 19 + Math.floor(i / 3));
    BOSS_ATTACK_STRATEGIES[i] = {
        type: attackTypes[typeIndex],
        damage: damage,
        direction: 'down'
    };
}

// ============================================================
// VARIÁVEIS GLOBAIS DO JOGO
// ============================================================

let currentLevel = 1;
let enemies = [];
let coins = 0;
let score = 2;
let totalTargetsEliminated = 0;
let totalBossesDefeated = 0;
let timer = 300;
let timerInterval = null;
let gameActive = false;
let gameOver = false;

let bossActive = false;
let boss = null;
let bossDefeated = false;
let explosionParticles = [];
let bossSpawned = false;
let floatingCoins = [];

let levelTransitionActive = false;
let levelTransitionPaused = false;
let levelStartTime = 0;
let levelCoinsEarned = 0;
let levelKills = 0;
let totalCoinsAccumulated = 0;
let isTransitioning = false;

let weaponStates = {};
let activeWeapon = null;
let activeWeaponTimer = null;
let projectiles = [];
let hitEffects = [];
let pauseActive = false;
let mouseX = -1000;
let mouseY = -1000;

let bossAttacks = [];
let bossAttackTimer = 0;
let bossAttackCooldown = 120;
let bossAttackPattern = null;
let bossAttackPhase = 0;
let bossAttackProgress = 0;

let bossDefeatTimeout = null;
let bossSpawnedThisLevel = false;

// ============================================================
// WEAPONS
// ============================================================

const WEAPONS = [
    { id: 'double', name: 'Double Shot', price: 2500, duration: 15, type: 'double', color: '#ff9933', damage: 1, image: 'Arma04.png', btnColor: '' },
    { id: 'triple', name: 'Triple Shot', price: 4500, duration: 20, type: 'triple', color: '#ff6bff', damage: 1, image: 'Arma04.png', btnColor: 'orange' },
    { id: 'triple2', name: 'Triple Shot+', price: 9000, duration: 15, type: 'triple', color: '#ff66b2', damage: 1, image: 'Arma04.png', btnColor: 'red' },
    { id: 'quad', name: 'Quad Shot', price: 13500, duration: 30, type: 'quad', color: '#00ccff', damage: 1, image: 'Arma04.png', btnColor: 'green' },
    { id: 'double2', name: 'Double Shot+', price: 2900, duration: 15, type: 'double', color: '#ffaa00', damage: 1, image: 'Arma04.png', btnColor: '' },
    { id: 'quint', name: 'Quintuple Shot', price: 6500, duration: 15, type: 'quint', color: '#66ff66', damage: 1, image: 'Arma04.png', btnColor: 'orange' }
];

// ============================================================
// ELEMENTOS DOM
// ============================================================

const timeVal = document.getElementById('time-val');
const coinVal = document.getElementById('coin-val');
const targetCount = document.getElementById('target-count');
const levelVal = document.getElementById('level-val');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalLevel = document.getElementById('final-level');
const finalCoins = document.getElementById('final-coins');
const finalTargets = document.getElementById('final-targets');
const finalBosses = document.getElementById('final-bosses');
const bossHealthBar = document.getElementById('bossHealthBar');
const bossHealthFill = document.getElementById('bossHealthFill');
const bossName = document.getElementById('bossName');
const bossHpText = document.getElementById('bossHpText');
const transitionScreen = document.getElementById('levelTransitionScreen');
const transitionLevelName = document.getElementById('transitionLevelName');
const transitionLevelTime = document.getElementById('transitionLevelTime');
const transitionLevelKills = document.getElementById('transitionLevelKills');
const transitionLevelCoins = document.getElementById('transitionLevelCoins');
const transitionTotalCoins = document.getElementById('transitionTotalCoins');
const btnContinue = document.getElementById('btnContinue');
const pauseOverlay = document.getElementById('pauseOverlay');
const pauseCoinBalance = document.getElementById('pauseCoinBalance');
const weaponsGrid = document.getElementById('weaponsGrid');
const btnPauseGame = document.getElementById('btnPauseGame');
const btnResumeGame = document.getElementById('btnResumeGame');
const btnHome = document.getElementById('btnHome');

const victoryScreen = document.getElementById('victoryScreen');
const victoryCoins = document.getElementById('victory-coins');
const victoryTargets = document.getElementById('victory-targets');
const victoryBosses = document.getElementById('victory-bosses');
const btnVictoryRestart = document.getElementById('btnVictoryRestart');

const barrierText = document.getElementById('barrierText');
const barrierHitEffect = document.getElementById('barrierHitEffect');

const remainingCircle = document.getElementById('remainingCircle');

const levelBlockOverlay = document.getElementById('levelBlockOverlay');
const btnUnlockLevel = document.getElementById('btnUnlockLevel');
const btnBackLevel = document.getElementById('btnBackLevel');
const btnCloseBlock = document.getElementById('btnCloseBlock');

// ============================================================
// FUNÇÃO PARA ATUALIZAR O CÍRCULO DE ALVOS
// ============================================================

function updateRemainingCircle(count) {
    const circle = document.getElementById('remainingCircle');
    const countEl = document.getElementById('target-count');
    const labelTop = document.querySelector('.remaining-circle .label-top');
    const labelBottom = document.querySelector('.remaining-circle .label-bottom');
    
    circle.classList.remove('status-high', 'status-medium', 'status-low', 'status-boss');
    
    if (bossActive && boss && !boss.defeated) {
        circle.classList.add('status-boss');
        countEl.textContent = '💀';
        labelTop.textContent = 'Big Boss';
        labelBottom.textContent = 'Ativo';
    } else {
        countEl.textContent = count;
        labelTop.textContent = 'TARGETS';
        labelBottom.textContent = 'REMAIN';
        
        if (count > 3) {
            circle.classList.add('status-high');
        } else if (count > 1) {
            circle.classList.add('status-medium');
        } else if (count > 0) {
            circle.classList.add('status-low');
        } else {
            circle.classList.add('status-high');
        }
    }
}

// ============================================================
// CLASSES DO JOGO
// ============================================================

class HitEffect {
    constructor(target, hitX, hitY) {
        this.target = target;
        this.flashAlpha = 0;
        this.life = 8;
        this.maxLife = 8;
        this.active = true;
    }
    update() {
        if (!this.active) return;
        this.life--;
        const progress = 1 - (this.life / this.maxLife);
        this.flashAlpha = progress < 0.2 ? 0.5 * (1 - progress / 0.2) : 0;
        if (this.life <= 0) this.active = false;
    }
    draw() {
        if (!this.active || this.flashAlpha <= 0) return;
        ctx.save();
        ctx.globalAlpha = this.flashAlpha;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.target.x, this.target.y, this.target.radius * 1.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    isActive() { return this.active; }
}

function addHitEffect(target, hitX, hitY) {
    const effect = new HitEffect(target, hitX, hitY);
    hitEffects.push(effect);
    if (hitEffects.length > 20) hitEffects.splice(0, 1);
}

function updateHitEffects() {
    for (let i = hitEffects.length - 1; i >= 0; i--) {
        hitEffects[i].update();
        if (!hitEffects[i].isActive()) hitEffects.splice(i, 1);
    }
}

function drawHitEffects() {
    for (const effect of hitEffects) effect.draw();
}

function createExplosion(x, y, color, sizeMultiplier = 1, count = 25) {
    const particleCount = Math.floor(count * sizeMultiplier);
    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (1.5 + Math.random() * 4) * sizeMultiplier;
        const radius = (3 + Math.random() * 10) * sizeMultiplier;
        explosionParticles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1.5 * sizeMultiplier,
            radius,
            life: 40 + Math.random() * 20,
            maxLife: 60,
            color: color || '#FFD700',
            gravity: 0.08 * sizeMultiplier
        });
    }
}

// ============================================================
// CLASSE BOSS
// ============================================================

class Boss {
    constructor(level) {
        this.level = level;
        this.maxHp = BOSS_HP[level] || 250;
        this.hp = this.maxHp;
        this.radius = Math.max(24, Math.min(90, 36 + (level * 0.9) + (W * 0.036)));
        this.x = W / 2;
        this.y = -this.radius - 50;
        this.targetY = Math.max(100, Math.min(200, 120 + Math.random() * 80 + (H * 0.04)));
        this.vx = (Math.random() - 0.5) * 1.5;
        this.vy = 1.2 + (level * 0.04);
        this.direction = 1;
        this.moveTimer = 0;
        this.pulsePhase = 0;
        this.entering = true;
        this.enteringSpeed = 1.8 + (level * 0.04);
        this.defeated = false;
        this.image = loadedImages[level] || null;
        this.imageLoaded = this.image && this.image.complete && this.image.naturalWidth > 0;
        const hue = (level * 18) % 360;
        this.color = `hsl(${hue}, 80%, 60%)`;
        this.colorDark = `hsl(${hue}, 80%, 30%)`;
        this.colorLight = `hsl(${hue}, 90%, 75%)`;
        
        const strategy = BOSS_ATTACK_STRATEGIES[level] || BOSS_ATTACK_STRATEGIES[5];
        this.attackStrategy = strategy;
        this.attackCooldown = Math.max(80, 200 - level * 2);
        this.attackTimer = 0;
        this.attackPhase = 0;
        this.attackProgress = 0;
        this.isAttacking = false;
        this.attackCount = 0;
    }

    update() {
        this.pulsePhase += 0.03;
        
        if (this.attackStrategy) {
            this.attackTimer++;
            if (this.attackTimer >= this.attackCooldown && !this.isAttacking && !this.entering) {
                this.startAttack();
            }
            if (this.isAttacking) {
                this.updateAttack();
            }
        }
        
        if (this.entering) {
            this.y += this.enteringSpeed;
            if (this.y >= this.targetY) {
                this.entering = false;
                this.y = this.targetY;
            }
            return;
        }
        
        this.moveTimer += 0.02;
        this.y += this.vy * this.direction;
        this.x += Math.sin(this.moveTimer * 0.7) * 1.0;
        if (this.y > H - this.radius - 20) this.direction = -1;
        else if (this.y < 100) this.direction = 1;
        if (this.x < this.radius) this.x = this.radius;
        if (this.x > W - this.radius) this.x = W - this.radius;
    }

    startAttack() {
        if (!this.attackStrategy || this.isAttacking || this.entering) return;
        this.isAttacking = true;
        this.attackPhase = 0;
        this.attackProgress = 0;
        this.attackTimer = 0;
        this.attackCount = 0;
        audioManager.playSoundEffect('bossShoot');
        audioManager.playBossAttackSound(this.attackStrategy.type);
    }

    updateAttack() {
        if (!this.isAttacking) return;
        this.attackProgress++;
        this.attackTimer++;
        const strategy = this.attackStrategy;
        const level = this.level;
        const damage = strategy.damage;
        
        switch (strategy.type) {
            case 'rain': this.updateRainAttack(damage); break;
            case 'sniper': this.updateSniperAttack(damage); break;
            case 'spread': this.updateSpreadAttack(damage); break;
            case 'bomb': this.updateBombAttack(damage); break;
            case 'laser': this.updateLaserAttack(damage); break;
            case 'homing': this.updateHomingAttack(damage); break;
            case 'burst': this.updateBurstAttack(damage); break;
            case 'meteor': this.updateMeteorAttack(damage); break;
            case 'spiral': this.updateSpiralAttack(damage); break;
            case 'shotgun': this.updateShotgunAttack(damage); break;
            case 'mine': this.updateMineAttack(damage); break;
            case 'beam': this.updateBeamAttack(damage); break;
            case 'wave': this.updateWaveAttack(damage); break;
            case 'tornado': this.updateTornadoAttack(damage); break;
            case 'supernova': this.updateSupernovaAttack(damage); break;
            case 'apocalypse': this.updateApocalypseAttack(damage); break;
            default: this.updateDefaultAttack(damage);
        }
    }

    updateRainAttack(damage) {
        if (this.attackProgress % 10 === 0) {
            const count = 2 + Math.floor(this.level / 4);
            for (let i = 0; i < count; i++) {
                const x = this.x + (Math.random() - 0.5) * this.radius * 1.5;
                const angle = Math.PI / 2 + (Math.random() - 0.5) * 0.3;
                const speed = 2.5 + Math.random() * 2.5;
                const attack = new BossAttack(x, this.y + this.radius * 0.3, angle, speed, '#ff4444', damage, 'rain');
                attack.targetY = H - 20 - Math.random() * 100;
                attack.gravity = 0.04;
                bossAttacks.push(attack);
            }
        }
        if (this.attackProgress > 120) this.finishAttack();
    }

    updateSniperAttack(damage) {
        if (this.attackProgress % 25 === 0) {
            const targetX = W / 2 + (Math.random() - 0.5) * 200;
            const angle = Math.PI / 2 + (Math.random() - 0.5) * 0.05;
            const attack = new BossAttack(this.x, this.y + this.radius * 0.3, angle, 7 + this.level * 0.15, '#ffaa00', damage, 'sniper');
            attack.targetX = targetX;
            attack.trailColor = '#ffaa00';
            bossAttacks.push(attack);
        }
        if (this.attackProgress > 60) this.finishAttack();
    }

    updateSpreadAttack(damage) {
        if (this.attackProgress % 18 === 0) {
            const count = 4 + Math.floor(this.level / 4);
            for (let i = 0; i < count; i++) {
                const angleOffset = (i - (count - 1) / 2) * 0.15;
                const angle = Math.PI / 2 + angleOffset + (Math.random() - 0.5) * 0.1;
                const speed = 4 + Math.random() * 3;
                const attack = new BossAttack(this.x, this.y + this.radius * 0.3, angle, speed, '#ff66ff', damage, 'spread');
                bossAttacks.push(attack);
            }
        }
        if (this.attackProgress > 80) this.finishAttack();
    }

    updateBombAttack(damage) {
        if (this.attackProgress === 15) {
            const attack = new BossAttack(this.x, this.y + this.radius * 0.3, Math.PI / 2, 1.5, '#ff4444', damage * 1.5, 'bomb');
            attack.radius = 18;
            attack.isBomb = true;
            attack.bombTimer = 60;
            attack.gravity = 0.08;
            bossAttacks.push(attack);
        }
        if (this.attackProgress > 80) this.finishAttack();
    }

    updateLaserAttack(damage) {
        if (this.attackProgress % 6 === 0 && this.attackProgress < 50) {
            const angleOffset = (this.attackProgress / 50) * 0.5 - 0.25;
            const angle = Math.PI / 2 + angleOffset;
            const attack = new BossAttack(this.x, this.y + this.radius * 0.3, angle, 9, '#ff0000', damage, 'laser');
            attack.isLaser = true;
            attack.laserDuration = 6;
            bossAttacks.push(attack);
        }
        if (this.attackProgress > 50) this.finishAttack();
    }

    updateHomingAttack(damage) {
        if (this.attackProgress % 30 === 0) {
            const count = 1 + Math.floor(this.level / 6);
            for (let i = 0; i < count; i++) {
                const attack = new BossAttack(this.x, this.y + this.radius * 0.3, Math.PI / 2, 2.5 + this.level * 0.08, '#ff8800', damage, 'homing');
                attack.isHoming = true;
                attack.homingStrength = 0.04 + this.level * 0.0015;
                attack.gravity = 0.02;
                bossAttacks.push(attack);
            }
        }
        if (this.attackProgress > 60) this.finishAttack();
    }

    updateBurstAttack(damage) {
        if (this.attackProgress % 4 === 0 && this.attackProgress < 30) {
            const angle = Math.PI / 2 + (Math.random() - 0.5) * 0.5;
            const attack = new BossAttack(this.x, this.y + this.radius * 0.3, angle, 6 + Math.random() * 2.5, '#ff66ff', damage, 'burst');
            bossAttacks.push(attack);
        }
        if (this.attackProgress > 30) this.finishAttack();
    }

    updateMeteorAttack(damage) {
        if (this.attackProgress === 8) {
            const x = Math.random() * W;
            const attack = new BossAttack(x, -30, Math.PI / 2, 2.5 + this.level * 0.15, '#ff6600', damage * 1.2, 'meteor');
            attack.radius = 25;
            attack.isMeteor = true;
            attack.gravity = 0.15;
            bossAttacks.push(attack);
        }
        if (this.attackProgress > 100) this.finishAttack();
    }

    updateSpiralAttack(damage) {
        if (this.attackProgress % 5 === 0) {
            const angle = Math.PI / 2 + (this.attackProgress * 0.05);
            const attack = new BossAttack(this.x, this.y + this.radius * 0.3, angle, 4.5, '#00ff88', damage, 'spiral');
            bossAttacks.push(attack);
        }
        if (this.attackProgress > 120) this.finishAttack();
    }

    updateShotgunAttack(damage) {
        if (this.attackProgress % 25 === 0) {
            const count = 6 + Math.floor(this.level / 3);
            for (let i = 0; i < count; i++) {
                const angleOffset = (i - (count - 1) / 2) * 0.08;
                const angle = Math.PI / 2 + angleOffset;
                const speed = 5 + Math.random() * 2;
                const attack = new BossAttack(this.x, this.y + this.radius * 0.3, angle, speed, '#ffaa44', damage, 'shotgun');
                bossAttacks.push(attack);
            }
        }
        if (this.attackProgress > 60) this.finishAttack();
    }

    updateMineAttack(damage) {
        if (this.attackProgress % 35 === 0) {
            const x = Math.random() * (W - 100) + 50;
            const attack = new BossAttack(x, H - 30, Math.PI / 2, 0, '#ff4444', damage, 'mine');
            attack.radius = 13;
            attack.isMine = true;
            attack.mineActive = true;
            attack.mineTimer = 0;
            bossAttacks.push(attack);
        }
        if (this.attackProgress > 120) this.finishAttack();
    }

    updateBeamAttack(damage) {
        if (this.attackProgress % 3 === 0 && this.attackProgress < 40) {
            const angle = Math.PI / 2 + (Math.random() - 0.5) * 0.6;
            const attack = new BossAttack(this.x, this.y + this.radius * 0.3, angle, 8, '#00ccff', damage, 'beam');
            attack.isBeam = true;
            attack.beamDuration = 4;
            bossAttacks.push(attack);
        }
        if (this.attackProgress > 40) this.finishAttack();
    }

    updateWaveAttack(damage) {
        if (this.attackProgress % 12 === 0) {
            const count = 8 + Math.floor(this.level / 3);
            const baseX = this.x - count * 12;
            for (let i = 0; i < count; i++) {
                const x = baseX + i * 25 + Math.sin(i * 0.5 + this.attackProgress * 0.05) * 15;
                const attack = new BossAttack(x, this.y + this.radius * 0.3, Math.PI / 2, 3.5, '#0088ff', damage, 'wave');
                attack.gravity = 0.02;
                bossAttacks.push(attack);
            }
        }
        if (this.attackProgress > 80) this.finishAttack();
    }

    updateTornadoAttack(damage) {
        if (this.attackProgress % 6 === 0) {
            const angle = Math.PI / 2 + Math.sin(this.attackProgress * 0.1) * 0.8;
            const speed = 3.5 + Math.sin(this.attackProgress * 0.15) * 1.5;
            const attack = new BossAttack(this.x, this.y + this.radius * 0.3, angle, speed, '#88ff88', damage, 'tornado');
            bossAttacks.push(attack);
        }
        if (this.attackProgress > 80) this.finishAttack();
    }

    updateSupernovaAttack(damage) {
        if (this.attackProgress === 25) {
            const count = 12 + Math.floor(this.level / 3);
            for (let i = 0; i < count; i++) {
                const angle = Math.PI / 2 + (i / count) * Math.PI * 2;
                const speed = 4 + Math.random() * 3;
                const attack = new BossAttack(this.x, this.y + this.radius * 0.3, angle, speed, '#ff44ff', damage, 'supernova');
                bossAttacks.push(attack);
            }
            createExplosion(this.x, this.y, '#ff44ff', 1.2, 20);
        }
        if (this.attackProgress > 60) this.finishAttack();
    }

    updateApocalypseAttack(damage) {
        if (this.attackProgress % 12 === 0 && this.attackProgress < 80) {
            const count = 4 + Math.floor(this.level / 4);
            for (let i = 0; i < count; i++) {
                const angle = Math.PI / 2 + (Math.random() - 0.5) * 1.2;
                const speed = 3.5 + Math.random() * 3.5;
                const attack = new BossAttack(
                    this.x + (Math.random() - 0.5) * this.radius,
                    this.y + this.radius * 0.3,
                    angle, speed, '#ff0044', damage, 'apocalypse'
                );
                attack.radius = 8 + Math.random() * 6;
                attack.gravity = 0.04;
                bossAttacks.push(attack);
            }
        }
        if (this.attackProgress > 80) this.finishAttack();
    }

    updateDefaultAttack(damage) {
        if (this.attackProgress % 18 === 0) {
            const angle = Math.PI / 2 + (Math.random() - 0.5) * 0.3;
            const attack = new BossAttack(this.x, this.y + this.radius * 0.3, angle, 4 + Math.random() * 2, '#ff0000', damage, 'default');
            bossAttacks.push(attack);
        }
        if (this.attackProgress > 60) this.finishAttack();
    }

    finishAttack() {
        this.isAttacking = false;
        this.attackTimer = 0;
        this.attackProgress = 0;
        this.attackCount++;
        this.attackCooldown = Math.max(50, 200 - this.level * 2 + Math.floor(Math.random() * 60) - 30);
    }

    draw() {
        if (this.defeated) return;
        ctx.save();
        const pulseScale = 1 + Math.sin(this.pulsePhase * 2) * 0.05;
        const glowRadius = this.radius * 1.6;
        const glow = ctx.createRadialGradient(this.x, this.y, this.radius * 0.5, this.x, this.y, glowRadius);
        glow.addColorStop(0, `rgba(255, 215, 0, 0.2)`);
        glow.addColorStop(0.3, `rgba(255, 200, 0, 0.1)`);
        glow.addColorStop(1, `rgba(255, 200, 0, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(this.x, this.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        const hasValidImage = this.image && this.image.complete && this.image.naturalWidth > 0;
        if (hasValidImage) {
            const size = this.radius * 2 * pulseScale;
            ctx.shadowColor = 'rgba(255, 215, 0, 0.4)';
            ctx.shadowBlur = 20;
            ctx.drawImage(this.image, this.x - size/2, this.y - size/2, size, size);
            ctx.shadowBlur = 0;
        } else {
            const grad = ctx.createRadialGradient(this.x - this.radius * 0.3, this.y - this.radius * 0.3, 5, this.x, this.y, this.radius * pulseScale);
            grad.addColorStop(0, this.colorLight);
            grad.addColorStop(0.4, this.color);
            grad.addColorStop(1, this.colorDark);
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * pulseScale, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.strokeStyle = `rgba(255, 215, 0, ${0.2 + Math.sin(this.pulsePhase * 2) * 0.15})`;
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.fillStyle = '#ff0000';
            ctx.shadowColor = 'rgba(255, 0, 0, 0.6)';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.ellipse(this.x - this.radius * 0.3, this.y - this.radius * 0.1, this.radius * 0.25, this.radius * 0.3, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(this.x + this.radius * 0.3, this.y - this.radius * 0.1, this.radius * 0.25, this.radius * 0.3, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.ellipse(this.x - this.radius * 0.25, this.y - this.radius * 0.1, this.radius * 0.12, this.radius * 0.16, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(this.x + this.radius * 0.35, this.y - this.radius * 0.1, this.radius * 0.12, this.radius * 0.16, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ff0000';
            ctx.shadowColor = 'rgba(255, 0, 0, 0.6)';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(this.x - this.radius * 0.25, this.y - this.radius * 0.05, this.radius * 0.05, 0, Math.PI * 2);
            ctx.arc(this.x + this.radius * 0.35, this.y - this.radius * 0.05, this.radius * 0.05, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
        ctx.restore();
    }

    takeDamage() {
        this.hp--;
        audioManager.playBossHitSound();
        if (this.hp <= 0) {
            this.defeated = true;
            this.hp = 0;
            createExplosion(this.x, this.y, '#FFD700', 1.2, 25);
            audioManager.playSoundEffect('bossDefeat');
            return true;
        }
        return false;
    }

    getHpPercent() {
        return (this.hp / this.maxHp) * 100;
    }
}

function clamp(min, max, value) {
    return Math.min(Math.max(value, min), max);
}

// ============================================================
// CLASSE BOSS ATTACK
// ============================================================

class BossAttack {
    constructor(x, y, angle, speed, color, damage, type = 'default') {
        this.x = x;
        this.y = y;
        this.angle = angle || Math.PI / 2;
        this.speed = speed || 5;
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;
        this.radius = Math.max(6, Math.min(14, 9 + (W * 0.012)));
        this.color = color || '#ff4444';
        this.damage = damage || 5;
        this.type = type;
        this.active = true;
        this.life = 150;
        this.trail = [];
        this.maxTrail = Math.max(6, Math.min(12, 10));
        
        this.isBomb = false;
        this.bombTimer = 0;
        this.isHoming = false;
        this.homingStrength = 0.03;
        this.isLaser = false;
        this.laserDuration = 0;
        this.isMeteor = false;
        this.isMine = false;
        this.mineActive = false;
        this.mineTimer = 0;
        this.isBeam = false;
        this.beamDuration = 0;
        this.targetX = null;
        this.targetY = null;
        this.trailColor = null;
        this.gravity = 0;
        this.explosionRadius = 25;
    }

    update() {
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrail) this.trail.shift();
        this.life--;
        
        if (this.gravity) {
            this.vy += this.gravity;
        }
        
        if (this.isHoming && enemies.length > 0) {
            let target = null;
            let minDist = Infinity;
            for (const en of enemies) {
                const dist = Math.hypot(en.x - this.x, en.y - this.y);
                if (dist < minDist) {
                    minDist = dist;
                    target = en;
                }
            }
            if (target) {
                const targetAngle = Math.atan2(target.y - this.y, target.x - this.x);
                const diff = targetAngle - this.angle;
                this.angle += Math.atan2(Math.sin(diff), Math.cos(diff)) * this.homingStrength;
                this.vx = Math.cos(this.angle) * this.speed;
                this.vy = Math.sin(this.angle) * this.speed;
            }
        }
        
        if (this.isBomb) {
            this.bombTimer++;
            if (this.bombTimer > 60) {
                this.explode();
                return;
            }
        }
        
        if (this.isMine) {
            this.mineTimer++;
            if (this.mineTimer > 30) {
                this.mineActive = true;
                this.radius = 16;
            }
        }
        
        this.x += this.vx;
        this.y += this.vy;
        
        if (this.type === 'sniper' && this.targetX !== null && this.y > H - 20) {
            this.explode();
            return;
        }
        
        if (this.type === 'rain' && this.targetY !== null && this.y > this.targetY) {
            this.explode();
            return;
        }
        
        if (this.x < -50 || this.x > W + 50 || this.y < -50 || this.y > H + 50) {
            this.active = false;
        }
        
        if (this.vy > 0 && this.y + this.radius > H - 10) {
            this.hitBarrier();
            return;
        }
    }

    explode() {
        this.active = false;
        createExplosion(this.x, this.y, this.color, 1.0, 15);
        if (this.y > H - 50) {
            this.hitBarrier();
        }
    }

    hitBarrier() {
        this.active = false;
        const damage = this.damage || 5;
        barrierHealth = Math.max(0, barrierHealth - damage);
        updateBarrierUI();
        triggerBarrierHitEffect();
        createExplosion(this.x, H - 10, '#ff8800', 0.6, 10);
        if (barrierHealth <= 0) {
            barrierHealth = 0;
            updateBarrierUI();
            gameActive = false;
            clearInterval(timerInterval);
            audioManager.stopMusic();
            savePlayerProgress();
            showGameOver('barrier');
        }
    }

    draw() {
        if (!this.active) return;
        ctx.save();
        
        for (let i = 0; i < this.trail.length; i++) {
            const alpha = i / this.trail.length * 0.4;
            const radius = this.radius * (0.2 + 0.8 * (i / this.trail.length));
            ctx.globalAlpha = alpha;
            ctx.fillStyle = this.trailColor || this.color;
            ctx.shadowColor = this.trailColor || this.color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(this.trail[i].x, this.trail[i].y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        
        const grad = ctx.createRadialGradient(
            this.x - this.radius * 0.3, this.y - this.radius * 0.3, 2,
            this.x, this.y, this.radius
        );
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.3, this.color);
        grad.addColorStop(1, this.color);
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 20;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        if (this.isBomb) {
            ctx.shadowBlur = 30;
            ctx.strokeStyle = '#ff4444';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 1.4, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        if (this.isMine && this.mineActive) {
            ctx.shadowBlur = 25;
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 1.6, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        if (this.isLaser || this.isBeam) {
            ctx.shadowBlur = 30;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x + Math.cos(this.angle) * 70, this.y + Math.sin(this.angle) * 70);
            ctx.stroke();
        }
        
        ctx.restore();
    }

    isActive() { return this.active; }
}

// ============================================================
// CLASSE ENEMY
// ============================================================

class Enemy {
    constructor(level) {
        const lvlData = LEVELS[level - 1] || LEVELS[0];
        this.radius = Math.max(12, Math.min(38, lvlData.radius * 0.75 + Math.random() * 7 + (W * 0.01875)));
        this.x = Math.random() * (W - this.radius * 2) + this.radius;
        this.y = Math.random() * (H - this.radius * 2) + this.radius;
        this.colorIndex = Math.floor(Math.random() * BALL_COLORS.length);
        this.color = BALL_COLORS[this.colorIndex];
        this.vx = (Math.random() - 0.5) * lvlData.speed;
        this.vy = (Math.random() - 0.5) * lvlData.speed;
        this.hp = lvlData.hp;
        this.maxHp = lvlData.hp;
        this.level = level;
        this.damage = lvlData.damage || 1;
    }

    reset(level) {
        const lvlData = LEVELS[level - 1] || LEVELS[0];
        this.radius = Math.max(12, Math.min(38, lvlData.radius * 0.75 + Math.random() * 7 + (W * 0.01875)));
        this.x = Math.random() * (W - this.radius * 2) + this.radius;
        this.y = Math.random() * (H - this.radius * 2) + this.radius;
        this.colorIndex = Math.floor(Math.random() * BALL_COLORS.length);
        this.color = BALL_COLORS[this.colorIndex];
        this.vx = (Math.random() - 0.5) * lvlData.speed;
        this.vy = (Math.random() - 0.5) * lvlData.speed;
        this.hp = lvlData.hp;
        this.maxHp = lvlData.hp;
        this.level = level;
        this.damage = lvlData.damage || 1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < this.radius || this.x > W - this.radius) this.vx *= -1;
        if (this.y < this.radius || this.y > H - this.radius) this.vy *= -1;
        
        if (this.y + this.radius > H - 5 && this.vy > 0) {
            this.hitBarrier();
        }
    }

    hitBarrier() {
        const damage = this.damage || 1;
        barrierHealth = Math.max(0, barrierHealth - damage);
        updateBarrierUI();
        triggerBarrierHitEffect();
        createExplosion(this.x, H - 10, '#ff6666', 0.5, 8);
        this.hp = 0;
        if (barrierHealth <= 0) {
            barrierHealth = 0;
            updateBarrierUI();
            gameActive = false;
            clearInterval(timerInterval);
            audioManager.stopMusic();
            savePlayerProgress();
            showGameOver('barrier');
        }
    }

    draw() {
        ctx.save();
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(this.x - 8, this.y - this.radius - 4, 16, 12);
        const grad = ctx.createRadialGradient(this.x - this.radius * 0.3, this.y - this.radius * 0.3, 4, this.x, this.y, this.radius);
        grad.addColorStop(0, this.color.light);
        grad.addColorStop(0.4, this.color.main);
        grad.addColorStop(1, this.color.dark);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
        const eyeW = this.radius * 0.3;
        const eyeH = this.radius * 0.4;
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.ellipse(this.x - this.radius * 0.3, this.y - this.radius * 0.1, eyeW, eyeH, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(this.x + this.radius * 0.3, this.y - this.radius * 0.1, eyeW, eyeH, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(this.x - this.radius * 0.3, this.y - this.radius * 0.05, eyeW * 0.4, 0, Math.PI * 2);
        ctx.arc(this.x + this.radius * 0.3, this.y - this.radius * 0.05, eyeW * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f1c40f';
        this.drawStar(this.x, this.y + this.radius * 0.3, 5, this.radius * 0.18, this.radius * 0.09);
        const barW = this.radius * 1.2;
        const barH = Math.max(6, Math.min(12, 10));
        const barX = this.x - barW / 2;
        const barY = this.y - this.radius - 20;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, barH, 4);
        ctx.fill();
        const hpPercent = this.hp / this.maxHp;
        ctx.fillStyle = hpPercent > 0.6 ? '#2ecc71' : hpPercent > 0.3 ? '#f1c40f' : '#e74c3c';
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW * hpPercent, barH, 4);
        ctx.fill();
        const bonus = getBonusForColor(this.colorIndex);
        ctx.fillStyle = '#FFD700';
        ctx.font = `bold ${Math.max(7, Math.min(12, 9))}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 3;
        ctx.fillText(`💰${bonus}`, this.x, this.y - this.radius - 24);
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    drawStar(cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let step = Math.PI / spikes;
        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < spikes; i++) {
            ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
            rot += step;
            ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
            rot += step;
        }
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
        ctx.fill();
    }

    takeDamage(hitX, hitY) {
        this.hp--;
        addHitEffect(this, hitX, hitY);
        audioManager.playSoundEffect('hitTarget');
        if (this.hp <= 0) {
            const sizeMultiplier = this.radius / 40;
            createExplosion(this.x, this.y, this.color.main || '#FFD700', sizeMultiplier * 0.7, 12);
            return true;
        }
        return false;
    }
}

// ============================================================
// CLASSES FLOATING COIN E PROJECTILE
// ============================================================

class FloatingCoin {
    constructor(preferredEmoji = null) {
        this.radius = Math.max(12, Math.min(28, 16 + (W * 0.02)));
        this.x = Math.random() * (W - this.radius * 2) + this.radius;
        this.y = Math.random() * (H - this.radius * 2) + this.radius;
        let availableEmojis = COIN_EMOJIS;
        if (preferredEmoji && COIN_EMOJIS.includes(preferredEmoji)) {
            const others = COIN_EMOJIS.filter(e => e !== preferredEmoji);
            if (others.length > 0) availableEmojis = others;
        }
        this.emoji = availableEmojis[Math.floor(Math.random() * availableEmojis.length)];
        this.value = COIN_VALUES[this.emoji] || 199;
        this.vx = (Math.random() - 0.5) * 1.2;
        this.vy = (Math.random() - 0.5) * 1.2;
        this.maxLife = 120 + Math.floor(Math.random() * 60);
        this.life = this.maxLife;
        this.collected = false;
        this.collectAnimation = 0;
    }

    update() {
        if (this.collected) return;
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < this.radius || this.x > W - this.radius) this.vx *= -1;
        if (this.y < this.radius || this.y > H - this.radius) this.vy *= -1;
        this.life--;
        if (this.collectAnimation > 0) this.collectAnimation -= 0.05;
    }

    draw() {
        if (this.collected && this.collectAnimation <= 0) return;
        ctx.save();
        const scale = 1 + this.collectAnimation * 0.3;
        const alpha = this.collected ? Math.max(0, 1 - this.collectAnimation) : 1;
        ctx.globalAlpha = alpha;
        ctx.font = `${this.radius * 1.4 * scale}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const glow = ctx.createRadialGradient(this.x, this.y, 4, this.x, this.y, this.radius * 1.6 * scale);
        glow.addColorStop(0, `rgba(255, 215, 0, ${0.3 * alpha})`);
        glow.addColorStop(1, 'rgba(255, 215, 0, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 1.6 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
        ctx.shadowBlur = 30;
        ctx.fillText(this.emoji, this.x, this.y + 2);
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    collect() {
        if (this.collected) return false;
        this.collected = true;
        this.collectAnimation = 1;
        return true;
    }

    isExpired() {
        return (this.life <= 0) || (this.collected && this.collectAnimation <= 0);
    }
}

const coinManager = {
    maxCoins: 3,
    spawnTimer: 0,
    lastEmoji: null,
    pendingCoinCount: 0,

    reset() {
        this.spawnTimer = 0;
        this.pendingCoinCount = 0;
        this.lastEmoji = null;
        floatingCoins = [];
    },

    update() {
        for (let i = floatingCoins.length - 1; i >= 0; i--) {
            const coin = floatingCoins[i];
            if (coin.isExpired()) {
                if (coin.emoji && !coin.collected) this.lastEmoji = coin.emoji;
                floatingCoins.splice(i, 1);
            }
        }
        if (this.pendingCoinCount > 0 && floatingCoins.length < this.maxCoins) {
            const toSpawn = Math.min(this.pendingCoinCount, this.maxCoins - floatingCoins.length);
            for (let i = 0; i < toSpawn; i++) this.spawnOne();
            this.pendingCoinCount -= toSpawn;
        }
        if (this.pendingCoinCount <= 0) {
            if (this.spawnTimer > 0) {
                this.spawnTimer--;
            } else {
                if (floatingCoins.length < this.maxCoins) {
                    const spawnChance = 0.015 + (currentLevel * 0.0015);
                    if (Math.random() < spawnChance) this.spawnOne();
                }
                this.spawnTimer = 40 + Math.floor(Math.random() * 60);
            }
        }
    },

    spawnOne() {
        if (floatingCoins.length >= this.maxCoins) return;
        const coin = new FloatingCoin(this.lastEmoji);
        floatingCoins.push(coin);
        this.lastEmoji = coin.emoji;
    }
};

function collectCoin(coin, clientX, clientY) {
    if (!coin || coin.collected) return;
    coins += coin.value;
    levelCoinsEarned += coin.value;
    totalCoinsAccumulated = coins;
    coinVal.innerText = String(coins).padStart(4, '0');
    updatePauseCoinBalance();
    const xPos = clientX || (coin.x + 30);
    const yPos = clientY || (coin.y - 30);
    showCoinFloatText(xPos - 30, yPos - 30, `+$${coin.value}`);
    audioManager.playCoinSound();
    coin.collect();
    savePlayerProgress();
    setTimeout(() => {
        const index = floatingCoins.indexOf(coin);
        if (index !== -1) floatingCoins.splice(index, 1);
    }, 500);
}

function checkCoinCollection(mx, my, clientX, clientY) {
    if (!gameActive || gameOver || levelTransitionPaused || pauseActive || blockOverlayActive) return;
    for (let i = floatingCoins.length - 1; i >= 0; i--) {
        const coin = floatingCoins[i];
        if (coin.collected) continue;
        const dist = Math.hypot(coin.x - mx, coin.y - my);
        if (dist < coin.radius + 30) {
            collectCoin(coin, clientX, clientY);
            break;
        }
    }
}

function showCoinFloatText(x, y, text) {
    const floatDiv = document.createElement('div');
    floatDiv.className = 'coin-float';
    floatDiv.textContent = text;
    floatDiv.style.position = 'fixed';
    floatDiv.style.left = x + 'px';
    floatDiv.style.top = y + 'px';
    floatDiv.style.color = '#FFD700';
    floatDiv.style.fontSize = '26px';
    floatDiv.style.fontWeight = 'bold';
    floatDiv.style.fontFamily = 'Carter One, Arial Black, sans-serif';
    floatDiv.style.textShadow = '0 0 20px rgba(255,215,0,0.8), 0 0 40px rgba(255,215,0,0.5)';
    floatDiv.style.pointerEvents = 'none';
    floatDiv.style.zIndex = '250';
    floatDiv.style.transition = 'all 1s ease-out';
    floatDiv.style.opacity = '1';
    document.body.appendChild(floatDiv);
    requestAnimationFrame(() => {
        floatDiv.style.transform = 'translateY(-70px)';
        floatDiv.style.opacity = '0';
    });
    setTimeout(() => floatDiv.remove(), 1000);
}

class Projectile {
    constructor(x, y, angle, speed, color, damage = 1, isBouncy = false) {
        this.x = x;
        this.y = y;
        this.radius = Math.max(3, Math.min(8, 5 + (W * 0.006)));
        this.speed = speed || 12;
        this.angle = angle || -Math.PI / 2;
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;
        this.color = color || '#ff4444';
        this.damage = damage || 1;
        this.life = 100;
        this.trail = [];
        this.active = true;
        this.isBouncy = isBouncy;
        this.bounces = 0;
        this.maxBounces = 3;
    }

    update() {
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 6) this.trail.shift();
        this.x += this.vx;
        this.y += this.vy;
        this.life--;

        for (let i = enemies.length - 1; i >= 0; i--) {
            const en = enemies[i];
            const dist = Math.hypot(en.x - this.x, en.y - this.y);
            if (dist < en.radius + this.radius) {
                const destroyed = en.takeDamage(this.x, this.y);
                if (destroyed) {
                    enemies.splice(i, 1);
                    const bonus = getBonusForColor(en.colorIndex);
                    coins += bonus;
                    levelCoinsEarned += bonus;
                    totalCoinsAccumulated = coins;
                    
                    if (!bossSpawnedThisLevel) {
                        score--;
                        targetCount.innerText = score;
                        updateRemainingCircle(score);
                        
                        // Sistema de balão - contagem de kills
                        totalKills++;
                        killsSinceLastBalloon++;
                        
                        // Tenta spawnar balão com base na lógica
                        const killInterval = getKillIntervalForLevel(currentLevel);
                        if (killsSinceLastBalloon >= killInterval) {
                            if (spawnBalloon()) {
                                // Se spawnou, reseta o contador de kills desde o último balão
                                // O reset já é feito dentro do spawnBalloon
                            }
                        }
                        
                        // Sistema de coração (a cada 20 abates)
                        killsSinceLastHeart++;
                        if (killsSinceLastHeart >= HEART_SPAWN_INTERVAL) {
                            killsSinceLastHeart = 0;
                            spawnHeart();
                        }
                    }
                    
                    totalTargetsEliminated++;
                    levelKills++;
                    coinVal.innerText = String(coins).padStart(4, '0');
                    updatePauseCoinBalance();
                    showCoinFloatText(en.x, en.y - 30, `+${bonus}🪙`);
                    savePlayerProgress();
                    if (Math.random() < 0.25 && floatingCoins.length < coinManager.maxCoins) {
                        coinManager.spawnOne();
                    }
                    
                    if (score <= 0 && !bossSpawnedThisLevel && !bossActive && !bossDefeated) {
                        score = 0;
                        targetCount.innerText = '0';
                        updateRemainingCircle(0);
                        spawnBoss(currentLevel);
                        bossSpawnedThisLevel = true;
                    }
                    
                    if (enemies.length === 0 && score > 0 && !bossActive && !bossDefeated && !bossSpawnedThisLevel) {
                        const lvlData = LEVELS[currentLevel - 1] || LEVELS[0];
                        const count = Math.min(lvlData.enemies, score);
                        for (let j = 0; j < count; j++) {
                            enemies.push(new Enemy(currentLevel));
                        }
                    }
                }
                this.active = false;
                return;
            }
        }

        if (bossActive && boss && !boss.defeated) {
            const dist = Math.hypot(boss.x - this.x, boss.y - this.y);
            if (dist < boss.radius + this.radius) {
                addHitEffect(boss, this.x, this.y);
                audioManager.playBossHitSound();
                const defeated = boss.takeDamage();
                updateBossHealthBar();
                if (defeated) {
                    bossDefeated = true;
                    bossActive = false;
                    bossHealthBar.style.display = 'none';
                    coins += 5000;
                    totalCoinsAccumulated = coins;
                    coinVal.innerText = String(coins).padStart(4, '0');
                    updatePauseCoinBalance();
                    updateRemainingCircle(0);
                    savePlayerProgress();
                    
                    if (currentLevel < 20) {
                        if (bossDefeatTimeout) clearTimeout(bossDefeatTimeout);
                        bossDefeatTimeout = setTimeout(() => {
                            const levelTime = getLevelTimeElapsed();
                            const timeStr = formatTime(levelTime);
                            totalCoinsAccumulated = coins;
                            savePlayerProgress();
                            showLevelTransition(currentLevel + 1, timeStr, levelKills, levelCoinsEarned, totalCoinsAccumulated);
                            bossDefeatTimeout = null;
                        }, 2000);
                    } else {
                        setTimeout(() => {
                            totalBossesDefeated++;
                            showVictoryScreen();
                        }, 2000);
                    }
                }
                this.active = false;
                return;
            }
        }

        if (this.isBouncy && this.bounces < this.maxBounces) {
            if (this.x < this.radius || this.x > W - this.radius) {
                this.vx *= -1;
                this.bounces++;
                this.x = Math.max(this.radius, Math.min(W - this.radius, this.x));
            }
            if (this.y < this.radius || this.y > H - this.radius) {
                this.vy *= -1;
                this.bounces++;
                this.y = Math.max(this.radius, Math.min(H - this.radius, this.y));
            }
        }

        if (this.x < -50 || this.x > W + 50 || this.y < -50 || this.y > H + 50 || this.life <= 0) {
            this.active = false;
        }
    }

    draw() {
        for (let i = 0; i < this.trail.length; i++) {
            const alpha = i / this.trail.length * 0.5;
            const radius = this.radius * (0.3 + 0.7 * (i / this.trail.length));
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = this.color;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(this.trail[i].x, this.trail[i].y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath();
        ctx.arc(this.x - this.radius * 0.2, this.y - this.radius * 0.2, this.radius * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    isActive() { return this.active; }
}

// ============================================================
// FUNÇÕES DA BARREIRA
// ============================================================

function updateBarrierUI() {
    barrierText.textContent = Math.floor(barrierHealth);
    
    if (barrierHealth > 3000) {
        barrierText.style.color = '#00ff88';
        barrierText.style.textShadow = '0 0 20px rgba(0, 255, 136, 0.4)';
        document.querySelector('.barrier-hud').style.borderColor = '#00ff88';
        document.querySelector('.barrier-hud').style.boxShadow = '0 0 40px rgba(0, 255, 136, 0.25)';
    } else if (barrierHealth > 1500) {
        barrierText.style.color = '#ffaa44';
        barrierText.style.textShadow = '0 0 20px rgba(255, 170, 68, 0.4)';
        document.querySelector('.barrier-hud').style.borderColor = '#ffaa44';
        document.querySelector('.barrier-hud').style.boxShadow = '0 0 40px rgba(255, 170, 68, 0.25)';
    } else {
        barrierText.style.color = '#ff4444';
        barrierText.style.textShadow = '0 0 20px rgba(255, 68, 68, 0.5)';
        document.querySelector('.barrier-hud').style.borderColor = '#ff4444';
        document.querySelector('.barrier-hud').style.boxShadow = '0 0 40px rgba(255, 68, 68, 0.3)';
    }
}

function triggerBarrierHitEffect() {
    const effect = document.getElementById('barrierHitEffect');
    effect.classList.remove('active');
    void effect.offsetWidth;
    effect.classList.add('active');
}

// ============================================================
// FUNÇÕES DO JOGO
// ============================================================

function initWeaponStates() {
    weaponStates = {};
    WEAPONS.forEach(w => {
        weaponStates[w.id] = { owned: false, active: false, timeLeft: 0, maxDuration: w.duration };
    });
    activeWeapon = null;
    if (activeWeaponTimer) {
        clearInterval(activeWeaponTimer);
        activeWeaponTimer = null;
    }
}

function buyWeapon(weaponId) {
    const weapon = WEAPONS.find(w => w.id === weaponId);
    if (!weapon) return false;
    const state = weaponStates[weaponId];
    if (!state) return false;
    
    if (state.active) return false;
    if (coins < weapon.price) return false;
    
    coins -= weapon.price;
    updateCoinDisplay();
    updatePauseCoinBalance();
    
    state.owned = true;
    state.active = true;
    state.timeLeft = weapon.duration;
    
    if (activeWeapon && activeWeapon !== weaponId) {
        const oldState = weaponStates[activeWeapon];
        if (oldState) {
            oldState.active = false;
            oldState.timeLeft = 0;
        }
    }
    
    activeWeapon = weaponId;
    
    if (activeWeaponTimer) clearInterval(activeWeaponTimer);
    activeWeaponTimer = setInterval(() => {
        const currentState = weaponStates[activeWeapon];
        if (currentState) {
            currentState.timeLeft--;
            if (currentState.timeLeft <= 0) {
                currentState.active = false;
                currentState.timeLeft = 0;
                activeWeapon = null;
                clearInterval(activeWeaponTimer);
                activeWeaponTimer = null;
                updateWeaponsUI();
            }
            updateWeaponsUI();
        }
    }, 1000);
    
    updateWeaponsUI();
    savePlayerProgress();
    return true;
}

function getActiveWeapon() {
    const balloonData = getBalloonWeaponData();
    if (balloonData) {
        return {
            type: 'balloon',
            color: balloonData.config.color,
            damage: balloonData.damage,
            projectiles: balloonData.projectiles,
            isBouncy: false
        };
    }
    
    if (activeWeapon && weaponStates[activeWeapon] && weaponStates[activeWeapon].active) {
        const weapon = WEAPONS.find(w => w.id === activeWeapon);
        if (weapon) {
            return {
                type: weapon.type,
                color: weapon.color,
                damage: weapon.damage || 1,
                projectiles: getWeaponShots(weapon),
                isBouncy: false
            };
        }
    }
    return null;
}

function getWeaponShots(weapon) {
    if (!weapon) return 1;
    switch (weapon.type) {
        case 'double': return 2;
        case 'triple': return 3;
        case 'quad': return 4;
        case 'quint': return 5;
        default: return 1;
    }
}

function spawnBoss(level) {
    boss = new Boss(level);
    bossActive = true;
    bossDefeated = false;
    bossSpawned = true;
    bossSpawnedThisLevel = true;
    bossHealthBar.style.display = 'block';
    bossName.textContent = BOSS_NAMES[level] || 'CHEFÃO';
    updateBossHealthBar();
    updateRemainingCircle(0);
}

function updateBossHealthBar() {
    if (boss) {
        const percent = boss.getHpPercent();
        bossHealthFill.style.width = percent + '%';
        bossHpText.textContent = Math.ceil(percent) + '%';
    }
}

function startLevel(level) {
    if (BLOCKED_LEVELS.includes(level) && !LevelUnlockManager.isLevelUnlocked(level)) {
        showLevelBlockScreen(level);
        return;
    }
    
    const maxUnlocked = LevelUnlockManager.getMaxUnlockedLevel();
    if (level > maxUnlocked + 1 && BLOCKED_LEVELS.includes(level)) {
        showLevelBlockScreen(level);
        return;
    }
    
    initLevel(level);
    initCoinSystem();
    if (level > 1) {
        coins += 1000;
        totalCoinsAccumulated = coins;
        coinVal.innerText = String(coins).padStart(4, '0');
        updatePauseCoinBalance();
    }
    updatePauseCoinBalance();
    savePlayerProgress();
    hideLevelTransition();
    gameActive = true;
    startTimer();
    audioManager.setLevel(level);
}

function initLevel(level) {
    const lvlData = LEVELS[level - 1] || LEVELS[0];
    enemies = [];
    for (let i = 0; i < lvlData.enemies; i++) {
        enemies.push(new Enemy(level));
    }
    score = lvlData.targetCount;
    targetCount.innerText = score;
    updateRemainingCircle(score);
    levelVal.innerText = level;
    currentLevel = level;
    floatingCoins = [];
    bossActive = false;
    boss = null;
    bossDefeated = false;
    bossSpawned = false;
    bossSpawnedThisLevel = false;
    bossHealthBar.style.display = 'none';
    explosionParticles = [];
    hitEffects = [];
    projectiles = [];
    bossAttacks = [];
    bossAttackTimer = 0;
    levelCoinsEarned = 0;
    levelKills = 0;
    levelStartTime = Date.now();
    timer = 300;
    updateTimerDisplay();
    
    // Inicializa sistema de balão
    activeBalloons = [];
    clearBalloonEffect();
    totalKills = 0;
    killsSinceLastBalloon = 0;
    balloonSpawnCooldown = 0;
    totalBalloonsSpawned = 0;
    
    // Inicializa a fila de balões (garante que todos os 7 apareçam)
    initializeBalloonQueue();
    
    console.log(`🎈 Nível ${level} - Fila de balões: ${balloonSpawnQueue.length} tipos`);
    console.log(`📊 Kill interval base: ${getBaseKillInterval(level)} kills`);
    
    heartObjects = [];
    heartSpawnCount = 0;
    killsSinceLastHeart = 0;
    
    audioManager.ensureAudioStarted();
    audioManager.setLevel(level);
    
    drawLevelBackground(level);
    const player = PlayerManager.getPlayer();
    if (player && player.totalCoins !== undefined) {
        coins = player.totalCoins;
        coinVal.innerText = String(coins).padStart(4, '0');
        updatePauseCoinBalance();
    }
    barrierHealth = BARRIER_CONFIG.initialHealth;
    updateBarrierUI();
    
    if (bossDefeatTimeout) {
        clearTimeout(bossDefeatTimeout);
        bossDefeatTimeout = null;
    }
}

function initCoinSystem() {
    coinManager.reset();
    for (let i = 0; i < coinManager.maxCoins; i++) {
        coinManager.spawnOne();
    }
}

function showVictoryScreen() {
    gameActive = false;
    gameOver = true;
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    audioManager.stopMusic();
    
    victoryCoins.textContent = coins;
    victoryTargets.textContent = totalTargetsEliminated;
    victoryBosses.textContent = totalBossesDefeated + 1;
    
    victoryScreen.classList.add('active');
    savePlayerProgress();
}

function restartGame() {
    gameOverScreen.classList.remove('active');
    victoryScreen.classList.remove('active');
    transitionScreen.classList.remove('active');
    transitionScreen.classList.remove('fade-out');
    pauseOverlay.classList.remove('active');
    levelBlockOverlay.classList.remove('active');
    
    gameOver = false;
    gameActive = false;
    pauseActive = false;
    levelTransitionActive = false;
    levelTransitionPaused = false;
    isTransitioning = false;
    blockOverlayActive = false;
    pendingUnlockLevel = null;
    
    document.querySelector('.game-over-box h1').innerHTML = '💥 GAME OVER';
    document.querySelector('.game-over-box .subtitle').innerText = 'Sua barreira foi destruída!';
    
    barrierHealth = BARRIER_CONFIG.initialHealth;
    updateBarrierUI();
    
    if (bossDefeatTimeout) {
        clearTimeout(bossDefeatTimeout);
        bossDefeatTimeout = null;
    }
    
    startGame();
}

function startNextLevel() {
    const nextLevel = currentLevel + 1;
    
    if (BLOCKED_LEVELS.includes(nextLevel) && !LevelUnlockManager.isLevelUnlocked(nextLevel)) {
        savePlayerProgress();
        showLevelBlockScreen(nextLevel);
        return;
    }
    
    startLevel(nextLevel);
}

function showLevelTransition(level, timeStr, kills, levelCoins, totalCoins) {
    levelTransitionActive = true;
    levelTransitionPaused = true;
    isTransitioning = true;
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    transitionLevelName.textContent = `Nível ${level}`;
    transitionLevelTime.textContent = timeStr;
    transitionLevelKills.textContent = kills;
    transitionLevelCoins.textContent = levelCoins;
    transitionTotalCoins.textContent = totalCoins;
    transitionScreen.classList.remove('fade-out');
    transitionScreen.classList.add('active');
    
    audioManager.ensureAudioStarted();
    audioManager.setLevel(level);
}

function hideLevelTransition() {
    transitionScreen.classList.add('fade-out');
    setTimeout(() => {
        transitionScreen.classList.remove('active');
        transitionScreen.classList.remove('fade-out');
        levelTransitionActive = false;
        levelTransitionPaused = false;
        isTransitioning = false;
        if (!gameOver && gameActive) {
            startTimer();
        }
    }, 500);
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (levelTransitionPaused || pauseActive || blockOverlayActive) return;
        timer--;
        updateTimerDisplay();
        if (timer <= 0) {
            timer = 0;
            updateTimerDisplay();
            gameActive = false;
            clearInterval(timerInterval);
            audioManager.stopMusic();
            savePlayerProgress();
            showGameOver('time');
        }
    }, 1000);
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function getLevelTimeElapsed() {
    return Math.floor((Date.now() - levelStartTime) / 1000);
}

function togglePause() {
    if (gameOver || levelTransitionActive || blockOverlayActive) return;
    pauseActive = !pauseActive;
    if (pauseActive) {
        gameActive = false;
        if (timerInterval) { 
            clearInterval(timerInterval); 
            timerInterval = null; 
        }
        audioManager.toggleMusicPause(true);
        pauseOverlay.classList.add('active');
        updatePauseCoinBalance();
        updateWeaponsUI();
        savePlayerProgress();
    } else {
        pauseOverlay.classList.remove('active');
        if (!gameOver) {
            gameActive = true;
            startTimer();
            audioManager.toggleMusicPause(false);
        }
    }
}

function updatePauseCoinBalance() {
    pauseCoinBalance.textContent = coins;
}

function updateCoinDisplay() {
    coinVal.innerText = String(coins).padStart(4, '0');
    updatePauseCoinBalance();
}

// ============================================================
// UPDATE WEAPONS UI
// ============================================================

function updateWeaponsUI() {
    weaponsGrid.innerHTML = '';

    WEAPONS.forEach(weapon => {
        const state = weaponStates[weapon.id] || { owned: false, active: false, timeLeft: 0 };
        
        let statusText = '';
        let statusClass = '';
        let isActive = false;
        let isOwned = state.owned;
        let canBuy = false;
        let isLocked = false;

        if (state.active) {
            statusText = `⏳ ${state.timeLeft}s`;
            statusClass = 'active';
            isActive = true;
            canBuy = false;
            isLocked = false;
        } else if (state.owned && state.timeLeft <= 0) {
            statusText = '✅ AVAILABLE';
            statusClass = 'available';
            isActive = false;
            canBuy = true;
            isLocked = false;
        } else if (!state.owned) {
            statusText = `💰 ${weapon.price}`;
            statusClass = 'locked';
            isActive = false;
            canBuy = coins >= weapon.price;
            isLocked = true;
        }

        const button = document.createElement('button');
        const btnColor = weapon.btnColor || '';
        button.className = `game-button ${btnColor} ${statusClass}`;
        
        button.style.cssText = `
            width: 100% !important;
            margin: 0 !important;
            padding: clamp(10px, 1.5vw, 24px) clamp(12px, 2vw, 26px) !important;
            min-height: clamp(40px, 6vh, 70px) !important;
            font-size: clamp(9px, 1.4vw, 16px) !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 3px !important;
            line-height: 1.3 !important;
            position: relative !important;
            border-radius: 12px !important;
            white-space: normal !important;
            word-break: break-word !important;
            text-align: center !important;
        `;

        const nameSpan = document.createElement('span');
        nameSpan.className = 'weapon-name';
        nameSpan.style.cssText = `
            font-size: clamp(8px, 1.2vw, 15px);
            font-weight: bold;
            display: block;
            text-align: center;
            width: 100%;
        `;
        
        let displayName = weapon.name;
        if (isActive) displayName = `⚡ ${weapon.name}`;
        else if (isOwned && !isActive) displayName = `✅ ${weapon.name}`;
        nameSpan.textContent = displayName;

        const statusSpan = document.createElement('span');
        statusSpan.className = 'weapon-status';
        statusSpan.style.cssText = `
            font-size: clamp(7px, 0.9vw, 12px);
            opacity: 0.9;
            margin-top: 2px;
            display: block;
            font-weight: normal;
            text-shadow: 0 2px 4px rgba(0,0,0,0.5);
        `;
        statusSpan.textContent = statusText;

        button.appendChild(nameSpan);
        button.appendChild(statusSpan);

        if (isActive) {
            const timerBar = document.createElement('div');
            timerBar.className = 'timer-bar';
            timerBar.style.cssText = `
                width: 90%; height: clamp(3px, 0.4vh, 5px); background: rgba(255,255,255,0.15);
                border-radius: 4px; margin-top: 3px; overflow: hidden;
                position: absolute; bottom: 3px; left: 5%;
            `;
            const fill = document.createElement('div');
            fill.className = 'fill';
            const percent = (state.timeLeft / state.maxDuration) * 100;
            fill.style.cssText = `
                height: 100%; background: linear-gradient(90deg, #2ecc71, #f1c40f, #e74c3c);
                transition: width 0.3s; border-radius: 4px; width: ${percent}%;
            `;
            timerBar.appendChild(fill);
            button.appendChild(timerBar);
        }

        if (isActive) {
            button.style.animation = 'pulseButton 1s ease-in-out infinite';
            button.style.borderColor = '#fff';
            button.style.borderWidth = '3px';
            button.style.boxShadow = '0 0 30px rgba(46,204,113,0.3)';
        }

        if (isLocked && !isActive) {
            button.style.opacity = '0.5';
            button.style.filter = 'grayscale(0.3)';
        }

        button.addEventListener('click', function(e) {
            e.stopPropagation();
            
            if (isActive) {
                return;
            }
            
            if (!isOwned && coins < weapon.price) {
                this.style.boxShadow = '0 0 40px rgba(255,0,0,0.5)';
                this.style.borderColor = '#ff4444';
                this.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    this.style.boxShadow = '';
                    this.style.borderColor = '';
                    this.style.transform = '';
                }, 500);
                return;
            }
            
            const success = buyWeapon(weapon.id);
            if (success) {
                this.style.boxShadow = '0 0 50px rgba(46,204,113,0.6)';
                this.style.borderColor = '#2ecc71';
                this.style.transform = 'scale(1.03)';
                setTimeout(() => {
                    this.style.boxShadow = '';
                    this.style.borderColor = '';
                    this.style.transform = '';
                }, 800);
                
                updateWeaponsUI();
                updateCoinDisplay();
            } else {
                this.style.boxShadow = '0 0 40px rgba(255,0,0,0.5)';
                this.style.borderColor = '#ff4444';
                setTimeout(() => {
                    this.style.boxShadow = '';
                    this.style.borderColor = '';
                }, 500);
            }
        });

        weaponsGrid.appendChild(button);
    });
}

// ============================================================
// BACKGROUND
// ============================================================

const LEVEL_BACKGROUNDS = {};
const bgColors = [
    ['#000814', '#001d3d', '#003566'],
    ['#1a0a1e', '#2d1b3d', '#4a2b5a'],
    ['#0a1a0a', '#1a3d1a', '#2a5a2a'],
    ['#1a0a0a', '#3d1b1b', '#5a2b2b'],
    ['#0a0a1a', '#1b1b3d', '#2b2b5a'],
    ['#1a1a0a', '#3d3d1b', '#5a5a2b'],
    ['#0a1a1a', '#1b3d3d', '#2b5a5a'],
    ['#1a0a1a', '#3d1b3d', '#5a2b5a'],
    ['#0a0a0a', '#2a2a2a', '#4a4a4a'],
    ['#1a0a05', '#3d1b0a', '#5a2b0f'],
    ['#050a1a', '#0a1b3d', '#0f2b5a'],
    ['#1a050a', '#3d0a1b', '#5a0f2b'],
    ['#050a0a', '#0a1b1b', '#0f2b2b'],
    ['#0a050a', '#1b0a1b', '#2b0f2b'],
    ['#0a0a05', '#1b1b0a', '#2b2b0f'],
    ['#1a0f0a', '#3d1f15', '#5a2f20'],
    ['#0f0a1a', '#1f153d', '#2f205a'],
    ['#1a0f05', '#3d1f0a', '#5a2f0f'],
    ['#050a0f', '#0a1a2a', '#0f2a3a'],
    ['#1a0505', '#3d0a0a', '#5a0f0f']
];

for (let i = 0; i < 20; i++) {
    const idx = i % bgColors.length;
    LEVEL_BACKGROUNDS[i + 1] = { colors: bgColors[idx], accent: bgColors[idx][1] };
}

function getLevelBackground(level) {
    const bg = LEVEL_BACKGROUNDS[level] || LEVEL_BACKGROUNDS[1];
    return { gradient: [bg.colors[0], bg.colors[1], bg.colors[2]], accent: bg.accent };
}

function drawLevelBackground(level) {
    const bg = getLevelBackground(level);
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, bg.gradient[0]);
    bgGrad.addColorStop(0.5, bg.gradient[1]);
    bgGrad.addColorStop(1, bg.gradient[2]);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = bg.accent;
    ctx.beginPath();
    ctx.arc(W * 0.15, H * 0.75, 150, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = bg.accent;
    ctx.beginPath();
    ctx.arc(W * 0.85, H * 0.25, 200, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
}

function drawBackground() {
    drawLevelBackground(currentLevel);
}

// ============================================================
// FUNÇÕES PRINCIPAIS DO JOGO
// ============================================================

function startGame() {
    gameActive = true;
    gameOver = false;
    const player = PlayerManager.getPlayer();
    if (player) {
        coins = player.totalCoins || 0;
    } else {
        coins = 0;
    }
    totalTargetsEliminated = 0;
    totalBossesDefeated = 0;
    totalCoinsAccumulated = coins;
    levelCoinsEarned = 0;
    levelKills = 0;
    levelStartTime = Date.now();
    timer = 300;
    coinVal.innerText = String(coins).padStart(4, '0');
    gameOverScreen.classList.remove('active');
    victoryScreen.classList.remove('active');
    levelBlockOverlay.classList.remove('active');
    explosionParticles = [];
    hitEffects = [];
    projectiles = [];
    bossAttacks = [];
    levelTransitionActive = false;
    levelTransitionPaused = false;
    isTransitioning = false;
    transitionScreen.classList.remove('active');
    transitionScreen.classList.remove('fade-out');
    pauseActive = false;
    pauseOverlay.classList.remove('active');
    blockOverlayActive = false;
    pendingUnlockLevel = null;
    initWeaponStates();
    audioManager.reset();
    barrierHealth = BARRIER_CONFIG.initialHealth;
    updateBarrierUI();
    bossSpawnedThisLevel = false;
    
    // Inicializa sistema de balão
    activeBalloons = [];
    clearBalloonEffect();
    totalKills = 0;
    killsSinceLastBalloon = 0;
    balloonSpawnCooldown = 0;
    totalBalloonsSpawned = 0;
    initializeBalloonQueue();
    
    heartObjects = [];
    heartSpawnCount = 0;
    killsSinceLastHeart = 0;
    
    if (!LevelUnlockManager.isLevelUnlocked(1)) {
        LevelUnlockManager.unlockLevel(1);
    }
    
    startLevel(1);
    updateTimerDisplay();
    updatePauseCoinBalance();
}

function showGameOver(type = 'time') {
    gameOver = true;
    gameActive = false;
    finalLevel.innerText = currentLevel;
    finalCoins.innerText = coins;
    finalTargets.innerText = totalTargetsEliminated;
    finalBosses.innerText = totalBossesDefeated;
    
    if (type === 'barrier') {
        document.querySelector('.game-over-box h1').innerHTML = '💥 BARREIRA DESTRUÍDA!';
        document.querySelector('.game-over-box .subtitle').innerText = 'Os inimigos destruíram sua defesa!';
    } else {
        document.querySelector('.game-over-box h1').innerHTML = '💥 GAME OVER';
        document.querySelector('.game-over-box .subtitle').innerText = 'Seu tempo acabou!';
    }
    
    gameOverScreen.classList.add('active');
    audioManager.stopMusic();
    savePlayerProgress();
}

function updateTimerDisplay() {
    const minutes = Math.floor(timer / 60);
    const seconds = timer % 60;
    timeVal.innerText = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    timeVal.style.color = timer <= 30 ? '#ff3b30' : timer <= 60 ? '#ff9500' : 'white';
}

function updateExplosionParticles() {
    for (let i = explosionParticles.length - 1; i >= 0; i--) {
        const p = explosionParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.life--;
        p.radius *= 0.97;
        if (p.life <= 0 || p.radius < 0.3) explosionParticles.splice(i, 1);
    }
}

function drawExplosionParticles() {
    for (const p of explosionParticles) {
        const alpha = p.life / p.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function handleShot(mx, my, clientX, clientY) {
    if (!gameActive || gameOver || levelTransitionPaused || pauseActive || blockOverlayActive) return;
    audioManager.playSoundEffect('shoot');
    audioManager.ensureAudioStarted();
    
    const balloonData = getBalloonWeaponData();
    const activeWeaponData = getActiveWeapon();
    
    let shots = 1;
    let damage = 1;
    let color = '#ff4444';
    let isBouncy = false;
    
    if (balloonData) {
        shots = balloonData.projectiles;
        damage = balloonData.damage;
        color = balloonData.config.color;
        isBouncy = false;
    } else if (activeWeaponData && activeWeaponData.type !== 'balloon') {
        shots = activeWeaponData.projectiles || 1;
        damage = activeWeaponData.damage || 1;
        color = activeWeaponData.color || '#ff4444';
    }

    for (let i = 0; i < shots; i++) {
        const angleOffset = (i - (shots - 1) / 2) * 0.25;
        const angle = -Math.PI / 2 + angleOffset;
        const startX = mx + Math.cos(angle) * 15;
        const startY = my + Math.sin(angle) * 15;
        const projectile = new Projectile(startX, startY, angle, 13, color, damage, isBouncy);
        projectiles.push(projectile);
    }

    checkBalloonCollection(mx, my);
    checkHeartCollection(mx, my);

    for (let i = floatingCoins.length - 1; i >= 0; i--) {
        const coin = floatingCoins[i];
        if (coin.collected) continue;
        const dist = Math.hypot(coin.x - mx, coin.y - my);
        if (dist < coin.radius + 30) {
            collectCoin(coin, clientX, clientY);
            break;
        }
    }
}

// ============================================================
// EVENTOS PARA INICIAR ÁUDIO
// ============================================================

const AUDIO_START_EVENTS = ['click', 'touchstart', 'keydown', 'mousedown'];

function setupAudioStartListeners() {
    const startAudio = () => {
        audioManager.ensureAudioStarted();
        AUDIO_START_EVENTS.forEach(event => {
            document.removeEventListener(event, startAudio);
        });
    };
    
    AUDIO_START_EVENTS.forEach(event => {
        document.addEventListener(event, startAudio, { once: false });
    });
    
    canvas.addEventListener('click', startAudio, { once: true });
    canvas.addEventListener('touchstart', startAudio, { once: true });
}

setupAudioStartListeners();

// ============================================================
// LOOP PRINCIPAL
// ============================================================

function loop() {
    drawBackground();
    updateExplosionParticles();
    drawExplosionParticles();
    updateHitEffects();
    drawHitEffects();

    ctx.save();
    const barrierY = H - 5;
    const glow = ctx.createLinearGradient(0, barrierY - 20, 0, barrierY + 5);
    const healthPercent = barrierHealth / barrierMaxHealth;
    const color = healthPercent > 0.6 ? '#00ff88' : healthPercent > 0.3 ? '#ff8800' : '#ff4444';
    glow.addColorStop(0, `rgba(0, 255, 136, ${0.1 * healthPercent})`);
    glow.addColorStop(1, `rgba(0, 255, 136, 0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(0, barrierY - 30, W, 35);
    
    const gradient = ctx.createLinearGradient(0, barrierY - 4, 0, barrierY + 4);
    if (healthPercent > 0.6) {
        gradient.addColorStop(0, 'rgba(0, 255, 136, 0.3)');
        gradient.addColorStop(0.5, `rgba(0, 255, 136, ${0.4 + healthPercent * 0.4})`);
        gradient.addColorStop(1, 'rgba(0, 255, 136, 0.3)');
    } else if (healthPercent > 0.3) {
        gradient.addColorStop(0, 'rgba(255, 136, 0, 0.3)');
        gradient.addColorStop(0.5, `rgba(255, 136, 0, ${0.5 + healthPercent * 0.3})`);
        gradient.addColorStop(1, 'rgba(255, 136, 0, 0.3)');
    } else {
        gradient.addColorStop(0, 'rgba(255, 68, 68, 0.3)');
        gradient.addColorStop(0.5, `rgba(255, 68, 68, ${0.6 + healthPercent * 0.3})`);
        gradient.addColorStop(1, 'rgba(255, 68, 68, 0.3)');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, barrierY - 3, W, 6);
    
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, barrierY);
    ctx.lineTo(W, barrierY);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();

    if (!levelTransitionPaused && !pauseActive && !blockOverlayActive) {
        updateBalloons();
    }
    drawBalloons();

    if (!levelTransitionPaused && !pauseActive && !blockOverlayActive) {
        updateHearts();
    }
    drawHearts();

    if (!levelTransitionPaused && !pauseActive && !blockOverlayActive && gameActive) {
        for (let i = bossAttacks.length - 1; i >= 0; i--) {
            const attack = bossAttacks[i];
            attack.update();
            if (!attack.isActive()) {
                bossAttacks.splice(i, 1);
            }
        }
    }
    for (const attack of bossAttacks) {
        attack.draw();
    }

    if (!levelTransitionPaused && !pauseActive && !blockOverlayActive) {
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const proj = projectiles[i];
            proj.update();
            if (!proj.isActive()) projectiles.splice(i, 1);
        }
    }
    for (const proj of projectiles) proj.draw();

    if (!levelTransitionPaused && !pauseActive && !blockOverlayActive) {
        if (gameActive && enemies.length > 0) {
            enemies.forEach(en => { en.update(); en.draw(); });
        }
        if (bossActive && boss && !boss.defeated) {
            boss.update();
            boss.draw();
            updateBossHealthBar();
            if (boss.hp <= 0) {
                bossDefeated = true;
                bossActive = false;
                bossHealthBar.style.display = 'none';
                coins += 5000;
                totalCoinsAccumulated = coins;
                coinVal.innerText = String(coins).padStart(4, '0');
                updatePauseCoinBalance();
                updateRemainingCircle(0);
                savePlayerProgress();
                
                if (currentLevel < 20) {
                    if (bossDefeatTimeout) clearTimeout(bossDefeatTimeout);
                    bossDefeatTimeout = setTimeout(() => {
                        const levelTime = getLevelTimeElapsed();
                        const timeStr = formatTime(levelTime);
                        totalCoinsAccumulated = coins;
                        savePlayerProgress();
                        showLevelTransition(currentLevel + 1, timeStr, levelKills, levelCoinsEarned, totalCoinsAccumulated);
                        bossDefeatTimeout = null;
                    }, 2000);
                } else {
                    setTimeout(() => {
                        totalBossesDefeated++;
                        showVictoryScreen();
                    }, 2000);
                }
            }
        }
        if (gameActive) {
            coinManager.update();
            for (let i = floatingCoins.length - 1; i >= 0; i--) {
                const coin = floatingCoins[i];
                coin.update();
                coin.draw();
            }
            if (mouseX > 0 && mouseY > 0) {
                checkCoinCollection(mouseX, mouseY, mouseX, mouseY);
            }
        }
    } else {
        if (enemies.length > 0) enemies.forEach(en => en.draw());
        if (bossActive && boss && !boss.defeated) boss.draw();
        for (let i = floatingCoins.length - 1; i >= 0; i--) floatingCoins[i].draw();
    }

    if (gameActive && !gameOver && !pauseActive && !blockOverlayActive) {
        if (!window._saveTimer) {
            window._saveTimer = setInterval(() => {
                savePlayerProgress();
            }, 10000);
        }
    } else {
        if (window._saveTimer) {
            clearInterval(window._saveTimer);
            window._saveTimer = null;
        }
    }

    requestAnimationFrame(loop);
}

// ============================================================
// EVENTOS DO CANVAS
// ============================================================

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

canvas.addEventListener('mouseleave', () => { mouseX = -1000; mouseY = -1000; });

canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    handleShot(e.clientX - rect.left, e.clientY - rect.top, e.clientX, e.clientY);
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    handleShot(touch.clientX - rect.left, touch.clientY - rect.top, touch.clientX, touch.clientY);
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!gameActive || gameOver || levelTransitionPaused || pauseActive || blockOverlayActive) return;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    mouseX = touch.clientX - rect.left;
    mouseY = touch.clientY - rect.top;
    checkCoinCollection(mouseX, mouseY, touch.clientX, touch.clientY);
    checkBalloonCollection(mouseX, mouseY);
    checkHeartCollection(mouseX, mouseY);
}, { passive: false });

canvas.addEventListener('touchend', () => { mouseX = -1000; mouseY = -1000; });

// ============================================================
// EVENTOS DA UI
// ============================================================

btnPauseGame.addEventListener('click', togglePause);
btnResumeGame.addEventListener('click', togglePause);

btnHome.addEventListener('click', () => {
    savePlayerProgress();
    window.location.href = 'meuranking.html';
});

document.getElementById('btn-restart').addEventListener('click', restartGame);
btnVictoryRestart.addEventListener('click', restartGame);

btnContinue.addEventListener('click', () => {
    if (levelTransitionActive) {
        startNextLevel();
    }
});

btnUnlockLevel.addEventListener('click', handleUnlockLevel);
btnBackLevel.addEventListener('click', handleBackToPreviousLevel);
btnCloseBlock.addEventListener('click', () => {
    hideLevelBlockScreen();
    if (!gameActive && !gameOver && !levelTransitionActive) {
        gameActive = true;
        startTimer();
        audioManager.toggleMusicPause(false);
    }
});

// ============================================================
// POLYFILL E INICIALIZAÇÃO
// ============================================================

if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
        if (r > w/2) r = w/2;
        if (r > h/2) r = h/2;
        this.moveTo(x + r, y);
        this.arcTo(x + w, y, x + w, y + h, r);
        this.arcTo(x + w, y + h, x, y + h, r);
        this.arcTo(x, y + h, x, y, r);
        this.arcTo(x, y, x + w, y, r);
        return this;
    };
}

window.addEventListener('resize', resize);

document.addEventListener('DOMContentLoaded', () => {
    resize();
    checkPlayerAndStart();
    loop();
});

window.addEventListener('beforeunload', () => {
    savePlayerProgress();
});

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        savePlayerProgress();
    }
});

console.log('🎮 BOLA EXPLOSIVA - PREMIUM carregado!');
console.log('🎈 NOVA LÓGICA DE BALÕES IMPLEMENTADA:');
console.log('  ✅ Todos os 7 balões aparecem em TODAS as partidas');
console.log('  ✅ Aleatoriedade controlada - imprevisível mas justa');
console.log('  ✅ Sem limite de quantidade - balões continuam aparecendo');
console.log('  ✅ Frequência aumenta com o nível');
console.log('  📊 Kill interval por nível:');
console.log('    • Níveis 1-3: 14 kills');
console.log('    • Níveis 4-6: 12 kills');
console.log('    • Níveis 7-9: 10 kills');
console.log('    • Níveis 10-12: 8 kills');
console.log('    • Níveis 13-15: 7 kills');
console.log('    • Níveis 16-18: 6 kills');
console.log('    • Níveis 19-20: 5 kills');
console.log('  🔄 Fila de balões reinicia em nova ordem aleatória quando todos os 7 aparecem');
console.log('  🎯 Balões mostram o próximo tipo que virá na fila');
