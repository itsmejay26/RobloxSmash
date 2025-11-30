/* ========================================
   CSS Variables & Reset
======================================== */
:root {
    --bg-primary: #1a1a2e;
    --bg-secondary: #16213e;
    --bg-card: #0f3460;
    --bg-card-hover: #1a4a7a;
    --accent-primary: #e94560;
    --accent-secondary: #00d9ff;
    --accent-warning: #f59e0b;
    --accent-success: #4ade80;
    --text-primary: #ffffff;
    --text-secondary: #a0a0a0;
    --health-high: #4ade80;
    --health-mid: #f59e0b;
    --health-low: #ef4444;
    --health-bg: #1f2937;
    --shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    --shadow-glow: 0 0 30px rgba(233, 69, 96, 0.5);
    --radius: 12px;
    --transition: all 0.3s ease;
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
    min-height: 100vh;
    color: var(--text-primary);
    overflow-x: hidden;
}

/* ========================================
   Particle Canvas
======================================== */
#particle-canvas {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1000;
}

/* ========================================
   Sound Toggle
======================================== */
.sound-toggle {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    border: none;
    background: var(--bg-card);
    color: var(--text-primary);
    font-size: 1.5rem;
    cursor: pointer;
    z-index: 100;
    transition: var(--transition);
    box-shadow: var(--shadow);
}

.sound-toggle:hover {
    background: var(--bg-card-hover);
    transform: scale(1.1);
}

.sound-toggle.muted {
    opacity: 0.5;
}

/* ========================================
   App Container
======================================== */
.app-container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px;
    position: relative;
    z-index: 1;
}

/* ========================================
   Input Section
======================================== */
.input-section {
    text-align: center;
    padding: 30px 20px;
    background: var(--bg-secondary);
    border-radius: var(--radius);
    margin-bottom: 20px;
    box-shadow: var(--shadow);
}

.input-section h1 {
    font-size: 2.2rem;
    margin-bottom: 25px;
    background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.input-wrapper {
    display: flex;
    justify-content: center;
    gap: 10px;
    flex-wrap: wrap;
}

#username-input {
    padding: 15px 25px;
    font-size: 1rem;
    border: 2px solid var(--bg-card);
    border-radius: var(--radius);
    background: var(--bg-primary);
    color: var(--text-primary);
    width: 320px;
    max-width: 100%;
    transition: var(--transition);
}

#username-input:focus {
    outline: none;
    border-color: var(--accent-secondary);
    box-shadow: 0 0 15px rgba(0, 217, 255, 0.3);
}

#username-input::placeholder {
    color: var(--text-secondary);
}

#add-profile-btn {
    padding: 15px 30px;
    font-size: 1rem;
    font-weight: 600;
    border: none;
    border-radius: var(--radius);
    background: linear-gradient(135deg, var(--accent-primary), #ff6b6b);
    color: var(--text-primary);
    cursor: pointer;
    transition: var(--transition);
}

#add-profile-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 20px rgba(233, 69, 96, 0.4);
}

#add-profile-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
}

.status-message {
    margin-top: 15px;
    font-size: 0.9rem;
    min-height: 22px;
}

.status-message.error { color: var(--accent-primary); }
.status-message.success { color: var(--accent-success); }
.status-message.loading { color: var(--accent-secondary); }

/* ========================================
   Tools Section
======================================== */
.tools-section {
    background: var(--bg-secondary);
    border-radius: var(--radius);
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: var(--shadow);
}

.tools-title {
    font-size: 1.2rem;
    margin-bottom: 15px;
    color: var(--text-secondary);
    text-align: center;
}

.tools-container {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 15px;
}

.tool-btn {
    padding: 12px 24px;
    font-size: 0.95rem;
    font-weight: 600;
    border: 2px solid transparent;
    border-radius: var(--radius);
    background: var(--bg-card);
    color: var(--text-primary);
    cursor: pointer;
    transition: var(--transition);
    display: flex;
    align-items: center;
    gap: 8px;
}

.tool-btn:hover {
    background: var(--bg-card-hover);
    transform: translateY(-2px);
}

