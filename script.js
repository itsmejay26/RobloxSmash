/**
 * ============================================
 * ROBLOX DUMMY ARENA - PHYSICS GAME
 * ============================================
 * Fixed version with better rate limit handling
 * ============================================
 */

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
    // Physics
    gravity: 0.4,
    friction: 0.985,
    bounceFactor: 0.65,
    airResistance: 0.998,
    
    // Dummy settings
    dummyRadius: 50,
    dummyMaxHP: 10000,
    dummyMass: 1,
    
    // Damage
    tapDamage: 5,
    minImpactSpeed: 3,
    impactDamageMultiplier: 2.5,
    maxImpactDamage: 500,
    
    // Throw
    throwMultiplier: 0.25,
    maxThrowSpeed: 35,
    
    // Crack stages (percentage thresholds)
    crackStages: [80, 60, 40, 20, 5],
    
    // API Configuration - Multiple proxies for fallback
    corsProxies: [
        'https://corsproxy.io/?',
        'https://api.allorigins.win/raw?url=',
        'https://cors-anywhere.herokuapp.com/',
        '' // Direct (may work in some cases)
    ],
    currentProxyIndex: 0,
    
    robloxEndpoints: {
        usernames: 'https://users.roblox.com/v1/usernames/users',
        userInfo: 'https://users.roblox.com/v1/users/',
        avatar: 'https://thumbnails.roblox.com/v1/users/avatar-headshot'
    },
    
    // Rate limit settings - IMPROVED
    maxRetries: 5,
    baseRetryDelay: 2000,      // Start with 2 seconds
    maxRetryDelay: 30000,      // Max 30 seconds
    requestCooldown: 1500,     // 1.5 seconds between requests
    
    // Sound
    soundEnabled: true
};

// ============================================
// UTILITY FUNCTIONS
// ============================================
const Utils = {
    random(min, max) {
        return Math.random() * (max - min) + min;
    },
    
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },
    
    distance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    },
    
    lerp(start, end, t) {
        return start + (end - start) * t;
    },
    
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    
    // Generate a simple hash for caching
    hash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }
};

