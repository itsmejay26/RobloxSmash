/**
 * ========================================
 * Roblox Dummy Arena - Ultimate Combat System
 * ========================================
 * Complete weapon system with unique effects,
 * particles, physics, and polished UI
 * ========================================
 */

// ========================================
// CONFIGURATION
// ========================================
const CONFIG = {
    // API Settings
    useCorsProxy: true,
    corsProxyUrl: 'https://corsproxy.io/?',
    
    // Retry settings for rate limiting (429 errors)
    maxRetries: 3,
    baseRetryDelay: 1000, // 1 second
    maxRetryDelay: 10000, // 10 seconds
    
    endpoints: {
        usernames: 'https://users.roblox.com/v1/usernames/users',
        userInfo: 'https://users.roblox.com/v1/users/',
        avatar: 'https://thumbnails.roblox.com/v1/users/avatar'
    },
    
    avatarSize: '420x420',
    avatarFormat: 'Png',
    
    // Game Settings
    defaultHealth: 100,
    maxHealth: 100,
    
    // Crack thresholds
    crackThresholds: {
        crack1: 75,
        crack2: 50,
        crack3: 25
    },
    
    // Sound
    soundEnabled: true,
    
    // DOT Settings
    dotTickInterval: 500, // ms between DOT ticks
    
    // Physics
    knockbackEnabled: true
};

