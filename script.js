/**
 * ========================================
 * Roblox Profile Spawner Module
 * ========================================
 * A modular system for fetching and displaying
 * Roblox profiles as "dummy targets"
 * ========================================
 */

// ========================================
// Configuration
// ========================================
const CONFIG = {
    // Set to true to use a CORS proxy (required for browser)
    useCorsProxy: true,
    corsProxyUrl: 'https://corsproxy.io/?',
    
    // Roblox API Endpoints
    endpoints: {
        usernames: 'https://users.roblox.com/v1/usernames/users',
        userInfo: 'https://users.roblox.com/v1/users/',
        avatar: 'https://thumbnails.roblox.com/v1/users/avatar'
    },
    
    // Avatar settings
    avatarSize: '420x420',
    avatarFormat: 'Png',
    
    // Default values
    defaultHealth: 100,
    maxHealth: 100
};

// ========================================
// Profile Store (State Management)
// ========================================
const ProfileStore = {
    profiles: [],
    nextLocalId: 1,
    
    /**
     * Add a profile to the store
     * @param {Object} profileData - Profile data from API
     * @returns {Object} - Complete profile object
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
            createdAt: Date.now()
        };
        
        this.profiles.push(profile);
        this.saveToStorage();
        return profile;
    },
    
    /**
     * Remove a profile by local ID
     * @param {number} localId - Local profile ID
     * @returns {boolean} - Success status
     */
    remove(localId) {
        const index = this.profiles.findIndex(p => p.localId === localId);
        if (index !== -1) {
            this.profiles.splice(index, 1);
            this.saveToStorage();
            return true;
        }
        return false;
    },
    
    /**
     * Get profile by local ID
     * @param {number} localId - Local profile ID
     * @returns {Object|null} - Profile or null
     */
    get(localId) {
        return this.profiles.find(p => p.localId === localId) || null;
    },
    
    /**
     * Get all profiles
     * @returns {Array} - All profiles
     */
    getAll() {
        return [...this.profiles];
    },
    
    /**
     * Get profile count
     * @returns {number} - Number of profiles
     */
    count() {
        return this.profiles.length;
    },
    
    /**
     * Clear all profiles
     */
    clear() {
        this.profiles = [];
        this.saveToStorage();
    },
    
    /**
     * Update profile health
     * @param {number} localId - Local profile ID
     * @param {number} health - New health value
     */
    updateHealth(localId, health) {
        const profile = this.get(localId);
        if (profile) {
            profile.health = Math.max(0, Math.min(health, profile.maxHealth));
            this.saveToStorage();
        }
    },
    
    /**
     * Check if username already exists
     * @param {string} username - Username to check
     * @returns {boolean}
     */
    hasUsername(username) {
        return this.profiles.some(
            p => p.name.toLowerCase() === username.toLowerCase()
        );
    },
    
    /**
     * Save profiles to localStorage
     */
    saveToStorage() {
        try {
            localStorage.setItem('roblox_profiles', JSON.stringify(this.profiles));
            localStorage.setItem('roblox_nextId', this.nextLocalId.toString());
        } catch (e) {
            console.warn('Could not save to localStorage:', e);
        }
    },
    
    /**
     * Load profiles from localStorage
     */
    loadFromStorage() {
        try {
            const stored = localStorage.getItem('roblox_profiles');
            const nextId = localStorage.getItem('roblox_nextId');
            
            if (stored) {
                this.profiles = JSON.parse(stored);
            }
            if (nextId) {
                this.nextLocalId = parseInt(nextId, 10);
            }
        } catch (e) {
            console.warn('Could not load from localStorage:', e);
        }
    }
};