// ============================================
// SOUND SYSTEM (Web Audio API)
// ============================================
const SoundSystem = {
    ctx: null,
    enabled: CONFIG.soundEnabled,
    initialized: false,
    
    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio not supported');
            this.enabled = false;
        }
    },
    
    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },
    
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    },
    
    play(type, options = {}) {
        if (!this.enabled || !this.ctx) return;
        this.resume();
        
        const sounds = {
            tap: () => this.playTap(),
            hit: () => this.playHit(options.intensity || 0.5),
            impact: () => this.playImpact(options.intensity || 0.5),
            crack: () => this.playCrack(),
            break: () => this.playBreak(),
            hammer: () => this.playHammer(),
            push: () => this.playPush(),
            explosion: () => this.playExplosion(),
            freeze: () => this.playFreeze(),
            fire: () => this.playFire(),
            ui: () => this.playUI()
        };
        
        if (sounds[type]) sounds[type]();
    },
    
    createOsc(freq, type, duration, gain = 0.3) {
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        osc.frequency.value = freq;
        osc.type = type;
        gainNode.gain.setValueAtTime(gain, this.ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },
    
    createNoise(duration, gain = 0.2, freq = 1000) {
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource();
        const gainNode = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        noise.buffer = buffer;
        filter.type = 'lowpass';
        filter.frequency.value = freq;
        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        gainNode.gain.setValueAtTime(gain, this.ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        noise.start();
        noise.stop(this.ctx.currentTime + duration);
    },
    
    playTap() {
        this.createNoise(0.05, 0.15, 1200);
        this.createOsc(200, 'sine', 0.05, 0.1);
    },
    
    playHit(intensity) {
        const gain = 0.2 + intensity * 0.3;
        this.createNoise(0.1, gain, 800);
        this.createOsc(100 + intensity * 50, 'sine', 0.1, gain * 0.6);
    },
    
    playImpact(intensity) {
        const gain = 0.15 + intensity * 0.35;
        const duration = 0.1 + intensity * 0.15;
        this.createNoise(duration, gain, 600);
        this.createOsc(80 + intensity * 40, 'sine', duration, gain * 0.5);
        this.createOsc(50 + intensity * 30, 'triangle', duration * 0.8, gain * 0.3);
    },
    
    playCrack() {
        this.createNoise(0.15, 0.35, 2000);
        this.createOsc(400, 'sawtooth', 0.08, 0.2);
    },
    
    playBreak() {
        this.createNoise(0.4, 0.5, 500);
        this.createOsc(60, 'sawtooth', 0.3, 0.4);
        setTimeout(() => {
            this.createNoise(0.3, 0.3, 300);
            this.createOsc(40, 'square', 0.25, 0.3);
        }, 100);
    },
    
    playHammer() {
        this.createNoise(0.2, 0.45, 400);
        this.createOsc(70, 'sine', 0.2, 0.35);
        this.createOsc(50, 'sawtooth', 0.15, 0.25);
    },
    
    playPush() {
        this.createNoise(0.15, 0.25, 1500);
        this.createOsc(300, 'sine', 0.12, 0.15);
    },
    
    playExplosion() {
        this.createNoise(0.5, 0.6, 300);
        this.createOsc(50, 'sawtooth', 0.4, 0.45);
        this.createOsc(30, 'square', 0.5, 0.35);
        setTimeout(() => this.createNoise(0.3, 0.35, 150), 100);
    },
    
    playFreeze() {
        this.createOsc(800, 'sine', 0.2, 0.2);
        this.createOsc(1200, 'sine', 0.15, 0.15);
        this.createNoise(0.1, 0.15, 3000);
    },
    
    playFire() {
        this.createNoise(0.2, 0.25, 1200);
        this.createOsc(250, 'sawtooth', 0.15, 0.15);
    },
    
    playUI() {
        this.createOsc(600, 'sine', 0.08, 0.15);
    }
};

// ============================================
// PARTICLE SYSTEM
// ============================================
class ParticleSystem {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.particles = [];
    }
    
    add(particle) {
        this.particles.push(particle);
    }
    
    createSparks(x, y, count = 10, colors = ['#ff3366', '#00d4ff', '#fff']) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Utils.random(2, 8);
            this.add({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Utils.random(2, 5),
                color: colors[Math.floor(Math.random() * colors.length)],
                alpha: 1,
                decay: Utils.random(0.02, 0.04),
                gravity: 0.15
            });
        }
    }
    
    createImpact(x, y, intensity = 1) {
        const count = Math.floor(8 + intensity * 12);
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Utils.random(1, 5) * intensity;
            this.add({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Utils.random(2, 6),
                color: `hsl(${Utils.random(0, 30)}, 100%, ${Utils.random(50, 70)}%)`,
                alpha: 1,
                decay: Utils.random(0.015, 0.03),
                gravity: 0.1
            });
        }
    }
    
    createExplosion(x, y) {
        for (let i = 0; i < 40; i++) {
            const angle = (Math.PI * 2 * i) / 40 + Utils.random(-0.2, 0.2);
            const speed = Utils.random(3, 12);
            this.add({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Utils.random(3, 8),
                color: `hsl(${Utils.random(10, 50)}, 100%, ${Utils.random(50, 70)}%)`,
                alpha: 1,
                decay: Utils.random(0.01, 0.025),
                gravity: 0.08
            });
        }
        this.add({
            x, y, vx: 0, vy: 0,
            size: 10, maxSize: 150,
            color: '#fff', alpha: 0.6,
            decay: 0.03, gravity: 0,
            type: 'ring', expansion: 8
        });
    }
    
    createFreeze(x, y) {
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Utils.random(1, 4);
            this.add({
                x: x + Utils.random(-30, 30),
                y: y + Utils.random(-30, 30),
                vx: Math.cos(angle) * speed * 0.3,
                vy: Math.sin(angle) * speed * 0.3 - 1,
                size: Utils.random(3, 8),
                color: `hsl(200, ${Utils.random(70, 100)}%, ${Utils.random(70, 90)}%)`,
                alpha: 1,
                decay: 0.015,
                gravity: -0.02
            });
        }
    }
    
    createFire(x, y) {
        for (let i = 0; i < 15; i++) {
            const angle = Utils.random(-0.6, 0.6) - Math.PI / 2;
            const speed = Utils.random(2, 5);
            this.add({
                x: x + Utils.random(-15, 15), y,
                vx: Math.cos(angle) * speed * 0.4,
                vy: Math.sin(angle) * speed,
                size: Utils.random(4, 10),
                color: `hsl(${Utils.random(15, 45)}, 100%, ${Utils.random(50, 70)}%)`,
                alpha: 1,
                decay: Utils.random(0.025, 0.04),
                gravity: -0.1
            });
        }
    }
    
    createBreak(x, y) {
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Utils.random(5, 15);
            this.add({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 5,
                size: Utils.random(5, 15),
                color: '#444',
                alpha: 1,
                decay: 0.008,
                gravity: 0.3,
                rotation: Utils.random(0, 360),
                rotationSpeed: Utils.random(-10, 10)
            });
        }
    }
    
    update() {
        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity || 0;
            p.alpha -= p.decay;
            
            if (p.type === 'ring') {
                p.size += p.expansion;
                if (p.size > p.maxSize) p.alpha = 0;
            } else {
                p.size *= 0.97;
            }
            
            if (p.rotation !== undefined) {
                p.rotation += p.rotationSpeed;
            }
            
            return p.alpha > 0 && p.size > 0.5;
        });
    }
    
    render() {
        this.particles.forEach(p => {
            this.ctx.save();
            this.ctx.globalAlpha = p.alpha;
            
            if (p.type === 'ring') {
                this.ctx.strokeStyle = p.color;
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                this.ctx.stroke();
            } else {
                if (p.rotation !== undefined) {
                    this.ctx.translate(p.x, p.y);
                    this.ctx.rotate(p.rotation * Math.PI / 180);
                    this.ctx.fillStyle = p.color;
                    this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                } else {
                    this.ctx.fillStyle = p.color;
                    this.ctx.beginPath();
                    this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
            
            this.ctx.restore();
        });
    }
}

// ============================================
// ROBLOX API SERVICE - IMPROVED
// ============================================
const RobloxAPI = {
    // Persistent cache
    cache: new Map(),
    
    // Request queue for rate limiting
    requestQueue: [],
    isProcessingQueue: false,
    lastRequestTime: 0,
    
    // Track failed proxies
    failedProxies: new Set(),
    
    /**
     * Get a working CORS proxy URL
     */
    getProxyUrl() {
        // Try proxies in order, skip failed ones
        for (let i = 0; i < CONFIG.corsProxies.length; i++) {
            const proxy = CONFIG.corsProxies[i];
            if (!this.failedProxies.has(proxy)) {
                return proxy;
            }
        }
        // If all failed, reset and try first one
        this.failedProxies.clear();
        return CONFIG.corsProxies[0];
    },
    
    /**
     * Build URL with CORS proxy
     */
    buildUrl(url) {
        const proxy = this.getProxyUrl();
        if (!proxy) return url;
        
        // Different proxies need different URL formats
        if (proxy.includes('allorigins')) {
            return proxy + encodeURIComponent(url);
        }
        return proxy + encodeURIComponent(url);
    },
    
    /**
     * Add request to queue and process
     */
    async queueRequest(requestFn, priority = false) {
        return new Promise((resolve, reject) => {
            const request = { fn: requestFn, resolve, reject };
            
            if (priority) {
                this.requestQueue.unshift(request);
            } else {
                this.requestQueue.push(request);
            }
            
            this.processQueue();
        });
    },
    
    /**
     * Process queued requests with rate limiting
     */
    async processQueue() {
        if (this.isProcessingQueue || this.requestQueue.length === 0) return;
        
        this.isProcessingQueue = true;
        
        while (this.requestQueue.length > 0) {
            const request = this.requestQueue.shift();
            
            // Ensure minimum time between requests
            const timeSinceLastRequest = Date.now() - this.lastRequestTime;
            if (timeSinceLastRequest < CONFIG.requestCooldown) {
                await Utils.sleep(CONFIG.requestCooldown - timeSinceLastRequest);
            }
            
            try {
                this.lastRequestTime = Date.now();
                const result = await request.fn();
                request.resolve(result);
            } catch (error) {
                request.reject(error);
            }
            
            // Small delay between requests
            await Utils.sleep(300);
        }
        
        this.isProcessingQueue = false;
    },
    
    /**
     * Fetch with retry logic and proxy fallback
     */
    async fetchWithRetry(url, options = {}, retryCount = 0) {
        const proxyUrl = this.buildUrl(url);
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
            
            const response = await fetch(proxyUrl, {
                ...options,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            // Handle rate limiting (429)
            if (response.status === 429) {
                if (retryCount < CONFIG.maxRetries) {
                    // Calculate exponential backoff delay
                    const delay = Math.min(
                        CONFIG.baseRetryDelay * Math.pow(2, retryCount),
                        CONFIG.maxRetryDelay
                    );
                    
                    console.warn(`Rate limited (429). Waiting ${delay/1000}s before retry ${retryCount + 1}/${CONFIG.maxRetries}`);
                    
                    // Update UI with countdown
                    this.showRetryCountdown(delay, retryCount + 1);
                    
                    await Utils.sleep(delay);
                    return this.fetchWithRetry(url, options, retryCount + 1);
                }
                
                // Try different proxy
                const currentProxy = this.getProxyUrl();
                this.failedProxies.add(currentProxy);
                
                if (this.failedProxies.size < CONFIG.corsProxies.length) {
                    console.warn('Trying different proxy...');
                    return this.fetchWithRetry(url, options, 0);
                }
                
                throw new Error('Rate limited. Please wait a minute and try again.');
            }
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return response;
            
        } catch (error) {
            // Handle network errors
            if (error.name === 'AbortError') {
                console.warn('Request timed out');
            }
            
            if (retryCount < CONFIG.maxRetries) {
                const delay = CONFIG.baseRetryDelay * Math.pow(1.5, retryCount);
                console.warn(`Request failed. Retrying in ${delay/1000}s...`);
                await Utils.sleep(delay);
                return this.fetchWithRetry(url, options, retryCount + 1);
            }
            
            // Try different proxy on failure
            const currentProxy = this.getProxyUrl();
            if (currentProxy) {
                this.failedProxies.add(currentProxy);
                
                if (this.failedProxies.size < CONFIG.corsProxies.length) {
                    console.warn('Trying different proxy after error...');
                    return this.fetchWithRetry(url, options, 0);
                }
            }
            
            throw error;
        }
    },
    
    /**
     * Show retry countdown in status
     */
    showRetryCountdown(delay, attempt) {
        const statusEl = document.getElementById('panel-status');
        if (!statusEl) return;
        
        let remaining = Math.ceil(delay / 1000);
        
        const updateCountdown = () => {
            if (remaining > 0) {
                statusEl.textContent = `Rate limited. Retrying in ${remaining}s... (Attempt ${attempt}/${CONFIG.maxRetries})`;
                statusEl.className = 'panel-status loading';
                remaining--;
                setTimeout(updateCountdown, 1000);
            }
        };
        
        updateCountdown();
    },
    
    /**
     * Get User ID from username
     */
    async getUserId(username) {
        const cacheKey = `userId_${username.toLowerCase()}`;
        
        // Check cache first
        if (this.cache.has(cacheKey)) {
            console.log(`Cache hit for userId: ${username}`);
            return this.cache.get(cacheKey);
        }
        
        return this.queueRequest(async () => {
            const response = await this.fetchWithRetry(
                CONFIG.robloxEndpoints.usernames,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        usernames: [username], 
                        excludeBannedUsers: false 
                    })
                }
            );
            
            const data = await response.json();
            
            if (data.data && data.data.length > 0) {
                const userId = data.data[0].id;
                this.cache.set(cacheKey, userId);
                this.saveCache(); // Persist cache
                return userId;
            }
            
            return null;
        });
    },
    
    /**
     * Get user info
     */
    async getUserInfo(userId) {
        const cacheKey = `userInfo_${userId}`;
        
        if (this.cache.has(cacheKey)) {
            console.log(`Cache hit for userInfo: ${userId}`);
            return this.cache.get(cacheKey);
        }
        
        return this.queueRequest(async () => {
            const response = await this.fetchWithRetry(
                `${CONFIG.robloxEndpoints.userInfo}${userId}`
            );
            
            const data = await response.json();
            this.cache.set(cacheKey, data);
            this.saveCache();
            return data;
        });
    },
    
    /**
     * Get avatar URL
     */
    async getAvatarUrl(userId) {
        const cacheKey = `avatar_${userId}`;
        
        if (this.cache.has(cacheKey)) {
            console.log(`Cache hit for avatar: ${userId}`);
            return this.cache.get(cacheKey);
        }
        
        return this.queueRequest(async () => {
            const params = new URLSearchParams({
                userIds: userId,
                size: '420x420',
                format: 'Png'
            });
            
            const response = await this.fetchWithRetry(
                `${CONFIG.robloxEndpoints.avatar}?${params}`
            );
            
            const data = await response.json();
            
            if (data.data && data.data.length > 0) {
                const avatarUrl = data.data[0].imageUrl;
                this.cache.set(cacheKey, avatarUrl);
                this.saveCache();
                return avatarUrl;
            }
            
            return null;
        });
    },
    
    /**
     * Load complete profile
     */
    async loadProfile(username) {
        // Check for complete cached profile
        const fullCacheKey = `profile_${username.toLowerCase()}`;
        if (this.cache.has(fullCacheKey)) {
            console.log(`Using cached profile for: ${username}`);
            return this.cache.get(fullCacheKey);
        }
        
        try {
            // Step 1: Get User ID
            const userId = await this.getUserId(username);
            
            if (!userId) {
                throw new Error(`User "${username}" not found`);
            }
            
            // Step 2: Get user info
            const userInfo = await this.getUserInfo(userId);
            
            // Step 3: Get avatar (with delay to avoid rate limit)
            await Utils.sleep(500);
            const avatarUrl = await this.getAvatarUrl(userId);
            
            const profile = {
                id: userId,
                username: userInfo.name,
                displayName: userInfo.displayName,
                avatarUrl: avatarUrl || this.getDefaultAvatar()
            };
            
            // Cache the complete profile
            this.cache.set(fullCacheKey, profile);
            this.saveCache();
            
            return profile;
            
        } catch (error) {
            console.error('Profile load error:', error);
            
            // Return demo profile on failure
            if (error.message.includes('Rate limited') || error.message.includes('429')) {
                console.warn('Using demo profile due to rate limiting');
                return this.getDemoProfile(username);
            }
            
            throw error;
        }
    },
    
    /**
     * Get default avatar URL
     */
    getDefaultAvatar() {
        // Return a simple colored placeholder
        return null;
    },
    
    /**
     * Get demo profile when API fails
     */
    getDemoProfile(username) {
        return {
            id: Math.floor(Math.random() * 1000000),
            username: username,
            displayName: username,
            avatarUrl: null, // Will show placeholder
            isDemo: true
        };
    },
    
    /**
     * Save cache to localStorage
     */
    saveCache() {
        try {
            const cacheObj = {};
            this.cache.forEach((value, key) => {
                cacheObj[key] = value;
            });
            localStorage.setItem('roblox_api_cache', JSON.stringify(cacheObj));
        } catch (e) {
            console.warn('Could not save cache:', e);
        }
    },
    
    /**
     * Load cache from localStorage
     */
    loadCache() {
        try {
            const stored = localStorage.getItem('roblox_api_cache');
            if (stored) {
                const cacheObj = JSON.parse(stored);
                Object.entries(cacheObj).forEach(([key, value]) => {
                    this.cache.set(key, value);
                });
                console.log(`Loaded ${this.cache.size} cached items`);
            }
        } catch (e) {
            console.warn('Could not load cache:', e);
        }
    },
    
    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        localStorage.removeItem('roblox_api_cache');
        this.failedProxies.clear();
    }
};