// ========================================
// UTILITY FUNCTIONS
// ========================================
const Utils = {
    /**
     * Sleep/delay function
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    
    /**
     * Get random number between min and max
     */
    random(min, max) {
        return Math.random() * (max - min) + min;
    },
    
    /**
     * Get random integer between min and max (inclusive)
     */
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    
    /**
     * Clamp a value between min and max
     */
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },
    
    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },
    
    /**
     * Generate unique ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
};

// ========================================
// ROBLOX API SERVICE
// With retry logic for rate limiting
// ========================================
const RobloxAPI = {
    // Cache for fetched profiles to avoid repeat requests
    cache: new Map(),
    
    // Request queue to prevent overwhelming the API
    requestQueue: Promise.resolve(),
    lastRequestTime: 0,
    minRequestInterval: 500, // Minimum 500ms between requests
    
    /**
     * Build URL with optional CORS proxy
     */
    buildUrl(url) {
        if (CONFIG.useCorsProxy) {
            return CONFIG.corsProxyUrl + encodeURIComponent(url);
        }
        return url;
    },
    
    /**
     * Queue a request to prevent rate limiting
     */
    async queueRequest(requestFn) {
        this.requestQueue = this.requestQueue.then(async () => {
            const now = Date.now();
            const timeSinceLastRequest = now - this.lastRequestTime;
            
            if (timeSinceLastRequest < this.minRequestInterval) {
                await Utils.sleep(this.minRequestInterval - timeSinceLastRequest);
            }
            
            this.lastRequestTime = Date.now();
            return requestFn();
        });
        
        return this.requestQueue;
    },
    
    /**
     * Fetch with retry logic for rate limiting
     */
    async fetchWithRetry(url, options = {}, retryCount = 0) {
        try {
            const response = await fetch(url, options);
            
            // Handle rate limiting (429)
            if (response.status === 429) {
                if (retryCount < CONFIG.maxRetries) {
                    // Calculate delay with exponential backoff
                    const delay = Math.min(
                        CONFIG.baseRetryDelay * Math.pow(2, retryCount),
                        CONFIG.maxRetryDelay
                    );
                    
                    console.warn(`Rate limited (429). Retrying in ${delay}ms... (Attempt ${retryCount + 1}/${CONFIG.maxRetries})`);
                    
                    // Update UI to show retry status
                    UIRenderer.setStatus(`Rate limited. Retrying in ${Math.ceil(delay/1000)}s...`, 'warning');
                    
                    await Utils.sleep(delay);
                    return this.fetchWithRetry(url, options, retryCount + 1);
                } else {
                    throw new Error('Rate limited by Roblox API. Please wait a moment and try again.');
                }
            }
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return response;
        } catch (error) {
            // Network errors - retry
            if (error.name === 'TypeError' && retryCount < CONFIG.maxRetries) {
                const delay = CONFIG.baseRetryDelay * Math.pow(2, retryCount);
                console.warn(`Network error. Retrying in ${delay}ms...`);
                await Utils.sleep(delay);
                return this.fetchWithRetry(url, options, retryCount + 1);
            }
            throw error;
        }
    },
    
    /**
     * Get User ID from username
     */
    async getUserId(username) {
        // Check cache first
        const cacheKey = `userid_${username.toLowerCase()}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        return this.queueRequest(async () => {
            const url = this.buildUrl(CONFIG.endpoints.usernames);
            
            const response = await this.fetchWithRetry(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    usernames: [username],
                    excludeBannedUsers: false
                })
            });
            
            const data = await response.json();
            
            if (data.data && data.data.length > 0) {
                const userId = data.data[0].id;
                this.cache.set(cacheKey, userId);
                return userId;
            }
            
            return null;
        });
    },
    
    /**
     * Get user profile info
     */
    async getUserInfo(userId) {
        const cacheKey = `userinfo_${userId}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        return this.queueRequest(async () => {
            const url = this.buildUrl(`${CONFIG.endpoints.userInfo}${userId}`);
            const response = await this.fetchWithRetry(url);
            const data = await response.json();
            
            this.cache.set(cacheKey, data);
            return data;
        });
    },
    
    /**
     * Get user avatar URL
     */
    async getAvatarUrl(userId) {
        const cacheKey = `avatar_${userId}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        return this.queueRequest(async () => {
            const params = new URLSearchParams({
                userIds: userId,
                size: CONFIG.avatarSize,
                format: CONFIG.avatarFormat
            });
            
            const url = this.buildUrl(`${CONFIG.endpoints.avatar}?${params}`);
            const response = await this.fetchWithRetry(url);
            const data = await response.json();
            
            if (data.data && data.data.length > 0) {
                const avatarUrl = data.data[0].imageUrl;
                this.cache.set(cacheKey, avatarUrl);
                return avatarUrl;
            }
            
            return null;
        });
    },
    
    /**
     * Fetch complete profile data
     */
    async fetchProfile(username) {
        // Check if entire profile is cached
        const cacheKey = `profile_${username.toLowerCase()}`;
        if (this.cache.has(cacheKey)) {
            console.log(`Using cached profile for ${username}`);
            return this.cache.get(cacheKey);
        }
        
        // Step 1: Get User ID
        const userId = await this.getUserId(username);
        
        if (!userId) {
            throw new Error(`User "${username}" not found`);
        }
        
        // Step 2: Get User Info and Avatar (with small delay between)
        const userInfo = await this.getUserInfo(userId);
        await Utils.sleep(200); // Small delay between requests
        const avatarUrl = await this.getAvatarUrl(userId);
        
        const profile = {
            id: userInfo.id,
            name: userInfo.name,
            displayName: userInfo.displayName,
            avatarUrl: avatarUrl
        };
        
        // Cache the complete profile
        this.cache.set(cacheKey, profile);
        
        return profile;
    },
    
    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }
};

// ========================================
// TOOLS REGISTRY
// All weapons and their properties
// ========================================
const ToolsRegistry = {
    tools: new Map(),
    selectedTool: null,
    
    /**
     * Initialize all tools
     */
    init() {
        // Melee Category
        this.register({
            id: 'punch',
            name: 'Punch',
            icon: '👊',
            category: 'melee',
            damage: 10,
            criticalChance: 0.1,
            criticalMultiplier: 2,
            effects: ['spark'],
            shake: 'light',
            sound: 'punch',
            color: '#ff6b6b',
            colorRgb: '255, 107, 107',
            description: 'Quick jab'
        });
        
        this.register({
            id: 'kick',
            name: 'Kick',
            icon: '🦵',
            category: 'melee',
            damage: 15,
            criticalChance: 0.15,
            criticalMultiplier: 2,
            effects: ['spark', 'knockback'],
            shake: 'medium',
            sound: 'kick',
            color: '#ffa94d',
            colorRgb: '255, 169, 77',
            description: 'Powerful kick'
        });
        
        this.register({
            id: 'hammer',
            name: 'Hammer',
            icon: '🔨',
            category: 'melee',
            damage: 35,
            criticalChance: 0.2,
            criticalMultiplier: 2.5,
            effects: ['spark', 'smoke', 'screenShake', 'knockback', 'bounce'],
            shake: 'heavy',
            sound: 'hammer',
            color: '#845ef7',
            colorRgb: '132, 94, 247',
            description: 'Heavy smash'
        });
        
        // Ranged Category
        this.register({
            id: 'gun',
            name: 'Gun',
            icon: '🔫',
            category: 'ranged',
            damage: 25,
            criticalChance: 0.25,
            criticalMultiplier: 3,
            effects: ['bulletHole', 'spark', 'smoke', 'recoil'],
            shake: 'medium',
            sound: 'gun',
            color: '#495057',
            colorRgb: '73, 80, 87',
            description: 'Ranged shot'
        });
        
        this.register({
            id: 'laser',
            name: 'Laser',
            icon: '🔴',
            category: 'ranged',
            damage: 30,
            criticalChance: 0.15,
            criticalMultiplier: 2,
            effects: ['laserBurn', 'heatDistortion', 'spark'],
            shake: 'light',
            sound: 'laser',
            color: '#ff0080',
            colorRgb: '255, 0, 128',
            description: 'Heat beam'
        });
        
        // Explosive Category
        this.register({
            id: 'bomb',
            name: 'Bomb',
            icon: '💣',
            category: 'explosive',
            damage: 50,
            criticalChance: 0.1,
            criticalMultiplier: 2,
            effects: ['explosion', 'screenShake', 'smoke', 'shockwave', 'knockbackAll'],
            shake: 'heavy',
            sound: 'explosion',
            color: '#ff4757',
            colorRgb: '255, 71, 87',
            isAOE: true,
            aoeRadius: 300,
            description: 'Area damage'
        });
        
        // Elemental Category
        this.register({
            id: 'fire',
            name: 'Fire',
            icon: '🔥',
            category: 'elemental',
            damage: 15,
            criticalChance: 0.1,
            criticalMultiplier: 1.5,
            effects: ['burn', 'fireParticles'],
            shake: 'light',
            sound: 'fire',
            color: '#ff6348',
            colorRgb: '255, 99, 72',
            dot: {
                damage: 5,
                duration: 3000,
                ticks: 6
            },
            description: 'Burn DOT'
        });
        
        this.register({
            id: 'electric',
            name: 'Electric',
            icon: '⚡',
            category: 'elemental',
            damage: 20,
            criticalChance: 0.3,
            criticalMultiplier: 2.5,
            effects: ['electricArc', 'electricFlicker', 'spark'],
            shake: 'medium',
            sound: 'electric',
            color: '#00d4ff',
            colorRgb: '0, 212, 255',
            description: 'Chain lightning'
        });
        
        // Select default tool
        this.select('punch');
    },
    
    /**
     * Register a tool
     */
    register(tool) {
        this.tools.set(tool.id, tool);
    },
    
    /**
     * Get tool by ID
     */
    get(id) {
        return this.tools.get(id);
    },
    
    /**
     * Get all tools
     */
    getAll() {
        return Array.from(this.tools.values());
    },
    
    /**
     * Get tools by category
     */
    getByCategory(category) {
        return this.getAll().filter(t => t.category === category);
    },
    
    /**
     * Get all categories
     */
    getCategories() {
        const categories = new Set(this.getAll().map(t => t.category));
        return Array.from(categories);
    },
    
    /**
     * Select a tool
     */
    select(id) {
        this.selectedTool = this.tools.get(id) || null;
        return this.selectedTool;
    },
    
    /**
     * Get selected tool
     */
    getSelected() {
        return this.selectedTool;
    },
    
    /**
     * Calculate damage with critical hit
     */
    calculateDamage(tool) {
        const isCritical = Math.random() < tool.criticalChance;
        const damage = isCritical
            ? Math.floor(tool.damage * tool.criticalMultiplier)
            : tool.damage;
        return { damage, isCritical };
    }
};

// ========================================
// SOUND SYSTEM
// Procedural audio generation
// ========================================
const SoundSystem = {
    audioContext: null,
    enabled: CONFIG.soundEnabled,
    masterGain: null,
    
    /**
     * Initialize audio system
     */
    init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            this.masterGain.gain.value = 0.5;
        } catch (e) {
            console.warn('Web Audio API not supported');
            this.enabled = false;
        }
    },
    
    /**
     * Toggle sound
     */
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    },
    
    /**
     * Resume audio context (required after user interaction)
     */
    resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    },
    
    /**
     * Play a sound effect
     */
    play(type) {
        if (!this.enabled || !this.audioContext) return;
        this.resume();
        
        const sounds = {
            punch: () => this.playPunch(),
            kick: () => this.playKick(),
            hammer: () => this.playHammer(),
            gun: () => this.playGun(),
            laser: () => this.playLaser(),
            explosion: () => this.playExplosion(),
            fire: () => this.playFire(),
            electric: () => this.playElectric(),
            critical: () => this.playCritical(),
            destroy: () => this.playDestroy(),
            respawn: () => this.playRespawn(),
            dot: () => this.playDot()
        };
        
        if (sounds[type]) {
            sounds[type]();
        }
    },
    
    /**
     * Create oscillator
     */
    createOsc(freq, type, duration, gain = 0.3) {
        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        osc.frequency.value = freq;
        osc.type = type;
        
        const now = this.audioContext.currentTime;
        gainNode.gain.setValueAtTime(gain, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        osc.start(now);
        osc.stop(now + duration);
    },
    
    /**
     * Create noise
     */
    createNoise(duration, gain = 0.2, filterFreq = 1000) {
        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        noise.buffer = buffer;
        filter.type = 'lowpass';
        filter.frequency.value = filterFreq;
        
        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        const now = this.audioContext.currentTime;
        gainNode.gain.setValueAtTime(gain, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        noise.start(now);
        noise.stop(now + duration);
    },
    
    playPunch() {
        this.createNoise(0.1, 0.25, 800);
        this.createOsc(150, 'sine', 0.08, 0.2);
    },
    
    playKick() {
        this.createNoise(0.12, 0.3, 600);
        this.createOsc(100, 'sine', 0.1, 0.25);
        this.createOsc(80, 'triangle', 0.08, 0.15);
    },
    
    playHammer() {
        this.createNoise(0.25, 0.4, 400);
        this.createOsc(60, 'sine', 0.2, 0.35);
        this.createOsc(40, 'sawtooth', 0.15, 0.2);
        setTimeout(() => {
            this.createOsc(30, 'sine', 0.1, 0.15);
            this.createNoise(0.15, 0.2, 200);
        }, 50);
    },
    
    playGun() {
        this.createNoise(0.08, 0.5, 2000);
        this.createOsc(200, 'square', 0.05, 0.3);
        setTimeout(() => {
            this.createNoise(0.15, 0.2, 500);
        }, 30);
    },
    
    playLaser() {
        this.createOsc(800, 'sine', 0.15, 0.25);
        this.createOsc(1200, 'sine', 0.1, 0.15);
        setTimeout(() => {
            this.createOsc(600, 'triangle', 0.2, 0.2);
        }, 50);
    },
    
    playExplosion() {
        this.createNoise(0.5, 0.6, 300);
        this.createOsc(50, 'sawtooth', 0.4, 0.4);
        this.createOsc(30, 'square', 0.5, 0.3);
        
        setTimeout(() => {
            this.createNoise(0.3, 0.4, 200);
            this.createOsc(20, 'sine', 0.3, 0.2);
        }, 100);
        
        setTimeout(() => {
            this.createNoise(0.2, 0.2, 100);
        }, 250);
    },
    
    playFire() {
        this.createNoise(0.2, 0.3, 1500);
        this.createOsc(300, 'sawtooth', 0.15, 0.15);
        this.createOsc(400, 'sine', 0.1, 0.1);
    },
    
    playElectric() {
        // Crackling electric sound
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                this.createNoise(0.05, 0.3, 3000);
                this.createOsc(Utils.random(800, 1500), 'sawtooth', 0.05, 0.2);
            }, i * 40);
        }
        this.createOsc(100, 'square', 0.2, 0.15);
    },
    
    playCritical() {
        this.createNoise(0.2, 0.4, 1500);
        this.createOsc(200, 'square', 0.1, 0.25);
        this.createOsc(150, 'sawtooth', 0.15, 0.2);
        setTimeout(() => {
            this.createOsc(250, 'sine', 0.1, 0.2);
        }, 50);
    },
    
    playDestroy() {
        this.createNoise(0.5, 0.5, 400);
        this.createOsc(60, 'sawtooth', 0.4, 0.4);
        this.createOsc(40, 'square', 0.5, 0.3);
        
        setTimeout(() => {
            this.createNoise(0.3, 0.3, 200);
        }, 150);
        
        setTimeout(() => {
            this.createOsc(30, 'triangle', 0.4, 0.2);
        }, 300);
    },
    
    playRespawn() {
        const notes = [261.63, 329.63, 392.00, 523.25];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.createOsc(freq, 'sine', 0.2, 0.2);
            }, i * 80);
        });
    },
    
    playDot() {
        this.createOsc(200, 'sine', 0.08, 0.1);
        this.createNoise(0.05, 0.1, 500);
    }
};

// ========================================
// PARTICLE SYSTEM
// Canvas-based particle effects
// ========================================
const ParticleSystem = {
    canvas: null,
    ctx: null,
    particles: [],
    animationId: null,
    
    /**
     * Initialize particle system
     */
    init() {
        this.canvas = document.getElementById('particle-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.animate();
    },
    
    /**
     * Resize canvas
     */
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    },
    
    /**
     * Add particle
     */
    addParticle(particle) {
        this.particles.push(particle);
    },
    
    /**
     * Create spark particles
     */
    createSparks(x, y, count = 10, colors = ['#00d4ff', '#ff3366', '#ffffff', '#ffa94d']) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Utils.random(3, 8);
            
            this.addParticle({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Utils.random(2, 5),
                color: colors[Math.floor(Math.random() * colors.length)],
                alpha: 1,
                decay: Utils.random(0.02, 0.04),
                gravity: 0.1,
                type: 'spark'
            });
        }
    },
    
    /**
     * Create smoke particles
     */
    createSmoke(x, y, count = 8) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Utils.random(0.5, 2);
            
            this.addParticle({
                x: x + Utils.random(-10, 10),
                y: y + Utils.random(-10, 10),
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1,
                size: Utils.random(10, 25),
                color: '#555555',
                alpha: 0.6,
                decay: 0.01,
                gravity: -0.05,
                type: 'smoke'
            });
        }
    },
    
    /**
     * Create fire particles
     */
    createFire(x, y, count = 15) {
        const colors = ['#ff6600', '#ff3300', '#ffcc00', '#ff0000'];
        
        for (let i = 0; i < count; i++) {
            const angle = Utils.random(-0.8, 0.8) - Math.PI / 2;
            const speed = Utils.random(2, 5);
            
            this.addParticle({
                x: x + Utils.random(-15, 15),
                y,
                vx: Math.cos(angle) * speed * 0.5,
                vy: Math.sin(angle) * speed,
                size: Utils.random(5, 12),
                color: colors[Math.floor(Math.random() * colors.length)],
                alpha: 1,
                decay: Utils.random(0.03, 0.05),
                gravity: -0.15,
                type: 'fire'
            });
        }
    },
    
    /**
     * Create explosion particles
     */
    createExplosion(x, y, count = 30, color = '#ff4444') {
        // Core explosion
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + Utils.random(-0.2, 0.2);
            const speed = Utils.random(4, 10);
            
            this.addParticle({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Utils.random(4, 10),
                color,
                alpha: 1,
                decay: Utils.random(0.015, 0.03),
                gravity: 0.1,
                type: 'explosion'
            });
        }
        
        // Add debris
        for (let i = 0; i < count / 2; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Utils.random(2, 6);
            
            this.addParticle({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Utils.random(2, 5),
                color: '#333333',
                alpha: 1,
                decay: 0.02,
                gravity: 0.2,
                type: 'debris'
            });
        }
    },
    
    /**
     * Create shockwave ring
     */
    createShockwave(x, y) {
        this.addParticle({
            x, y,
            vx: 0,
            vy: 0,
            size: 10,
            maxSize: 200,
            color: '#ffffff',
            alpha: 0.8,
            decay: 0.04,
            gravity: 0,
            type: 'shockwave',
            expansion: 8
        });
    },
    
    /**
     * Create electric arc particles
     */
    createElectricArc(x1, y1, x2, y2, segments = 8) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        
        for (let i = 0; i < segments; i++) {
            const t = i / segments;
            const x = x1 + dx * t + Utils.random(-20, 20);
            const y = y1 + dy * t + Utils.random(-20, 20);
            
            this.addParticle({
                x, y,
                vx: Utils.random(-2, 2),
                vy: Utils.random(-2, 2),
                size: Utils.random(2, 6),
                color: '#00d4ff',
                alpha: 1,
                decay: 0.08,
                gravity: 0,
                type: 'electric',
                glow: true
            });
        }
    },
    
    /**
     * Create bullet trail
     */
    createBulletTrail(x, y) {
        for (let i = 0; i < 5; i++) {
            this.addParticle({
                x: x + Utils.random(-5, 5),
                y: y + Utils.random(-5, 5),
                vx: Utils.random(-1, 1),
                vy: Utils.random(-1, 1),
                size: Utils.random(1, 3),
                color: '#ffcc00',
                alpha: 1,
                decay: 0.1,
                gravity: 0,
                type: 'bullet'
            });
        }
    },
    
    /**
     * Animation loop
     */
    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.particles = this.particles.filter(p => {
            // Update position
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity || 0;
            p.alpha -= p.decay;
            
            // Special handling for shockwave
            if (p.type === 'shockwave') {
                p.size += p.expansion;
                if (p.size > p.maxSize) p.alpha = 0;
            }
            
            // Draw particle
            if (p.alpha > 0) {
                this.ctx.save();
                this.ctx.globalAlpha = p.alpha;
                
                if (p.type === 'shockwave') {
                    // Draw ring
                    this.ctx.strokeStyle = p.color;
                    this.ctx.lineWidth = 3;
                    this.ctx.beginPath();
                    this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    this.ctx.stroke();
                } else if (p.type === 'smoke') {
                    // Draw soft smoke
                    const gradient = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
                    gradient.addColorStop(0, p.color);
                    gradient.addColorStop(1, 'transparent');
                    this.ctx.fillStyle = gradient;
                    this.ctx.beginPath();
                    this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    this.ctx.fill();
                } else if (p.glow) {
                    // Draw glowing particle
                    this.ctx.shadowBlur = 15;
                    this.ctx.shadowColor = p.color;
                    this.ctx.fillStyle = p.color;
                    this.ctx.beginPath();
                    this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.shadowBlur = 0;
                } else {
                    // Draw normal particle
                    this.ctx.fillStyle = p.color;
                    this.ctx.beginPath();
                    this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    this.ctx.fill();
                }
                
                this.ctx.restore();
                
                // Shrink non-smoke particles
                if (p.type !== 'smoke' && p.type !== 'shockwave') {
                    p.size *= 0.97;
                }
                
                return p.alpha > 0 && p.size > 0.5;
            }
            
            return false;
        });
        
        this.animationId = requestAnimationFrame(() => this.animate());
    }
};

// ========================================
// SCREEN EFFECTS
// Global visual effects
// ========================================
const ScreenEffects = {
    elements: {},
    
    /**
     * Initialize screen effects
     */
    init() {
        this.elements = {
            flash: document.getElementById('screen-flash'),
            electric: document.getElementById('electric-overlay'),
            heat: document.getElementById('heat-overlay'),
            wrapper: document.querySelector('.app-wrapper')
        };
    },
    
    /**
     * Flash screen
     */
    flash(color = 'red') {
        const el = this.elements.flash;
        el.className = 'screen-flash';
        void el.offsetWidth; // Force reflow
        el.classList.add(color);
        
        setTimeout(() => {
            el.className = 'screen-flash';
        }, 300);
    },
    
    /**
     * Shake screen
     */
    shake(intensity = 'light') {
        const el = this.elements.wrapper;
        el.classList.remove('screen-shake-light', 'screen-shake-heavy');
        void el.offsetWidth;
        
        if (intensity === 'heavy') {
            el.classList.add('screen-shake-heavy');
            setTimeout(() => el.classList.remove('screen-shake-heavy'), 500);
        } else {
            el.classList.add('screen-shake-light');
            setTimeout(() => el.classList.remove('screen-shake-light'), 300);
        }
    },
    
    /**
     * Electric flicker effect
     */
    electricFlicker() {
        const el = this.elements.electric;
        el.classList.remove('active');
        void el.offsetWidth;
        el.classList.add('active');
        
        setTimeout(() => {
            el.classList.remove('active');
        }, 400);
    },
    
    /**
     * Heat distortion effect
     */
    heatDistortion(x, y) {
        const el = this.elements.heat;
        el.style.setProperty('--heat-x', `${(x / window.innerWidth) * 100}%`);
        el.style.setProperty('--heat-y', `${(y / window.innerHeight) * 100}%`);
        
        el.classList.remove('active');
        void el.offsetWidth;
        el.classList.add('active');
        
        setTimeout(() => {
            el.classList.remove('active');
        }, 500);
    }
};

// ========================================
// PROFILE STORE
// State management for profiles
// ========================================
const ProfileStore = {
    profiles: [],
    nextLocalId: 1,
    stats: {
        destroyed: 0,
        totalDamage: 0,
        totalHits: 0
    },
    activeDOTs: new Map(), // Track active DOT effects
    
    /**
     * Add a profile
     */
    add(profileData) {
        const profile = {
            localId: this.nextLocalId++,
            id: profileData.id,
            name: profileData.name,
            displayName: profileData.displayName,
            avatarUrl: profileData.avatarUrl,
            health: CONFIG.defaultHealth,
            maxHealth: CONFIG.maxHealth,
            isDestroyed: false,
            bulletHoles: [],
            createdAt: Date.now()
        };
        
        this.profiles.push(profile);
        this.save();
        return profile;
    },
    
    /**
     * Remove a profile
     */
    remove(localId) {
        // Clear any active DOTs
        this.clearDOT(localId);
        
        const index = this.profiles.findIndex(p => p.localId === localId);
        if (index !== -1) {
            this.profiles.splice(index, 1);
            this.save();
            return true;
        }
        return false;
    },
    
    /**
     * Get profile by local ID
     */
    get(localId) {
        return this.profiles.find(p => p.localId === localId) || null;
    },
    
    /**
     * Get all profiles
     */
    getAll() {
        return [...this.profiles];
    },
    
    /**
     * Get all alive profiles
     */
    getAlive() {
        return this.profiles.filter(p => !p.isDestroyed);
    },
    
    /**
     * Count profiles
     */
    count() {
        return this.profiles.length;
    },
    
    /**
     * Apply damage
     */
    applyDamage(localId, damage) {
        const profile = this.get(localId);
        if (profile && !profile.isDestroyed) {
            profile.health = Math.max(0, profile.health - damage);
            this.stats.totalDamage += damage;
            this.stats.totalHits++;
            
            if (profile.health <= 0) {
                profile.isDestroyed = true;
                profile.health = 0;
                this.stats.destroyed++;
                this.clearDOT(localId);
            }
            
            this.save();
            return profile;
        }
        return null;
    },
    
    /**
     * Apply DOT effect
     */
    applyDOT(localId, dotConfig) {
        // Clear existing DOT of same type
        this.clearDOT(localId);
        
        const profile = this.get(localId);
        if (!profile || profile.isDestroyed) return;
        
        let ticksRemaining = dotConfig.ticks;
        
        const dotInterval = setInterval(() => {
            const p = this.get(localId);
            if (!p || p.isDestroyed || ticksRemaining <= 0) {
                this.clearDOT(localId);
                return;
            }
            
            // Apply tick damage
            this.applyDamage(localId, dotConfig.damage);
            UIRenderer.showDamageText(localId, dotConfig.damage, false, null, null, 'dot fire');
            UIRenderer.updateProfileCard(this.get(localId));
            SoundSystem.play('dot');
            
            ticksRemaining--;
            
            if (ticksRemaining <= 0) {
                this.clearDOT(localId);
                UIRenderer.removeEffect(localId, 'burning');
            }
        }, CONFIG.dotTickInterval);
        
        this.activeDOTs.set(localId, dotInterval);
    },
    
    /**
     * Clear DOT effect
     */
    clearDOT(localId) {
        if (this.activeDOTs.has(localId)) {
            clearInterval(this.activeDOTs.get(localId));
            this.activeDOTs.delete(localId);
        }
    },
    
    /**
     * Add bullet hole to profile
     */
    addBulletHole(localId, x, y) {
        const profile = this.get(localId);
        if (profile) {
            profile.bulletHoles.push({ x, y });
            // Keep max 10 bullet holes
            if (profile.bulletHoles.length > 10) {
                profile.bulletHoles.shift();
            }
        }
    },
    
    /**
     * Respawn a profile
     */
    respawn(localId) {
        const profile = this.get(localId);
        if (profile) {
            profile.health = profile.maxHealth;
            profile.isDestroyed = false;
            profile.bulletHoles = [];
            this.clearDOT(localId);
            this.save();
            return profile;
        }
        return null;
    },
    
    /**
     * Respawn all profiles
     */
    respawnAll() {
        this.profiles.forEach(p => {
            p.health = p.maxHealth;
            p.isDestroyed = false;
            p.bulletHoles = [];
            this.clearDOT(p.localId);
        });
        this.save();
    },
    
    /**
     * Clear all profiles
     */
    clear() {
        // Clear all DOTs
        this.activeDOTs.forEach((interval) => clearInterval(interval));
        this.activeDOTs.clear();
        
        this.profiles = [];
        this.stats = { destroyed: 0, totalDamage: 0, totalHits: 0 };
        this.save();
    },
    
    /**
     * Check if username exists
     */
    hasUsername(username) {
        return this.profiles.some(
            p => p.name.toLowerCase() === username.toLowerCase()
        );
    },
    
    /**
     * Save to localStorage
     */
    save() {
        try {
            localStorage.setItem('roblox_profiles_v2', JSON.stringify(this.profiles));
            localStorage.setItem('roblox_nextId_v2', this.nextLocalId.toString());
            localStorage.setItem('roblox_stats_v2', JSON.stringify(this.stats));
        } catch (e) {
            console.warn('Could not save to localStorage:', e);
        }
    },
    
    /**
     * Load from localStorage
     */
    load() {
        try {
            const profiles = localStorage.getItem('roblox_profiles_v2');
            const nextId = localStorage.getItem('roblox_nextId_v2');
            const stats = localStorage.getItem('roblox_stats_v2');
            
            if (profiles) this.profiles = JSON.parse(profiles);
            if (nextId) this.nextLocalId = parseInt(nextId, 10);
            if (stats) this.stats = JSON.parse(stats);
        } catch (e) {
            console.warn('Could not load from localStorage:', e);
        }
    }
};

// ========================================
// UI RENDERER
// DOM manipulation and rendering
// ========================================
const UIRenderer = {
    elements: {},
    
    /**
     * Initialize UI
     */
    init() {
        this.elements = {
            input: document.getElementById('username-input'),
            addBtn: document.getElementById('add-profile-btn'),
            status: document.getElementById('status-message'),
            container: document.getElementById('profiles-container'),
            profileCount: document.getElementById('profile-count'),
            destroyedCount: document.getElementById('destroyed-count'),
            totalDamage: document.getElementById('total-damage'),
            totalHits: document.getElementById('total-hits'),
            clearBtn: document.getElementById('clear-all-btn'),
            respawnAllBtn: document.getElementById('respawn-all-btn'),
            toolsList: document.getElementById('tools-list'),
            selectedToolDisplay: document.getElementById('selected-tool-display'),
            soundToggle: document.getElementById('sound-toggle'),
            sidebar: document.getElementById('sidebar'),
            sidebarToggle: document.getElementById('sidebar-toggle'),
            mobileToolToggle: document.getElementById('mobile-tool-toggle')
        };
    },
    
    /**
     * Set status message
     */
    setStatus(message, type = '') {
        this.elements.status.textContent = message;
        this.elements.status.className = `status-message ${type}`;
    },
    
    /**
     * Update stats display
     */
    updateStats() {
        this.elements.profileCount.textContent = ProfileStore.count();
        this.elements.destroyedCount.textContent = ProfileStore.stats.destroyed;
        this.elements.totalDamage.textContent = ProfileStore.stats.totalDamage;
        this.elements.totalHits.textContent = ProfileStore.stats.totalHits;
    },
    
    /**
     * Set loading state
     */
    setLoading(isLoading) {
        this.elements.addBtn.disabled = isLoading;
        this.elements.input.disabled = isLoading;
        
        const btnText = this.elements.addBtn.querySelector('.btn-text');
        const btnIcon = this.elements.addBtn.querySelector('.btn-icon');
        
        if (isLoading) {
            btnText.textContent = 'Loading...';
            btnIcon.innerHTML = '<span class="loading-spinner"></span>';
        } else {
            btnText.textContent = 'Add Dummy';
            btnIcon.textContent = '+';
        }
    },
    
    /**
     * Render tools in sidebar
     */
    renderTools() {
        const categories = {
            melee: { name: 'Melee', icon: '⚔️' },
            ranged: { name: 'Ranged', icon: '🎯' },
            explosive: { name: 'Explosive', icon: '💥' },
            elemental: { name: 'Elemental', icon: '✨' }
        };
        
        let html = '';
        
        for (const [catId, catInfo] of Object.entries(categories)) {
            const tools = ToolsRegistry.getByCategory(catId);
            if (tools.length === 0) continue;
            
            html += `
                <div class="tool-category">
                    <div class="tool-category-title">${catInfo.icon} ${catInfo.name}</div>
                    ${tools.map(tool => this.renderToolItem(tool)).join('')}
                </div>
            `;
        }
        
        this.elements.toolsList.innerHTML = html;
        
        // Add click listeners
        this.elements.toolsList.querySelectorAll('.tool-item').forEach(item => {
            item.addEventListener('click', () => {
                const toolId = item.dataset.toolId;
                ToolsRegistry.select(toolId);
                this.updateToolSelection();
            });
        });
        
        this.updateToolSelection();
    },
    
    /**
     * Render single tool item
     */
    renderToolItem(tool) {
        const selected = ToolsRegistry.getSelected();
        const isSelected = selected && selected.id === tool.id;
        
        return `
            <div class="tool-item ${isSelected ? 'selected' : ''}" 
                 data-tool-id="${tool.id}"
                 style="--tool-color: ${tool.color}; --tool-rgb: ${tool.colorRgb}">
                <div class="tool-icon-wrapper">
                    <span class="tool-icon">${tool.icon}</span>
                </div>
                <div class="tool-info">
                    <div class="tool-name">${tool.name}</div>
                    <div class="tool-stats">
                        <span class="tool-stat damage">💥 ${tool.damage}</span>
                        <span class="tool-stat special">${tool.description}</span>
                    </div>
                </div>
            </div>
        `;
    },
    
    /**
     * Update tool selection in UI
     */
    updateToolSelection() {
        const tool = ToolsRegistry.getSelected();
        
        // Update tool items
        this.elements.toolsList.querySelectorAll('.tool-item').forEach(item => {
            item.classList.toggle('selected', item.dataset.toolId === tool?.id);
        });
        
        // Update selected tool display
        if (tool) {
            this.elements.selectedToolDisplay.innerHTML = `
                <span class="selected-icon">${tool.icon}</span>
                <div class="selected-info">
                    <span class="selected-name">${tool.name}</span>
                    <span class="selected-damage">${tool.damage} DMG</span>
                </div>
            `;
        }
    },
    
    /**
     * Get health level class
     */
    getHealthLevel(health, maxHealth) {
        const percent = (health / maxHealth) * 100;
        if (percent > 50) return 'high';
        if (percent > 25) return 'mid';
        return 'low';
    },
    
    /**
     * Get crack level
     */
    getCrackLevel(health, maxHealth) {
        const percent = (health / maxHealth) * 100;
        if (percent < CONFIG.crackThresholds.crack3) return 3;
        if (percent < CONFIG.crackThresholds.crack2) return 2;
        if (percent < CONFIG.crackThresholds.crack1) return 1;
        return 0;
    },
    
    /**
     * Create profile card HTML
     */
    createProfileCard(profile) {
        const healthPercent = (profile.health / profile.maxHealth) * 100;
        const healthLevel = this.getHealthLevel(profile.health, profile.maxHealth);
        const crackLevel = this.getCrackLevel(profile.health, profile.maxHealth);
        
        return `
            <article class="profile-card ${profile.isDestroyed ? 'destroyed' : ''} spawning"
                     id="profile-${profile.localId}"
                     data-local-id="${profile.localId}">
                <button class="remove-btn" aria-label="Remove">×</button>
                <span class="profile-badge">#${profile.id}</span>
                
                <div class="avatar-wrapper" id="avatar-wrapper-${profile.localId}">
                    ${profile.avatarUrl
                        ? `<img class="avatar-image ${healthLevel === 'low' ? 'critical' : healthLevel === 'mid' ? 'damaged' : ''}"
                               src="${profile.avatarUrl}"
                               alt="${profile.displayName}"
                               id="avatar-${profile.localId}"
                               draggable="false">`
                        : `<div class="avatar-placeholder">?</div>`
                    }
                    
                    <!-- Crack Overlays -->
                    <div class="crack-overlay crack-1 ${crackLevel >= 1 ? 'visible' : ''}" id="crack1-${profile.localId}"></div>
                    <div class="crack-overlay crack-2 ${crackLevel >= 2 ? 'visible' : ''}" id="crack2-${profile.localId}"></div>
                    <div class="crack-overlay crack-3 ${crackLevel >= 3 ? 'visible' : ''}" id="crack3-${profile.localId}"></div>
                    
                    <!-- Effect Overlays -->
                    <div class="effect-overlay burn" id="effect-burn-${profile.localId}"></div>
                    <div class="effect-overlay burning" id="effect-burning-${profile.localId}"></div>
                    <div class="effect-overlay electric" id="effect-electric-${profile.localId}"></div>
                    <div class="effect-overlay laser-heat" id="effect-laser-${profile.localId}"></div>
                    
                    <!-- Bullet Holes -->
                    <div class="bullet-holes-container" id="bullets-${profile.localId}"></div>
                    
                    <!-- Shatter Container -->
                    <div class="shatter-container" id="shatter-${profile.localId}"></div>
                    
                    ${profile.isDestroyed ? this.createDestroyedOverlay(profile.localId) : ''}
                </div>
                
                <div class="profile-info">
                    <h2 class="display-name">${Utils.escapeHtml(profile.displayName)}</h2>
                    <p class="username">@${Utils.escapeHtml(profile.name)}</p>
                </div>
                
                <div class="health-section">
                    <div class="health-label">
                        <span class="health-label-text">Health</span>
                        <span class="health-value ${healthLevel}" id="health-text-${profile.localId}">
                            ${profile.health}/${profile.maxHealth}
                        </span>
                    </div>
                    <div class="health-bar-container">
                        <div class="health-bar-fill ${healthLevel}"
                             id="health-bar-${profile.localId}"
                             style="width: ${healthPercent}%"></div>
                    </div>
                </div>
            </article>
        `;
    },
    
    /**
     * Create destroyed overlay
     */
    createDestroyedOverlay(localId) {
        return `
            <div class="destroyed-overlay">
                <div class="destroyed-text">💀 DESTROYED!</div>
                <button class="respawn-btn-card" data-respawn-id="${localId}">
                    ↻ Respawn
                </button>
            </div>
        `;
    },
    
    /**
     * Create empty state
     */
    createEmptyState() {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">🎯</div>
                <p class="empty-state-text">
                    No dummies yet!<br>
                    Enter a Roblox username above to spawn a target.
                </p>
            </div>
        `;
    },
    
    /**
     * Spawn profile card
     */
    spawnProfile(profile) {
        const emptyState = this.elements.container.querySelector('.empty-state');
        if (emptyState) emptyState.remove();
        
        this.elements.container.insertAdjacentHTML('beforeend', this.createProfileCard(profile));
        this.attachCardListeners(profile.localId);
        this.updateStats();
        
        // Remove spawning class after animation
        setTimeout(() => {
            const card = document.getElementById(`profile-${profile.localId}`);
            if (card) card.classList.remove('spawning');
        }, 500);
    },
    
    /**
     * Attach event listeners to a card
     */
    attachCardListeners(localId) {
        const card = document.getElementById(`profile-${localId}`);
        if (!card) return;
        
        // Remove button
        const removeBtn = card.querySelector('.remove-btn');
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleRemove(localId);
        });
        
        // Click to attack
        card.addEventListener('click', (e) => {
            if (e.target.closest('.remove-btn') ||
                e.target.closest('.respawn-btn-card')) return;
            
            CombatSystem.attack(localId, e);
        });
        
        // Respawn button
        const respawnBtn = card.querySelector('.respawn-btn-card');
        if (respawnBtn) {
            respawnBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                CombatSystem.respawn(localId);
            });
        }
    },
    
    /**
     * Update profile card
     */
    updateProfileCard(profile) {
        if (!profile) return;
        
        const healthPercent = (profile.health / profile.maxHealth) * 100;
        const healthLevel = this.getHealthLevel(profile.health, profile.maxHealth);
        const crackLevel = this.getCrackLevel(profile.health, profile.maxHealth);
        
        // Update health bar
        const healthBar = document.getElementById(`health-bar-${profile.localId}`);
        const healthText = document.getElementById(`health-text-${profile.localId}`);
        
        if (healthBar) {
            healthBar.style.width = `${healthPercent}%`;
            healthBar.className = `health-bar-fill ${healthLevel}`;
        }
        
        if (healthText) {
            healthText.textContent = `${profile.health}/${profile.maxHealth}`;
            healthText.className = `health-value ${healthLevel}`;
        }
        
        // Update avatar state
        const avatar = document.getElementById(`avatar-${profile.localId}`);
        if (avatar) {
            avatar.classList.remove('damaged', 'critical');
            if (healthLevel === 'low') avatar.classList.add('critical');
            else if (healthLevel === 'mid') avatar.classList.add('damaged');
        }
        
        // Update cracks
        for (let i = 1; i <= 3; i++) {
            const crack = document.getElementById(`crack${i}-${profile.localId}`);
            if (crack) {
                crack.classList.toggle('visible', crackLevel >= i);
            }
        }
        
        this.updateStats();
    },
    
    /**
     * Show floating damage text
     */
    showDamageText(localId, damage, isCritical, x, y, extraClass = '') {
        const card = document.getElementById(`profile-${localId}`);
        if (!card) return;
        
        const damageText = document.createElement('div');
        const typeClass = extraClass || (isCritical ? 'critical' : 'normal');
        damageText.className = `damage-text ${typeClass}`;
        damageText.textContent = isCritical ? `-${damage} CRIT!` : `-${damage}`;
        
        // Position
        if (x && y) {
            const rect = card.getBoundingClientRect();
            damageText.style.left = `${x - rect.left}px`;
            damageText.style.top = `${y - rect.top - 20}px`;
        } else {
            // Random position for DOT
            damageText.style.left = `${Utils.random(30, 70)}%`;
            damageText.style.top = `${Utils.random(20, 40)}%`;
        }
        
        card.appendChild(damageText);
        setTimeout(() => damageText.remove(), 1000);
    },
    
    /**
     * Show effect on avatar
     */
    showEffect(localId, effectType, duration = 500) {
        const effectEl = document.getElementById(`effect-${effectType}-${localId}`);
        if (effectEl) {
            effectEl.classList.add('active');
            setTimeout(() => {
                effectEl.classList.remove('active');
            }, duration);
        }
    },
    
    /**
     * Remove effect
     */
    removeEffect(localId, effectType) {
        const effectEl = document.getElementById(`effect-${effectType}-${localId}`);
        if (effectEl) {
            effectEl.classList.remove('active');
        }
    },
    
    /**
     * Add bullet hole
     */
    addBulletHole(localId, relX, relY) {
        const container = document.getElementById(`bullets-${localId}`);
        if (!container) return;
        
        const hole = document.createElement('div');
        hole.className = 'bullet-hole';
        hole.style.left = `${relX}%`;
        hole.style.top = `${relY}%`;
        
        container.appendChild(hole);
        ProfileStore.addBulletHole(localId, relX, relY);
    },
    
    /**
     * Play hit animation on card
     */
    playHitAnimation(localId, shake = 'light', isCritical = false) {
        const card = document.getElementById(`profile-${localId}`);
        if (!card) return;
        
        // Flash
        card.classList.add('hit-flash');
        setTimeout(() => card.classList.remove('hit-flash'), 150);
        
        // Shake
        card.classList.remove('shake-light', 'shake-medium', 'shake-heavy', 'knockback', 'bounce', 'rotate-hit');
        void card.offsetWidth;
        
        if (shake === 'heavy') {
            card.classList.add('shake-heavy');
            setTimeout(() => card.classList.remove('shake-heavy'), 500);
        } else if (shake === 'medium') {
            card.classList.add('shake-medium');
            setTimeout(() => card.classList.remove('shake-medium'), 400);
        } else {
            card.classList.add('shake-light');
            setTimeout(() => card.classList.remove('shake-light'), 300);
        }
        
        // Random rotation on big hits
        if (isCritical || shake === 'heavy') {
            const rotation = Utils.random(-15, 15);
            card.style.setProperty('--rot-amount', `${rotation}deg`);
            card.classList.add('rotate-hit');
            setTimeout(() => card.classList.remove('rotate-hit'), 400);
        }
    },
    
    /**
     * Play knockback animation
     */
    playKnockback(localId) {
        const card = document.getElementById(`profile-${localId}`);
        if (!card) return;
        
        card.classList.add('knockback');
        setTimeout(() => card.classList.remove('knockback'), 400);
    },
    
    /**
     * Play bounce animation
     */
    playBounce(localId) {
        const card = document.getElementById(`profile-${localId}`);
        if (!card) return;
        
        card.classList.add('bounce');
        setTimeout(() => card.classList.remove('bounce'), 500);
    },
    
    /**
     * Play destroy animation
     */
    playDestroyAnimation(localId, avatarUrl) {
        const card = document.getElementById(`profile-${localId}`);
        const avatarWrapper = document.getElementById(`avatar-wrapper-${localId}`);
        const shatterContainer = document.getElementById(`shatter-${localId}`);
        
        if (!card || !avatarWrapper) return;
        
        card.classList.add('destroyed');
        
        // Create shatter pieces
        if (shatterContainer && avatarUrl) {
            this.createShatterPieces(shatterContainer, avatarUrl);
        }
        
        // Add destroyed overlay
        setTimeout(() => {
            if (!avatarWrapper.querySelector('.destroyed-overlay')) {
                avatarWrapper.insertAdjacentHTML('beforeend', this.createDestroyedOverlay(localId));
                
                const respawnBtn = avatarWrapper.querySelector('.respawn-btn-card');
                if (respawnBtn) {
                    respawnBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        CombatSystem.respawn(localId);
                    });
                }
            }
        }, 500);
    },
    
    /**
     * Create shatter pieces
     */
    createShatterPieces(container, avatarUrl) {
        container.innerHTML = '';
        
        const gridSize = 4;
        const pieceSize = 150 / gridSize;
        
        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                const piece = document.createElement('div');
                piece.className = 'shatter-piece';
                
                const x = col * pieceSize;
                const y = row * pieceSize;
                
                piece.style.cssText = `
                    width: ${pieceSize}px;
                    height: ${pieceSize}px;
                    left: ${x}px;
                    top: ${y}px;
                    background-image: url(${avatarUrl});
                    background-position: -${x}px -${y}px;
                `;
                
                // ========================================
// CONTINUED FROM PREVIOUS PART
// UIRenderer.createShatterPieces continued...
// ========================================

                // Random trajectory
                const angle = Math.random() * Math.PI * 2;
                const distance = 80 + Math.random() * 120;
                const rotation = -360 + Math.random() * 720;
                
                piece.style.setProperty('--tx', `${Math.cos(angle) * distance}px`);
                piece.style.setProperty('--ty', `${Math.sin(angle) * distance}px`);
                piece.style.setProperty('--rot', `${rotation}deg`);
                
                container.appendChild(piece);
                
                // Trigger animation
                setTimeout(() => piece.classList.add('animate'), 10 + (row * gridSize + col) * 20);
            }
        }
    },
    
    /**
     * Play respawn animation
     */
    playRespawnAnimation(localId) {
        const card = document.getElementById(`profile-${localId}`);
        const avatarWrapper = document.getElementById(`avatar-wrapper-${localId}`);
        const shatterContainer = document.getElementById(`shatter-${localId}`);
        const bulletsContainer = document.getElementById(`bullets-${localId}`);
        const avatar = document.getElementById(`avatar-${localId}`);
        
        if (!card) return;
        
        // Remove destroyed state
        card.classList.remove('destroyed');
        
        // Clear containers
        if (shatterContainer) shatterContainer.innerHTML = '';
        if (bulletsContainer) bulletsContainer.innerHTML = '';
        
        // Remove destroyed overlay
        const overlay = avatarWrapper?.querySelector('.destroyed-overlay');
        if (overlay) overlay.remove();
        
        // Reset avatar
        if (avatar) {
            avatar.classList.remove('damaged', 'critical');
            avatar.style.opacity = '1';
            avatar.style.transform = 'scale(1)';
        }
        
        // Remove cracks
        for (let i = 1; i <= 3; i++) {
            const crack = document.getElementById(`crack${i}-${localId}`);
            if (crack) crack.classList.remove('visible');
        }
        
        // Remove all effects
        ['burn', 'burning', 'electric', 'laser'].forEach(effect => {
            this.removeEffect(localId, effect);
        });
        
        // Play spawn animation
        card.classList.add('spawning');
        setTimeout(() => card.classList.remove('spawning'), 500);
    },
    
    /**
     * Handle remove profile
     */
    handleRemove(localId) {
        const card = document.getElementById(`profile-${localId}`);
        if (card) {
            card.style.animation = 'spawn-in 0.3s ease-out reverse';
            setTimeout(() => {
                card.remove();
                ProfileStore.remove(localId);
                this.updateStats();
                
                if (ProfileStore.count() === 0) {
                    this.elements.container.innerHTML = this.createEmptyState();
                }
            }, 280);
        }
    },
    
    /**
     * Render all profiles
     */
    renderAll() {
        const profiles = ProfileStore.getAll();
        
        if (profiles.length === 0) {
            this.elements.container.innerHTML = this.createEmptyState();
        } else {
            this.elements.container.innerHTML = profiles
                .map(p => this.createProfileCard(p))
                .join('');
            
            profiles.forEach(profile => {
                this.attachCardListeners(profile.localId);
                
                // Restore bullet holes
                const bulletsContainer = document.getElementById(`bullets-${profile.localId}`);
                if (bulletsContainer && profile.bulletHoles) {
                    profile.bulletHoles.forEach(hole => {
                        const holeEl = document.createElement('div');
                        holeEl.className = 'bullet-hole';
                        holeEl.style.left = `${hole.x}%`;
                        holeEl.style.top = `${hole.y}%`;
                        bulletsContainer.appendChild(holeEl);
                    });
                }
            });
            
            // Remove spawning class
            setTimeout(() => {
                document.querySelectorAll('.profile-card.spawning').forEach(card => {
                    card.classList.remove('spawning');
                });
            }, 100);
        }
        
        this.updateStats();
    },
    
    /**
     * Clear all profiles
     */
    clearAll() {
        ProfileStore.clear();
        this.elements.container.innerHTML = this.createEmptyState();
        this.updateStats();
        this.setStatus('All dummies cleared', 'success');
    }
};