.tool-btn.selected {
    border-color: var(--accent-secondary);
    background: rgba(0, 217, 255, 0.15);
    box-shadow: 0 0 15px rgba(0, 217, 255, 0.3);
}

.tool-btn .tool-icon {
    font-size: 1.3rem;
}

.tool-btn .tool-damage {
    font-size: 0.8rem;
    padding: 2px 8px;
    background: var(--accent-primary);
    border-radius: 10px;
}

.tool-info {
    text-align: center;
    font-size: 0.9rem;
    color: var(--text-secondary);
}

#current-tool-damage {
    margin-left: 10px;
    color: var(--accent-primary);
    font-weight: 600;
}

/* ========================================
   Stats Bar
======================================== */
.stats-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 20px;
    background: var(--bg-card);
    border-radius: var(--radius);
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 15px;
}

.stats-left {
    display: flex;
    gap: 25px;
    flex-wrap: wrap;
}

.stats-left span {
    font-size: 0.95rem;
    color: var(--text-secondary);
}

.stats-right {
    display: flex;
    gap: 10px;
}

.action-btn {
    padding: 10px 18px;
    font-size: 0.85rem;
    font-weight: 600;
    border: 2px solid;
    border-radius: var(--radius);
    background: transparent;
    cursor: pointer;
    transition: var(--transition);
}

.respawn-btn {
    border-color: var(--accent-success);
    color: var(--accent-success);
}

.respawn-btn:hover {
    background: var(--accent-success);
    color: var(--bg-primary);
}

.clear-btn {
    border-color: var(--accent-primary);
    color: var(--accent-primary);
}

.clear-btn:hover {
    background: var(--accent-primary);
    color: var(--text-primary);
}

/* ========================================
   Profiles Container
======================================== */
.profiles-container {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 25px;
    padding: 10px;
}

/* ========================================
   Profile Card (Dummy Target)
======================================== */
.profile-card {
    background: var(--bg-card);
    border-radius: var(--radius);
    padding: 20px;
    text-align: center;
    box-shadow: var(--shadow);
    transition: var(--transition);
    position: relative;
    overflow: visible;
    animation: spawn-in 0.4s ease-out;
    cursor: crosshair;
    user-select: none;
}

@keyframes spawn-in {
    from {
        opacity: 0;
        transform: scale(0.8) translateY(20px);
    }
    to {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
}

.profile-card:hover {
    transform: translateY(-3px);
}

.profile-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary));
    transition: var(--transition);
}

.profile-card.destroyed {
    cursor: default;
}

.profile-card.destroyed::before {
    background: var(--text-secondary);
}

/* Hit Flash Effect */
.profile-card.hit-flash {
    animation: hit-flash 0.15s ease-out;
}

@keyframes hit-flash {
    0%, 100% { 
        box-shadow: var(--shadow);
    }
    50% { 
        box-shadow: 0 0 30px rgba(255, 0, 0, 0.6), inset 0 0 30px rgba(255, 0, 0, 0.3);
    }
}

/* Shake Animation */
.profile-card.shake {
    animation: shake 0.4s ease-out;
}

@keyframes shake {
    0%, 100% { transform: translateX(0) rotate(0); }
    10% { transform: translateX(-8px) rotate(-2deg); }
    20% { transform: translateX(8px) rotate(2deg); }
    30% { transform: translateX(-6px) rotate(-1deg); }
    40% { transform: translateX(6px) rotate(1deg); }
    50% { transform: translateX(-4px) rotate(-0.5deg); }
    60% { transform: translateX(4px) rotate(0.5deg); }
    70% { transform: translateX(-2px); }
    80% { transform: translateX(2px); }
    90% { transform: translateX(-1px); }
}

/* Critical Hit Shake */
.profile-card.critical-shake {
    animation: critical-shake 0.5s ease-out;
}

@keyframes critical-shake {
    0%, 100% { transform: translateX(0) translateY(0) rotate(0); }
    10% { transform: translateX(-12px) translateY(-5px) rotate(-3deg); }
    20% { transform: translateX(12px) translateY(5px) rotate(3deg); }
    30% { transform: translateX(-10px) translateY(-3px) rotate(-2deg); }
    40% { transform: translateX(10px) translateY(3px) rotate(2deg); }
    50% { transform: translateX(-8px) translateY(-2px) rotate(-1deg); }
    60% { transform: translateX(8px) translateY(2px) rotate(1deg); }
    70% { transform: translateX(-4px) translateY(-1px); }
    80% { transform: translateX(4px) translateY(1px); }
}