// Load cache on startup
RobloxAPI.loadCache();

// ============================================
// DUMMY CLASS
// ============================================
class Dummy {
    constructor(x, y, username, displayName, avatarUrl) {
        this.username = username;
        this.displayName = displayName;
        this.avatarUrl = avatarUrl;
        this.avatarLoaded = false;
        this.avatarImage = null;
        
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.radius = CONFIG.dummyRadius;
        this.rotation = 0;
        this.angularVel = 0;
        
        this.hp = CONFIG.dummyMaxHP;
        this.maxHP = CONFIG.dummyMaxHP;
        this.isDestroyed = false;
        this.isFrozen = false;
        this.freezeTimer = 0;
        this.isDragging = false;
        this.dotActive = false;
        this.dotTimer = 0;
        
        this.crackStage = 0;
        this.flashTimer = 0;
        this.flashColor = null;
        
        this.loadAvatar();
    }
    
    loadAvatar() {
        if (!this.avatarUrl) return;
        
        this.avatarImage = new Image();
        this.avatarImage.crossOrigin = 'anonymous';
        this.avatarImage.onload = () => {
            this.avatarLoaded = true;
        };
        this.avatarImage.onerror = () => {
            console.warn('Failed to load avatar image');
            this.avatarUrl = null;
        };
        this.avatarImage.src = this.avatarUrl;
    }
    