// ========================================
// COMBAT SYSTEM
// Handle attacks, damage, and effects
// ========================================
const CombatSystem = {
    /**
     * Attack a profile
     */
    attack(localId, event) {
        const profile = ProfileStore.get(localId);
        const tool = ToolsRegistry.getSelected();
        
        if (!profile || profile.isDestroyed || !tool) return null;
        
        // Calculate damage
        const { damage, isCritical } = ToolsRegistry.calculateDamage(tool);
        
        // Get click position
        const x = event.clientX;
        const y = event.clientY;
        
        // Apply damage
        ProfileStore.applyDamage(localId, damage);
        
        // Get card position for effects
        const card = document.getElementById(`profile-${localId}`);
        const avatarWrapper = document.getElementById(`avatar-wrapper-${localId}`);
        const cardRect = card?.getBoundingClientRect();
        const avatarRect = avatarWrapper?.getBoundingClientRect();
        
        // Calculate center of avatar for particles
        const centerX = avatarRect ? avatarRect.left + avatarRect.width / 2 : x;
        const centerY = avatarRect ? avatarRect.top + avatarRect.height / 2 : y;
        
        // === Apply tool-specific effects ===
        this.applyToolEffects(tool, localId, x, y, centerX, centerY, cardRect, avatarRect, isCritical);
        
        // Show damage text
        UIRenderer.showDamageText(localId, damage, isCritical, x, y, tool.id);
        
        // Play hit animation
        UIRenderer.playHitAnimation(localId, tool.shake, isCritical);
        
        // Play sound
        if (isCritical) {
            SoundSystem.play('critical');
        } else {
            SoundSystem.play(tool.sound);
        }
        
        // Update display
        const updatedProfile = ProfileStore.get(localId);
        UIRenderer.updateProfileCard(updatedProfile);
        
        // Check if destroyed
        if (updatedProfile.isDestroyed) {
            this.handleDestroy(localId, updatedProfile.avatarUrl, centerX, centerY);
        }
        
        return { damage, isCritical, destroyed: updatedProfile.isDestroyed };
    },
    
    /**
     * Apply tool-specific effects
     */
    applyToolEffects(tool, localId, x, y, centerX, centerY, cardRect, avatarRect, isCritical) {
        const effects = tool.effects || [];
        
        effects.forEach(effect => {
            switch (effect) {
                case 'spark':
                    ParticleSystem.createSparks(x, y, isCritical ? 15 : 8);
                    break;
                    
                case 'smoke':
                    ParticleSystem.createSmoke(centerX, centerY, isCritical ? 12 : 6);
                    break;
                    
                case 'knockback':
                    if (CONFIG.knockbackEnabled) {
                        UIRenderer.playKnockback(localId);
                    }
                    break;
                    
                case 'bounce':
                    UIRenderer.playBounce(localId);
                    break;
                    
                case 'screenShake':
                    ScreenEffects.shake(tool.shake === 'heavy' ? 'heavy' : 'light');
                    break;
                    
                case 'bulletHole':
                    if (avatarRect) {
                        const relX = ((x - avatarRect.left) / avatarRect.width) * 100;
                        const relY = ((y - avatarRect.top) / avatarRect.height) * 100;
                        // Only add if within avatar bounds
                        if (relX >= 0 && relX <= 100 && relY >= 0 && relY <= 100) {
                            UIRenderer.addBulletHole(localId, relX, relY);
                        }
                    }
                    ParticleSystem.createBulletTrail(x, y);
                    break;
                    
                case 'recoil':
                    ScreenEffects.flash('white');
                    break;
                    
                case 'laserBurn':
                    UIRenderer.showEffect(localId, 'laser', 400);
                    ParticleSystem.createSparks(centerX, centerY, 12, ['#ff0080', '#ff00ff', '#ffffff']);
                    break;
                    
                case 'heatDistortion':
                    ScreenEffects.heatDistortion(centerX, centerY);
                    break;
                    
                case 'explosion':
                    ParticleSystem.createExplosion(centerX, centerY, 40, '#ff4444');
                    ParticleSystem.createSmoke(centerX, centerY, 15);
                    ScreenEffects.flash('orange');
                    break;
                    
                case 'shockwave':
                    ParticleSystem.createShockwave(centerX, centerY);
                    break;
                    
                case 'knockbackAll':
                    this.knockbackAllProfiles(localId);
                    break;
                    
                case 'burn':
                    UIRenderer.showEffect(localId, 'burn', 500);
                    ParticleSystem.createFire(centerX, centerY, 20);
                    break;
                    
                case 'fireParticles':
                    ParticleSystem.createFire(centerX, centerY, 15);
                    // Apply DOT if configured
                    if (tool.dot) {
                        ProfileStore.applyDOT(localId, tool.dot);
                        UIRenderer.showEffect(localId, 'burning', tool.dot.duration);
                    }
                    break;
                    
                case 'electricArc':
                    UIRenderer.showEffect(localId, 'electric', 400);
                    // Create arcs to random positions
                    for (let i = 0; i < 3; i++) {
                        const endX = centerX + Utils.random(-100, 100);
                        const endY = centerY + Utils.random(-100, 100);
                        ParticleSystem.createElectricArc(centerX, centerY, endX, endY, 6);
                    }
                    break;
                    
                case 'electricFlicker':
                    ScreenEffects.electricFlicker();
                    break;
            }
        });
    },
    
    /**
     * Knockback all profiles (bomb effect)
     */
    knockbackAllProfiles(sourceLocalId) {
        const profiles = ProfileStore.getAlive();
        
        profiles.forEach(profile => {
            if (profile.localId !== sourceLocalId) {
                UIRenderer.playKnockback(profile.localId);
                UIRenderer.playBounce(profile.localId);
                
                // Apply splash damage
                const splashDamage = Utils.randomInt(10, 20);
                ProfileStore.applyDamage(profile.localId, splashDamage);
                UIRenderer.showDamageText(profile.localId, splashDamage, false, null, null, 'explosion');
                UIRenderer.updateProfileCard(ProfileStore.get(profile.localId));
                
                // Check if destroyed
                const updated = ProfileStore.get(profile.localId);
                if (updated.isDestroyed) {
                    const card = document.getElementById(`profile-${profile.localId}`);
                    const rect = card?.getBoundingClientRect();
                    if (rect) {
                        this.handleDestroy(profile.localId, updated.avatarUrl, 
                            rect.left + rect.width / 2, rect.top + rect.height / 2);
                    }
                }
            }
        });
    },
    
    /**
     * Handle profile destruction
     */
    handleDestroy(localId, avatarUrl, x, y) {
        SoundSystem.play('destroy');
        ParticleSystem.createExplosion(x, y, 25, '#ff3366');
        ParticleSystem.createSmoke(x, y, 10);
        ScreenEffects.flash('red');
        UIRenderer.playDestroyAnimation(localId, avatarUrl);
    },
    
    /**
     * Respawn a profile
     */
    respawn(localId) {
        ProfileStore.respawn(localId);
        const profile = ProfileStore.get(localId);
        
        if (profile) {
            SoundSystem.play('respawn');
            UIRenderer.playRespawnAnimation(localId);
            UIRenderer.updateProfileCard(profile);
            
            // Particles at respawn
            const card = document.getElementById(`profile-${localId}`);
            if (card) {
                const rect = card.getBoundingClientRect();
                ParticleSystem.createSparks(
                    rect.left + rect.width / 2,
                    rect.top + rect.height / 2,
                    20,
                    ['#22c55e', '#4ade80', '#ffffff']
                );
            }
        }
    },
    
    /**
     * Respawn all profiles
     */
    respawnAll() {
        const profiles = ProfileStore.getAll();
        ProfileStore.respawnAll();
        
        profiles.forEach(p => {
            UIRenderer.playRespawnAnimation(p.localId);
            UIRenderer.updateProfileCard(ProfileStore.get(p.localId));
        });
        
        SoundSystem.play('respawn');
        UIRenderer.setStatus('All dummies respawned!', 'success');
    }
};