/* ========================================
   Avatar Section
======================================== */
.avatar-wrapper {
    position: relative;
    width: 160px;
    height: 160px;
    margin: 0 auto 15px;
}

.avatar-image {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
    border: 4px solid var(--bg-secondary);
    transition: var(--transition);
    position: relative;
    z-index: 1;
}

.avatar-image.damaged {
    filter: saturate(0.8);
}

.avatar-image.critical {
    filter: saturate(0.5) brightness(0.8);
    border-color: var(--accent-primary);
}

/* ========================================
   Crack Overlays
======================================== */
.crack-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    pointer-events: none;
    z-index: 2;
    opacity: 0;
    transition: opacity 0.3s ease;
}

.crack-overlay.visible {
    opacity: 1;
}

/* Crack Level 1 - Light cracks */
.crack-overlay.crack-1 {
    background: 
        linear-gradient(45deg, transparent 48%, rgba(0,0,0,0.4) 49%, rgba(0,0,0,0.4) 51%, transparent 52%),
        linear-gradient(-30deg, transparent 48%, rgba(0,0,0,0.3) 49%, rgba(0,0,0,0.3) 51%, transparent 52%);
    background-size: 60px 60px;
}

.crack-overlay.crack-1::before {
    content: '';
    position: absolute;
    top: 20%;
    left: 30%;
    width: 40%;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(0,0,0,0.5), transparent);
    transform: rotate(-15deg);
}

/* Crack Level 2 - Medium cracks */
.crack-overlay.crack-2 {
    background: 
        radial-gradient(circle at 30% 30%, transparent 20%, rgba(0,0,0,0.1) 21%, transparent 22%),
        linear-gradient(60deg, transparent 45%, rgba(0,0,0,0.5) 46%, rgba(0,0,0,0.5) 54%, transparent 55%),
        linear-gradient(-45deg, transparent 45%, rgba(0,0,0,0.4) 46%, rgba(0,0,0,0.4) 54%, transparent 55%),
        linear-gradient(15deg, transparent 47%, rgba(0,0,0,0.4) 48%, rgba(0,0,0,0.4) 52%, transparent 53%);
    background-size: 100% 100%, 40px 40px, 50px 50px, 30px 30px;
}

.crack-overlay.crack-2::before,
.crack-overlay.crack-2::after {
    content: '';
    position: absolute;
    background: rgba(0,0,0,0.5);
}

.crack-overlay.crack-2::before {
    top: 15%;
    left: 20%;
    width: 60%;
    height: 3px;
    transform: rotate(-25deg);
    box-shadow: 
        10px 20px 0 rgba(0,0,0,0.4),
        -15px 40px 0 rgba(0,0,0,0.3);
}

.crack-overlay.crack-2::after {
    top: 50%;
    right: 15%;
    width: 3px;
    height: 40%;
    transform: rotate(20deg);
}

/* Crack Level 3 - Heavy cracks */
.crack-overlay.crack-3 {
    background: 
        radial-gradient(circle at 50% 50%, transparent 30%, rgba(0,0,0,0.15) 31%, transparent 35%),
        linear-gradient(75deg, transparent 42%, rgba(0,0,0,0.6) 43%, rgba(0,0,0,0.6) 57%, transparent 58%),
        linear-gradient(-60deg, transparent 42%, rgba(0,0,0,0.5) 43%, rgba(0,0,0,0.5) 57%, transparent 58%),
        linear-gradient(30deg, transparent 44%, rgba(0,0,0,0.5) 45%, rgba(0,0,0,0.5) 55%, transparent 56%),
        linear-gradient(-20deg, transparent 46%, rgba(0,0,0,0.4) 47%, rgba(0,0,0,0.4) 53%, transparent 54%);
    background-size: 100% 100%, 25px 25px, 35px 35px, 20px 20px, 30px 30px;
    animation: crack-pulse 1s ease-in-out infinite;
}

