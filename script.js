/**
 * ========================================
 * Roblox Profile Combat System
 * ========================================
 * Extended module with damage, cracks,
 * breaking animations, and tools
 * ========================================
 */

// ========================================
// Configuration
// ========================================
const CONFIG = {
    useCorsProxy: true,
    corsProxyUrl: 'https://corsproxy.io/?',
    
    endpoints: {
        usernames: 'https://users.roblox.com/v1/usernames/users',
        userInfo: 'https://users.roblox.com/v1/users/',
        avatar: 'https://thumbnails.roblox.com/v1/users/avatar'
    },
    
    avatarSize: '420x420',
    avatarFormat: 'Png',
    
    defaultHealth: 100,
    maxHealth: 100,
    
    // Crack thresholds
    crackThresholds: {
        crack1: 75,
        crack2: 50,
        crack3: 25
    },
    
    // Particle settings
    sparkCount: 8,
    shatterPieces: 12,
    
    // Sound enabled by default
    soundEnabled: true
};

// ========================================
// Tools Registry
// ========================================
const ToolsRegistry = {
    tools: new Map(),
    selectedTool: null,
    
    /**
     * Register a new tool
     */
    register(tool) {
        this.tools.set(tool.id, {
            id: tool.id,
            name: tool.name,
            icon: tool.icon,
            damage: tool.damage,
            criticalChance: tool.criticalChance || 0,
            criticalMultiplier: tool.criticalMultiplier || 2,
            sound: tool.sound || 'hit',
            effect: tool.effect || null
        });
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
     * Calculate damage with critical hit check
     */
    calculateDamage(tool) {
        const isCritical = Math.random() < tool.criticalChance;
        const damage = isCritical 
            ? Math.floor(tool.damage * tool.criticalMultiplier)
            : tool.damage;
        return { damage, isCritical };
    }
};

// Register default tools
ToolsRegistry.register({
    id: 'punch',
    name: 'Punch',
    icon: '👊',
    damage: 10,
    criticalChance: 0.1,
    criticalMultiplier: 2,
    sound: 'punch'
});

ToolsRegistry.register({
    id: 'kick',
    name: 'Kick',
    icon: '🦵',
    damage: 15,
    criticalChance: 0.15,
    criticalMultiplier: 2,
    sound: 'kick'
});

ToolsRegistry.register({
    id: 'heavy',
    name: 'Heavy Hit',
    icon: '🔨',
    damage: 25,
    criticalChance: 0.2,
    criticalMultiplier: 2.5,
    sound: 'heavy'
});

// Select punch by default
ToolsRegistry.select('punch');

// ========================================
// Sound System
// ========================================
const SoundSystem = {
    audioContext: null,
    enabled: CONFIG.soundEnabled,
    
    /**
     * Initialize audio context
     */
    init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
            this.enabled = false;
        }
    },
    
    /**
     * Toggle sound on/off
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
    play(type, options = {}) {
        if (!this.enabled || !this.audioContext) return;
        
        this.resume();
        
        const sounds = {
            punch: () => this.playPunch(),
            kick: () => this.playKick(),
            heavy: () => this.playHeavy(),
            critical: () => this.playCritical(),
            destroy: () => this.playDestroy(),
            respawn: () => this.playRespawn()
        };
        
        if (sounds[type]) {
            sounds[type]();
        }
    },
    
    /**
     * Create oscillator-based sound
     */
    createOscillator(freq, type, duration, gainValue = 0.3) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = freq;
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(gainValue, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + duration);
        
        return { oscillator, gainNode };
    },
    
    /**
     * Create noise-based sound
     */
    createNoise(duration, gainValue = 0.2) {
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
        filter.frequency.value = 1000;
        
        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        gainNode.gain.setValueAtTime(gainValue, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        noise.start();
        noise.stop(this.audioContext.currentTime + duration);
    },
    
    playPunch() {
        this.createNoise(0.1, 0.3);
        this.createOscillator(150, 'sine', 0.1, 0.2);
    },
    
    playKick() {
        this.createNoise(0.15, 0.35);
        this.createOscillator(100, 'sine', 0.15, 0.25);
        this.createOscillator(80, 'triangle', 0.1, 0.15);
    },
    
    playHeavy() {
        this.createNoise(0.2, 0.4);
        this.createOscillator(80, 'sine', 0.2, 0.3);
        this.createOscillator(60, 'sawtooth', 0.15, 0.2);
        setTimeout(() => this.createOscillator(40, 'sine', 0.1, 0.15), 50);
    },
    
    playCritical() {
        this.createNoise(0.25, 0.5);
        this.createOscillator(200, 'square', 0.1, 0.2);
        this.createOscillator(100, 'sawtooth', 0.2, 0.3);
        setTimeout(() => {
            this.createOscillator(150, 'sine', 0.15, 0.25);
        }, 80);
    },
    
    playDestroy() {
        // Explosion-like sound
        this.createNoise(0.4, 0.5);
        this.createOscillator(60, 'sawtooth', 0.3, 0.4);
        this.createOscillator(40, 'square', 0.4, 0.3);
        
        setTimeout(() => {
            this.createNoise(0.2, 0.3);
            this.createOscillator(30, 'sine', 0.2, 0.2);
        }, 100);
        
        setTimeout(() => {
            this.createOscillator(20, 'triangle', 0.3, 0.15);
        }, 200);
    },
    
    playRespawn() {
        // Positive ascending sound
        const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.createOscillator(freq, 'sine', 0.2, 0.2);
            }, i * 80);
        });
    }
};