// ========================================
// MAIN APPLICATION CONTROLLER
// ========================================
const App = {
    /**
     * Initialize the application
     */
    init() {
        console.log('🎮 Initializing Roblox Dummy Arena...');
        
        // Initialize all systems
        UIRenderer.init();
        ToolsRegistry.init();
        SoundSystem.init();
        ParticleSystem.init();
        ScreenEffects.init();
        
        // Load saved data
        ProfileStore.load();
        
        // Render UI
        UIRenderer.renderAll();
        UIRenderer.renderTools();
        
        // Bind events
        this.bindEvents();
        
        console.log('✅ Roblox Dummy Arena ready!');
    },
    
    /**
     * Bind all event listeners
     */
    bindEvents() {
        // Add profile button
        UIRenderer.elements.addBtn.addEventListener('click', () => this.addProfile());
        
        // Enter key in input
        UIRenderer.elements.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addProfile();
        });
        
        // Clear all button
        UIRenderer.elements.clearBtn.addEventListener('click', () => {
            if (confirm('Remove all dummies?')) {
                UIRenderer.clearAll();
            }
        });
        
        // Respawn all button
        UIRenderer.elements.respawnAllBtn.addEventListener('click', () => {
            CombatSystem.respawnAll();
        });
        
        // Sound toggle
        UIRenderer.elements.soundToggle.addEventListener('click', () => {
            const enabled = SoundSystem.toggle();
            UIRenderer.elements.soundToggle.classList.toggle('muted', !enabled);
            UIRenderer.elements.soundToggle.textContent = enabled ? '🔊' : '🔇';
        });
        
        // Sidebar toggle
        UIRenderer.elements.sidebarToggle.addEventListener('click', () => {
            UIRenderer.elements.sidebar.classList.toggle('collapsed');
        });
        
        // Mobile tool toggle
        UIRenderer.elements.mobileToolToggle.addEventListener('click', () => {
            UIRenderer.elements.sidebar.classList.toggle('mobile-open');
        });
        
        // Close mobile sidebar when clicking outside
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                const sidebar = UIRenderer.elements.sidebar;
                const toggle = UIRenderer.elements.mobileToolToggle;
                
                if (!sidebar.contains(e.target) && !toggle.contains(e.target)) {
                    sidebar.classList.remove('mobile-open');
                }
            }
        });
        
        // Resume audio on first interaction
        document.addEventListener('click', () => SoundSystem.resume(), { once: true });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Number keys 1-7 to select tools
            const toolKeys = ['1', '2', '3', '4', '5', '6', '7'];
            const tools = ToolsRegistry.getAll();
            
            const keyIndex = toolKeys.indexOf(e.key);
            if (keyIndex !== -1 && keyIndex < tools.length) {
                ToolsRegistry.select(tools[keyIndex].id);
                UIRenderer.updateToolSelection();
            }
            
            // R to respawn all
            if (e.key === 'r' || e.key === 'R') {
                if (!e.target.matches('input')) {
                    CombatSystem.respawnAll();
                }
            }
        });
    },
    
    /**
     * Add a new profile
     */
    async addProfile() {
        const username = UIRenderer.elements.input.value.trim();
        
        // Validation
        if (!username) {
            UIRenderer.setStatus('Please enter a username', 'error');
            return;
        }
        
        if (ProfileStore.hasUsername(username)) {
            UIRenderer.setStatus(`"${username}" already exists`, 'error');
            return;
        }
        
        // Fetch and spawn
        UIRenderer.setLoading(true);
        UIRenderer.setStatus('Fetching profile...', 'loading');
        
        try {
            const profileData = await RobloxAPI.fetchProfile(username);
            const profile = ProfileStore.add(profileData);
            UIRenderer.spawnProfile(profile);
            UIRenderer.setStatus(`Added ${profileData.displayName}!`, 'success');
            UIRenderer.elements.input.value = '';
            
            // Play spawn effect
            setTimeout(() => {
                const card = document.getElementById(`profile-${profile.localId}`);
                if (card) {
                    const rect = card.getBoundingClientRect();
                    ParticleSystem.createSparks(
                        rect.left + rect.width / 2,
                        rect.top + rect.height / 2,
                        15,
                        ['#00d4ff', '#ff3366', '#a855f7']
                    );
                }
            }, 100);
            
        } catch (error) {
            console.error('Failed to add profile:', error);
            UIRenderer.setStatus(error.message || 'Failed to fetch profile', 'error');
        } finally {
            UIRenderer.setLoading(false);
            UIRenderer.elements.input.focus();
        }
    }
};