// ========================================
// Roblox API Service
// ========================================
const RobloxAPI = {
    /**
     * Build URL with optional CORS proxy
     * @param {string} url - Original URL
     * @returns {string} - Processed URL
     */
    buildUrl(url) {
        if (CONFIG.useCorsProxy) {
            return CONFIG.corsProxyUrl + encodeURIComponent(url);
        }
        return url;
    },
    
    /**
     * Get User ID from username
     * @param {string} username - Roblox username
     * @returns {Promise<number|null>} - User ID or null
     */
    async getUserId(username) {
        const url = this.buildUrl(CONFIG.endpoints.usernames);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                usernames: [username],
                excludeBannedUsers: false
            })
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch user ID: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
            return data.data[0].id;
        }
        
        return null;
    },
    
    /**
     * Get user profile info
     * @param {number} userId - Roblox user ID
     * @returns {Promise<Object>} - User profile data
     */
    async getUserInfo(userId) {
        const url = this.buildUrl(`${CONFIG.endpoints.userInfo}${userId}`);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch user info: ${response.status}`);
        }
        
        return response.json();
    },
    
    /**
     * Get user avatar URL
     * @param {number} userId - Roblox user ID
     * @returns {Promise<string|null>} - Avatar URL or null
     */
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
        
        if (data.data && data.data.length > 0) {
            return data.data[0].imageUrl;
        }
        
        return null;
    },
    
    /**
     * Fetch complete profile data
     * @param {string} username - Roblox username
     * @returns {Promise<Object>} - Complete profile data
     */
    async fetchProfile(username) {
        // Step 1: Get User ID
        const userId = await this.getUserId(username);
        
        if (!userId) {
            throw new Error(`User "${username}" not found`);
        }
        
        // Step 2: Get User Info and Avatar in parallel
        const [userInfo, avatarUrl] = await Promise.all([
            this.getUserInfo(userId),
            this.getAvatarUrl(userId)
        ]);
        
        return {
            id: userInfo.id,
            name: userInfo.name,
            displayName: userInfo.displayName,
            description: userInfo.description,
            avatarUrl: avatarUrl,
            created: userInfo.created,
            isBanned: userInfo.isBanned
        };
    }
};

// ========================================
// UI Renderer
// ========================================
const UIRenderer = {
    elements: {},
    
    /**
     * Initialize DOM element references
     */
    init() {
        this.elements = {
            input: document.getElementById('username-input'),
            addBtn: document.getElementById('add-profile-btn'),
            status: document.getElementById('status-message'),
            container: document.getElementById('profiles-container'),
            count: document.getElementById('profile-count'),
            clearBtn: document.getElementById('clear-all-btn')
        };
    },
    
    /**
     * Set status message
     * @param {string} message - Message text
     * @param {string} type - Message type (error, success, loading)
     */
    setStatus(message, type = '') {
        this.elements.status.textContent = message;
        this.elements.status.className = `status-message ${type}`;
    },
    
    /**
     * Update profile count display
     */
    updateCount() {
        this.elements.count.textContent = `Profiles Loaded: ${ProfileStore.count()}`;
    },
    
    /**
     * Set loading state
     * @param {boolean} isLoading - Loading state
     */
    setLoading(isLoading) {
        this.elements.addBtn.disabled = isLoading;
        this.elements.input.disabled = isLoading;
        
        if (isLoading) {
            this.elements.addBtn.innerHTML = '<span class="loading-spinner"></span>';
        } else {
            this.elements.addBtn.textContent = 'Add Profile';
        }
    },
    
    /**
     * Create profile card HTML
     * @param {Object} profile - Profile data
     * @returns {string} - HTML string
     */
    createProfileCard(profile) {
        const healthPercent = (profile.health / profile.maxHealth) * 100;
        
        return `
            <article class="profile-card" id="profile-${profile.localId}" data-local-id="${profile.localId}">
                <button class="remove-btn" aria-label="Remove profile">&times;</button>
                <span class="profile-id-badge">#${profile.id}</span>
                
                <div class="avatar-wrapper">
                    ${profile.avatarUrl 
                        ? `<img class="avatar-image" src="${profile.avatarUrl}" alt="${profile.displayName}'s avatar" loading="lazy">`
                        : `<div class="avatar-placeholder">?</div>`
                    }
                </div>
                
                <div class="profile-info">
                    <h2 class="display-name">${this.escapeHtml(profile.displayName)}</h2>
                    <p class="username">@${this.escapeHtml(profile.name)}</p>
                </div>
                
                <div class="health-section">
                    <div class="health-label">
                        <span>Health</span>
                        <span class="health-value">${profile.health}/${profile.maxHealth}</span>
                    </div>
                    <div class="health-bar-container">
                        <div class="health-bar-fill" style="width: ${healthPercent}%"></div>
                    </div>
                </div>
            </article>
        `;
    },
    
    /**
     * Create empty state HTML
     * @returns {string} - HTML string
     */
    createEmptyState() {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">👤</div>
                <p class="empty-state-text">No profiles added yet.<br>Enter a Roblox username above to get started!</p>
            </div>
        `;
    },
    
    /**
     * Spawn a profile card into the container
     * @param {Object} profile - Profile data
     */
    spawnProfile(profile) {
        // Remove empty state if present
        const emptyState = this.elements.container.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }
        
        // Create and insert profile card
        const cardHtml = this.createProfileCard(profile);
        this.elements.container.insertAdjacentHTML('beforeend', cardHtml);
        
        // Add remove button listener
        const card = document.getElementById(`profile-${profile.localId}`);
        const removeBtn = card.querySelector('.remove-btn');
        removeBtn.addEventListener('click', () => this.handleRemove(profile.localId));
        
        this.updateCount();
    },
    
    /**
     * Remove a profile card from the DOM
     * @param {number} localId - Local profile ID
     */
    handleRemove(localId) {
        const card = document.getElementById(`profile-${localId}`);
        if (card) {
            card.style.animation = 'spawn-in 0.3s ease-out reverse';
            setTimeout(() => {
                card.remove();
                ProfileStore.remove(localId);
                this.updateCount();
                
                // Show empty state if no profiles
                if (ProfileStore.count() === 0) {
                    this.elements.container.innerHTML = this.createEmptyState();
                }
            }, 280);
        }
    },
    
    /**
     * Render all profiles from store
     */
    renderAll() {
        const profiles = ProfileStore.getAll();
        
        if (profiles.length === 0) {
            this.elements.container.innerHTML = this.createEmptyState();
        } else {
            this.elements.container.innerHTML = profiles
                .map(p => this.createProfileCard(p))
                .join('');
            
            // Add event listeners to remove buttons
            profiles.forEach(profile => {
                const card = document.getElementById(`profile-${profile.localId}`);
                const removeBtn = card.querySelector('.remove-btn');
                removeBtn.addEventListener('click', () => this.handleRemove(profile.localId));
            });
        }
        
        this.updateCount();
    },
    
    /**
     * Clear all profiles from display
     */
    clearAll() {
        ProfileStore.clear();
        this.elements.container.innerHTML = this.createEmptyState();
        this.updateCount();
        this.setStatus('All profiles cleared', 'success');
    },
    
    /**
     * Update health bar display
     * @param {number} localId - Local profile ID
     * @param {number} health - New health value
     * @param {number} maxHealth - Max health value
     */
    updateHealthBar(localId, health, maxHealth) {
        const card = document.getElementById(`profile-${localId}`);
        if (card) {
            const healthFill = card.querySelector('.health-bar-fill');
            const healthValue = card.querySelector('.health-value');
            const percent = (health / maxHealth) * 100;
            
            healthFill.style.width = `${percent}%`;
            healthValue.textContent = `${health}/${maxHealth}`;
            
            // Change color based on health
            if (percent <= 25) {
                healthFill.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
            } else if (percent <= 50) {
                healthFill.style.background = 'linear-gradient(90deg, #f59e0b, #d97706)';
            } else {
                healthFill.style.background = 'linear-gradient(90deg, #4ade80, #22c55e)';
            }
        }
    },
    
    /**
     * Escape HTML to prevent XSS
     * @param {string} str - String to escape
     * @returns {string} - Escaped string
     */
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};