// ========================================
// Particle System
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
     * Resize canvas to window
     */
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    },
    
    /**
     * Create explosion particles
     */
    createExplosion(x, y, color = '#e94560', count = 20) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
            const speed = 2 + Math.random() * 4;
            
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 3 + Math.random() * 5,
                color,
                alpha: 1,
                decay: 0.02 + Math.random() * 0.02,
                gravity: 0.1
            });
        }
    },
    
    /**
     * Create spark particles
     */
    createSparks(x, y, count = 10) {
        const colors = ['#00d9ff', '#e94560', '#ffffff', '#f59e0b'];
        
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 3 + Math.random() * 5;
            
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 2 + Math.random() * 3,
                color: colors[Math.floor(Math.random() * colors.length)],
                alpha: 1,
                decay: 0.03 + Math.random() * 0.03,
                gravity: 0.05
            });
        }
    },
    
    /**
     * Animation loop
     */
    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.alpha -= p.decay;
            p.size *= 0.98;
            
            if (p.alpha > 0 && p.size > 0.5) {
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                this.ctx.fillStyle = p.color;
                this.ctx.globalAlpha = p.alpha;
                this.ctx.fill();
                this.ctx.globalAlpha = 1;
                return true;
            }
            return false;
        });
        
        this.animationId = requestAnimationFrame(() => this.animate());
    }
};

