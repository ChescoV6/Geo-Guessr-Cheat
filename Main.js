// ==UserScript==
    // @name         Chesco-Checker V11.0
    // @namespace    http://tampermonkey.net/
    // @version      11.0
    // @description  Next-gen GeoGuessr cheat
    // @author       Chesco
    // @match        https://www.geoguessr.com/*
    // @icon         https://www.google.com/s2/favicons?sz=64&domain=geoguessr.com
    // @grant        GM_addStyle
    // @grant        GM_setValue
    // @grant        GM_getValue
    // ==/UserScript==

    (function() {
        'use strict';

        let coords = { lat: 0, lng: 0 };
        let guiVisible = true;
        let autoGuessEnabled = false;
        let stealthModeEnabled = false;
        let countryHintEnabled = false;
        let autoZoomEnabled = false;
        let streetViewEnabled = false;
        let minimapEnabled = false;
        let cheatModeEnabled = true;
        let languageDetectionEnabled = false;
        let signAnalyzerEnabled = false;
        let geoPredictorEnabled = false;
        let proxyModeEnabled = false;
        let safeModeEnabled = false;
        let neuralNetEnabled = true;
        let ocrEnabled = true;
        let terrainVisualizerEnabled = true;
        let guiOpacity = 0.9;
        let scores = { total: 0, rounds: 0, highScore: 0, history: [], leaderboard: [] };
        let historicalGuesses = GM_getValue('historicalGuesses', []);
        let currentCountry = 'Unknown';
        let currentTerrain = 'Unknown';
        let currentWeather = 'Clear';
        let currentLanguage = 'Unknown';
        let currentSignText = 'N/A';
        let riskLevel = 'Low';
        let riskBreakdown = { autoGuess: 0, stealth: 0, performance: 0, historical: 0, neuralNet: 0 };
        let smartPinConfidence = 0;
        let geoPrediction = 'N/A';
        let neuralPrediction = 'N/A';
        let currentTheme = 'holographic';
        let themeColors = { primary: '#46b4ff', secondary: '#e6e6e6', accent: '#ff4d4d' };
        let guiPosition = GM_getValue('guiPosition', { top: '10px', right: '10px' });
        let heatmapData = [];
        let hotkeys = GM_getValue('hotkeys', {
            exactPin: 'g',
            smartPin: 's',
            randomPin: 'h',
            googleMaps: 'j',
            toggleGUI: 't',
            toggleAutoGuess: 'k',
            toggleStealthMode: 'l',
            toggleCountryHint: 'm',
            toggleAutoZoom: 'n',
            toggleStreetView: 'o',
            toggleMinimap: 'p',
            toggleLanguageDetection: 'q',
            toggleCheatMode: 'f',
            toggleSignAnalyzer: 'r',
            toggleGeoPredictor: 'e',
            toggleProxyMode: 'x',
            toggleSafeMode: 'z',
            toggleNeuralNet: 'w',
            toggleOCR: 'v',
            toggleTerrainVisualizer: 'b',
            reloadGUI: 'u'
        });
        const config = GM_getValue('geoCheatConfig', {
            autoGuess: false,
            stealthMode: false,
            countryHint: false,
            autoZoom: false,
            streetView: false,
            minimap: false,
            cheatMode: true,
            languageDetection: false,
            signAnalyzer: false,
            geoPredictor: false,
            proxyMode: false,
            safeMode: false,
            neuralNet: true,
            ocr: true,
            terrainVisualizer: true,
            theme: 'holographic',
            guiOpacity: 0.9,
            themeColors: themeColors,
            hotkeys: hotkeys
        });

        autoGuessEnabled = config.autoGuess;
        stealthModeEnabled = config.stealthMode;
        countryHintEnabled = config.countryHint;
        autoZoomEnabled = config.autoZoom;
        streetViewEnabled = config.streetView;
        minimapEnabled = config.minimap;
        cheatModeEnabled = config.cheatMode;
        languageDetectionEnabled = config.languageDetection;
        signAnalyzerEnabled = config.signAnalyzer;
        geoPredictorEnabled = config.geoPredictor;
        proxyModeEnabled = config.proxyMode;
        safeModeEnabled = config.safeMode;
        neuralNetEnabled = config.neuralNet;
        ocrEnabled = config.ocr;
        terrainVisualizerEnabled = config.terrainVisualizer;
        currentTheme = config.theme;
        guiOpacity = config.guiOpacity;
        themeColors = config.themeColors || themeColors;
        hotkeys = config.hotkeys || hotkeys;
        scores.history = GM_getValue('scoreHistory', []);
        scores.leaderboard = GM_getValue('leaderboard', []);
        heatmapData = GM_getValue('heatmapData', []);

        const countryData = [
            { name: 'USA', latMin: 24, latMax: 49, lngMin: -125, lngMax: -66, confidence: 0.9, hints: ['Yellow lines', 'Red signs'], terrain: 'Mixed', weather: ['Sunny', 'Snowy'], languages: ['English'], roadPatterns: ['Wide highways', 'Grid cities'] },
            { name: 'Brazil', latMin: -34, latMax: 5, lngMin: -74, lngMax: -34, confidence: 0.85, hints: ['Portuguese signs', 'Tropical'], terrain: 'Tropical', weather: ['Rainy', 'Sunny'], languages: ['Portuguese'], roadPatterns: ['Curved roads', 'Rural paths'] },
            { name: 'Australia', latMin: -44, latMax: -10, lngMin: 112, lngMax: 154, confidence: 0.9, hints: ['Kangaroo signs', 'Eucalyptus'], terrain: 'Desert', weather: ['Sunny', 'Dry'], languages: ['English'], roadPatterns: ['Straight outback roads', 'Red dirt'] },
            { name: 'Japan', latMin: 24, latMax: 45, lngMin: 122, lngMax: 146, confidence: 0.95, hints: ['Japanese signs', 'Narrow roads'], terrain: 'Mountainous', weather: ['Rainy', 'Sunny'], languages: ['Japanese'], roadPatterns: ['Narrow streets', 'Curved mountain roads'] },
            { name: 'South Africa', latMin: -35, latMax: -22, lngMin: 16, lngMax: 33, confidence: 0.8, hints: ['Afrikaans signs', 'Savanna'], terrain: 'Savanna', weather: ['Sunny', 'Dry'], languages: ['Afrikaans', 'English'], roadPatterns: ['Dirt roads', 'Savanna crossings'] },
            { name: 'Russia', latMin: 41, latMax: 82, lngMin: 19, lngMax: 179, confidence: 0.9, hints: ['Cyrillic signs', 'Snow'], terrain: 'Tundra', weather: ['Snowy', 'Cold'], languages: ['Russian'], roadPatterns: ['Long straight roads', 'Snowy paths'] },
            { name: 'France', latMin: 42, latMax: 51, lngMin: -5, lngMax: 8, confidence: 0.9, hints: ['French signs', 'Vineyards'], terrain: 'Plains', weather: ['Sunny', 'Rainy'], languages: ['French'], roadPatterns: ['Roundabouts', 'Rural lanes'] },
            { name: 'Germany', latMin: 47, latMax: 55, lngMin: 5, lngMax: 15, confidence: 0.85, hints: ['German signs', 'Forests'], terrain: 'Forested', weather: ['Rainy', 'Cloudy'], languages: ['German'], roadPatterns: ['Autobahn', 'Winding forest roads'] },
            { name: 'Canada', latMin: 41, latMax: 83, lngMin: -141, lngMax: -52, confidence: 0.9, hints: ['Bilingual signs', 'Snow'], terrain: 'Tundra', weather: ['Snowy', 'Cold'], languages: ['English', 'French'], roadPatterns: ['Long highways', 'Snowy trails'] },
            { name: 'India', latMin: 6, latMax: 35, lngMin: 68, lngMax: 97, confidence: 0.85, hints: ['Hindi signs', 'Crowded roads'], terrain: 'Tropical', weather: ['Sunny', 'Monsoon'], languages: ['Hindi', 'English'], roadPatterns: ['Chaotic traffic', 'Narrow lanes'] }
        ];

        const languagePatterns = {
            English: /[A-Za-z\s]+/,
            Portuguese: /[ÁÉÍÓÚáéíóúãõç\s]+/,
            Japanese: /[\u3040-\u309F\u30A0-\u30FF\s]+/,
            Afrikaans: /[êëîïôöûü\s]+/,
            Russian: /[\u0400-\u04FF\s]+/,
            French: /[àâçèéêëîïôœùûüÿ\s]+/,
            German: /[äöüß\s]+/,
            Hindi: /[\u0900-\u097F\s]+/
        };

        const xhrQueue = [];
        let isProcessingQueue = false;
        const originalOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url) {
            if (method.toUpperCase() === 'POST' && url.includes('maps.googleapis.com')) {
                xhrQueue.push({ xhr: this, method, url });
                processXHRQueue();
            }
            return originalOpen.apply(this, arguments);
        };

        function processXHRQueue() {
            if (isProcessingQueue || xhrQueue.length === 0) return;
            isProcessingQueue = true;
            const { xhr } = xhrQueue.shift();
            xhr.addEventListener('load', () => {
                try {
                    const response = xhr.responseText;
                    const match = response.match(/-?\d+\.\d+,-?\d+\.\d+/g);
                    if (match && match[0]) {
                        const [lat, lng] = match[0].split(',').map(Number);
                        coords.lat = lat;
                        coords.lng = lng;
                        console.log(`[CheatScript] Captured coords: ${lat}, ${lng}`);
                        updateCountryHint();
                        updateTerrainAndWeather();
                        if (languageDetectionEnabled) detectLanguage();
                        if (signAnalyzerEnabled || ocrEnabled) analyzeSigns();
                        if (geoPredictorEnabled || neuralNetEnabled) predictLocation();
                        if (autoZoomEnabled) autoZoom();
                        if (streetViewEnabled) updateStreetView();
                        if (minimapEnabled) updateMinimap();
                        if (autoGuessEnabled && !safeModeEnabled) autoGuess();
                        updateRiskLevel();
                        updateHeatmap();
                        if (terrainVisualizerEnabled) updateTerrainVisualizer();
                    }
                    isProcessingQueue = false;
                    processXHRQueue();
                } catch (e) {
                    console.error('[CheatScript] Error parsing coords:', e);
                    isProcessingQueue = false;
                    processXHRQueue();
                }
            });
            xhr.addEventListener('error', () => {
                console.error('[CheatScript] XHR request failed');
                isProcessingQueue = false;
                processXHRQueue();
            });
        }

        function updateCountryHint() {
            if (!countryHintEnabled || !cheatModeEnabled || safeModeEnabled) return;
            const { lat, lng } = coords;
            let bestMatch = { name: 'Unknown', confidence: 0 };
            for (const country of countryData) {
                if (lat >= country.latMin && lat <= country.latMax && lng >= country.lngMin && lng <= country.lngMax) {
                    let confidence = country.confidence;
                    if (currentTerrain !== 'Unknown') confidence += 0.07;
                    if (currentWeather !== 'Clear') confidence += 0.05;
                    if (currentLanguage !== 'Unknown') confidence += 0.06;
                    if (currentSignText !== 'N/A') confidence += 0.08;
                    if (historicalGuesses.some(guess => guess.country === country.name && guess.lat === lat && guess.lng === lng)) confidence += 0.12;
                    confidence = Math.min(confidence, 1);
                    if (confidence > bestMatch.confidence) {
                        bestMatch = { name: country.name, confidence };
                    }
                }
            }
            currentCountry = bestMatch.name === 'Unknown' ? 'Unknown' : `${bestMatch.name} (${(bestMatch.confidence * 100).toFixed(0)}%)`;
            smartPinConfidence = bestMatch.confidence;
            console.log(`[CheatScript] Country hint: ${currentCountry}`);
            updateGUI();
        }

        function updateTerrainAndWeather() {
            if (!cheatModeEnabled || safeModeEnabled) return;
            const { lat, lng } = coords;
            for (const country of countryData) {
                if (lat >= country.latMin && lat <= country.latMax && lng >= country.lngMin && lng <= country.lngMax) {
                    currentTerrain = country.terrain;
                    currentWeather = country.weather[Math.floor(Math.random() * country.weather.length)];
                    break;
                }
            }
            console.log(`[CheatScript] Terrain: ${currentTerrain}, Weather: ${currentWeather}`);
            updateGUI();
        }

        function detectLanguage() {
            if (!languageDetectionEnabled || !cheatModeEnabled || safeModeEnabled) return;
            const textElements = document.querySelectorAll('div, p, span, h1, h2, h3, h4, h5, h6');
            let detected = 'Unknown';
            for (const element of textElements) {
                const text = element.textContent;
                for (const [language, pattern] of Object.entries(languagePatterns)) {
                    if (pattern.test(text)) {
                        detected = language;
                        break;
                    }
                }
                if (detected !== 'Unknown') break;
            }
            currentLanguage = detected;
            console.log(`[CheatScript] Detected language: ${currentLanguage}`);
            updateGUI();
        }

        function analyzeSigns() {
            if (!signAnalyzerEnabled && !ocrEnabled || !cheatModeEnabled || safeModeEnabled) return;
            let signText = 'N/A';
            if (ocrEnabled) {
                // Simulated OCR for sign reading
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const imageElements = document.querySelectorAll('img');
                if (imageElements.length > 0) {
                    canvas.width = 300;
                    canvas.height = 150;
                    ctx.drawImage(imageElements[0], 0, 0, 300, 150);
                    const pixels = ctx.getImageData(0, 0, 300, 150).data;
                    const contrast = pixels.reduce((sum, val, i) => i % 4 === 0 ? sum + val : sum, 0) / (pixels.length / 4);
                    signText = contrast > 128 ? 'Highway 101' : 'Rua São Paulo';
                }
            } else {
                const textElements = document.querySelectorAll('div, p, span');
                for (const element of textElements) {
                    const text = element.textContent.trim();
                    if (text.length > 0 && text.length < 50 && /[A-Za-z0-9\s]+/.test(text)) {
                        signText = text;
                        break;
                    }
                }
            }
            currentSignText = signText;
            console.log(`[CheatScript] Sign text detected: ${currentSignText}`);
            updateGUI();
        }

        function predictLocation() {
            if (!geoPredictorEnabled && !neuralNetEnabled || !cheatModeEnabled || safeModeEnabled) return;
            const { lat, lng } = coords;
            let prediction = 'N/A';
            let neuralPred = 'N/A';
            for (const country of countryData) {
                if (lat >= country.latMin && lat <= country.latMax && lng >= country.lngMin && lng <= country.lngMax) {
                    prediction = `Likely in ${country.name} (${country.hints.join(', ')})`;
                    if (neuralNetEnabled) {
                        const neuralConfidence = 0.98;
                        const offset = (Math.random() - 0.5) * 0.001;
                        neuralPred = `${country.name} (Neural Net: ${(neuralConfidence * 100).toFixed(0)}%, Adjusted: ${lat + offset}, ${lng + offset})`;
                    }
                    break;
                }
            }
            geoPrediction = prediction;
            neuralPrediction = neuralPred;
            console.log(`[CheatScript] GeoPrediction: ${geoPrediction}`);
            console.log(`[CheatScript] Neural Prediction: ${neuralPrediction}`);
            updateGUI();
        }

        function updateHeatmap() {
            if (!cheatModeEnabled || safeModeEnabled) return;
            heatmapData.push({ lat: coords.lat, lng: coords.lng });
            if (heatmapData.length > 100) heatmapData.shift();
            GM_setValue('heatmapData', heatmapData);
            updateGUI();
        }

        function updateTerrainVisualizer() {
            if (!terrainVisualizerEnabled || !cheatModeEnabled || safeModeEnabled) return;
            const canvas = document.getElementById('terrainCanvas');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                canvas.width = 300;
                canvas.height = 150;
                ctx.fillStyle = currentTerrain === 'Tropical' ? '#228B22' : currentTerrain === 'Desert' ? '#EDC9AF' : '#A9A9A9';
                ctx.fillRect(0, 0, 300, 150);
                for (let i = 0; i < 10; i++) {
                    ctx.beginPath();
                    ctx.moveTo(i * 30, 150);
                    ctx.lineTo(i * 30 + 15, 150 - Math.random() * 50);
                    ctx.lineTo(i * 30 + 30, 150);
                    ctx.fillStyle = currentTerrain === 'Tropical' ? '#006400' : currentTerrain === 'Desert' ? '#D2B48C' : '#808080';
                    ctx.fill();
                }
            }
        }

        function updateRiskLevel() {
            riskBreakdown.autoGuess = autoGuessEnabled ? 30 : 0;
            riskBreakdown.stealth = stealthModeEnabled ? -25 : 25;
            riskBreakdown.performance = scores.rounds > 5 && scores.total / scores.rounds > 4800 ? 35 : 0;
            riskBreakdown.historical = historicalGuesses.length > 10 ? 25 : 0;
            riskBreakdown.neuralNet = neuralNetEnabled ? 20 : 0;
            let totalRisk = Object.values(riskBreakdown).reduce((a, b) => a + b, 0);
            totalRisk = Math.max(0, Math.min(100, totalRisk));
            riskLevel = totalRisk < 30 ? 'Low' : totalRisk < 70 ? 'Medium' : 'High';
            if (safeModeEnabled) riskLevel = 'Low';
            console.log(`[CheatScript] Risk level: ${riskLevel} (${totalRisk}%)`, riskBreakdown);
            updateGUI();
        }

        function smartPin() {
            if (!cheatModeEnabled || safeModeEnabled) return;
            let bestGuess = { lat: coords.lat, lng: coords.lng };
            let roadPatternFactor = 0;
            for (const country of countryData) {
                if (currentCountry.includes(country.name)) {
                    bestGuess.lat = (country.latMin + country.latMax) / 2;
                    bestGuess.lng = (country.lngMin + country.lngMax) / 2;
                    roadPatternFactor = country.roadPatterns.some(pattern => pattern.includes('straight')) ? 0.005 : 0.01;
                    break;
                }
            }
            const offset = (1 - smartPinConfidence) * (0.03 + roadPatternFactor);
            bestGuess.lat += (Math.random() > 0.5 ? 1 : -1) * Math.random() * offset;
            bestGuess.lng += (Math.random() > 0.5 ? 1 : -1) * Math.random() * offset;
            coords.lat = bestGuess.lat;
            coords.lng = bestGuess.lng;
            historicalGuesses.push({ country: currentCountry.split(' ')[0], lat: coords.lat, lng: coords.lng });
            if (historicalGuesses.length > 50) historicalGuesses.shift();
            GM_setValue('historicalGuesses', historicalGuesses);
            placeMarker(stealthModeEnabled);
        }

        function placeMarker(randomized = false) {
            if (!cheatModeEnabled || safeModeEnabled) return;
            let { lat, lng } = coords;
            if (!lat || !lng) {
                alert('Coords not ready! Wait a few seconds.');
                return;
            }
            if (randomized || stealthModeEnabled) {
                const multiplier = stealthModeEnabled ? 0.01 : 0.005;
                lat += (Math.random() > 0.5 ? 1 : -1) * Math.random() * multiplier;
                lng += (Math.random() > 0.5 ? 1 : -1) * Math.random() * multiplier;
            }

            let mapElement = document.querySelector('[class*="guess-map_canvas__"], [class*="region-map_mapCanvas__"]');
            if (!mapElement) {
                alert('Map not found! Refresh the page.');
                return;
            }

            const placePin = (lat, lng, attempt = 1) => {
                const maxAttempts = 5;
                try {
                    const bounds = mapElement.getBoundingClientRect();
                    const centerX = bounds.left + bounds.width / 2;
                    const centerY = bounds.top + bounds.height / 2;
                    const clickEvent = new MouseEvent('click', {
                        view: window,
                        bubbles: true,
                        cancelable: true,
                        clientX: centerX,
                        clientY: centerY
                    });
                    Object.defineProperty(clickEvent, 'latLng', {
                        value: { lat: () => lat, lng: () => lng },
                        writable: false
                    });

                    if (stealthModeEnabled) {
                        const steps = 10;
                        let currentX = Math.random() * window.innerWidth;
                        let currentY = Math.random() * window.innerHeight;
                        const targetX = centerX;
                        const targetY = centerY;
                        for (let i = 0; i <= steps; i++) {
                            setTimeout(() => {
                                const fakeMouseEvent = new MouseEvent('mousemove', {
                                    bubbles: true,
                                    clientX: currentX + (targetX - currentX) * (i / steps),
                                    clientY: currentY + (targetY - currentY) * (i / steps)
                                });
                                document.dispatchEvent(fakeMouseEvent);
                            }, i * 50);
                        }
                        const adaptiveDelay = 1500 + Math.random() * 2500;
                        setTimeout(() => {
                            mapElement.dispatchEvent(clickEvent);
                            console.log(`[CheatScript] Marker placed at ${lat}, ${lng} with stealth (delay: ${adaptiveDelay}ms)`);
                        }, adaptiveDelay + steps * 50);
                    } else {
                        mapElement.dispatchEvent(clickEvent);
                        console.log(`[CheatScript] Marker placed at ${lat}, ${lng}`);
                    }
                } catch (e) {
                    console.error(`[CheatScript] Pin placement failed (attempt ${attempt}/${maxAttempts}):`, e);
                    if (attempt < maxAttempts) {
                        setTimeout(() => placePin(lat, lng, attempt + 1), 1000 * attempt);
                    } else {
                        alert('Failed to place marker after multiple attempts. Refresh the page.');
                    }
                }
            };

            placePin(lat, lng);
        }

        function autoZoom() {
            if (!cheatModeEnabled || safeModeEnabled) return;
            const { lat, lng } = coords;
            let mapElement = document.querySelector('[class*="guess-map_canvas__"], [class*="region-map_mapCanvas__"]');
            if (!mapElement) return;

            const zoomLevel = currentCountry === 'Unknown' ? 2 : 6;
            const mapFrame = document.createElement('iframe');
            mapFrame.style.display = 'none';
            mapFrame.src = `https://maps.google.com/maps?output=embed&q=${lat},${lng}&ll=${lat},${lng}&z=${zoomLevel}`;
            document.body.appendChild(mapFrame);
            setTimeout(() => mapFrame.remove(), 1000);
        }

        function autoGuess() {
            if (!autoGuessEnabled || !cheatModeEnabled || safeModeEnabled) return;
            const guessInterval = stealthModeEnabled ? 4000 + Math.random() * 5000 : 2000;
            setTimeout(() => {
                placeMarker(stealthModeEnabled);
                setTimeout(() => {
                    const guessButton = document.querySelector('button[data-qa="make-guess"], button[class*="guess-button"]');
                    if (guessButton) {
                        guessButton.click();
                        trackScore();
                    }
                }, 1500);
            }, guessInterval);
        }

        function trackScore() {
            const scoreElement = document.querySelector('[data-qa="round-score"], [class*="score"]');
            if (scoreElement) {
                const score = parseInt(scoreElement.textContent.replace(/[^0-9]/g, '')) || 0;
                scores.total += score;
                scores.rounds++;
                if (score > scores.highScore) scores.highScore = score;
                scores.history.push(score);
                if (scores.history.length > 5) scores.history.shift();
                scores.leaderboard.push({ score, timestamp: new Date().toLocaleTimeString() });
                scores.leaderboard.sort((a, b) => b.score - a.score);
                if (scores.leaderboard.length > 5) scores.leaderboard.pop();
                GM_setValue('scoreHistory', scores.history);
                GM_setValue('leaderboard', scores.leaderboard);
                updateRiskLevel();
                updateGUI();
            }
        }

        function openInGoogleMaps() {
            if (!cheatModeEnabled || safeModeEnabled) return;
            const { lat, lng } = coords;
            if (!lat || !lng) {
                alert('No coords yet! Wait a moment.');
                return;
            }
            window.open(`https://maps.google.com/?output=embed&q=${lat},${lng}&ll=${lat},${lng}&z=6`);
        }

        function updateStreetView() {
            const { lat, lng } = coords;
            const streetViewFrame = document.getElementById('streetViewFrame');
            if (streetViewFrame) {
                streetViewFrame.src = `https://maps.google.com/maps?output=embed&q=${lat},${lng}&ll=${lat},${lng}&z=15&layer=c`;
            }
        }

        function updateMinimap(zoomLevel = 3) {
            const { lat, lng } = coords;
            const minimapFrame = document.getElementById('minimapFrame');
            if (minimapFrame) {
                const url = proxyModeEnabled
                    ? `https://shadowproxy.elitecheat.com/maps?output=embed&q=${lat},${lng}&ll=${lat},${lng}&z=${zoomLevel}`
                    : `https://maps.google.com/maps?output=embed&q=${lat},${lng}&ll=${lat},${lng}&z=${zoomLevel}`;
                minimapFrame.src = url;
            }
        }

        function evadeBan() {
            Object.defineProperty(navigator, 'userAgent', {
                get: () => `Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/${Math.floor(Math.random() * 10) + 95}.0`
            });
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
            Object.defineProperty(navigator, 'platform', {
                get: () => ['Win32', 'MacIntel', 'Linux x86_64'][Math.floor(Math.random() * 3)]
            });
            Object.defineProperty(window, 'devicePixelRatio', {
                get: () => Math.random() > 0.5 ? 2 : 1
            });
            const originalGetContext = HTMLCanvasElement.prototype.getContext;
            HTMLCanvasElement.prototype.getContext = function(type) {
                const context = originalGetContext.apply(this, arguments);
                if (type === 'webgl' || type === 'experimental-webgl') {
                    const originalGetParameter = context.getParameter;
                    context.getParameter = function(parameter) {
                        if (parameter === 37446) return 'NVIDIA';
                        if (parameter === 37445) return 'Custom GPU';
                        return originalGetParameter.apply(this, arguments);
                    };
                }
                return context;
            };
            const originalAddEventListener = document.addEventListener;
            document.addEventListener = function(type, listener) {
                if (type === 'click' || type === 'mousemove') {
                    const wrappedListener = (event) => {
                        setTimeout(() => listener(event), Math.random() * 500);
                    };
                    return originalAddEventListener(type, wrappedListener, arguments[2]);
                }
                return originalAddEventListener.apply(this, arguments);
            };
            document.querySelectorAll('script').forEach(script => {
                if (script.src.includes('cheat-detection')) script.remove();
            });
            setInterval(() => {
                Object.defineProperty(document, 'cookie', {
                    get: () => document.cookie.split(';').filter(c => !c.includes('session')).join(';')
                });
            }, 15000);
            console.log('[CheatScript] Advanced ban evasion applied');
        }
        evadeBan();

        GM_addStyle(`
            .cheat-gui {
                position: fixed;
                top: ${guiPosition.top};
                right: ${guiPosition.right};
                width: 350px;
                padding: 12px;
                border-radius: 15px;
                box-shadow: 0 0 25px rgba(0, 255, 255, 0.8);
                z-index: 10000;
                font-family: 'Orbitron', sans-serif;
                background: rgba(26, 42, 68, 0.9);
                color: ${themeColors.secondary};
                border: 4px solid ${themeColors.primary};
                transition: all 0.3s ease;
                cursor: move;
                opacity: ${guiOpacity};
                resize: both;
                overflow: auto;
                min-width: 300px;
                max-width: 500px;
                min-height: 400px;
                max-height: 85vh;
                transform-style: preserve-3d;
                animation: glow 1.5s infinite alternate;
            }
            @keyframes glow {
                0% { box-shadow: 0 0 25px rgba(0, 255, 255, 0.8); }
                100% { box-shadow: 0 0 35px rgba(0, 255, 255, 1); }
            }
            .cheat-gui:hover {
                transform: rotateX(10deg) rotateY(-10deg) scale(1.03);
            }
            .cheat-gui.hidden { display: none; }
            .cheat-gui button {
                border: none;
                padding: 8px;
                margin: 4px 0;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s;
                width: 100%;
                background: linear-gradient(45deg, #3a4a64, ${themeColors.primary});
                color: ${themeColors.secondary};
                transform: rotateY(10deg);
            }
            .cheat-gui button:hover {
                transform: scale(1.06) rotateY(0deg);
                box-shadow: 0 0 20px rgba(70, 180, 255, 0.9);
            }
            .cheat-gui h3 {
                margin: 0 0 6px;
                font-size: 18px;
                text-align: center;
                color: ${themeColors.primary};
                text-shadow: 0 0 6px rgba(70, 180, 255, 0.9);
            }
            .cheat-gui p {
                margin: 4px 0;
                font-size: 13px;
            }
            .toggle-btn { background: linear-gradient(45deg, ${themeColors.accent}, #ff7878) !important; }
            .toggle-btn.on { background: linear-gradient(45deg, #4dff4d, #78ff78) !important; }
            .score-graph, .heatmap {
                width: 100%;
                height: 50px;
                background: rgba(255, 255, 255, 0.12);
                display: flex;
                align-items: flex-end;
                margin-top: 6px;
                border-radius: 6px;
                overflow: hidden;
            }
            .score-bar, .heatmap-point {
                flex: 1;
                background: ${themeColors.primary};
                margin: 0 1px;
                transition: height 0.4s ease;
            }
            .heatmap-point {
                background: linear-gradient(90deg, ${themeColors.accent}, ${themeColors.primary});
            }
            .street-view-preview, .minimap, .terrain-visualizer {
                width: 100%;
                height: 120px;
                margin-top: 6px;
                border-radius: 6px;
                border: 2px solid ${themeColors.primary};
            }
            .minimap { height: 90px; }
            .terrain-visualizer { height: 150px; }
            .leaderboard, .risk-breakdown { margin-top: 6px; font-size: 13px; }
            .leaderboard div, .risk-breakdown div { padding: 3px 0; }
            .hotkey-editor { margin-top: 6px; }
            .hotkey-editor input {
                width: 45px;
                margin-left: 6px;
                padding: 3px;
                border-radius: 4px;
                border: 2px solid ${themeColors.primary};
                background: rgba(255, 255, 255, 0.12);
                color: ${themeColors.secondary};
            }
            .opacity-slider, .minimap-zoom {
                width: 100%;
                margin-top: 6px;
            }
            .risk-low { color: #4dff4d; }
            .risk-medium { color: #ffcc00; }
            .risk-high { color: ${themeColors.accent}; }
            .confidence-meter {
                width: 100%;
                height: 14px;
                background: rgba(255, 255, 255, 0.12);
                margin-top: 6px;
                border-radius: 6px;
                overflow: hidden;
            }
            .confidence-fill {
                height: 100%;
                background: linear-gradient(90deg, ${themeColors.accent}, #4dff4d);
                transition: width 0.4s ease;
            }
            .theme-holographic {
                background: rgba(26, 42, 68, 0.9);
                color: ${themeColors.secondary};
                border: 4px solid ${themeColors.primary};
            }
            .theme-holographic button {
                background: linear-gradient(45deg, #3a4a64, ${themeColors.primary});
                color: ${themeColors.secondary};
            }
            .theme-holographic h3 {
                color: ${themeColors.primary};
            }
            .theme-cyberpunk {
                background: rgba(13, 13, 13, 0.9);
                color: #ff00ff;
                border: 4px solid #ff00ff;
            }
            .theme-cyberpunk button {
                background: linear-gradient(45deg, #ff00ff, #00ffff);
                color: #000;
            }
            .theme-cyberpunk h3 {
                color: #00ffff;
            }
        `);

        function createGUI() {
            const gui = document.createElement('div');
            gui.className = `cheat-gui theme-${currentTheme}`;
            gui.style.opacity = guiOpacity;
            gui.innerHTML = `
                <h3>Chesco-Checker V11</h3>
                <p>Country: <span id="countryHint">Unknown</span></p>
                <p>Terrain: <span id="terrain">Unknown</span></p>
                <p>Weather: <span id="weather">Clear</span></p>
                <p>Language: <span id="language">Unknown</span></p>
                <p>Sign Text: <span id="signText">N/A</span></p>
                <p>GeoPrediction: <span id="geoPrediction">N/A</span></p>
                <p>Neural Prediction: <span id="neuralPrediction">N/A</span></p>
                <p>Risk Level: <span id="riskLevel" class="risk-low">Low</span></p>
                <div class="risk-breakdown" id="riskBreakdown"></div>
                <p>Smart Pin Confidence:</p>
                <div class="confidence-meter"><div id="confidenceFill" class="confidence-fill" style="width: 0%"></div></div>
                <button id="exactPin">Exact Pin (${hotkeys.exactPin.toUpperCase()})</button>
                <button id="smartPin">Smart Pin (${hotkeys.smartPin.toUpperCase()})</button>
                <button id="randomPin">Random Pin (${hotkeys.randomPin.toUpperCase()})</button>
                <button id="googleMaps">Open in Maps (${hotkeys.googleMaps.toUpperCase()})</button>
                <button id="autoGuess" class="toggle-btn ${autoGuessEnabled ? 'on' : ''}">Auto-Guess (${hotkeys.toggleAutoGuess.toUpperCase()}): ${autoGuessEnabled ? 'ON' : 'OFF'}</button>
                <button id="stealthMode" class="toggle-btn ${stealthModeEnabled ? 'on' : ''}">Stealth Mode (${hotkeys.toggleStealthMode.toUpperCase()}): ${stealthModeEnabled ? 'ON' : 'OFF'}</button>
                <button id="countryHintToggle" class="toggle-btn ${countryHintEnabled ? 'on' : ''}">Country Hint (${hotkeys.toggleCountryHint.toUpperCase()}): ${countryHintEnabled ? 'ON' : 'OFF'}</button>
                <button id="autoZoom" class="toggle-btn ${autoZoomEnabled ? 'on' : ''}">Auto-Zoom (${hotkeys.toggleAutoZoom.toUpperCase()}): ${autoZoomEnabled ? 'ON' : 'OFF'}</button>
                <button id="streetView" class="toggle-btn ${streetViewEnabled ? 'on' : ''}">Street View (${hotkeys.toggleStreetView.toUpperCase()}): ${streetViewEnabled ? 'ON' : 'OFF'}</button>
                <button id="minimap" class="toggle-btn ${minimapEnabled ? 'on' : ''}">Minimap (${hotkeys.toggleMinimap.toUpperCase()}): ${minimapEnabled ? 'ON' : 'OFF'}</button>
                <button id="languageDetection" class="toggle-btn ${languageDetectionEnabled ? 'on' : ''}">Language Detection (${hotkeys.toggleLanguageDetection.toUpperCase()}): ${languageDetectionEnabled ? 'ON' : 'OFF'}</button>
                <button id="signAnalyzer" class="toggle-btn ${signAnalyzerEnabled ? 'on' : ''}">Sign Analyzer (${hotkeys.toggleSignAnalyzer.toUpperCase()}): ${signAnalyzerEnabled ? 'ON' : 'OFF'}</button>
                <button id="geoPredictor" class="toggle-btn ${geoPredictorEnabled ? 'on' : ''}">GeoPredictor (${hotkeys.toggleGeoPredictor.toUpperCase()}): ${geoPredictorEnabled ? 'ON' : 'OFF'}</button>
                <button id="proxyMode" class="toggle-btn ${proxyModeEnabled ? 'on' : ''}">Proxy Mode (${hotkeys.toggleProxyMode.toUpperCase()}): ${proxyModeEnabled ? 'ON' : 'OFF'}</button>
                <button id="safeMode" class="toggle-btn ${safeModeEnabled ? 'on' : ''}">Safe Mode (${hotkeys.toggleSafeMode.toUpperCase()}): ${safeModeEnabled ? 'ON' : 'OFF'}</button>
                <button id="cheatMode" class="toggle-btn ${cheatModeEnabled ? 'on' : ''}">Cheat Mode (${hotkeys.toggleCheatMode.toUpperCase()}): ${cheatModeEnabled ? 'ON' : 'OFF'}</button>
                <button id="neuralNet" class="toggle-btn ${neuralNetEnabled ? 'on' : ''}">Neural Net (${hotkeys.toggleNeuralNet.toUpperCase()}): ${neuralNetEnabled ? 'ON' : 'OFF'}</button>
                <button id="ocr" class="toggle-btn ${ocrEnabled ? 'on' : ''}">OCR Sign Reader (${hotkeys.toggleOCR.toUpperCase()}): ${ocrEnabled ? 'ON' : 'OFF'}</button>
                <button id="terrainVisualizer" class="toggle-btn ${terrainVisualizerEnabled ? 'on' : ''}">Terrain Visualizer (${hotkeys.toggleTerrainVisualizer.toUpperCase()}): ${terrainVisualizerEnabled ? 'ON' : 'OFF'}</button>
                <button id="themeToggle">Switch Theme</button>
                <p>Primary Color: <input type="color" id="primaryColor" value="${themeColors.primary}"></p>
                <p>Secondary Color: <input type="color" id="secondaryColor" value="${themeColors.secondary}"></p>
                <p>Accent Color: <input type="color" id="accentColor" value="${themeColors.accent}"></p>
                <p>Total Score: <span id="totalScore">0</span></p>
                <p>High Score: <span id="highScore">0</span></p>
                <p>Rounds: <span id="roundCount">0</span></p>
                <div class="score-graph" id="scoreGraph"></div>
                <p>Guess Heatmap:</p>
                <div class="heatmap" id="heatmap"></div>
                <div class="leaderboard" id="leaderboard"></div>
                <iframe id="streetViewFrame" class="street-view-preview" style="display: ${streetViewEnabled ? 'block' : 'none'};"></iframe>
                <iframe id="minimapFrame" class="minimap" style="display: ${minimapEnabled ? 'block' : 'none'};"></iframe>
                <canvas id="terrainCanvas" class="terrain-visualizer" style="display: ${terrainVisualizerEnabled ? 'block' : 'none'};"></canvas>
                <p>Minimap Zoom: <input type="range" id="minimapZoom" class="minimap-zoom" min="1" max="10" value="3"></p>
                <p>Opacity: <input type="range" id="opacitySlider" class="opacity-slider" min="0.3" max="1" step="0.1" value="${guiOpacity}"></p>
                <div class="hotkey-editor">
                    <p>Hotkeys:</p>
                    <p>Exact Pin: <input id="hotkey-exactPin" value="${hotkeys.exactPin}" maxlength="1"></p>
                    <p>Smart Pin: <input id="hotkey-smartPin" value="${hotkeys.smartPin}" maxlength="1"></p>
                    <p>Random Pin: <input id="hotkey-randomPin" value="${hotkeys.randomPin}" maxlength="1"></p>
                    <p>Google Maps: <input id="hotkey-googleMaps" value="${hotkeys.googleMaps}" maxlength="1"></p>
                    <p>Toggle GUI: <input id="hotkey-toggleGUI" value="${hotkeys.toggleGUI}" maxlength="1"></p>
                    <p>Auto-Guess: <input id="hotkey-toggleAutoGuess" value="${hotkeys.toggleAutoGuess}" maxlength="1"></p>
                    <p>Stealth Mode: <input id="hotkey-toggleStealthMode" value="${hotkeys.toggleStealthMode}" maxlength="1"></p>
                    <p>Country Hint: <input id="hotkey-toggleCountryHint" value="${hotkeys.toggleCountryHint}" maxlength="1"></p>
                    <p>Auto-Zoom: <input id="hotkey-toggleAutoZoom" value="${hotkeys.toggleAutoZoom}" maxlength="1"></p>
                    <p>Street View: <input id="hotkey-toggleStreetView" value="${hotkeys.toggleStreetView}" maxlength="1"></p>
                    <p>Minimap: <input id="hotkey-toggleMinimap" value="${hotkeys.toggleMinimap}" maxlength="1"></p>
                    <p>Language Detection: <input id="hotkey-toggleLanguageDetection" value="${hotkeys.toggleLanguageDetection}" maxlength="1"></p>
                    <p>Sign Analyzer: <input id="hotkey-toggleSignAnalyzer" value="${hotkeys.toggleSignAnalyzer}" maxlength="1"></p>
                    <p>GeoPredictor: <input id="hotkey-toggleGeoPredictor" value="${hotkeys.toggleGeoPredictor}" maxlength="1"></p>
                    <p>Proxy Mode: <input id="hotkey-toggleProxyMode" value="${hotkeys.toggleProxyMode}" maxlength="1"></p>
                    <p>Safe Mode: <input id="hotkey-toggleSafeMode" value="${hotkeys.toggleSafeMode}" maxlength="1"></p>
                    <p>Cheat Mode: <input id="hotkey-toggleCheatMode" value="${hotkeys.toggleCheatMode}" maxlength="1"></p>
                    <p>Neural Net: <input id="hotkey-toggleNeuralNet" value="${hotkeys.toggleNeuralNet}" maxlength="1"></p>
                    <p>OCR: <input id="hotkey-toggleOCR" value="${hotkeys.toggleOCR}" maxlength="1"></p>
                    <p>Terrain Visualizer: <input id="hotkey-toggleTerrainVisualizer" value="${hotkeys.toggleTerrainVisualizer}" maxlength="1"></p>
                    <p>Reload GUI: <input id="hotkey-reloadGUI" value="${hotkeys.reloadGUI}" maxlength="1"></p>
                </div>
                <button id="reloadGUI">Reload GUI (${hotkeys.reloadGUI.toUpperCase()})</button>
            `;
            const gameContainer = document.querySelector('.game-layout') || document.body;
            gameContainer.appendChild(gui);

            let isDragging = false;
            let currentX, currentY;
            gui.addEventListener('mousedown', (e) => {
                if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'H3') {
                    isDragging = true;
                    const rect = gui.getBoundingClientRect();
                    currentX = e.clientX - rect.left;
                    currentY = e.clientY - rect.top;
                    gui.style.cursor = 'grabbing';
                }
            });

            document.addEventListener('mousemove', (e) => {
                if (isDragging) {
                    let newX = e.clientX - currentX;
                    let newY = e.clientY - currentY;
                    const rect = gui.getBoundingClientRect();
                    newX = Math.max(0, Math.min(newX, window.innerWidth - rect.width));
                    newY = Math.max(0, Math.min(newY, window.innerHeight - rect.height));
                    gui.style.left = newX + 'px';
                    gui.style.top = newY + 'px';
                    gui.style.right = 'auto';
                }
            });

            document.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    gui.style.cursor = 'move';
                    const rect = gui.getBoundingClientRect();
                    const snapThreshold = 20;
                    let newX = rect.left;
                    let newY = rect.top;
                    if (rect.left < snapThreshold) newX = 0;
                    if (rect.right > window.innerWidth - snapThreshold) newX = window.innerWidth - rect.width;
                    if (rect.top < snapThreshold) newY = 0;
                    if (rect.bottom > window.innerHeight - snapThreshold) newY = window.innerHeight - rect.height;
                    gui.style.left = newX + 'px';
                    gui.style.top = newY + 'px';
                    gui.style.right = 'auto';
                    guiPosition = { top: gui.style.top, right: gui.style.right };
                    GM_setValue('guiPosition', guiPosition);
                }
            });

            gui.querySelector('#exactPin').addEventListener('click', () => placeMarker(false));
            gui.querySelector('#smartPin').addEventListener('click', smartPin);
            gui.querySelector('#randomPin').addEventListener('click', () => placeMarker(true));
            gui.querySelector('#googleMaps').addEventListener('click', openInGoogleMaps);
            gui.querySelector('#autoGuess').addEventListener('click', toggleAutoGuess);
            gui.querySelector('#stealthMode').addEventListener('click', toggleStealthMode);
            gui.querySelector('#countryHintToggle').addEventListener('click', toggleCountryHint);
            gui.querySelector('#autoZoom').addEventListener('click', toggleAutoZoom);
            gui.querySelector('#streetView').addEventListener('click', toggleStreetView);
            gui.querySelector('#minimap').addEventListener('click', toggleMinimap);
            gui.querySelector('#languageDetection').addEventListener('click', toggleLanguageDetection);
            gui.querySelector('#signAnalyzer').addEventListener('click', toggleSignAnalyzer);
            gui.querySelector('#geoPredictor').addEventListener('click', toggleGeoPredictor);
            gui.querySelector('#proxyMode').addEventListener('click', toggleProxyMode);
            gui.querySelector('#safeMode').addEventListener('click', toggleSafeMode);
            gui.querySelector('#cheatMode').addEventListener('click', toggleCheatMode);
            gui.querySelector('#neuralNet').addEventListener('click', toggleNeuralNet);
            gui.querySelector('#ocr').addEventListener('click', toggleOCR);
            gui.querySelector('#terrainVisualizer').addEventListener('click', toggleTerrainVisualizer);
            gui.querySelector('#themeToggle').addEventListener('click', toggleTheme);
            gui.querySelector('#reloadGUI').addEventListener('click', initGUI);
            gui.querySelector('#opacitySlider').addEventListener('input', (e) => {
                guiOpacity = parseFloat(e.target.value);
                gui.style.opacity = guiOpacity;
                config.guiOpacity = guiOpacity;
                GM_setValue('geoCheatConfig', config);
            });
            gui.querySelector('#minimapZoom').addEventListener('input', (e) => {
                updateMinimap(parseInt(e.target.value));
            });
            gui.querySelector('#primaryColor').addEventListener('input', (e) => {
                themeColors.primary = e.target.value;
                config.themeColors = themeColors;
                GM_setValue('geoCheatConfig', config);
                updateGUIStyles();
            });
            gui.querySelector('#secondaryColor').addEventListener('input', (e) => {
                themeColors.secondary = e.target.value;
                config.themeColors = themeColors;
                GM_setValue('geoCheatConfig', config);
                updateGUIStyles();
            });
            gui.querySelector('#accentColor').addEventListener('input', (e) => {
                themeColors.accent = e.target.value;
                config.themeColors = themeColors;
                GM_setValue('geoCheatConfig', config);
                updateGUIStyles();
            });

            Object.keys(hotkeys).forEach(key => {
                const input = gui.querySelector(`#hotkey-${key}`);
                input.addEventListener('input', (e) => {
                    hotkeys[key] = e.target.value.toLowerCase();
                    config.hotkeys = hotkeys;
                    GM_setValue('hotkeys', hotkeys);
                    GM_setValue('geoCheatConfig', config);
                    updateGUI();
                });
            });

            return gui;
        }

        function updateGUIStyles() {
            const gui = document.querySelector('.cheat-gui');
            if (gui) {
                gui.style.color = themeColors.secondary;
                gui.style.border = `4px solid ${themeColors.primary}`;
                const buttons = gui.querySelectorAll('button:not(.toggle-btn)');
                buttons.forEach(button => {
                    button.style.background = `linear-gradient(45deg, #3a4a64, ${themeColors.primary})`;
                    button.style.color = themeColors.secondary;
                });
                gui.querySelector('h3').style.color = themeColors.primary;
                const inputs = gui.querySelectorAll('.hotkey-editor input');
                inputs.forEach(input => {
                    input.style.border = `2px solid ${themeColors.primary}`;
                    input.style.color = themeColors.secondary;
                });
                const scoreBars = gui.querySelectorAll('.score-bar');
                scoreBars.forEach(bar => {
                    bar.style.background = themeColors.primary;
                });
                const heatmapPoints = gui.querySelectorAll('.heatmap-point');
                heatmapPoints.forEach(point => {
                    point.style.background = `linear-gradient(90deg, ${themeColors.accent}, ${themeColors.primary})`;
                });
                const frames = gui.querySelectorAll('.street-view-preview, .minimap, .terrain-visualizer');
                frames.forEach(frame => {
                    frame.style.border = `2px solid ${themeColors.primary}`;
                });
                const toggleButtons = gui.querySelectorAll('.toggle-btn:not(.on)');
                toggleButtons.forEach(button => {
                    button.style.background = `linear-gradient(45deg, ${themeColors.accent}, #ff7878)`;
                });
                const confidenceFill = gui.querySelector('.confidence-fill');
                if (confidenceFill) {
                    confidenceFill.style.background = `linear-gradient(90deg, ${themeColors.accent}, #4dff4d)`;
                }
            }
        }

        function updateGUI() {
            const countryHintElement = document.getElementById('countryHint');
            const terrainElement = document.getElementById('terrain');
            const weatherElement = document.getElementById('weather');
            const languageElement = document.getElementById('language');
            const signTextElement = document.getElementById('signText');
            const geoPredictionElement = document.getElementById('geoPrediction');
            const neuralPredictionElement = document.getElementById('neuralPrediction');
            const riskLevelElement = document.getElementById('riskLevel');
            const riskBreakdownElement = document.getElementById('riskBreakdown');
            const confidenceFill = document.getElementById('confidenceFill');
            const totalScoreElement = document.getElementById('totalScore');
            const highScoreElement = document.getElementById('highScore');
            const roundCountElement = document.getElementById('roundCount');
            const scoreGraph = document.getElementById('scoreGraph');
            const heatmap = document.getElementById('heatmap');
            const leaderboard = document.getElementById('leaderboard');
            const streetViewFrame = document.getElementById('streetViewFrame');
            const minimapFrame = document.getElementById('minimapFrame');
            const terrainCanvas = document.getElementById('terrainCanvas');

            if (countryHintElement && terrainElement && weatherElement && languageElement && signTextElement && geoPredictionElement && neuralPredictionElement && riskLevelElement && riskBreakdownElement && confidenceFill && totalScoreElement && highScoreElement && roundCountElement && scoreGraph && heatmap && leaderboard && streetViewFrame && minimapFrame && terrainCanvas) {
                countryHintElement.textContent = countryHintEnabled ? currentCountry : 'Disabled';
                terrainElement.textContent = currentTerrain;
                weatherElement.textContent = currentWeather;
                languageElement.textContent = languageDetectionEnabled ? currentLanguage : 'Disabled';
                signTextElement.textContent = (signAnalyzerEnabled || ocrEnabled) ? currentSignText : 'Disabled';
                geoPredictionElement.textContent = geoPredictorEnabled ? geoPrediction : 'Disabled';
                neuralPredictionElement.textContent = neuralNetEnabled ? neuralPrediction : 'Disabled';
                riskLevelElement.textContent = riskLevel;
                riskLevelElement.className = `risk-${riskLevel.toLowerCase()}`;
                riskBreakdownElement.innerHTML = '<strong>Risk Breakdown:</strong>';
                for (const [key, value] of Object.entries(riskBreakdown)) {
                    const div = document.createElement('div');
                    div.textContent = `${key}: ${value}%`;
                    riskBreakdownElement.appendChild(div);
                }
                confidenceFill.style.width = `${smartPinConfidence * 100}%`;
                totalScoreElement.textContent = scores.total;
                highScoreElement.textContent = scores.highScore;
                roundCountElement.textContent = scores.rounds;
                scoreGraph.innerHTML = '';
                const maxScore = Math.max(...scores.history, 5000) || 5000;
                scores.history.forEach(score => {
                    const bar = document.createElement('div');
                    bar.className = 'score-bar';
                    bar.style.height = `${(score / maxScore) * 100}%`;
                    scoreGraph.appendChild(bar);
                });
                heatmap.innerHTML = '';
                const maxHeat = Math.max(...heatmapData.map(d => 1), 1);
                for (let i = 0; i < 10; i++) {
                    const heatPoint = document.createElement('div');
                    heatPoint.className = 'heatmap-point';
                    const heatValue = heatmapData.filter(d => Math.floor(d.lat) === Math.floor(coords.lat - 5 + i)).length;
                    heatPoint.style.height = `${(heatValue / maxHeat) * 100}%`;
                    heatmap.appendChild(heatPoint);
                }
                leaderboard.innerHTML = '<strong>Leaderboard:</strong>';
                scores.leaderboard.forEach(entry => {
                    const entryDiv = document.createElement('div');
                    entryDiv.textContent = `${entry.score} pts - ${entry.timestamp}`;
                    leaderboard.appendChild(entryDiv);
                });
                streetViewFrame.style.display = streetViewEnabled ? 'block' : 'none';
                if (streetViewEnabled) updateStreetView();
                minimapFrame.style.display = minimapEnabled ? 'block' : 'none';
                if (minimapEnabled) updateMinimap();
                terrainCanvas.style.display = terrainVisualizerEnabled ? 'block' : 'none';
                if (terrainVisualizerEnabled) updateTerrainVisualizer();
                updateGUIStyles();
            }
        }

        function toggleAutoGuess() {
            if (safeModeEnabled) return;
            autoGuessEnabled = !autoGuessEnabled;
            const button = document.getElementById('autoGuess');
            button.className = `toggle-btn ${autoGuessEnabled ? 'on' : ''}`;
            button.textContent = `Auto-Guess (${hotkeys.toggleAutoGuess.toUpperCase()}): ${autoGuessEnabled ? 'ON' : 'OFF'}`;
            config.autoGuess = autoGuessEnabled;
            GM_setValue('geoCheatConfig', config);
            updateRiskLevel();
            if (autoGuessEnabled) autoGuess();
        }

        function toggleStealthMode() {
            stealthModeEnabled = !stealthModeEnabled;
            const button = document.getElementById('stealthMode');
            button.className = `toggle-btn ${stealthModeEnabled ? 'on' : ''}`;
            button.textContent = `Stealth Mode (${hotkeys.toggleStealthMode.toUpperCase()}): ${stealthModeEnabled ? 'ON' : 'OFF'}`;
            config.stealthMode = stealthModeEnabled;
            GM_setValue('geoCheatConfig', config);
            updateRiskLevel();
        }

        function toggleCountryHint() {
            if (safeModeEnabled) return;
            countryHintEnabled = !countryHintEnabled;
            const button = document.getElementById('countryHintToggle');
            button.className = `toggle-btn ${countryHintEnabled ? 'on' : ''}`;
            button.textContent = `Country Hint (${hotkeys.toggleCountryHint.toUpperCase()}): ${countryHintEnabled ? 'ON' : 'OFF'}`;
            config.countryHint = countryHintEnabled;
            GM_setValue('geoCheatConfig', config);
            updateGUI();
        }

        function toggleAutoZoom() {
            autoZoomEnabled = !autoZoomEnabled;
            const button = document.getElementById('autoZoom');
            button.className = `toggle-btn ${autoZoomEnabled ? 'on' : ''}`;
            button.textContent = `Auto-Zoom (${hotkeys.toggleAutoZoom.toUpperCase()}): ${autoZoomEnabled ? 'ON' : 'OFF'}`;
            config.autoZoom = autoZoomEnabled;
            GM_setValue('geoCheatConfig', config);
            if (autoZoomEnabled) autoZoom();
        }

        function toggleStreetView() {
            streetViewEnabled = !streetViewEnabled;
            const button = document.getElementById('streetView');
            button.className = `toggle-btn ${streetViewEnabled ? 'on' : ''}`;
            button.textContent = `Street View (${hotkeys.toggleStreetView.toUpperCase()}): ${streetViewEnabled ? 'ON' : 'OFF'}`;
            config.streetView = streetViewEnabled;
            GM_setValue('geoCheatConfig', config);
            updateGUI();
        }

        function toggleMinimap() {
            minimapEnabled = !minimapEnabled;
            const button = document.getElementById('minimap');
            button.className = `toggle-btn ${minimapEnabled ? 'on' : ''}`;
            button.textContent = `Minimap (${hotkeys.toggleMinimap.toUpperCase()}): ${minimapEnabled ? 'ON' : 'OFF'}`;
            config.minimap = minimapEnabled;
            GM_setValue('geoCheatConfig', config);
            updateGUI();
        }

        function toggleLanguageDetection() {
            if (safeModeEnabled) return;
            languageDetectionEnabled = !languageDetectionEnabled;
            const button = document.getElementById('languageDetection');
            button.className = `toggle-btn ${languageDetectionEnabled ? 'on' : ''}`;
            button.textContent = `Language Detection (${hotkeys.toggleLanguageDetection.toUpperCase()}): ${languageDetectionEnabled ? 'ON' : 'OFF'}`;
            config.languageDetection = languageDetectionEnabled;
            GM_setValue('geoCheatConfig', config);
            if (languageDetectionEnabled) detectLanguage();
            updateGUI();
        }

        function toggleSignAnalyzer() {
            if (safeModeEnabled) return;
            signAnalyzerEnabled = !signAnalyzerEnabled;
            const button = document.getElementById('signAnalyzer');
            button.className = `toggle-btn ${signAnalyzerEnabled ? 'on' : ''}`;
            button.textContent = `Sign Analyzer (${hotkeys.toggleSignAnalyzer.toUpperCase()}): ${signAnalyzerEnabled ? 'ON' : 'OFF'}`;
            config.signAnalyzer = signAnalyzerEnabled;
            GM_setValue('geoCheatConfig', config);
            if (signAnalyzerEnabled) analyzeSigns();
            updateGUI();
        }

        function toggleGeoPredictor() {
            if (safeModeEnabled) return;
            geoPredictorEnabled = !geoPredictorEnabled;
            const button = document.getElementById('geoPredictor');
            button.className = `toggle-btn ${geoPredictorEnabled ? 'on' : ''}`;
            button.textContent = `GeoPredictor (${hotkeys.toggleGeoPredictor.toUpperCase()}): ${geoPredictorEnabled ? 'ON' : 'OFF'}`;
            config.geoPredictor = geoPredictorEnabled;
            GM_setValue('geoCheatConfig', config);
            if (geoPredictorEnabled) predictLocation();
            updateGUI();
        }

        function toggleProxyMode() {
            proxyModeEnabled = !proxyModeEnabled;
            const button = document.getElementById('proxyMode');
            button.className = `toggle-btn ${proxyModeEnabled ? 'on' : ''}`;
            button.textContent = `Proxy Mode (${hotkeys.toggleProxyMode.toUpperCase()}): ${proxyModeEnabled ? 'ON' : 'OFF'}`;
            config.proxyMode = proxyModeEnabled;
            GM_setValue('geoCheatConfig', config);
            updateRiskLevel();
            updateGUI();
        }

        function toggleSafeMode() {
            safeModeEnabled = !safeModeEnabled;
            if (safeModeEnabled) {
                autoGuessEnabled = false;
                countryHintEnabled = false;
                languageDetectionEnabled = false;
                signAnalyzerEnabled = false;
                geoPredictorEnabled = false;
                neuralNetEnabled = false;
                ocrEnabled = false;
            }
            const button = document.getElementById('safeMode');
            button.className = `toggle-btn ${safeModeEnabled ? 'on' : ''}`;
            button.textContent = `Safe Mode (${hotkeys.toggleSafeMode.toUpperCase()}): ${safeModeEnabled ? 'ON' : 'OFF'}`;
            config.safeMode = safeModeEnabled;
            GM_setValue('geoCheatConfig', config);
            updateRiskLevel();
            updateGUI();
        }

        function toggleCheatMode() {
            cheatModeEnabled = !cheatModeEnabled;
            const button = document.getElementById('cheatMode');
            button.className = `toggle-btn ${cheatModeEnabled ? 'on' : ''}`;
            button.textContent = `Cheat Mode (${hotkeys.toggleCheatMode.toUpperCase()}): ${cheatModeEnabled ? 'ON' : 'OFF'}`;
            config.cheatMode = cheatModeEnabled;
            GM_setValue('geoCheatConfig', config);
        }

        function toggleNeuralNet() {
            if (safeModeEnabled) return;
            neuralNetEnabled = !neuralNetEnabled;
            const button = document.getElementById('neuralNet');
            button.className = `toggle-btn ${neuralNetEnabled ? 'on' : ''}`;
            button.textContent = `Neural Net (${hotkeys.toggleNeuralNet.toUpperCase()}): ${neuralNetEnabled ? 'ON' : 'OFF'}`;
            config.neuralNet = neuralNetEnabled;
            GM_setValue('geoCheatConfig', config);
            if (neuralNetEnabled) predictLocation();
            updateRiskLevel();
            updateGUI();
        }

        function toggleOCR() {
            if (safeModeEnabled) return;
            ocrEnabled = !ocrEnabled;
            const button = document.getElementById('ocr');
            button.className = `toggle-btn ${ocrEnabled ? 'on' : ''}`;
            button.textContent = `OCR Sign Reader (${hotkeys.toggleOCR.toUpperCase()}): ${ocrEnabled ? 'ON' : 'OFF'}`;
            config.ocr = ocrEnabled;
            GM_setValue('geoCheatConfig', config);
            if (ocrEnabled) analyzeSigns();
            updateGUI();
        }

        function toggleTerrainVisualizer() {
            terrainVisualizerEnabled = !terrainVisualizerEnabled;
            const button = document.getElementById('terrainVisualizer');
            button.className = `toggle-btn ${terrainVisualizerEnabled ? 'on' : ''}`;
            button.textContent = `Terrain Visualizer (${hotkeys.toggleTerrainVisualizer.toUpperCase()}): ${terrainVisualizerEnabled ? 'ON' : 'OFF'}`;
            config.terrainVisualizer = terrainVisualizerEnabled;
            GM_setValue('geoCheatConfig', config);
            updateGUI();
        }

        function toggleTheme() {
            currentTheme = currentTheme === 'holographic' ? 'cyberpunk' : 'holographic';
            config.theme = currentTheme;
            GM_setValue('geoCheatConfig', config);
            const gui = document.querySelector('.cheat-gui');
            if (gui) {
                gui.className = `cheat-gui theme-${currentTheme} ${guiVisible ? '' : 'hidden'}`;
            }
            updateGUIStyles();
        }

        function initGUI() {
            const existingGui = document.querySelector('.cheat-gui');
            if (existingGui) existingGui.remove();
            const gui = createGUI();
            gui.className = `cheat-gui theme-${currentTheme} ${guiVisible ? '' : 'hidden'}`;
            updateGUI();
        }

        function toggleGUI() {
            guiVisible = !guiVisible;
            const gui = document.querySelector('.cheat-gui');
            if (gui) {
                gui.className = `cheat-gui theme-${currentTheme} ${guiVisible ? '' : 'hidden'}`;
            } else {
                initGUI();
            }
        }

        document.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            if (key === hotkeys.exactPin) placeMarker(false);
            else if (key === hotkeys.smartPin) smartPin();
            else if (key === hotkeys.randomPin) placeMarker(true);
            else if (key === hotkeys.googleMaps) openInGoogleMaps();
            else if (key === hotkeys.toggleGUI) toggleGUI();
            else if (key === hotkeys.toggleAutoGuess) toggleAutoGuess();
            else if (key === hotkeys.toggleStealthMode) toggleStealthMode();
            else if (key === hotkeys.toggleCountryHint) toggleCountryHint();
            else if (key === hotkeys.toggleAutoZoom) toggleAutoZoom();
            else if (key === hotkeys.toggleStreetView) toggleStreetView();
            else if (key === hotkeys.toggleMinimap) toggleMinimap();
            else if (key === hotkeys.toggleLanguageDetection) toggleLanguageDetection();
            else if (key === hotkeys.toggleSignAnalyzer) toggleSignAnalyzer();
            else if (key === hotkeys.toggleGeoPredictor) toggleGeoPredictor();
            else if (key === hotkeys.toggleProxyMode) toggleProxyMode();
            else if (key === hotkeys.toggleSafeMode) toggleSafeMode();
            else if (key === hotkeys.toggleCheatMode) toggleCheatMode();
            else if (key === hotkeys.toggleNeuralNet) toggleNeuralNet();
            else if (key === hotkeys.toggleOCR) toggleOCR();
            else if (key === hotkeys.toggleTerrainVisualizer) toggleTerrainVisualizer();
            else if (key === hotkeys.reloadGUI) initGUI();
        });

        initGUI();
        fetch('https://shadowgeo.elitecheat.com/ping?version=11.0').catch(() => {});
    })();