@keyframes crack-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.85; }
}

.crack-overlay.crack-3::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 50%;
    border: 3px solid transparent;
    border-top-color: rgba(255, 0, 0, 0.3);
    border-right-color: rgba(255, 0, 0, 0.2);
    animation: crack-rotate 3s linear infinite;
}

@keyframes crack-rotate {
    to { transform: rotate(360deg); }
}

.crack-overlay.crack-3::after {
    content: '';
    position: absolute;
    top: 10%;
    left: 10%;
    right: 10%;
    bottom: 10%;
    background: 
        linear-gradient(45deg, transparent 30%, rgba(139, 0, 0, 0.2) 50%, transparent 70%),
        linear-gradient(-45deg, transparent 30%, rgba(139, 0, 0, 0.2) 50%, transparent 70%);
    border-radius: 50%;
}

/* ========================================
   Destroyed State
======================================== */
.avatar-wrapper.destroyed .avatar-image {
    opacity: 0;
    transform: scale(0);
    transition: all 0.5s ease-out;
}

.avatar-wrapper.destroyed .crack-overlay {
    opacity: 0;
}

/* Shatter Pieces Container */
.shatter-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 10;
}

.shatter-piece {
    position: absolute;
    background-size: 160px 160px;
    border-radius: 2px;
    opacity: 1;
}

.shatter-piece.animate {
    animation: shatter-fly 0.8s ease-out forwards;
}

@keyframes shatter-fly {
    0% {
        opacity: 1;
        transform: translate(0, 0) rotate(0deg) scale(1);
    }
    100% {
        opacity: 0;
        transform: translate(var(--tx), var(--ty)) rotate(var(--rot)) scale(0.3);
    }
}

/* Destroyed Overlay */
.destroyed-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 15;
    text-align: center;
    opacity: 0;
    animation: destroyed-appear 0.5s ease-out 0.3s forwards;
}

@keyframes destroyed-appear {
    from {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.5);
    }
    to {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
    }
}

.destroyed-text {
    font-size: 1rem;
    font-weight: 700;
    color: var(--accent-primary);
    text-shadow: 0 0 10px rgba(233, 69, 96, 0.5);
    white-space: nowrap;
    margin-bottom: 10px;
}

.respawn-btn-small {
    padding: 8px 16px;
    font-size: 0.85rem;
    font-weight: 600;
    border: none;
    border-radius: 8px;
    background: var(--accent-success);
    color: var(--bg-primary);
    cursor: pointer;
    transition: var(--transition);
}

.respawn-btn-small:hover {
    transform: scale(1.05);
    box-shadow: 0 0 15px rgba(74, 222, 128, 0.5);
}

/* ========================================
   Floating Damage Text
======================================== */
.damage-text {
    position: absolute;
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--accent-primary);
    text-shadow: 
        2px 2px 0 #000,
        -2px -2px 0 #000,
        2px -2px 0 #000,
        -2px 2px 0 #000,
        0 0 10px rgba(233, 69, 96, 0.8);
    pointer-events: none;
    z-index: 100;
    animation: damage-float 1s ease-out forwards;
    white-space: nowrap;
}

.damage-text.critical {
    font-size: 2rem;
    color: #ff0000;
    text-shadow: 
        2px 2px 0 #000,
        -2px -2px 0 #000,
        2px -2px 0 #000,
        -2px 2px 0 #000,
        0 0 20px rgba(255, 0, 0, 0.9);
}

.damage-text.heal {
    color: var(--accent-success);
    text-shadow: 
        2px 2px 0 #000,
        -2px -2px 0 #000,
        2px -2px 0 #000,
        -2px 2px 0 #000,
        0 0 10px rgba(74, 222, 128, 0.8);
}