// ========================================
// Profile Store
// ========================================
const ProfileStore = {
    profiles: [],
    nextLocalId: 1,
    stats: {
        destroyed: 0,
        totalDamage: 0
    },
    
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
            createdAt: Date.now()
        };
        
        this.profiles.push(profile);
        this.saveToStorage();
        return profile;
    },
    
    remove(localId) {
        const index = this.profiles.findIndex(p => p.localId === localId);
        if (index !== -1) {
            this.profiles.splice(index, 1);
            this.saveToStorage();
            return true;
        }
        return false;
    },
    
    get(localId) {
        return this.profiles.find(p => p.localId === localId) || null;
    },
    
    getAll() {
        return [...this.profiles];
    },
    
    count() {
        return this.profiles.length;
    },
    
    clear() {
        this.profiles = [];
        this.stats = { destroyed: 0, totalDamage: 0 };
        this.saveToStorage();
    },
    
    /**
     * Apply damage to a profile
     */
    applyDamage(localId, damage) {
        const profile = this.get(localId);
        if (profile && !profile.isDestroyed) {
            profile.health = Math.max(0, profile.health - damage);
            this.stats.totalDamage += damage;
            
            if (profile.health <= 0) {
                profile.isDestroyed = true;
                this.stats.destroyed++;
            }
            
            this.saveToStorage();
            return profile;
        }
        return null;
    },
    
    /**
     * Respawn a profile
     */
    respawn(localId) {
        const profile = this.get(localId);
        if (profile) {
            profile.health = profile.maxHealth;
            profile.isDestroyed = false;
            this.saveToStorage();
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
        });
        this.saveToStorage();
    },
    
    hasUsername(username) {
        return this.profiles.some(
            p => p.name.toLowerCase() === username.toLowerCase()
        );
    },
    
    saveToStorage() {
        try {
            localStorage.setItem('roblox_profiles', JSON.stringify(this.profiles));
            localStorage.setItem('roblox_nextId', this.nextLocalId.toString());
            localStorage.setItem('roblox_stats', JSON.stringify(this.stats));
        } catch (e) {
            console.warn('Could not save to localStorage:', e);
        }
    },
    
    loadFromStorage() {
        try {
            const stored = localStorage.getItem('roblox_profiles');
            const nextId = localStorage.getItem('roblox_nextId');
            const stats = localStorage.getItem('roblox_stats');
            
            if (stored) this.profiles = JSON.parse(stored);
            if (nextId) this.nextLocalId = parseInt(nextId, 10);
            if (stats) this.stats = JSON.parse(stats);
        } catch (e) {
            console.warn('Could not load from localStorage:', e);
        }
    }
};