    get speed() {
        return Math.sqrt(this.vx ** 2 + this.vy ** 2);
    }
    
    get hpPercent() {
        return (this.hp / this.maxHP) * 100;
    }
    
    applyForce(fx, fy) {
        if (this.isFrozen) return;
        this.vx += fx;
        this.vy += fy;
    }
    
    applyDamage(amount, particles, flashColor = 'red') {
        if (this.isDestroyed) return 0;
        
        const actualDamage = Math.min(amount, this.hp);
        this.hp -= actualDamage;
        
        this.flashTimer = 10;
        this.flashColor = flashColor;
        
        const oldStage = this.crackStage;
        for (let i = 0; i < CONFIG.crackStages.length; i++) {
            if (this.hpPercent <= CONFIG.crackStages[i]) {
                this.crackStage = i + 1;
            }
        }
        
        if (this.crackStage > oldStage) {
            SoundSystem.play('crack');
        }
        
        if (this.hp <= 0) {
            this.hp = 0;
            this.isDestroyed = true;
            particles.createBreak(this.x, this.y);
            SoundSystem.play('break');
        }
        
        return actualDamage;
    }
    
    update(arena, particles) {
        if (this.isDestroyed) return;
        
        if (this.isFrozen) {
            this.freezeTimer--;
            if (this.freezeTimer <= 0) {
                this.isFrozen = false;
            }
        }
        
        if (this.dotActive) {
            this.dotTimer--;
            if (this.dotTimer % 30 === 0) {
                this.applyDamage(15, particles, 'orange');
                particles.createFire(this.x, this.y - this.radius);
            }
            if (this.dotTimer <= 0) {
                this.dotActive = false;
            }
        }
        
        if (this.isDragging || this.isFrozen) {
            this.vx = 0;
            this.vy = 0;
            return;
        }
        
        this.vy += CONFIG.gravity;
        this.vx *= CONFIG.airResistance;
        this.vy *= CONFIG.airResistance;
        
        this.x += this.vx;
        this.y += this.vy;
        
        this.rotation += this.angularVel;
        this.angularVel *= 0.95;
        
        this.handleWallCollisions(arena, particles);
        
        if (this.flashTimer > 0) {
            this.flashTimer--;
        }
    }
    