// ========================================
// PUBLIC API
// For external access and debugging
// ========================================
const RobloxArenaAPI = {
    // Profile methods
    getProfiles: () => ProfileStore.getAll(),
    getProfile: (localId) => ProfileStore.get(localId),
    addProfile: (username) => App.addProfile.call({ elements: UIRenderer.elements }, username),
    removeProfile: (localId) => UIRenderer.handleRemove(localId),
    
    // Combat methods
    attack: (localId, damage) => {
        const profile = ProfileStore.get(localId);
        if (profile && !profile.isDestroyed) {
            ProfileStore.applyDamage(localId, damage);
            UIRenderer.updateProfileCard(ProfileStore.get(localId));
            return true;
        }
        return false;
    },
    
    // Tool methods
    registerTool: (tool) => {
        ToolsRegistry.register(tool);
        UIRenderer.renderTools();
    },
    selectTool: (id) => {
        ToolsRegistry.select(id);
        UIRenderer.updateToolSelection();
    },
    getTools: () => ToolsRegistry.getAll(),
    getSelectedTool: () => ToolsRegistry.getSelected(),
    
    // Respawn methods
    respawn: (localId) => CombatSystem.respawn(localId),
    respawnAll: () => CombatSystem.respawnAll(),
    
    // Effect methods
    createExplosion: (x, y, count, color) => ParticleSystem.createExplosion(x, y, count, color),
    createSparks: (x, y, count, colors) => ParticleSystem.createSparks(x, y, count, colors),
    createFire: (x, y, count) => ParticleSystem.createFire(x, y, count),
    createSmoke: (x, y, count) => ParticleSystem.createSmoke(x, y, count),
    createShockwave: (x, y) => ParticleSystem.createShockwave(x, y),
    screenShake: (intensity) => ScreenEffects.shake(intensity),
    screenFlash: (color) => ScreenEffects.flash(color),
    
    // Sound methods
    playSound: (type) => SoundSystem.play(type),
    toggleSound: () => SoundSystem.toggle(),
    
    // Stats
    getStats: () => ({ ...ProfileStore.stats }),
    
    // Utility
    clearCache: () => RobloxAPI.clearCache()
};

// ========================================
// INITIALIZE APPLICATION
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Make API available globally
window.RobloxArenaAPI = RobloxArenaAPI;