// ========================================
// Roblox API Service
// ========================================
const RobloxAPI = {
    buildUrl(url) {
        if (CONFIG.useCorsProxy) {
            return CONFIG.corsProxyUrl + encodeURIComponent(url);
        }
        return url;
    },
    
    async getUserId(username) {
        const url = this.buildUrl(CONFIG.endpoints.usernames);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usernames: [username],
                excludeBannedUsers: false
            })
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch user ID: ${response.status}`);
        }
        
        const data = await response.json();
        return data.data?.[0]?.id || null;
    },
    
    async getUserInfo(userId) {
        const url = this.buildUrl(`${CONFIG.endpoints.userInfo}${userId}`);
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch user info: ${response.status}`);
        }
        
        return response.json();
    },
    
    async getAvatarUrl(userId) {
        const params = new URLSearchParams({
            userIds: userId,
            size: CONFIG.avatarSize,
            format: CONFIG.avatarFormat
        });
        
        const url = this.buildUrl(`${CONFIG.endpoints.avatar}?${params}`);
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch avatar: ${response.status}`);
        }
        
        const data = await response.json();
        return data.data?.[0]?.imageUrl || null;
    },
    
    async fetchProfile(username) {
        const userId = await this.getUserId(username);
        
        if (!userId) {
            throw new Error(`User "${username}" not found`);
        }
        
        const [userInfo, avatarUrl] = await Promise.all([
            this.getUserInfo(userId),
            this.getAvatarUrl(userId)
        ]);
        
        return {
            id: userInfo.id,
            name: userInfo.name,
            displayName: userInfo.displayName,
            avatarUrl: avatarUrl
        };
    }
};

// ========================================
// UI Renderer
// ========================================
const UIRenderer = {
    elements: {},
    
    init() {
        this.elements = {
            input: document.getElementById('username-input'),
            addBtn: document.getElementById('add-profile-btn'),
            status: document.getElementById('status-message'),
            container: document.getElementById('profiles-container'),
            count: document.getElementById('profile-count'),
            destroyedCount: document.getElementById('destroyed-count'),
            totalDamage: document.getElementById('total-damage'),
            clearBtn: document.getElementById('clear-all-btn'),
            respawnAllBtn: document.getElementById('respawn-all-btn'),
            toolsContainer: document.getElementById('tools-container'),
            currentToolName: document.getElementById('current-tool-name'),
            currentToolDamage: document.getElementById('current-tool-damage'),
            soundToggle: document.getElementById('sound-toggle')
        };
    },
    
    setStatus(message, type = '') {
        this.elements.status.textContent = message;
        this.elements.status.className = `status-message ${type}`;
    },
    
    updateStats() {
        this.elements.count.textContent = `Dummies: ${ProfileStore.count()}`;
        this.elements.destroyedCount.textContent = `Destroyed: ${ProfileStore.stats.destroyed}`;
        this.elements.totalDamage.textContent = `Total Damage: ${ProfileStore.stats.totalDamage}`;
    },
    
    setLoading(isLoading) {
        this.elements.addBtn.disabled = isLoading;
        this.elements.input.disabled = isLoading;
        
        if (isLoading) {
            this.elements.addBtn.innerHTML = '<span class="loading-spinner"></span>';
        } else {
            this.elements.addBtn.textContent = 'Add Dummy';
        }
    },
    
    /**
     * Render tools buttons
     */
    renderTools() {
        const tools = ToolsRegistry.getAll();
        const selected = ToolsRegistry.getSelected();
        
        this.elements.toolsContainer.innerHTML = tools.map(tool => `
            <button class="tool-btn ${selected?.id === tool.id ? 'selected' : ''}" 
                    data-tool-id="${tool.id}">
                <span class="tool-icon">${tool.icon}</span>
                <span class="tool-name">${tool.name}</span>
                <span class="tool-damage">-${tool.damage}</span>
            </button>
        `).join('');
        
        // Add click listeners
        this.elements.toolsContainer.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const toolId = btn.dataset.toolId;
                ToolsRegistry.select(toolId);
                this.renderTools();
                this.updateToolInfo();
            });
        });
        
        this.updateToolInfo();
    },
    
    /**
     * Update current tool info display
     */
    updateToolInfo() {
        const tool = ToolsRegistry.getSelected();
        if (tool) {
            this.elements.currentToolName.textContent = `${tool.icon} ${tool.name}`;
            this.elements.currentToolDamage.textContent = `${tool.damage} damage`;
        } else {
            this.elements.currentToolName.textContent = 'No tool selected';
            this.elements.currentToolDamage.textContent = '';
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
     * Get crack level based on health
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
            <article class="profile-card ${profile.isDestroyed ? 'destroyed' : ''}" 
                     id="profile-${profile.localId}" 
                     data-local-id="${profile.localId}">
                <button class="remove-btn" aria-label="Remove profile">&times;</button>
                <span class="profile-id-badge">#${profile.id}</span>
                
                <div class="avatar-wrapper ${profile.isDestroyed ? 'destroyed' : ''}" 
                     id="avatar-wrapper-${profile.localId}">
                    ${profile.avatarUrl 
                        ? `<img class="avatar-image ${healthLevel === 'low' ? 'critical' : healthLevel === 'mid' ? 'damaged' : ''}" 
                               src="${profile.avatarUrl}" 
                               alt="${profile.displayName}'s avatar" 
                               loading="lazy"
                               id="avatar-${profile.localId}">`
                        : `<div class="avatar-placeholder">?</div>`
                    }
                    
                    <!-- Crack Overlays -->
                    <div class="crack-overlay crack-1 ${crackLevel >= 1 ? 'visible' : ''}" 
                         id="crack1-${profile.localId}"></div>
                    <div class="crack-overlay crack-2 ${crackLevel >= 2 ? 'visible' : ''}" 
                         id="crack2-${profile.localId}"></div>
                    <div class="crack-overlay crack-3 ${crackLevel >= 3 ? 'visible' : ''}" 
                         id="crack3-${profile.localId}"></div>
                    
                    <!-- Spark Container -->
                    <div class="spark-container" id="sparks-${profile.localId}"></div>
                    
                    <!-- Shatter Container -->
                    <div class="shatter-container" id="shatter-${profile.localId}"></div>
                    
                    ${profile.isDestroyed ? `
                        <div class="destroyed-overlay">
                            <div class="destroyed-text">💀 DESTROYED!</div>
                            <button class="respawn-btn-small" data-respawn-id="${profile.localId}">
                                ↻ Respawn
                            </button>
                        </div>
                    ` : ''}
                </div>
                
                <div class="profile-info">
                    <h2 class="display-name">${this.escapeHtml(profile.displayName)}</h2>
                    <p class="username">@${this.escapeHtml(profile.name)}</p>
                </div>
                
                <div class="health-section">
                    <div class="health-label">
                        <span>Health</span>
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
    
    createEmptyState() {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">🎯</div>
                <p class="empty-state-text">No dummies yet!<br>Add a Roblox username to spawn a target.</p>
            </div>
        `;
    },
    
    /**
     * Spawn a profile card
     */
    spawnProfile(profile) {
        const emptyState = this.elements.container.querySelector('.empty-state');
        if (emptyState) emptyState.remove();
        
        const cardHtml = this.createProfileCard(profile);
        this.elements.container.insertAdjacentHTML('beforeend', cardHtml);
        
        this.attachCardListeners(profile.localId);
        this.updateStats();
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
        
        // Click to damage
        card.addEventListener('click', (e) => {
            if (e.target.closest('.remove-btn') || 
                e.target.closest('.respawn-btn-small')) return;
            
            DamageSystem.attack(localId, e);
        });
        
        // Respawn button (if destroyed)
        const respawnBtn = card.querySelector('.respawn-btn-small');
        if (respawnBtn) {
            respawnBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                DamageSystem.respawn(localId);
            });
        }
    },
    
    /**
     * Update a profile card's display
     */
    updateProfileCard(profile) {
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
    showDamageText(localId, damage, isCritical, x, y) {
        const card = document.getElementById(`profile-${localId}`);
        if (!card) return;
        
        const damageText = document.createElement('div');
        damageText.className = `damage-text ${isCritical ? 'critical' : ''}`;
        damageText.textContent = `-${damage}${isCritical ? ' CRIT!' : ''}`;
        
        // Position near click
        const rect = card.getBoundingClientRect();
        damageText.style.left = `${x - rect.left}px`;
        damageText.style.top = `${y - rect.top - 20}px`;
        
        card.appendChild(damageText);
        
        setTimeout(() => damageText.remove(), 1000);
    },
    
    /**
     * Show spark effects
     */
    showSparks(localId) {
        const container = document.getElementById(`sparks-${localId}`);
        if (!container) return;
        
        for (let i = 0; i < CONFIG.sparkCount; i++) {
            const spark = document.createElement('div');
            spark.className = 'spark';
            
            const angle = (Math.PI * 2 * i) / CONFIG.sparkCount;
            const distance = 40 + Math.random() * 40;
            
            spark.style.setProperty('--sx', `${Math.cos(angle) * distance}px`);
            spark.style.setProperty('--sy', `${Math.sin(angle) * distance}px`);
            
            container.appendChild(spark);
            
            setTimeout(() => spark.remove(), 600);
        }
    },
    
    /**
     * Play hit animation
     */
    playHitAnimation(localId, isCritical) {
        const card = document.getElementById(`profile-${localId}`);
        if (!card) return;
        
        // Flash effect
        card.classList.add('hit-flash');
        setTimeout(() => card.classList.remove('hit-flash'), 150);
        
        // Shake effect
        card.classList.remove('shake', 'critical-shake');
        void card.offsetWidth; // Force reflow
        card.classList.add(isCritical ? 'critical-shake' : 'shake');
        
        setTimeout(() => {
            card.classList.remove('shake', 'critical-shake');
        }, 500);
    },
    
    /**
     * Play destroy animation
     */
    playDestroyAnimation(localId, avatarUrl) {
        const card = document.getElementById(`profile-${localId}`);
        const avatarWrapper = document.getElementById(`avatar-wrapper-${localId}`);
        const shatterContainer = document.getElementById(`shatter-${localId}`);
        
        if (!card || !avatarWrapper || !shatterContainer) return;
        
        // Mark as destroyed
        card.classList.add('destroyed');
        avatarWrapper.classList.add('destroyed');
        
        // Create shatter pieces
        this.createShatterPieces(shatterContainer, avatarUrl);
        
        // Create global explosion particles
        const rect = avatarWrapper.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        ParticleSystem.createExplosion(centerX, centerY, '#e94560', 30);
        
        // Add destroyed overlay after animation
        setTimeout(() => {
            if (!avatarWrapper.querySelector('.destroyed-overlay')) {
                const overlay = document.createElement('div');
                overlay.className = 'destroyed-overlay';
                overlay.innerHTML = `
                    <div class="destroyed-text">💀 DESTROYED!</div>
                    <button class="respawn-btn-small" data-respawn-id="${localId}">
                        ↻ Respawn
                    </button>
                `;
                avatarWrapper.appendChild(overlay);
                
                // Attach respawn listener
                overlay.querySelector('.respawn-btn-small').addEventListener('click', (e) => {
                    e.stopPropagation();
                    DamageSystem.respawn(localId);
                });
            }
        }, 500);
    },
    
    /**
     * Create shatter pieces from avatar
     */
    createShatterPieces(container, avatarUrl) {
        container.innerHTML = '';
        
        const pieceSize = 160 / 4; // 4x4 grid
        
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                const piece = document.createElement('div');
                piece.className = 'shatter-piece';
                
                const x = col * pieceSize;
                const y = row * pieceSize;
                
                piece.style.width = `${pieceSize}px`;
                piece.style.height = `${pieceSize}px`;
                piece.style.left = `${x}px`;
                piece.style.top = `${y}px`;
                piece.style.backgroundImage = `url(${avatarUrl})`;
                piece.style.backgroundPosition = `-${x}px -${y}px`;
                piece.style.borderRadius = row === 0 || row === 3 || col === 0 || col === 3 
                    ? '8px' : '2px';
                
                // Random trajectory
                const angle = Math.random() * Math.PI * 2;
                const distance = 100 + Math.random() * 150;
                const rotation = -360 + Math.random() * 720;
                
                piece.style.setProperty('--tx', `${Math.cos(angle) * distance}px`);
                piece.style.setProperty('--ty', `${Math.sin(angle) * distance}px`);
                piece.style.setProperty('--rot', `${rotation}deg`);
                
                container.appendChild(piece);
                
                // Trigger animation
                setTimeout(() => piece.classList.add('animate'), 10);
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
        const avatar = document.getElementById(`avatar-${localId}`);
        
        if (!card || !avatarWrapper) return;
        
        // Remove destroyed state
        card.classList.remove('destroyed');
        avatarWrapper.classList.remove('destroyed');
        
        // Clear shatter pieces
        if (shatterContainer) shatterContainer.innerHTML = '';
        
        // Remove destroyed overlay
        const overlay = avatarWrapper.querySelector('.destroyed-overlay');
        if (overlay) overlay.remove();
        
        // Reset avatar
        if (avatar) {
            avatar.style.opacity = '1';
            avatar.style.transform = 'scale(1)';
            avatar.classList.remove('damaged', 'critical');
        }
        
        // Remove cracks
        for (let i = 1; i <= 3; i++) {
            const crack = document.getElementById(`crack${i}-${localId}`);
            if (crack) crack.classList.remove('visible');
        }
        
        // Play spawn animation
        card.style.animation = 'none';
        void card.offsetWidth;
        card.style.animation = 'spawn-in 0.4s ease-out';
        
        // Create heal particles
        const rect = avatarWrapper.getBoundingClientRect();
        ParticleSystem.createSparks(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2,
            15
        );
    },
    
    /**
     * Remove a profile
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
            });
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
    },
    
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};

// ========================================
// Damage System
// ========================================
const DamageSystem = {
    /**
     * Attack a profile with selected tool
     */
    attack(localId, event) {
        const profile = ProfileStore.get(localId);
        const tool = ToolsRegistry.getSelected();
        
        if (!profile || profile.isDestroyed || !tool) return;
        
        // Calculate damage
        const { damage, isCritical } = ToolsRegistry.calculateDamage(tool);
        
        // Apply damage
        ProfileStore.applyDamage(localId, damage);
        
        // Get click position
        const x = event.clientX;
        const y = event.clientY;
        
        // Visual effects
        UIRenderer.showDamageText(localId, damage, isCritical, x, y);
        UIRenderer.showSparks(localId);
        UIRenderer.playHitAnimation(localId, isCritical);
        
        // Particle effects at cursor
        ParticleSystem.createSparks(x, y, isCritical ? 15 : 8);
        
        // Sound
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
            SoundSystem.play('destroy');
            UIRenderer.playDestroyAnimation(localId, updatedProfile.avatarUrl);
        }
        
        return { damage, isCritical, destroyed: updatedProfile.isDestroyed };
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
        }
    },
    
    /**
     * Respawn all profiles
     */
    respawnAll() {
        const profiles = ProfileStore.getAll();
        ProfileStore.respawnAll();
        
        profiles.forEach(p => {
            if (p.isDestroyed) {
                UIRenderer.playRespawnAnimation(p.localId);
            }
            UIRenderer.updateProfileCard(ProfileStore.get(p.localId));
        });
        
        SoundSystem.play('respawn');
        UIRenderer.setStatus('All dummies respawned!', 'success');
    }
};