    handleWallCollisions(arena, particles) {
        const { width, height } = arena;
        let impacted = false;
        let impactSpeed = 0;
        
        if (this.x - this.radius < 0) {
            this.x = this.radius;
            impactSpeed = Math.abs(this.vx);
            this.vx = -this.vx * CONFIG.bounceFactor;
            this.angularVel += this.vy * 0.05;
            impacted = true;
        }
        
        if (this.x + this.radius > width) {
            this.x = width - this.radius;
            impactSpeed = Math.abs(this.vx);
            this.vx = -this.vx * CONFIG.bounceFactor;
            this.angularVel -= this.vy * 0.05;
            impacted = true;
        }
        
        if (this.y - this.radius < 0) {
            this.y = this.radius;
            impactSpeed = Math.abs(this.vy);
            this.vy = -this.vy * CONFIG.bounceFactor;
            impacted = true;
        }
        
        if (this.y + this.radius > height) {
            this.y = height - this.radius;
            impactSpeed = Math.abs(this.vy);
            this.vy = -this.vy * CONFIG.bounceFactor;
            this.vx *= CONFIG.friction;
            this.angularVel += this.vx * 0.02;
            impacted = true;
        }
        
        if (impacted && impactSpeed > CONFIG.minImpactSpeed) {
            const intensity = Math.min(impactSpeed / 20, 1);
            const damage = Math.min(
                impactSpeed * CONFIG.impactDamageMultiplier * intensity * 10,
                CONFIG.maxImpactDamage
            );
            
            this.applyDamage(Math.floor(damage), particles);
            particles.createImpact(this.x, this.y, intensity);
            SoundSystem.play('impact', { intensity });
            
            return { impacted: true, intensity };
        }
        
        return { impacted, intensity: 0 };
    }
    
    render(ctx) {
        if (this.isDestroyed) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation * Math.PI / 180);
        