// ========================================
// Profile Spawner Controller
// ========================================
const ProfileSpawner = {
    /**
     * Initialize the spawner
     */
    init() {
        UIRenderer.init();
        ProfileStore.loadFromStorage();
        UIRenderer.renderAll();
        this.bindEvents();
        
        console.log('🎮 Roblox Profile Spawner initialized');
    },
    
    /**
     * Bind event listeners
     */
    bindEvents() {
        // Add profile button
        UIRenderer.elements.addBtn.addEventListener('click', () => this.addProfile());
        
        // Enter key in input
        UIRenderer.elements.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addProfile();
            }
        });
        
        // Clear all button
        UIRenderer.elements.clearBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to remove all profiles?')) {
                UIRenderer.clearAll();
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
            UIRenderer.setStatus(`"${username}" is already added`, 'error');
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
// Public API (for external modules)
// ========================================
export const RobloxProfileAPI = {
    /**
     * Get all profiles
     */
    getProfiles: () => ProfileStore.getAll(),
    
    /**
     * Get profile by local ID
     */
    getProfile: (localId) => ProfileStore.get(localId),
    
    /**
     * Update profile health
     */
    setHealth: (localId, health) => {
        ProfileStore.updateHealth(localId, health);
        const profile = ProfileStore.get(localId);
        if (profile) {
            UIRenderer.updateHealthBar(localId, profile.health, profile.maxHealth);
        }
    },
    
    /**
     * Damage a profile
     */
    damage: (localId, amount) => {
        const profile = ProfileStore.get(localId);
        if (profile) {
            RobloxProfileAPI.setHealth(localId, profile.health - amount);
        }
    },
    
    /**
     * Heal a profile
     */
    heal: (localId, amount) => {
        const profile = ProfileStore.get(localId);
        if (profile) {
            RobloxProfileAPI.setHealth(localId, profile.health + amount);
        }
    },
    
    /**
     * Remove a profile
     */
    removeProfile: (localId) => UIRenderer.handleRemove(localId),
    
    /**
     * Get profile count
     */
    getCount: () => ProfileStore.count(),
    
    /**
     * Subscribe to store changes (basic event system)
     */
    onProfileAdded: null,
    onProfileRemoved: null,
    onHealthChanged: null
};

// ========================================
// Initialize on DOM Ready
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    ProfileSpawner.init();
});

// Make API available globally for debugging
window.RobloxProfileAPI = RobloxProfileAPI;