// ========================================
// Main Controller
// ========================================
const ProfileSpawner = {
    init() {
        UIRenderer.init();
        ProfileStore.loadFromStorage();
        SoundSystem.init();
        ParticleSystem.init();
        
        UIRenderer.renderAll();
        UIRenderer.renderTools();
        
        this.bindEvents();
        
        console.log('🎯 Roblox Dummy Arena initialized');
    },
    
    bindEvents() {
        // Add profile
        UIRenderer.elements.addBtn.addEventListener('click', () => this.addProfile());
        UIRenderer.elements.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addProfile();
        });
        
        // Clear all
        UIRenderer.elements.clearBtn.addEventListener('click', () => {
            if (confirm('Remove all dummies?')) {
                UIRenderer.clearAll();
            }
        });
        
        // Respawn all
        UIRenderer.elements.respawnAllBtn.addEventListener('click', () => {
            DamageSystem.respawnAll();
        });
        
        // Sound toggle
        UIRenderer.elements.soundToggle.addEventListener('click', () => {
            const enabled = SoundSystem.toggle();
            UIRenderer.elements.soundToggle.classList.toggle('muted', !enabled);
            UIRenderer.elements.soundToggle.textContent = enabled ? '🔊' : '🔇';
        });
        
        // Resume audio on first interaction
        document.addEventListener('click', () => SoundSystem.resume(), { once: true });
    },
    
    async addProfile() {
        const username = UIRenderer.elements.input.value.trim();
        
        if (!username) {
            UIRenderer.setStatus('Please enter a username', 'error');
            return;
        }
        
        if (ProfileStore.hasUsername(username)) {
            UIRenderer.setStatus(`"${username}" already exists`, 'error');
            return;
        }
        
        UIRenderer.setLoading(true);
        UIRenderer.setStatus('Fetching profile...', 'loading');
        
        try {
            const profileData = await RobloxAPI.fetchProfile(username);
            const profile = ProfileStore.add(profileData);
            UIRenderer.spawnProfile(profile);
            UIRenderer.setStatus(`Added ${profileData.displayName}!`, 'success');
            UIRenderer.elements.input.value = '';
            
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
// Public API
// ========================================
export const RobloxCombatAPI = {
    // Profile methods
    getProfiles: () => ProfileStore.getAll(),
    getProfile: (localId) => ProfileStore.get(localId),
    
    // Damage methods
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
    registerTool: (tool) => ToolsRegistry.register(tool),
    selectTool: (id) => {
        ToolsRegistry.select(id);
        UIRenderer.renderTools();
    },
    getTools: () => ToolsRegistry.getAll(),
    getSelectedTool: () => ToolsRegistry.getSelected(),
    
    // Respawn methods
    respawn: (localId) => DamageSystem.respawn(localId),
    respawnAll: () => DamageSystem.respawnAll(),
    
    // Stats
    getStats: () => ({ ...ProfileStore.stats }),
    
    // Effects
    createExplosion: (x, y, color, count) => ParticleSystem.createExplosion(x, y, color, count),
    createSparks: (x, y, count) => ParticleSystem.createSparks(x, y, count),
    playSound: (type) => SoundSystem.play(type)
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    ProfileSpawner.init();
});

// Global access for debugging
window.RobloxCombatAPI = RobloxCombatAPI;