        if (this.flashTimer > 0) {
            ctx.shadowBlur = 30;
            ctx.shadowColor = this.flashColor === 'red' ? '#ff3333' : 
                              this.flashColor === 'blue' ? '#3399ff' : '#ff9933';
        }
        
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        
        if (this.avatarLoaded && this.avatarImage) {
            ctx.drawImage(
                this.avatarImage,
                -this.radius, -this.radius,
                this.radius * 2, this.radius * 2
            );
        } else {
            // Colorful placeholder
            const hue = (this.username.charCodeAt(0) * 10) % 360;
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
            grad.addColorStop(0, `hsl(${hue}, 60%, 50%)`);
            grad.addColorStop(1, `hsl(${hue}, 60%, 30%)`);
            ctx.fillStyle = grad;
            ctx.fill();
            
            // First letter
            ctx.fillStyle = '#fff';
            ctx.font = `bold ${this.radius * 0.8}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.username.charAt(0).toUpperCase(), 0, 0);
        }
        
        if (this.crackStage > 0) {
            ctx.globalAlpha = 0.3 + this.crackStage * 0.12;
            this.drawCracks(ctx, this.crackStage);
        }
        
        if (this.isFrozen) {
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = 'rgba(150, 220, 255, 0.5)';
            ctx.fill();
        }
        
        if (this.dotActive) {
            ctx.globalAlpha = 0.3 + Math.sin(Date.now() / 100) * 0.1;
            ctx.fillStyle = 'rgba(255, 100, 50, 0.4)';
            ctx.fill();
        }
        
        ctx.restore();
        
        this.drawHPBar(ctx);
        this.drawUsername(ctx);
    }
    
    drawCracks(ctx, stage) {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.lineWidth = 2;
        
        const patterns = [
            [[0, -30], [10, 0], [-5, 25]],
            [[-25, -15], [0, 10], [20, -5]],
            [[15, -25], [5, 5], [-10, 20], [25, 10]],
            [[-20, -20], [5, -5], [15, 15], [-15, 25]],
            [[0, -35], [-20, 0], [20, 0], [0, 35]]
        ];
        
        for (let i = 0; i < Math.min(stage, patterns.length); i++) {
            ctx.beginPath();
            const pattern = patterns[i];
            ctx.moveTo(pattern[0][0], pattern[0][1]);
            for (let j = 1; j < pattern.length; j++) {
                ctx.lineTo(pattern[j][0], pattern[j][1]);
            }
            ctx.stroke();
        }
    }
    
    drawHPBar(ctx) {
        const barWidth = this.radius * 2;
        const barHeight = 8;
        const barX = this.x - this.radius;
        const barY = this.y - this.radius - 15;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.roundRect(barX, barY, barWidth, barHeight, 4);
        ctx.fill();
        
        const hpWidth = (this.hp / this.maxHP) * (barWidth - 4);
        const hpColor = this.hpPercent > 50 ? '#22c55e' : 
                        this.hpPercent > 25 ? '#f59e0b' : '#ef4444';
        
        ctx.fillStyle = hpColor;
        ctx.beginPath();
        ctx.roundRect(barX + 2, barY + 2, Math.max(0, hpWidth), barHeight - 4, 2);
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${Math.ceil(this.hp)}`, this.x, barY + barHeight / 2);
    }
    
    drawUsername(ctx) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        ctx.fillText(this.displayName || this.username, this.x, this.y + this.radius + 8);
        ctx.shadowBlur = 0;
    }
    
    containsPoint(px, py) {
        return Utils.distance(this.x, this.y, px, py) <= this.radius;
    }
    
    freeze(duration = 180) {
        this.isFrozen = true;
        this.freezeTimer = duration;
        this.vx = 0;
        this.vy = 0;
    }
    
    applyDOT(duration = 300) {
        this.dotActive = true;
        this.dotTimer = duration;
    }
    
    respawn(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.hp = this.maxHP;
        this.isDestroyed = false;
        this.isFrozen = false;
        this.dotActive = false;
        this.crackStage = 0;
        this.rotation = 0;
        this.angularVel = 0;
    }
}

// ============================================
// TOOLS DEFINITIONS
// ============================================
const TOOLS = {
    hand: {
        name: 'Hand',
        description: 'Drag and throw',
        cursor: 'grab',
        canDrag: true
    },
    tap: {
        name: 'Tap',
        description: 'Direct damage',
        cursor: 'pointer',
        damage: 25,
        sound: 'hit'
    },
    hammer: {
        name: 'Hammer',
        description: 'Heavy hit',
        cursor: 'crosshair',
        damage: 150,
        force: 20,
        sound: 'hammer',
        shake: 'medium'
    },
    push: {
        name: 'Push',
        description: 'Push force',
        cursor: 'pointer',
        force: 18,
        damage: 30,
        sound: 'push'
    },
    explosion: {
        name: 'Explosion',
        description: 'Area damage',
        cursor: 'crosshair',
        damage: 400,
        radius: 150,
        force: 25,
        sound: 'explosion',
        shake: 'heavy'
    },
    freeze: {
        name: 'Freeze',
        description: 'Stop movement',
        cursor: 'pointer',
        duration: 180,
        sound: 'freeze'
    },
    dot: {
        name: 'Fire',
        description: 'Burn damage',
        cursor: 'pointer',
        duration: 300,
        sound: 'fire'
    }
};