@keyframes damage-float {
    0% {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
    20% {
        transform: translateY(-20px) scale(1.2);
    }
    100% {
        opacity: 0;
        transform: translateY(-60px) scale(0.8);
    }
}

/* ========================================
   Profile Info
======================================== */
.profile-info {
    margin-bottom: 15px;
}

.display-name {
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 3px;
    word-break: break-word;
}

.username {
    font-size: 0.9rem;
    color: var(--text-secondary);
    word-break: break-word;
}

/* ========================================
   Health Bar
======================================== */
.health-section {
    margin-top: 15px;
}

.health-label {
    display: flex;
    justify-content: space-between;
    font-size: 0.85rem;
    margin-bottom: 6px;
    color: var(--text-secondary);
}

.health-value {
    font-weight: 600;
    transition: color 0.3s ease;
}

.health-value.high { color: var(--health-high); }
.health-value.mid { color: var(--health-mid); }
.health-value.low { color: var(--health-low); }

.health-bar-container {
    width: 100%;
    height: 14px;
    background: var(--health-bg);
    border-radius: 7px;
    overflow: hidden;
    position: relative;
}

.health-bar-fill {
    height: 100%;
    border-radius: 7px;
    transition: width 0.3s ease, background 0.3s ease;
    position: relative;
    overflow: hidden;
}

.health-bar-fill.high {
    background: linear-gradient(90deg, var(--health-high), #22c55e);
}

.health-bar-fill.mid {
    background: linear-gradient(90deg, var(--health-mid), #d97706);
}

.health-bar-fill.low {
    background: linear-gradient(90deg, var(--health-low), #dc2626);
    animation: health-pulse 0.5s ease-in-out infinite;
}

@keyframes health-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}

.health-bar-fill::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 50%;
    background: linear-gradient(180deg, rgba(255,255,255,0.3), transparent);
    border-radius: 7px 7px 0 0;
}

/* ========================================
   Profile Badges
======================================== */
.profile-id-badge {
    position: absolute;
    top: 12px;
    right: 12px;
    background: var(--bg-secondary);
    padding: 4px 10px;
    border-radius: 15px;
    font-size: 0.7rem;
    color: var(--text-secondary);
}

.remove-btn {
    position: absolute;
    top: 12px;
    left: 12px;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: none;
    background: rgba(233, 69, 96, 0.2);
    color: var(--accent-primary);
    font-size: 1.1rem;
    cursor: pointer;
    opacity: 0;
    transition: var(--transition);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 20;
}

.profile-card:hover .remove-btn {
    opacity: 1;
}

.remove-btn:hover {
    background: var(--accent-primary);
    color: var(--text-primary);
}

/* ========================================
   Spark Particles (CSS-based)
======================================== */
.spark-container {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    pointer-events: none;
    z-index: 50;
}

.spark {
    position: absolute;
    width: 6px;
    height: 6px;
    background: var(--accent-secondary);
    border-radius: 50%;
    animation: spark-fly 0.6s ease-out forwards;
    box-shadow: 0 0 6px var(--accent-secondary), 0 0 12px var(--accent-primary);
}

@keyframes spark-fly {
    0% {
        opacity: 1;
        transform: translate(0, 0) scale(1);
    }
    100% {
        opacity: 0;
        transform: translate(var(--sx), var(--sy)) scale(0);
    }
}

/* ========================================
   Empty State
======================================== */
.empty-state {
    grid-column: 1 / -1;
    text-align: center;
    padding: 60px 20px;
    color: var(--text-secondary);
}

.empty-state-icon {
    font-size: 4rem;
    margin-bottom: 15px;
    opacity: 0.5;
}

.empty-state-text {
    font-size: 1.1rem;
}

/* ========================================
   Loading Spinner
======================================== */
.loading-spinner {
    display: inline-block;
    width: 20px;
    height: 20px;
    border: 3px solid var(--bg-secondary);
    border-top-color: var(--accent-secondary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

/* ========================================
   Responsive Design
======================================== */
@media (max-width: 768px) {
    .input-section h1 {
        font-size: 1.7rem;
    }

    #username-input {
        width: 100%;
    }

    #add-profile-btn {
        width: 100%;
    }

    .tools-container {
        gap: 8px;
    }

    .tool-btn {
        padding: 10px 16px;
        font-size: 0.85rem;
    }

    .stats-bar {
        flex-direction: column;
        text-align: center;
    }

    .stats-left {
        justify-content: center;
    }

    .profiles-container {
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 15px;
    }

    .avatar-wrapper {
        width: 130px;
        height: 130px;
    }
}
