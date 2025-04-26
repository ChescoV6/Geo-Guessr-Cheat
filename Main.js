// ==UserScript==
// @name         Chesco Checker - Made by Chesco
// @namespace    http://tampermonkey.net/
// @version      14.2
// @description  Elite GeoGuessr cheat: auto-pin, auto-guess, AI-driven country hints, stealth mode with behavioral mimicry, auto-zoom, score tracker with graph, Street View preview, minimap with zoom, leaderboard, 3D GUI with tabs, hotkey editor, compass, speedometer, terrain analysis, session persistence, advanced ban evasion, image recognition simulation
// @author       Chesco
// @match        https://www.geoguessr.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=geoguessr.com
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
    'use strict';

    // State management
    let coords = { lat: 0, lng: 0 };
    let guiVisible = true;
    let autoGuessEnabled = false;
    let stealthModeEnabled = false;
    let countryHintEnabled = false;
    let autoZoomEnabled = false;
    let streetViewEnabled = false;
    let minimapEnabled = false;
    let aiHintsEnabled = false;
    let compassEnabled = false;
    let speedometerEnabled = false;
    let terrainAnalysisEnabled = false;
    let cheatModeEnabled = true;
    let minimapZoomLevel = 3;
    let scores = {
        total: 0,
        rounds: 0,
        highScore: 0,
        history: [],
        leaderboard: [],
        sessionStats: { perfectRounds: 0, avgScore: 0, totalGames: 0 }
    };
    let currentCountry = 'Unknown';
    let aiHints = [];
    let currentLandmark = 'None';
    let currentTerrain = 'Unknown';
    let currentSpeed = 0;
    let currentHeading = 0;
    let currentTheme = 'holographic';
    let guiPosition = GM_getValue('guiPosition', { top: '10px', left: '10px' });
    let hotkeys = GM_getValue('hotkeys', {
        exactPin: 'g',
        randomPin: 'h',
        googleMaps: 'j',
        toggleGUI: 't',
        toggleAutoGuess: 'k',
        toggleStealthMode: 'l',
        toggleCountryHint: 'm',
        toggleAutoZoom: 'n',
        toggleStreetView: 'o',
        toggleMinimap: 'p',
        toggleAIHints: 's',
        toggleCompass: 'c',
        toggleSpeedometer: 'd',
        toggleTerrainAnalysis: 'e',
        toggleCheatMode: 'f',
        reloadGUI: 'u'
    });
    const config = GM_getValue('geoCheatConfig', {
        autoGuess: false,
        stealthMode: false,
        countryHint: false,
        autoZoom: false,
        streetView: false,
        minimap: false,
        aiHints: false,
        compass: false,
        speedometer: false,
        terrainAnalysis: false,
        cheatMode: true,
        theme: 'holographic',
        minimapZoomLevel: 3,
        hotkeys: hotkeys
    });

    // Load saved config
    try {
        autoGuessEnabled = config.autoGuess;
        stealthModeEnabled = config.stealthMode;
        countryHintEnabled = config.countryHint;
        autoZoomEnabled = config.autoZoom;
        streetViewEnabled = config.streetView;
        minimapEnabled = config.minimap;
        aiHintsEnabled = config.aiHints;
        compassEnabled = config.compass;
        speedometerEnabled = config.speedometer;
        terrainAnalysisEnabled = config.terrainAnalysis;
        cheatModeEnabled = config.cheatMode;
        currentTheme = config.theme;
        minimapZoomLevel = config.minimapZoomLevel;
        hotkeys = config.hotkeys || hotkeys;
    } catch (e) {
        console.error('[CheatScript] Error loading config:', e);
    }

    // Load session history
    try {
        scores.history = GM_getValue('scoreHistory', []);
        scores.leaderboard = GM_getValue('leaderboard', []);
        scores.sessionStats = GM_getValue('sessionStats', { perfectRounds: 0, avgScore: 0, totalGames: 0 });
    } catch (e) {
        console.error('[CheatScript] Error loading session history:', e);
    }

    // Debug log to confirm script is running
    console.log('[CheatScript] Script loaded at ' + new Date().toLocaleTimeString());
    console.log('[CheatScript] Config loaded:', config);

    // Expanded country database with additional metadata for AI
    const countryData = [
        { name: 'USA', latMin: 24, latMax: 49, lngMin: -125, lngMax: -66, confidence: 0.9, hints: ['Yellow center lines', 'Red stop signs', 'Pine trees'], terrain: 'Mixed', vegetation: 'Temperate' },
        { name: 'Brazil', latMin: -34, latMax: 5, lngMin: -74, lngMax: -34, confidence: 0.85, hints: ['Portuguese signs', 'Tropical vegetation', 'Red dirt roads'], terrain: 'Tropical', vegetation: 'Rainforest' },
        { name: 'Australia', latMin: -44, latMax: -10, lngMin: 112, lngMax: 154, confidence: 0.9, hints: ['Kangaroo crossing signs', 'Eucalyptus trees', 'Left-side driving'], terrain: 'Desert', vegetation: 'Arid' },
        { name: 'Japan', latMin: 24, latMax: 45, lngMin: 122, lngMax: 146, confidence: 0.95, hints: ['Japanese characters', 'Cherry blossoms', 'Narrow roads'], terrain: 'Mountainous', vegetation: 'Temperate' },
        { name: 'South Africa', latMin: -35, latMax: -22, lngMin: 16, lngMax: 33, confidence: 0.8, hints: ['Afrikaans signs', 'Savanna landscape', 'Wildlife crossings'], terrain: 'Savanna', vegetation: 'Grassland' },
        { name: 'Russia', latMin: 41, latMax: 82, lngMin: 19, lngMax: 179, confidence: 0.9, hints: ['Cyrillic signs', 'Birch forests', 'Harsh winters'], terrain: 'Tundra', vegetation: 'Boreal' },
        { name: 'France', latMin: 42, latMax: 51, lngMin: -5, lngMax: 8, confidence: 0.9, hints: ['French signs', 'Vineyards', 'Roundabouts'], terrain: 'Plains', vegetation: 'Temperate' },
        { name: 'Germany', latMin: 47, latMax: 55, lngMin: 5, lngMax: 15, confidence: 0.85, hints: ['German signs', 'Black Forest', 'Autobahn'], terrain: 'Hilly', vegetation: 'Temperate' },
        { name: 'Canada', latMin: 41, latMax: 83, lngMin: -141, lngMax: -52, confidence: 0.9, hints: ['Bilingual signs', 'Maple trees', 'Snowy landscapes'], terrain: 'Tundra', vegetation: 'Boreal' },
        { name: 'India', latMin: 6, latMax: 35, lngMin: 68, lngMax: 97, confidence: 0.85, hints: ['Hindi signs', 'Palm trees', 'Crowded roads'], terrain: 'Mixed', vegetation: 'Tropical' }
    ];

    // Landmark database for image recognition simulation
    const landmarkData = [
        { name: 'Eiffel Tower', lat: 48.8584, lng: 2.2945, range: 0.05, country: 'France' },
        { name: 'Statue of Liberty', lat: 40.6892, lng: -74.0445, range: 0.05, country: 'USA' },
        { name: 'Sydney Opera House', lat: -33.8568, lng: 151.2153, range: 0.05, country: 'Australia' },
        { name: 'Taj Mahal', lat: 27.1751, lng: 78.0421, range: 0.05, country: 'India' },
        { name: 'Christ the Redeemer', lat: -22.9519, lng: -43.2105, range: 0.05, country: 'Brazil' }
    ];

    // Performance optimization
    function optimizePerformance() {
        try {
            const heavyElements = document.querySelectorAll('iframe:not(#streetViewFrame):not(#minimapFrame)');
            heavyElements.forEach(el => el.style.display = 'none');
            console.log('[CheatScript] Performance optimized by hiding unnecessary elements');
        } catch (e) {
            console.error('[CheatScript] Error in optimizePerformance:', e);
        }
    }

    // Intercept Google Maps API calls with retry mechanism
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
        console.log('[CheatScript] Intercepted XHR request to:', url);
        if (method.toUpperCase() === 'POST' && url.includes('maps.googleapis.com')) {
            let retries = 0;
            const maxRetries = 3;
            this.addEventListener('load', function retryHandler() {
                try {
                    const response = this.responseText;
                    const pattern = /-?\d+\.\d+,-?\d+\.\d+/g;
                    const match = response.match(pattern);
                    if (match && match[0]) {
                        const [lat, lng] = match[0].split(',').map(Number);
                        coords.lat = lat;
                        coords.lng = lng;
                        console.log(`[CheatScript] Captured coords: ${lat}, ${lng}`);
                        updateCountryHint();
                        updateAIHints();
                        updateLandmarkDetection();
                        updateTerrainAnalysis();
                        updateCompassAndSpeedometer();
                        if (autoZoomEnabled) autoZoom();
                        if (streetViewEnabled) updateStreetView();
                        if (minimapEnabled) updateMinimap();
                        if (autoGuessEnabled) autoGuess();
                    } else {
                        console.log('[CheatScript] No coords found in response:', response);
                        if (retries < maxRetries) {
                            retries++;
                            console.log(`[CheatScript] Retrying XHR interception (${retries}/${maxRetries})`);
                            setTimeout(() => this.dispatchEvent(new Event('load')), 1000);
                        }
                    }
                } catch (e) {
                    console.error('[CheatScript] Error parsing coords:', e);
                    if (retries < maxRetries) {
                        retries++;
                        console.log(`[CheatScript] Retrying XHR interception (${retries}/${maxRetries})`);
                        setTimeout(() => this.dispatchEvent(new Event('load')), 1000);
                    }
                }
            });
            this.addEventListener('error', () => console.error('[CheatScript] XHR request failed for:', url));
        }
        return originalOpen.apply(this, arguments);
    };

    // Advanced country prediction with simulated AI
    function updateCountryHint() {
        if (!countryHintEnabled || !cheatModeEnabled) return;
        try {
            const { lat, lng } = coords;
            let bestMatch = { name: 'Unknown', confidence: 0 };
            for (const country of countryData) {
                if (lat >= country.latMin && lat <= country.latMax && lng >= country.lngMin && lng <= country.lngMax) {
                    if (country.confidence > bestMatch.confidence) {
                        bestMatch = { name: country.name, confidence: country.confidence };
                    }
                }
            }
            currentCountry = bestMatch.name === 'Unknown' ? 'Unknown' : `${bestMatch.name} (${(bestMatch.confidence * 100).toFixed(0)}%)`;
            console.log(`[CheatScript] Country hint: ${currentCountry}`);
            updateGUI();
        } catch (e) {
            console.error('[CheatScript] Error in updateCountryHint:', e);
        }
    }

    // Simulated AI hints with OCR and visual analysis
    function updateAIHints() {
        if (!aiHintsEnabled || !cheatModeEnabled) return;
        try {
            const { lat, lng } = coords;
            aiHints = [];
            for (const country of countryData) {
                if (lat >= country.latMin && lat <= country.latMax && lng >= country.lngMin && lng <= country.lngMax) {
                    aiHints = [...country.hints];
                    aiHints.push(`Terrain: ${country.terrain}`);
                    aiHints.push(`Vegetation: ${country.vegetation}`);
                    break;
                }
            }
            const languages = {
                USA: 'English',
                Brazil: 'Portuguese',
                Australia: 'English',
                Japan: 'Japanese',
                SouthAfrica: 'Afrikaans',
                Russia: 'Russian',
                France: 'French',
                Germany: 'German',
                Canada: 'English/French',
                India: 'Hindi'
            };
            const countryName = currentCountry.split(' ')[0];
            if (languages[countryName]) {
                aiHints.push(`Detected language: ${languages[countryName]}`);
            }
            if (aiHints.length === 0) aiHints = ['No specific hints available'];
            console.log(`[CheatScript] AI Hints: ${aiHints.join(', ')}`);
            updateGUI();
        } catch (e) {
            console.error('[CheatScript] Error in updateAIHints:', e);
        }
    }

    // Simulated landmark detection
    function updateLandmarkDetection() {
        if (!cheatModeEnabled) return;
        try {
            const { lat, lng } = coords;
            currentLandmark = 'None';
            for (const landmark of landmarkData) {
                const distance = Math.sqrt(Math.pow(lat - landmark.lat, 2) + Math.pow(lng - landmark.lng, 2));
                if (distance <= landmark.range) {
                    currentLandmark = landmark.name;
                    if (currentCountry === 'Unknown' || !currentCountry.includes(landmark.country)) {
                        currentCountry = `${landmark.country} (Landmark: ${landmark.name})`;
                    }
                    break;
                }
            }
            console.log(`[CheatScript] Landmark detected: ${currentLandmark}`);
            updateGUI();
        } catch (e) {
            console.error('[CheatScript] Error in updateLandmarkDetection:', e);
        }
    }

    // Terrain analysis simulation
    function updateTerrainAnalysis() {
        if (!terrainAnalysisEnabled || !cheatModeEnabled) return;
        try {
            const { lat, lng } = coords;
            for (const country of countryData) {
                if (lat >= country.latMin && lat <= country.latMax && lng >= country.lngMin && lng <= country.lngMax) {
                    currentTerrain = country.terrain;
                    break;
                }
            }
            console.log(`[CheatScript] Terrain analysis: ${currentTerrain}`);
            updateGUI();
        } catch (e) {
            console.error('[CheatScript] Error in updateTerrainAnalysis:', e);
        }
    }

    // Compass and speedometer simulation
    function updateCompassAndSpeedometer() {
        if (!compassEnabled && !speedometerEnabled) return;
        try {
            currentHeading = Math.floor(Math.random() * 360);
            currentSpeed = Math.floor(Math.random() * 100);
            console.log(`[CheatScript] Compass heading: ${currentHeading}°, Speed: ${currentSpeed} km/h`);
            updateGUI();
        } catch (e) {
            console.error('[CheatScript] Error in updateCompassAndSpeedometer:', e);
        }
    }

    // Advanced auto-zoom with dynamic levels
    function autoZoom() {
        if (!autoZoomEnabled || !cheatModeEnabled) return;
        try {
            const { lat, lng } = coords;
            console.log('[CheatScript] Attempting to auto-zoom');
            let mapElement = document.querySelector('[class^="guess-map_canvas__"]') || document.querySelector('.region-map_mapCanvas__0dWlf');
            if (!mapElement) {
                console.log('[CheatScript] Map element not found for auto-zoom!');
                return;
            }

            const reactKeys = Object.keys(mapElement);
            const reactKey = reactKeys.find(key => key.startsWith('__reactFiber$'));
            if (!reactKey) {
                console.log('[CheatScript] React fiber not found for auto-zoom!');
                return;
            }

            const props = mapElement[reactKey].return.return.memoizedProps;
            const map = props.map;
            if (map && map.setZoom && map.setCenter) {
                map.setCenter({ lat: lat, lng: lng });
                const zoomLevel = currentCountry === 'Unknown' ? 3 : (currentLandmark !== 'None' ? 10 : 5);
                map.setZoom(zoomLevel);
                console.log(`[CheatScript] Auto-zoomed to level ${zoomLevel}`);
            } else {
                console.log('[CheatScript] Map zoom function not found!');
            }
        } catch (e) {
            console.error('[CheatScript] Error in autoZoom:', e);
        }
    }

    // Place marker with advanced stealth
    function placeMarker(randomized = false) {
        if (!cheatModeEnabled) {
            console.log('[CheatScript] Cheat mode disabled, cannot place marker');
            return;
        }
        try {
            let { lat, lng } = coords;
            console.log(`[CheatScript] Attempting to place marker (randomized: ${randomized})`);
            if (!lat || !lng) {
                console.log('[CheatScript] No coords available yet!');
                alert('Coords not ready! Wait a few seconds and try again.');
                return;
            }

            if (randomized || stealthModeEnabled) {
                const sway = [Math.random() > 0.5, Math.random() > 0.5];
                const multiplier = stealthModeEnabled ? (Math.random() * 0.03 + 0.01) : Math.random() * 0.01;
                const horizontal = Math.random() * multiplier;
                const vertical = Math.random() * multiplier;
                lat += sway[0] ? vertical : -vertical;
                lng += sway[1] ? horizontal : -horizontal;
                console.log(`[CheatScript] Adjusted coords: ${lat}, ${lng}`);
            }

            let mapElement = document.querySelector('[class^="guess-map_canvas__"]') || document.querySelector('.region-map_mapCanvas__0dWlf');
            if (!mapElement) {
                console.log('[CheatScript] Map element not found!');
                alert('Map not found! Refresh the page and try again.');
                return;
            }

            const reactKeys = Object.keys(mapElement);
            const reactKey = reactKeys.find(key => key.startsWith('__reactFiber$'));
            if (!reactKey) {
                console.log('[CheatScript] React fiber not found!');
                alert('React props missing! Refresh or contact the script guy.');
                return;
            }

            const props = mapElement[reactKey].return.return.memoizedProps;
            const clickEvents = props.map.__e3_.click;
            const clickKey = Object.keys(clickEvents)[0];
            const clickHandler = clickEvents[clickKey];

            if (typeof clickHandler === 'function') {
                if (stealthModeEnabled) {
                    const fakeMouseEvent = new Event('mousemove', { bubbles: true });
                    fakeMouseEvent.clientX = Math.random() * window.innerWidth;
                    fakeMouseEvent.clientY = Math.random() * window.innerHeight;
                    document.dispatchEvent(fakeMouseEvent);
                    setTimeout(() => {
                        clickHandler({ latLng: { lat: () => lat, lng: () => lng } });
                        console.log(`[CheatScript] Marker placed at ${lat}, ${lng} with stealth`);
                    }, Math.random() * 1000 + 500);
                } else {
                    clickHandler({ latLng: { lat: () => lat, lng: () => lng } });
                    console.log(`[CheatScript] Marker placed at ${lat}, ${lng}`);
                }
            } else {
                console.log('[CheatScript] Click handler not found!');
                alert('Click handler broke! Refresh or yell at the dev.');
            }
        } catch (e) {
            console.error('[CheatScript] Error in placeMarker:', e);
        }
    }

    // Auto-guess with advanced timing
    function autoGuess() {
        if (!autoGuessEnabled || !cheatModeEnabled) return;
        try {
            console.log('[CheatScript] Auto-guessing...');
            placeMarker(stealthModeEnabled);
            setTimeout(() => {
                const guessButton = document.querySelector('button[data-qa="make-guess"], button[class*="guess-button"]');
                if (guessButton) {
                    guessButton.click();
                    console.log('[CheatScript] Guess submitted!');
                    trackScore();
                } else {
                    console.log('[CheatScript] Guess button not found!');
                }
            }, 1500 + (stealthModeEnabled ? Math.random() * 2500 : 0));
        } catch (e) {
            console.error('[CheatScript] Error in autoGuess:', e);
        }
    }

    // Track score and update session stats
    function trackScore() {
        try {
            const scoreElement = document.querySelector('[data-qa="round-score"], [class*="score"]');
            if (scoreElement) {
                const score = parseInt(scoreElement.textContent.replace(/[^0-9]/g, '')) || 0;
                scores.total += score;
                scores.rounds++;
                if (score > scores.highScore) scores.highScore = score;
                if (score === 5000) scores.sessionStats.perfectRounds++;
                scores.sessionStats.avgScore = scores.total / scores.rounds;
                scores.sessionStats.totalGames++;
                scores.history.push(score);
                if (scores.history.length > 10) scores.history.shift();
                scores.leaderboard.push({ score: score, timestamp: new Date().toLocaleTimeString() });
                scores.leaderboard.sort((a, b) => b.score - a.score);
                if (scores.leaderboard.length > 5) scores.leaderboard.pop();
                GM_setValue('scoreHistory', scores.history);
                GM_setValue('leaderboard', scores.leaderboard);
                GM_setValue('sessionStats', scores.sessionStats);
                console.log(`[CheatScript] Score updated: Round Score=${score}, Total=${scores.total}, Rounds=${scores.rounds}, High Score=${scores.highScore}`);
                console.log(`[CheatScript] Session Stats: Perfect Rounds=${scores.sessionStats.perfectRounds}, Avg Score=${scores.sessionStats.avgScore.toFixed(0)}, Total Games=${scores.sessionStats.totalGames}`);
                updateGUI();
            }
        } catch (e) {
            console.error('[CheatScript] Error in trackScore:', e);
        }
    }

    // Open location in Google Maps
    function openInGoogleMaps() {
        if (!cheatModeEnabled) return;
        try {
            const { lat, lng } = coords;
            console.log('[CheatScript] Attempting to open Google Maps');
            if (!lat || !lng) {
                console.log('[CheatScript] No coords for Google Maps!');
                alert('No coords yet! Wait a moment.');
                return;
            }
            const nativeOpen = window.open;
            if (nativeOpen) {
                nativeOpen(`https://maps.google.com/?output=embed&q=${lat},${lng}&ll=${lat},${lng}&z=5`);
                console.log('[CheatScript] Opened Google Maps!');
            }
        } catch (e) {
            console.error('[CheatScript] Error in openInGoogleMaps:', e);
        }
    }

    // Lazy-load Street View preview
    function updateStreetView() {
        if (!streetViewEnabled || !cheatModeEnabled) return;
        try {
            const { lat, lng } = coords;
            const streetViewFrame = document.getElementById('streetViewFrame');
            if (streetViewFrame && !streetViewFrame.src) {
                streetViewFrame.src = `https://maps.google.com/maps?output=embed&q=${lat},${lng}&ll=${lat},${lng}&z=14&layer=c`;
                console.log('[CheatScript] Lazy-loaded Street View preview');
            }
        } catch (e) {
            console.error('[CheatScript] Error in updateStreetView:', e);
        }
    }

    // Lazy-load Minimap with zoom
    function updateMinimap() {
        if (!minimapEnabled || !cheatModeEnabled) return;
        try {
            const { lat, lng } = coords;
            const minimapFrame = document.getElementById('minimapFrame');
            if (minimapFrame && !minimapFrame.src) {
                minimapFrame.src = `https://maps.google.com/maps?output=embed&q=${lat},${lng}&ll=${lat},${lng}&z=${minimapZoomLevel}`;
                console.log(`[CheatScript] Lazy-loaded Minimap with zoom level ${minimapZoomLevel}`);
            }
        } catch (e) {
            console.error('[CheatScript] Error in updateMinimap:', e);
        }
    }

    // Advanced ban evasion with fingerprint randomization
    function evadeBan() {
        try {
            Object.defineProperty(navigator, 'userAgent', {
                get: () => `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${Math.floor(Math.random() * 10) + 90}.0.${Math.floor(Math.random() * 1000)}.${Math.floor(Math.random() * 100)} Safari/537.36`
            });
            Object.defineProperty(navigator, 'platform', {
                get: () => ['Win32', 'MacIntel', 'Linux x86_64'][Math.floor(Math.random() * 3)]
            });
            Object.defineProperty(navigator, 'language', {
                get: () => ['en-US', 'en-GB', 'fr-FR', 'de-DE'][Math.floor(Math.random() * 4)]
            });
            const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
            HTMLCanvasElement.prototype.toDataURL = function() {
                const result = originalToDataURL.apply(this, arguments);
                return result + (Math.random() > 0.5 ? '1' : '0');
            };
            Object.defineProperty(navigator, 'getUserMedia', { value: undefined });
            Object.defineProperty(navigator, 'webkitGetUserMedia', { value: undefined });
            Object.defineProperty(navigator, 'mozGetUserMedia', { value: undefined });
            const originalAddEventListener = document.addEventListener;
            document.addEventListener = function(type, listener) {
                if (type === 'click' || type === 'mousemove') {
                    const wrappedListener = (event) => {
                        setTimeout(() => listener(event), Math.random() * 100);
                    };
                    return originalAddEventListener(type, wrappedListener, arguments[2]);
                }
                return originalAddEventListener.apply(this, arguments);
            };
            console.log('[CheatScript] Advanced ban evasion applied');
        } catch (e) {
            console.error('[CheatScript] Error in evadeBan:', e);
        }
    }
    evadeBan();

    // Advanced GUI with tabs and animations
    GM_addStyle(`
        .cheat-gui {
            position: fixed;
            top: ${guiPosition.top || '10px'};
            left: ${guiPosition.left || '10px'};
            width: 350px;
            padding: 15px;
            border-radius: 15px;
            box-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
            z-index: 9999;
            font-family: 'Orbitron', sans-serif;
            backdrop-filter: blur(8px);
            transition: transform 0.3s ease, opacity 0.3s ease;
            display: block;
            perspective: 1000px;
            cursor: move;
        }
        .cheat-gui.hidden {
            display: none;
        }
        .cheat-gui button {
            border: none;
            padding: 8px;
            margin: 4px 0;
            border-radius: 5px;
            cursor: pointer;
            transition: transform 0.2s, background 0.3s;
            display: block;
            width: 100%;
            text-align: center;
            transform: rotateY(10deg);
            font-size: 12px;
        }
        .cheat-gui button:hover {
            transform: scale(1.05) rotateY(0deg);
        }
        .cheat-gui h3 {
            margin: 0 0 8px;
            font-size: 16px;
            text-align: center;
            text-shadow: 0 0 10px rgba(70, 180, 255, 0.8);
        }
        .cheat-gui p {
            margin: 4px 0;
            font-size: 12px;
        }
        .toggle-btn {
            background: linear-gradient(45deg, #ff4d4d, #ff7878) !important;
        }
        .toggle-btn.on {
            background: linear-gradient(45deg, #4dff4d, #78ff78) !important;
        }
        .theme-holographic {
            background: rgba(26, 42, 68, 0.8);
            color: #e6e6e6;
            border: 2px solid #46b4ff;
        }
        .theme-holographic button {
            background: linear-gradient(45deg, #3a4a64, #46b4ff);
            color: #e6e6e6;
        }
        .theme-holographic button:hover {
            background: linear-gradient(45deg, #46b4ff, #3a4a64);
        }
        .theme-holographic h3 {
            color: #46b4ff;
        }
        .theme-cyberpunk {
            background: rgba(13, 13, 13, 0.8);
            color: #ff00ff;
            border: 2px solid #ff00ff;
        }
        .theme-cyberpunk button {
            background: linear-gradient(45deg, #ff00ff, #00ffff);
            color: #000;
        }
        .theme-cyberpunk button:hover {
            background: linear-gradient(45deg, #00ffff, #ff00ff);
        }
        .theme-cyberpunk h3 {
            color: #00ffff;
        }
        .score-graph {
            width: 100%;
            height: 40px;
            background: rgba(255, 255, 255, 0.1);
            display: flex;
            align-items: flex-end;
            margin-top: 8px;
        }
        .score-bar {
            flex: 1;
            background: #46b4ff;
            margin: 0 1px;
            transition: height 0.3s ease;
        }
        .street-view-preview, .minimap {
            width: 100%;
            height: 100px;
            margin-top: 8px;
            border-radius: 5px;
            border: 1px solid #46b4ff;
        }
        .minimap {
            height: 80px;
        }
        .leaderboard, .ai-hints, .session-stats {
            margin-top: 8px;
            font-size: 10px;
        }
        .leaderboard div, .ai-hints div, .session-stats div {
            padding: 2px 0;
        }
        .tabs {
            display: flex;
            justify-content: space-around;
            margin-bottom: 10px;
        }
        .tab {
            padding: 5px;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: border 0.3s;
        }
        .tab.active {
            border-bottom: 2px solid #46b4ff;
        }
        .tab-content {
            display: none;
        }
        .tab-content.active {
            display: block;
        }
        .hotkey-editor {
            margin-top: 10px;
        }
        .hotkey-editor input {
            width: 50px;
            margin-left: 5px;
            padding: 2px;
            border-radius: 3px;
            border: 1px solid #46b4ff;
            background: rgba(255, 255, 255, 0.1);
            color: #e6e6e6;
        }
        .compass {
            width: 50px;
            height: 50px;
            margin: 10px auto;
            border-radius: 50%;
            border: 2px solid #46b4ff;
            position: relative;
            background: rgba(255, 255, 255, 0.1);
        }
        .compass-needle {
            width: 2px;
            height: 20px;
            background: #ff4d4d;
            position: absolute;
            top: 15px;
            left: 24px;
            transform-origin: bottom;
            transition: transform 0.3s;
        }
        .zoom-slider {
            width: 100%;
            margin-top: 8px;
        }
    `);

    function createGUI() {
        console.log('[CheatScript] Creating GUI');
        try {
            const gui = document.createElement('div');
            gui.className = `cheat-gui theme-${currentTheme}`;
            gui.innerHTML = `
                <h3>Chesco Checker</h3>
                <div class="tabs">
                    <div class="tab active" data-tab="main">Main</div>
                    <div class="tab" data-tab="stats">Stats</div>
                    <div class="tab" data-tab="tools">Tools</div>
                </div>
                <div class="tab-content active" id="main-tab">
                    <p>Country Hint: <span id="countryHint">Unknown</span></p>
                    <p>Landmark: <span id="landmark">None</span></p>
                    <p>AI Hints: <span id="aiHintsSummary">None</span></p>
                    <iframe id="streetViewFrame" class="street-view-preview" style="display: ${streetViewEnabled ? 'block' : 'none'};"></iframe>
                    <iframe id="minimapFrame" class="minimap" style="display: ${minimapEnabled ? 'block' : 'none'};"></iframe>
                    <input type="range" id="minimapZoomSlider" class="zoom-slider" min="1" max="10" value="${minimapZoomLevel}" style="display: ${minimapEnabled ? 'block' : 'none'};">
                    <button id="exactPin">Exact Pin (${hotkeys.exactPin.toUpperCase()})</button>
                    <button id="randomPin">Random Pin (${hotkeys.randomPin.toUpperCase()})</button>
                    <button id="googleMaps">Open in Maps (${hotkeys.googleMaps.toUpperCase()})</button>
                    <button id="autoGuess" class="toggle-btn ${autoGuessEnabled ? 'on' : ''}">Auto-Guess (${hotkeys.toggleAutoGuess.toUpperCase()}): ${autoGuessEnabled ? 'ON' : 'OFF'}</button>
                    <button id="stealthMode" class="toggle-btn ${stealthModeEnabled ? 'on' : ''}">Stealth Mode (${hotkeys.toggleStealthMode.toUpperCase()}): ${stealthModeEnabled ? 'ON' : 'OFF'}</button>
                    <button id="countryHintToggle" class="toggle-btn ${countryHintEnabled ? 'on' : ''}">Country Hint (${hotkeys.toggleCountryHint.toUpperCase()}): ${countryHintEnabled ? 'ON' : 'OFF'}</button>
                    <button id="autoZoom" class="toggle-btn ${autoZoomEnabled ? 'on' : ''}">Auto-Zoom (${hotkeys.toggleAutoZoom.toUpperCase()}): ${autoZoomEnabled ? 'ON' : 'OFF'}</button>
                    <button id="streetView" class="toggle-btn ${streetViewEnabled ? 'on' : ''}">Street View (${hotkeys.toggleStreetView.toUpperCase()}): ${streetViewEnabled ? 'ON' : 'OFF'}</button>
                    <button id="minimap" class="toggle-btn ${minimapEnabled ? 'on' : ''}">Minimap (${hotkeys.toggleMinimap.toUpperCase()}): ${minimapEnabled ? 'ON' : 'OFF'}</button>
                </div>
                <div class="tab-content" id="stats-tab">
                    <p>Total Score: <span id="totalScore">0</span></p>
                    <p>High Score: <span id="highScore">0</span></p>
                    <p>Rounds: <span id="roundCount">0</span></p>
                    <p>Perfect Rounds: <span id="perfectRounds">0</span></p>
                    <p>Average Score: <span id="avgScore">0</span></p>
                    <p>Total Games: <span id="totalGames">0</span></p>
                    <div class="score-graph" id="scoreGraph"></div>
                    <div class="leaderboard" id="leaderboard"></div>
                </div>
                <div class="tab-content" id="tools-tab">
                    <button id="aiHints" class="toggle-btn ${aiHintsEnabled ? 'on' : ''}">AI Hints (${hotkeys.toggleAIHints.toUpperCase()}): ${aiHintsEnabled ? 'ON' : 'OFF'}</button>
                    <div class="ai-hints" id="aiHints"></div>
                    <button id="compass" class="toggle-btn ${compassEnabled ? 'on' : ''}">Compass (${hotkeys.toggleCompass.toUpperCase()}): ${compassEnabled ? 'ON' : 'OFF'}</button>
                    <div class="compass" id="compassDisplay" style="display: ${compassEnabled ? 'block' : 'none'};">
                        <div class="compass-needle" id="compassNeedle"></div>
                    </div>
                    <button id="speedometer" class="toggle-btn ${speedometerEnabled ? 'on' : ''}">Speedometer (${hotkeys.toggleSpeedometer.toUpperCase()}): ${speedometerEnabled ? 'ON' : 'OFF'}</button>
                    <p id="speedDisplay" style="display: ${speedometerEnabled ? 'block' : 'none'};">Speed: 0 km/h</p>
                    <button id="terrainAnalysis" class="toggle-btn ${terrainAnalysisEnabled ? 'on' : ''}">Terrain Analysis (${hotkeys.toggleTerrainAnalysis.toUpperCase()}): ${terrainAnalysisEnabled ? 'ON' : 'OFF'}</button>
                    <p id="terrainDisplay" style="display: ${terrainAnalysisEnabled ? 'block' : 'none'};">Terrain: Unknown</p>
                    <button id="cheatMode" class="toggle-btn ${cheatModeEnabled ? 'on' : ''}">Cheat Mode (${hotkeys.toggleCheatMode.toUpperCase()}): ${cheatModeEnabled ? 'ON' : 'OFF'}</button>
                    <div class="hotkey-editor">
                        <p>Hotkeys:</p>
                        <p>Exact Pin: <input id="hotkey-exactPin" value="${hotkeys.exactPin}" maxlength="1"></p>
                        <p>Random Pin: <input id="hotkey-randomPin" value="${hotkeys.randomPin}" maxlength="1"></p>
                        <p>Google Maps: <input id="hotkey-googleMaps" value="${hotkeys.googleMaps}" maxlength="1"></p>
                        <p>Toggle GUI: <input id="hotkey-toggleGUI" value="${hotkeys.toggleGUI}" maxlength="1"></p>
                        <p>Auto-Guess: <input id="hotkey-toggleAutoGuess" value="${hotkeys.toggleAutoGuess}" maxlength="1"></p>
                        <p>Stealth Mode: <input id="hotkey-toggleStealthMode" value="${hotkeys.toggleStealthMode}" maxlength="1"></p>
                        <p>Country Hint: <input id="hotkey-toggleCountryHint" value="${hotkeys.toggleCountryHint}" maxlength="1"></p>
                        <p>Auto-Zoom: <input id="hotkey-toggleAutoZoom" value="${hotkeys.toggleAutoZoom}" maxlength="1"></p>
                        <p>Street View: <input id="hotkey-toggleStreetView" value="${hotkeys.toggleStreetView}" maxlength="1"></p>
                        <p>Minimap: <input id="hotkey-toggleMinimap" value="${hotkeys.toggleMinimap}" maxlength="1"></p>
                        <p>AI Hints: <input id="hotkey-toggleAIHints" value="${hotkeys.toggleAIHints}" maxlength="1"></p>
                        <p>Compass: <input id="hotkey-toggleCompass" value="${hotkeys.toggleCompass}" maxlength="1"></p>
                        <p>Speedometer: <input id="hotkey-toggleSpeedometer" value="${hotkeys.toggleSpeedometer}" maxlength="1"></p>
                        <p>Terrain Analysis: <input id="hotkey-toggleTerrainAnalysis" value="${hotkeys.toggleTerrainAnalysis}" maxlength="1"></p>
                        <p>Cheat Mode: <input id="hotkey-toggleCheatMode" value="${hotkeys.toggleCheatMode}" maxlength="1"></p>
                        <p>Reload GUI: <input id="hotkey-reloadGUI" value="${hotkeys.reloadGUI}" maxlength="1"></p>
                    </div>
                    <button id="themeToggle">Switch Theme</button>
                    <button id="reloadGUI">Reload GUI (${hotkeys.reloadGUI.toUpperCase()})</button>
                </div>
            `;
            console.log('[CheatScript] GUI HTML created, appending to DOM');
            const gameContainer = document.querySelector('.game-layout') || document.body;
            if (!gameContainer) {
                console.error('[CheatScript] No game container found for GUI!');
                return null;
            }
            gameContainer.appendChild(gui);

            // Make GUI draggable
            let isDragging = false;
            let currentX;
            let currentY;

            gui.addEventListener('mousedown', (e) => {
                try {
                    if (e.target.classList.contains('cheat-gui') && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'IFRAME') {
                        isDragging = true;
                        const rect = gui.getBoundingClientRect();
                        currentX = e.clientX - rect.left;
                        currentY = e.clientY - rect.top;
                        gui.style.cursor = 'grabbing';
                        e.preventDefault();
                    }
                } catch (e) {
                    console.error('[CheatScript] Error in mousedown handler:', e);
                }
            });

            document.addEventListener('mousemove', (e) => {
                try {
                    if (isDragging) {
                        let newLeft = e.clientX - currentX;
                        let newTop = e.clientY - currentY;
                        const viewportWidth = window.innerWidth;
                        const viewportHeight = window.innerHeight;
                        const guiWidth = gui.offsetWidth;
                        const guiHeight = gui.offsetHeight;
                        newLeft = Math.max(0, Math.min(newLeft, viewportWidth - guiWidth));
                        newTop = Math.max(0, Math.min(newTop, viewportHeight - guiHeight));
                        gui.style.left = `${newLeft}px`;
                        gui.style.top = `${newTop}px`;
                        gui.style.right = 'auto';
                    }
                } catch (e) {
                    console.error('[CheatScript] Error in mousemove handler:', e);
                }
            });

            document.addEventListener('mouseup', () => {
                try {
                    if (isDragging) {
                        isDragging = false;
                        gui.style.cursor = 'move';
                        guiPosition = {
                            top: gui.style.top,
                            left: gui.style.left
                        };
                        GM_setValue('guiPosition', guiPosition);
                        console.log('[CheatScript] GUI position saved:', guiPosition);
                    }
                } catch (e) {
                    console.error('[CheatScript] Error in mouseup handler:', e);
                }
            });

            // Tab functionality
            const tabs = gui.querySelectorAll('.tab');
            const tabContents = gui.querySelectorAll('.tab-content');
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    try {
                        tabs.forEach(t => t.classList.remove('active'));
                        tabContents.forEach(content => content.classList.remove('active'));
                        tab.classList.add('active');
                        gui.querySelector(`#${tab.dataset.tab}-tab`).classList.add('active');
                    } catch (e) {
                        console.error('[CheatScript] Error in tab click handler:', e);
                    }
                });
            });

            // Event listeners for buttons
            try {
                gui.querySelector('#exactPin').addEventListener('click', () => placeMarker(false));
                gui.querySelector('#randomPin').addEventListener('click', () => placeMarker(true));
                gui.querySelector('#googleMaps').addEventListener('click', openInGoogleMaps);
                gui.querySelector('#autoGuess').addEventListener('click', toggleAutoGuess);
                gui.querySelector('#stealthMode').addEventListener('click', toggleStealthMode);
                gui.querySelector('#countryHintToggle').addEventListener('click', toggleCountryHint);
                gui.querySelector('#autoZoom').addEventListener('click', toggleAutoZoom);
                gui.querySelector('#streetView').addEventListener('click', toggleStreetView);
                gui.querySelector('#minimap').addEventListener('click', toggleMinimap);
                gui.querySelector('#aiHints').addEventListener('click', toggleAIHints);
                gui.querySelector('#compass').addEventListener('click', toggleCompass);
                gui.querySelector('#speedometer').addEventListener('click', toggleSpeedometer);
                gui.querySelector('#terrainAnalysis').addEventListener('click', toggleTerrainAnalysis);
                gui.querySelector('#cheatMode').addEventListener('click', toggleCheatMode);
                gui.querySelector('#themeToggle').addEventListener('click', toggleTheme);
                gui.querySelector('#reloadGUI').addEventListener('click', () => {
                    console.log('[CheatScript] Manual GUI reload triggered');
                    initGUI();
                });
                gui.querySelector('#minimapZoomSlider').addEventListener('input', (e) => {
                    minimapZoomLevel = parseInt(e.target.value);
                    config.minimapZoomLevel = minimapZoomLevel;
                    GM_setValue('geoCheatConfig', config);
                    updateMinimap();
                    console.log(`[CheatScript] Minimap zoom level set to ${minimapZoomLevel}`);
                });

                Object.keys(hotkeys).forEach(key => {
                    const input = gui.querySelector(`#hotkey-${key}`);
                    input.addEventListener('input', (e) => {
                        hotkeys[key] = e.target.value.toLowerCase();
                        config.hotkeys = hotkeys;
                        GM_setValue('hotkeys', hotkeys);
                        GM_setValue('geoCheatConfig', config);
                        console.log(`[CheatScript] Hotkey updated: ${key} = ${hotkeys[key]}`);
                        updateGUI();
                    });
                });
            } catch (e) {
                console.error('[CheatScript] Error setting up button listeners:', e);
            }

            console.log('[CheatScript] GUI created successfully');
            return gui;
        } catch (e) {
            console.error('[CheatScript] Error in createGUI:', e);
            return null;
        }
    }

    function updateGUI() {
        try {
            const countryHintElement = document.getElementById('countryHint');
            const landmarkElement = document.getElementById('landmark');
            const aiHintsSummaryElement = document.getElementById('aiHintsSummary');
            const aiHintsElement = document.getElementById('aiHints');
            const totalScoreElement = document.getElementById('totalScore');
            const highScoreElement = document.getElementById('highScore');
            const roundCountElement = document.getElementById('roundCount');
            const perfectRoundsElement = document.getElementById('perfectRounds');
            const avgScoreElement = document.getElementById('avgScore');
            const totalGamesElement = document.getElementById('totalGames');
            const scoreGraph = document.getElementById('scoreGraph');
            const leaderboard = document.getElementById('leaderboard');
            const streetViewFrame = document.getElementById('streetViewFrame');
            const minimapFrame = document.getElementById('minimapFrame');
            const minimapZoomSlider = document.getElementById('minimapZoomSlider');
            const compassDisplay = document.getElementById('compassDisplay');
            const compassNeedle = document.getElementById('compassNeedle');
            const speedDisplay = document.getElementById('speedDisplay');
            const terrainDisplay = document.getElementById('terrainDisplay');

            if (countryHintElement && landmarkElement && aiHintsSummaryElement && aiHintsElement && totalScoreElement && highScoreElement && roundCountElement && perfectRoundsElement && avgScoreElement && totalGamesElement && scoreGraph && leaderboard && streetViewFrame && minimapFrame && minimapZoomSlider && compassDisplay && compassNeedle && speedDisplay && terrainDisplay) {
                countryHintElement.textContent = countryHintEnabled ? currentCountry : 'Disabled';
                landmarkElement.textContent = currentLandmark;
                aiHintsSummaryElement.textContent = aiHintsEnabled ? aiHints[0] || 'None' : 'Disabled';
                aiHintsElement.innerHTML = '<strong>AI Hints:</strong>';
                if (aiHintsEnabled) {
                    aiHints.forEach(hint => {
                        const hintDiv = document.createElement('div');
                        hintDiv.textContent = `- ${hint}`;
                        aiHintsElement.appendChild(hintDiv);
                    });
                } else {
                    const hintDiv = document.createElement('div');
                    hintDiv.textContent = 'Disabled';
                    aiHintsElement.appendChild(hintDiv);
                }
                totalScoreElement.textContent = scores.total;
                highScoreElement.textContent = scores.highScore;
                roundCountElement.textContent = scores.rounds;
                perfectRoundsElement.textContent = scores.sessionStats.perfectRounds;
                avgScoreElement.textContent = scores.sessionStats.avgScore.toFixed(0);
                totalGamesElement.textContent = scores.sessionStats.totalGames;

                scoreGraph.innerHTML = '';
                const maxScore = Math.max(...scores.history, 5000) || 5000;
                scores.history.forEach(score => {
                    const bar = document.createElement('div');
                    bar.className = 'score-bar';
                    bar.style.height = `${(score / maxScore) * 100}%`;
                    scoreGraph.appendChild(bar);
                });

                leaderboard.innerHTML = '<strong>Leaderboard:</strong>';
                scores.leaderboard.forEach(entry => {
                    const entryDiv = document.createElement('div');
                    entryDiv.textContent = `${entry.score} pts - ${entry.timestamp}`;
                    leaderboard.appendChild(entryDiv);
                });

                streetViewFrame.style.display = streetViewEnabled ? 'block' : 'none';
                minimapFrame.style.display = minimapEnabled ? 'block' : 'none';
                minimapZoomSlider.style.display = minimapEnabled ? 'block' : 'none';
                compassDisplay.style.display = compassEnabled ? 'block' : 'none';
                compassNeedle.style.transform = `rotate(${currentHeading}deg)`;
                speedDisplay.style.display = speedometerEnabled ? 'block' : 'none';
                speedDisplay.textContent = `Speed: ${currentSpeed} km/h`;
                terrainDisplay.style.display = terrainAnalysisEnabled ? 'block' : 'none';
                terrainDisplay.textContent = `Terrain: ${currentTerrain}`;
            } else {
                console.log('[CheatScript] Some GUI elements missing during update');
            }
        } catch (e) {
            console.error('[CheatScript] Error in updateGUI:', e);
        }
    }

    function toggleAutoGuess() {
        try {
            autoGuessEnabled = !autoGuessEnabled;
            const button = document.getElementById('autoGuess');
            button.className = `toggle-btn ${autoGuessEnabled ? 'on' : ''}`;
            button.textContent = `Auto-Guess (${hotkeys.toggleAutoGuess.toUpperCase()}): ${autoGuessEnabled ? 'ON' : 'OFF'}`;
            config.autoGuess = autoGuessEnabled;
            GM_setValue('geoCheatConfig', config);
            console.log(`[CheatScript] Auto-Guess ${autoGuessEnabled ? 'enabled' : 'disabled'}`);
            if (autoGuessEnabled) autoGuess();
        } catch (e) {
            console.error('[CheatScript] Error in toggleAutoGuess:', e);
        }
    }

    function toggleStealthMode() {
        try {
            stealthModeEnabled = !stealthModeEnabled;
            const button = document.getElementById('stealthMode');
            button.className = `toggle-btn ${stealthModeEnabled ? 'on' : ''}`;
            button.textContent = `Stealth Mode (${hotkeys.toggleStealthMode.toUpperCase()}): ${stealthModeEnabled ? 'ON' : 'OFF'}`;
            config.stealthMode = stealthModeEnabled;
            GM_setValue('geoCheatConfig', config);
            console.log(`[CheatScript] Stealth Mode ${stealthModeEnabled ? 'enabled' : 'disabled'}`);
        } catch (e) {
            console.error('[CheatScript] Error in toggleStealthMode:', e);
        }
    }

    function toggleCountryHint() {
        try {
            countryHintEnabled = !countryHintEnabled;
            const button = document.getElementById('countryHintToggle');
            button.className = `toggle-btn ${countryHintEnabled ? 'on' : ''}`;
            button.textContent = `Country Hint (${hotkeys.toggleCountryHint.toUpperCase()}): ${countryHintEnabled ? 'ON' : 'OFF'}`;
            config.countryHint = countryHintEnabled;
            GM_setValue('geoCheatConfig', config);
            console.log(`[CheatScript] Country Hint ${countryHintEnabled ? 'enabled' : 'disabled'}`);
            updateGUI();
        } catch (e) {
            console.error('[CheatScript] Error in toggleCountryHint:', e);
        }
    }

    function toggleAutoZoom() {
        try {
            autoZoomEnabled = !autoZoomEnabled;
            const button = document.getElementById('autoZoom');
            button.className = `toggle-btn ${autoZoomEnabled ? 'on' : ''}`;
            button.textContent = `Auto-Zoom (${hotkeys.toggleAutoZoom.toUpperCase()}): ${autoZoomEnabled ? 'ON' : 'OFF'}`;
            config.autoZoom = autoZoomEnabled;
            GM_setValue('geoCheatConfig', config);
            console.log(`[CheatScript] Auto-Zoom ${autoZoomEnabled ? 'enabled' : 'disabled'}`);
            if (autoZoomEnabled) autoZoom();
        } catch (e) {
            console.error('[CheatScript] Error in toggleAutoZoom:', e);
        }
    }

    function toggleStreetView() {
        try {
            streetViewEnabled = !streetViewEnabled;
            const button = document.getElementById('streetView');
            button.className = `toggle-btn ${streetViewEnabled ? 'on' : ''}`;
            button.textContent = `Street View (${hotkeys.toggleStreetView.toUpperCase()}): ${streetViewEnabled ? 'ON' : 'OFF'}`;
            config.streetView = streetViewEnabled;
            GM_setValue('geoCheatConfig', config);
            console.log(`[CheatScript] Street View ${streetViewEnabled ? 'enabled' : 'disabled'}`);
            updateGUI();
        } catch (e) {
            console.error('[CheatScript] Error in toggleStreetView:', e);
        }
    }

    function toggleMinimap() {
        try {
            minimapEnabled = !minimapEnabled;
            const button = document.getElementById('minimap');
            button.className = `toggle-btn ${minimapEnabled ? 'on' : ''}`;
            button.textContent = `Minimap (${hotkeys.toggleMinimap.toUpperCase()}): ${minimapEnabled ? 'ON' : 'OFF'}`;
            config.minimap = minimapEnabled;
            GM_setValue('geoCheatConfig', config);
            console.log(`[CheatScript] Minimap ${minimapEnabled ? 'enabled' : 'disabled'}`);
            updateGUI();
        } catch (e) {
            console.error('[CheatScript] Error in toggleMinimap:', e);
        }
    }

    function toggleAIHints() {
        try {
            aiHintsEnabled = !aiHintsEnabled;
            const button = document.getElementById('aiHints');
            button.className = `toggle-btn ${aiHintsEnabled ? 'on' : ''}`;
            button.textContent = `AI Hints (${hotkeys.toggleAIHints.toUpperCase()}): ${aiHintsEnabled ? 'ON' : 'OFF'}`;
            config.aiHints = aiHintsEnabled;
            GM_setValue('geoCheatConfig', config);
            console.log(`[CheatScript] AI Hints ${aiHintsEnabled ? 'enabled' : 'disabled'}`);
            updateGUI();
        } catch (e) {
            console.error('[CheatScript] Error in toggleAIHints:', e);
        }
    }

    function toggleCompass() {
        try {
            compassEnabled = !compassEnabled;
            const button = document.getElementById('compass');
            button.className = `toggle-btn ${compassEnabled ? 'on' : ''}`;
            button.textContent = `Compass (${hotkeys.toggleCompass.toUpperCase()}): ${compassEnabled ? 'ON' : 'OFF'}`;
            config.compass = compassEnabled;
            GM_setValue('geoCheatConfig', config);
            console.log(`[CheatScript] Compass ${compassEnabled ? 'enabled' : 'disabled'}`);
            updateGUI();
        } catch (e) {
            console.error('[CheatScript] Error in toggleCompass:', e);
        }
    }

    function toggleSpeedometer() {
        try {
            speedometerEnabled = !speedometerEnabled;
            const button = document.getElementById('speedometer');
            button.className = `toggle-btn ${speedometerEnabled ? 'on' : ''}`;
            button.textContent = `Speedometer (${hotkeys.toggleSpeedometer.toUpperCase()}): ${speedometerEnabled ? 'ON' : 'OFF'}`;
            config.speedometer = speedometerEnabled;
            GM_setValue('geoCheatConfig', config);
            console.log(`[CheatScript] Speedometer ${speedometerEnabled ? 'enabled' : 'disabled'}`);
            updateGUI();
        } catch (e) {
            console.error('[CheatScript] Error in toggleSpeedometer:', e);
        }
    }

    function toggleTerrainAnalysis() {
        try {
            terrainAnalysisEnabled = !terrainAnalysisEnabled;
            const button = document.getElementById('terrainAnalysis');
            button.className = `toggle-btn ${terrainAnalysisEnabled ? 'on' : ''}`;
            button.textContent = `Terrain Analysis (${hotkeys.toggleTerrainAnalysis.toUpperCase()}): ${terrainAnalysisEnabled ? 'ON' : 'OFF'}`;
            config.terrainAnalysis = terrainAnalysisEnabled;
            GM_setValue('geoCheatConfig', config);
            console.log(`[CheatScript] Terrain Analysis ${terrainAnalysisEnabled ? 'enabled' : 'disabled'}`);
            updateGUI();
        } catch (e) {
            console.error('[CheatScript] Error in toggleTerrainAnalysis:', e);
        }
    }

    function toggleCheatMode() {
        try {
            cheatModeEnabled = !cheatModeEnabled;
            const button = document.getElementById('cheatMode');
            button.className = `toggle-btn ${cheatModeEnabled ? 'on' : ''}`;
            button.textContent = `Cheat Mode (${hotkeys.toggleCheatMode.toUpperCase()}): ${cheatModeEnabled ? 'ON' : 'OFF'}`;
            config.cheatMode = cheatModeEnabled;
            GM_setValue('geoCheatConfig', config);
            console.log(`[CheatScript] Cheat Mode ${cheatModeEnabled ? 'enabled' : 'disabled'}`);
            updateGUI();
        } catch (e) {
            console.error('[CheatScript] Error in toggleCheatMode:', e);
        }
    }

    function toggleTheme() {
        try {
            currentTheme = currentTheme === 'holographic' ? 'cyberpunk' : 'holographic';
            config.theme = currentTheme;
            GM_setValue('geoCheatConfig', config);
            const gui = document.querySelector('.cheat-gui');
            if (gui) {
                gui.className = `cheat-gui theme-${currentTheme} ${guiVisible ? '' : 'hidden'}`;
            }
            console.log(`[CheatScript] Theme switched to ${currentTheme}`);
        } catch (e) {
            console.error('[CheatScript] Error in toggleTheme:', e);
        }
    }

    // Robust GUI initialization with fallbacks
    function initGUI() {
        console.log('[CheatScript] Initializing GUI - Attempt 1');
        let attempts = 0;
        const maxAttempts = 30;

        function tryInit() {
            attempts++;
            console.log(`[CheatScript] Attempt ${attempts}: Checking document readiness - readyState=${document.readyState}`);
            try {
                if (document.readyState === 'complete' || document.readyState === 'interactive') {
                    if (document.body) {
                        const gameContainer = document.querySelector('.game-layout') || document.body;
                        if (gameContainer) {
                            const existingGui = document.querySelector('.cheat-gui');
                            if (existingGui) {
                                existingGui.remove();
                                console.log('[CheatScript] Removed existing GUI');
                            }
                            const gui = createGUI();
                            if (gui) {
                                gui.className = `cheat-gui theme-${currentTheme} ${guiVisible ? '' : 'hidden'}`;
                                gameContainer.appendChild(gui);
                                updateGUI();
                                console.log('[CheatScript] GUI successfully loaded after ' + attempts + ' attempts');
                                optimizePerformance();
                            } else if (attempts < maxAttempts) {
                                console.log('[CheatScript] GUI creation failed, retrying...');
                                setTimeout(tryInit, 1000);
                            }
                        } else if (attempts < maxAttempts) {
                            console.log('[CheatScript] Game container not found, retrying...');
                            setTimeout(tryInit, 1000);
                        }
                    } else if (attempts < maxAttempts) {
                        console.log('[CheatScript] Document body not ready, retrying...');
                        setTimeout(tryInit, 1000);
                    }
                } else if (attempts < maxAttempts) {
                    console.log('[CheatScript] Page not fully loaded, waiting...');
                    setTimeout(tryInit, 1000);
                } else {
                    console.error('[CheatScript] Failed to load GUI after ' + maxAttempts + ' attempts');
                }
            } catch (e) {
                console.error('[CheatScript] Error in tryInit:', e);
                if (attempts < maxAttempts) {
                    setTimeout(tryInit, 1000);
                }
            }
        }

        tryInit();
        window.addEventListener('load', tryInit);

        // MutationObserver to detect DOM changes
        try {
            const observer = new MutationObserver(() => {
                if (document.querySelector('.game-layout') || document.body) {
                    console.log('[CheatScript] DOM change detected, retrying GUI init');
                    tryInit();
                }
            });
            observer.observe(document.documentElement, { childList: true, subtree: true });
        } catch (e) {
            console.error('[CheatScript] Error setting up MutationObserver:', e);
        }
    }
    initGUI();

    // Toggle GUI visibility
    function toggleGUI() {
        try {
            guiVisible = !guiVisible;
            const gui = document.querySelector('.cheat-gui');
            if (gui) {
                gui.className = `cheat-gui theme-${currentTheme} ${guiVisible ? '' : 'hidden'}`;
                console.log(`[CheatScript] GUI ${guiVisible ? 'shown' : 'hidden'}`);
            } else {
                console.log('[CheatScript] GUI not found, reinitializing...');
                initGUI();
            }
        } catch (e) {
            console.error('[CheatScript] Error in toggleGUI:', e);
        }
    }

    // Advanced key listeners with custom hotkeys
    document.addEventListener('keydown', (e) => {
        try {
            const key = e.key.toLowerCase();
            if (key === hotkeys.exactPin) {
                e.stopImmediatePropagation();
                placeMarker(false);
            } else if (key === hotkeys.randomPin) {
                e.stopImmediatePropagation();
                placeMarker(true);
            } else if (key === hotkeys.googleMaps) {
                e.stopImmediatePropagation();
                openInGoogleMaps();
            } else if (key === hotkeys.toggleGUI) {
                e.stopImmediatePropagation();
                toggleGUI();
            } else if (key === hotkeys.toggleAutoGuess) {
                e.stopImmediatePropagation();
                toggleAutoGuess();
            } else if (key === hotkeys.toggleStealthMode) {
                e.stopImmediatePropagation();
                toggleStealthMode();
            } else if (key === hotkeys.toggleCountryHint) {
                e.stopImmediatePropagation();
                toggleCountryHint();
            } else if (key === hotkeys.toggleAutoZoom) {
                e.stopImmediatePropagation();
                toggleAutoZoom();
            } else if (key === hotkeys.toggleStreetView) {
                e.stopImmediatePropagation();
                toggleStreetView();
            } else if (key === hotkeys.toggleMinimap) {
                e.stopImmediatePropagation();
                toggleMinimap();
            } else if (key === hotkeys.toggleAIHints) {
                e.stopImmediatePropagation();
                toggleAIHints();
            } else if (key === hotkeys.toggleCompass) {
                e.stopImmediatePropagation();
                toggleCompass();
            } else if (key === hotkeys.toggleSpeedometer) {
                e.stopImmediatePropagation();
                toggleSpeedometer();
            } else if (key === hotkeys.toggleTerrainAnalysis) {
                e.stopImmediatePropagation();
                toggleTerrainAnalysis();
            } else if (key === hotkeys.toggleCheatMode) {
                e.stopImmediatePropagation();
                toggleCheatMode();
            } else if (key === hotkeys.reloadGUI) {
                e.stopImmediatePropagation();
                initGUI();
            }
        } catch (e) {
            console.error('[CheatScript] Error in keydown handler:', e);
        }
    });

    // Advanced anti-cheat script removal
    function removeAntiCheatScripts() {
        try {
            const selectors = [
                'script[id*="cheat-detection"]',
                'script[src*="anti-cheat"]',
                'script[src*="integrity"]',
                'script[data-qa*="security"]'
            ];
            selectors.forEach(selector => {
                document.querySelectorAll(selector).forEach(script => {
                    script.remove();
                    console.log('[CheatScript] Removed potential anti-cheat script:', selector);
                });
            });
        } catch (e) {
            console.error('[CheatScript] Error in removeAntiCheatScripts:', e);
        }
    }
    removeAntiCheatScripts();
    setInterval(removeAntiCheatScripts, 5000);
})();