// ============================================
// GAME CLASS
// ============================================
class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.arena = document.getElementById('game-arena');
        this.emptyState = document.getElementById('arena-empty');
        
        this.particles = new ParticleSystem(this.canvas, this.ctx);
        
        this.dummies = [];
        this.currentTool = 'hand';
        this.isDragging = false;
        this.dragTarget = null;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.lastDragX = 0;
        this.lastDragY = 0;
        this.dragVelX = 0;
        this.dragVelY = 0;
        
        this.stats = {
            totalDamage: 0,
            destroyed: 0
        };
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.bindEvents();
        this.gameLoop();
        
        document.addEventListener('click', () => SoundSystem.init(), { once: true });
        document.addEventListener('touchstart', () => SoundSystem.init(), { once: true });
    }
    
    setupCanvas() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }
    
    resize() {
        const rect = this.arena.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.width = rect.width;
        this.height = rect.height;
    }
    
    bindEvents() {
        this.canvas.addEventListener('mousedown', (e) => this.onPointerDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onPointerMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onPointerUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.onPointerUp(e));
        
        this.canvas.addEventListener('touchstart', (e) => this.onPointerDown(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.onPointerMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.onPointerUp(e));
        this.canvas.addEventListener('touchcancel', (e) => this.onPointerUp(e));
        
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectTool(btn.dataset.tool);
                SoundSystem.play('ui');
            });
        });
        
        document.getElementById('spawn-btn').addEventListener('click', () => {
            this.openSpawnPanel();
            SoundSystem.play('ui');
        });
        
        document.getElementById('sound-btn').addEventListener('click', (e) => {
            const enabled = SoundSystem.toggle();
            e.currentTarget.classList.toggle('muted', !enabled);
            e.currentTarget.textContent = enabled ? '🔊' : '🔇';
        });
        
        document.getElementById('reset-btn').addEventListener('click', () => {
            this.resetAll();
            SoundSystem.play('ui');
        });
        
        document.getElementById('panel-overlay').addEventListener('click', () => this.closeSpawnPanel());
        document.getElementById('panel-close').addEventListener('click', () => this.closeSpawnPanel());
        document.getElementById('spawn-confirm').addEventListener('click', () => this.spawnFromInput());
        document.getElementById('spawn-random').addEventListener('click', () => this.spawnRandom());
        
        document.getElementById('username-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.spawnFromInput();
        });
        
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('username-input').value = btn.dataset.username;
                this.spawnFromInput();
            });
        });
    }
    
    getPointerPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        let clientX, clientY;
        
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }
    
    onPointerDown(e) {
        e.preventDefault();
        const pos = this.getPointerPos(e);
        const dummy = this.findDummyAt(pos.x, pos.y);
        
        if (this.currentTool === 'hand' && dummy) {
            this.isDragging = true;
            this.dragTarget = dummy;
            this.dragOffsetX = pos.x - dummy.x;
            this.dragOffsetY = pos.y - dummy.y;
            this.lastDragX = pos.x;
            this.lastDragY = pos.y;
            this.dragVelX = 0;
            this.dragVelY = 0;
            dummy.isDragging = true;
            SoundSystem.play('tap');
        } else if (dummy) {
            this.applyTool(pos.x, pos.y, dummy);
        } else if (this.currentTool === 'explosion') {
            this.applyExplosion(pos.x, pos.y);
        }
    }
    
    onPointerMove(e) {
        e.preventDefault();
        
        if (this.isDragging && this.dragTarget) {
            const pos = this.getPointerPos(e);
            
            this.dragVelX = pos.x - this.lastDragX;
            this.dragVelY = pos.y - this.lastDragY;
            this.lastDragX = pos.x;
            this.lastDragY = pos.y;
            
            this.dragTarget.x = Utils.clamp(
                pos.x - this.dragOffsetX,
                this.dragTarget.radius,
                this.width - this.dragTarget.radius
            );
            this.dragTarget.y = Utils.clamp(
                pos.y - this.dragOffsetY,
                this.dragTarget.radius,
                this.height - this.dragTarget.radius
            );
        }
    }
    
    onPointerUp(e) {
        if (this.isDragging && this.dragTarget) {
            const speed = Math.sqrt(this.dragVelX ** 2 + this.dragVelY ** 2);
            const throwSpeed = Math.min(speed * CONFIG.throwMultiplier, CONFIG.maxThrowSpeed);
            
            if (speed > 2) {
                const angle = Math.atan2(this.dragVelY, this.dragVelX);
                this.dragTarget.vx = Math.cos(angle) * throwSpeed * 3;
                this.dragTarget.vy = Math.sin(angle) * throwSpeed * 3;
                this.dragTarget.angularVel = this.dragVelX * 0.5;
            }
            
            this.dragTarget.isDragging = false;
            this.dragTarget = null;
            this.isDragging = false;
        }
    }
    
    findDummyAt(x, y) {
        for (let i = this.dummies.length - 1; i >= 0; i--) {
            const dummy = this.dummies[i];
            if (!dummy.isDestroyed && dummy.containsPoint(x, y)) {
                return dummy;
            }
        }
        return null;
    }
    
    applyTool(x, y, dummy) {
        const tool = TOOLS[this.currentTool];
        if (!tool) return;
        
        let damage = 0;
        
        switch (this.currentTool) {
            case 'tap':
                damage = dummy.applyDamage(tool.damage, this.particles);
                this.particles.createSparks(x, y, 8, ['#ffa94d', '#fff']);
                SoundSystem.play('hit', { intensity: 0.4 });
                this.flashArena('red', x, y);
                break;
                
            case 'hammer':
                damage = dummy.applyDamage(tool.damage, this.particles);
                dummy.applyForce(0, tool.force);
                this.particles.createImpact(x, y, 0.8);
                SoundSystem.play('hammer');
                this.shakeArena(tool.shake);
                this.flashArena('red', x, y);
                break;
                
            case 'push':
                const angle = Math.atan2(y - dummy.y, x - dummy.x);
                dummy.applyForce(
                    -Math.cos(angle) * tool.force,
                    -Math.sin(angle) * tool.force
                );
                damage = dummy.applyDamage(tool.damage, this.particles);
                this.particles.createSparks(dummy.x, dummy.y, 10, ['#00d4ff', '#fff']);
                SoundSystem.play('push');
                break;
                
            case 'freeze':
                dummy.freeze(tool.duration);
                this.particles.createFreeze(dummy.x, dummy.y);
                SoundSystem.play('freeze');
                this.flashArena('blue', dummy.x, dummy.y);
                break;
                
            case 'dot':
                dummy.applyDOT(tool.duration);
                damage = dummy.applyDamage(50, this.particles, 'orange');
                this.particles.createFire(dummy.x, dummy.y);
                SoundSystem.play('fire');
                break;
        }
        
        this.stats.totalDamage += damage;
        this.updateStats();
    }
    
    applyExplosion(x, y) {
        const tool = TOOLS.explosion;
        let totalDamage = 0;
        
        this.dummies.forEach(dummy => {
            if (dummy.isDestroyed) return;
            
            const dist = Utils.distance(x, y, dummy.x, dummy.y);
            
            if (dist < tool.radius) {
                const intensity = 1 - (dist / tool.radius);
                const damage = Math.floor(tool.damage * intensity);
                totalDamage += dummy.applyDamage(damage, this.particles);
                
                const angle = Math.atan2(dummy.y - y, dummy.x - x);
                const force = tool.force * intensity;
                dummy.applyForce(
                    Math.cos(angle) * force,
                    Math.sin(angle) * force - 5
                );
            }
        });
        
        this.particles.createExplosion(x, y);
        SoundSystem.play('explosion');
        this.shakeArena('heavy');
        this.flashArena('white', x, y);
        
        this.stats.totalDamage += totalDamage;
        this.updateStats();
    }
    
    selectTool(toolId) {
        this.currentTool = toolId;
        
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.tool === toolId);
        });
        
        const tool = TOOLS[toolId];
        this.canvas.style.cursor = tool?.cursor || 'default';
    }
    
    flashArena(color, x, y) {
        const flash = document.getElementById(`flash-${color}`);
        if (!flash) return;
        
        const xPercent = (x / this.width) * 100;
        const yPercent = (y / this.height) * 100;
        flash.style.setProperty('--flash-x', `${xPercent}%`);
        flash.style.setProperty('--flash-y', `${yPercent}%`);
        
        flash.classList.remove('active');
        void flash.offsetWidth;
        flash.classList.add('active');
        
        setTimeout(() => flash.classList.remove('active'), 250);
    }
    
    shakeArena(intensity) {
        this.arena.classList.remove('shake-light', 'shake-medium', 'shake-heavy');
        void this.arena.offsetWidth;
        this.arena.classList.add(`shake-${intensity}`);
        
        setTimeout(() => {
            this.arena.classList.remove(`shake-${intensity}`);
        }, intensity === 'heavy' ? 500 : intensity === 'medium' ? 350 : 250);
    }
    
    openSpawnPanel() {
        document.getElementById('panel-overlay').classList.add('active');
        document.getElementById('spawn-panel').classList.add('active');
        document.getElementById('username-input').focus();
        document.getElementById('panel-status').textContent = '';
    }
    
    closeSpawnPanel() {
        document.getElementById('panel-overlay').classList.remove('active');
        document.getElementById('spawn-panel').classList.remove('active');
    }
    
    setSpawnStatus(message, type) {
        const status = document.getElementById('panel-status');
        status.textContent = message;
        status.className = `panel-status ${type}`;
    }
    
    async spawnFromInput() {
        const input = document.getElementById('username-input');
        const username = input.value.trim();
        
        if (!username) {
            this.setSpawnStatus('Please enter a username', 'error');
            return;
        }
        
        await this.spawnDummy(username);
    }
    
    async spawnRandom() {
        const names = ['Roblox', 'Builderman', 'ROBLOX', 'John', 'Jane', 'David', 'Guest'];
        const name = names[Math.floor(Math.random() * names.length)];
        await this.spawnDummy(name);
    }
    
    async spawnDummy(username) {
        const confirmBtn = document.getElementById('spawn-confirm');
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<span class="loading-spinner"></span>';
        
        this.setSpawnStatus('Loading profile...', 'loading');
        
        try {
            const profile = await RobloxAPI.loadProfile(username);
            
            const x = Utils.random(100, this.width - 100);
            const y = Utils.random(100, this.height - 150);
            
            const dummy = new Dummy(
                x, y,
                profile.username,
                profile.displayName,
                profile.avatarUrl
            );
            
            this.dummies.push(dummy);
            
            const statusMsg = profile.isDemo 
                ? `Spawned ${profile.displayName} (demo mode)`
                : `Spawned ${profile.displayName}!`;
            
            this.setSpawnStatus(statusMsg, 'success');
            document.getElementById('username-input').value = '';
            
            this.emptyState.classList.add('hidden');
            this.updateStats();
            
            setTimeout(() => this.closeSpawnPanel(), 800);
            
        } catch (error) {
            console.error('Spawn error:', error);
            this.setSpawnStatus(error.message || 'Failed to load profile', 'error');
        } finally {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<span class="btn-icon">✓</span><span class="btn-text">Spawn</span>';
        }
    }
    
    resetAll() {
        this.dummies.forEach(dummy => {
            if (dummy.isDestroyed) {
                dummy.respawn(
                    Utils.random(100, this.width - 100),
                    Utils.random(100, this.height - 150)
                );
            }
        });
        
        this.stats.destroyed = 0;
        this.updateStats();
    }
    
    updateStats() {
        const alive = this.dummies.filter(d => !d.isDestroyed).length;
        const destroyed = this.dummies.filter(d => d.isDestroyed).length;
        
        document.getElementById('stat-dummies').textContent = alive;
        document.getElementById('stat-damage').textContent = Math.floor(this.stats.totalDamage);
        document.getElementById('stat-destroyed').textContent = destroyed;
        
        this.emptyState.classList.toggle('hidden', this.dummies.length > 0);
    }
    
    update() {
        this.particles.update();
        
        const arena = { width: this.width, height: this.height };
        
        this.dummies.forEach(dummy => {
            const wasAlive = !dummy.isDestroyed;
            dummy.update(arena, this.particles);
            
            if (wasAlive && dummy.isDestroyed) {
                this.stats.destroyed++;
                this.updateStats();
            }
        });
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.dummies.forEach(dummy => dummy.render(this.ctx));
        this.particles.render();
    }
    
    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// ============================================
// GLOBAL FUNCTIONS
// ============================================
async function loadRobloxProfile(username) {
    return await RobloxAPI.loadProfile(username);
}

// ============================================
// INITIALIZE
// ============================================
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new Game();
});

window.loadRobloxProfile = loadRobloxProfile;
window.Game = Game;
window.RobloxAPI = RobloxAPI;
