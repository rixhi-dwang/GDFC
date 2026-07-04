/**
 * GDFC - Space Flight Control System (Core Logic)
 * Features:
 * 1. 3D Starfield Simulation with Warp/Hyperspace acceleration effect.
 * 2. Simulated Gyroscope (flight horizon) and Radar scanner.
 * 3. 17 Feature Inputs Manager with random sample data generator.
 * 4. Advanced Telemetry Graphing using Chart.js with responsive data updates.
 * 5. Scrolling cyber terminal console logger.
 */

// Global App State
const state = {
    velocity: 28450,
    altitude: 420.8,
    pitch: 12.4,
    yaw: -2.8,
    isWarping: false,
    warpFactor: 1,
    chart: null,
    terminalLogs: []
};

// DOM Cache
const dom = {
    spaceCanvas: document.getElementById('space-canvas'),
    hudVelocity: document.getElementById('hud-velocity'),
    hudAltitude: document.getElementById('hud-altitude'),
    hudAttitude: document.getElementById('hud-attitude'),
    hudHorizon: document.getElementById('hud-horizon'),
    radarCanvas: document.getElementById('radar-canvas'),
    btnFillSample: document.getElementById('btn-fill-sample'),
    form: document.getElementById('diagnostics-form'),
    terminalLog: document.getElementById('terminal-log'),
    bootLoader: document.getElementById('boot-loader'),
    progressBar: document.getElementById('loader-progress-bar'),
    loaderStatus: document.getElementById('loader-status'),
    loaderPercentage: document.getElementById('loader-percentage')
};

// ==========================================
// 1. STARFIELD & HYPERSPACE ANIMATION (Space Canvas)
// ==========================================
let stars = [];
const STAR_COUNT = 250;
let spaceCtx;

function initStarfield() {
    spaceCtx = dom.spaceCanvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Create random stars
    stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
            x: Math.random() * dom.spaceCanvas.width - dom.spaceCanvas.width / 2,
            y: Math.random() * dom.spaceCanvas.height - dom.spaceCanvas.height / 2,
            z: Math.random() * dom.spaceCanvas.width,
            color: getRandomStarColor()
        });
    }
    requestAnimationFrame(updateStarfield);
}

function resizeCanvas() {
    dom.spaceCanvas.width = window.innerWidth;
    dom.spaceCanvas.height = window.innerHeight;
}

function getRandomStarColor() {
    const colors = ['#00f0ff', '#ffffff', '#ff5b00', '#00ff66', '#a5d3ff'];
    return colors[Math.floor(Math.random() * colors.length)];
}

function updateStarfield() {
    spaceCtx.fillStyle = 'rgba(2, 2, 8, 0.2)'; // Fades trailing stars for warp effect
    spaceCtx.fillRect(0, 0, dom.spaceCanvas.width, dom.spaceCanvas.height);
    
    const cx = dom.spaceCanvas.width / 2;
    const cy = dom.spaceCanvas.height / 2;
    
    // Warp factor increases when calculating
    const targetWarp = state.isWarping ? 25 : 1.5;
    state.warpFactor += (targetWarp - state.warpFactor) * 0.1;
    
    stars.forEach(star => {
        star.z -= state.warpFactor;
        
        if (star.z <= 0) {
            star.z = dom.spaceCanvas.width;
            star.x = Math.random() * dom.spaceCanvas.width - cx;
            star.y = Math.random() * dom.spaceCanvas.height - cy;
        }
        
        // 3D projections
        const px = (star.x / star.z) * cx + cx;
        const py = (star.y / star.z) * cy + cy;
        
        if (px < 0 || px > dom.spaceCanvas.width || py < 0 || py > dom.spaceCanvas.height) {
            return;
        }
        
        // Size based on depth
        const size = (1 - star.z / dom.spaceCanvas.width) * 3;
        
        // Draw star (stretches if warping)
        spaceCtx.beginPath();
        spaceCtx.strokeStyle = star.color;
        spaceCtx.lineWidth = size;
        
        if (state.isWarping && state.warpFactor > 10) {
            // Stretch lines
            const lastPx = (star.x / (star.z + state.warpFactor * 2)) * cx + cx;
            const lastPy = (star.y / (star.z + state.warpFactor * 2)) * cy + cy;
            spaceCtx.moveTo(lastPx, lastPy);
            spaceCtx.lineTo(px, py);
            spaceCtx.stroke();
        } else {
            spaceCtx.fillStyle = star.color;
            spaceCtx.arc(px, py, size, 0, Math.PI * 2);
            spaceCtx.fill();
        }
    });
    
    requestAnimationFrame(updateStarfield);
}

// ==========================================
// 2. RADAR SCANNER SIMULATION
// ==========================================
let radarCtx;
let radarBlips = [];

function initRadar() {
    radarCtx = dom.radarCanvas.getContext('2d');
    dom.radarCanvas.width = 160;
    dom.radarCanvas.height = 160;
    
    // Add periodic mock flight debris/blips
    setInterval(() => {
        if (radarBlips.length < 5) {
            radarBlips.push({
                angle: Math.random() * Math.PI * 2,
                dist: 20 + Math.random() * 50,
                size: 2 + Math.random() * 4,
                alpha: 1.0,
                color: Math.random() > 0.3 ? '#00ff66' : '#ff5b00'
            });
        }
    }, 3000);
    
    requestAnimationFrame(updateRadar);
}

function updateRadar() {
    radarCtx.clearRect(0, 0, 160, 160);
    const cx = 80;
    const cy = 80;
    
    // Draw radar sweeps
    radarBlips.forEach((blip, index) => {
        const bx = cx + Math.cos(blip.angle) * blip.dist;
        const by = cy + Math.sin(blip.angle) * blip.dist;
        
        radarCtx.beginPath();
        radarCtx.arc(bx, by, blip.size, 0, Math.PI * 2);
        radarCtx.fillStyle = blip.color;
        radarCtx.globalAlpha = blip.alpha;
        radarCtx.shadowBlur = 10;
        radarCtx.shadowColor = blip.color;
        radarCtx.fill();
        
        // Slow fade
        blip.alpha -= 0.003;
        if (blip.alpha <= 0) {
            radarBlips.splice(index, 1);
        }
    });
    
    radarCtx.globalAlpha = 1.0;
    radarCtx.shadowBlur = 0;
    
    requestAnimationFrame(updateRadar);
}

// ==========================================
// 3. FLIGHT PARAMETER TELEMETRY OSCILLATION
// ==========================================
function startTelemetryOscillation() {
    setInterval(() => {
        if (state.isWarping) return; // Freeze telemetry changes during warp simulation
        
        // Minor oscillations
        state.velocity += (Math.random() - 0.5) * 12;
        state.altitude += (Math.random() - 0.5) * 0.2;
        state.pitch += (Math.random() - 0.5) * 0.4;
        state.yaw += (Math.random() - 0.5) * 0.1;
        
        // Clamp and update HUD
        dom.hudVelocity.innerText = `${Math.floor(state.velocity).toLocaleString()} km/h`;
        dom.hudAltitude.innerText = `${state.altitude.toFixed(2)} km`;
        dom.hudAttitude.innerText = `${state.pitch > 0 ? '+' : ''}${state.pitch.toFixed(1)}° / ${state.yaw > 0 ? '+' : ''}${state.yaw.toFixed(1)}°`;
        
        // Tilt horizon
        dom.hudHorizon.style.transform = `rotate(${-state.yaw * 3}deg) translateY(${state.pitch * 1.5}px)`;
    }, 300);
}

// ==========================================
// 4. TERMINAL CONSOLE LOGGING
// ==========================================
function logToTerminal(message, type = 'cyan') {
    const timestamp = new Date().toTimeString().split(' ')[0];
    const logLine = document.createElement('div');
    logLine.className = `log-line text-${type}`;
    logLine.innerText = `[${timestamp}] ${message}`;
    
    dom.terminalLog.appendChild(logLine);
    dom.terminalLog.scrollTop = dom.terminalLog.scrollHeight;
    
    // Maintain maximum 30 logs for rendering speed
    while (dom.terminalLog.children.length > 30) {
        dom.terminalLog.removeChild(dom.terminalLog.firstChild);
    }
}

// ==========================================
// 5. ML INPUTS GRID & RANDOM DATA GENERATOR
// ==========================================
function fillSampleData() {
    logToTerminal("INITIATING TELEMETRY MATRIX INJECTION...", "cyan");
    
    const inputs = dom.form.querySelectorAll('input[type="number"]');
    inputs.forEach((input, index) => {
        // Create realistic random floats or ints based on feature indices
        let val;
        if (index % 3 === 0) {
            val = (Math.random() * 100).toFixed(2); // Large ranges (e.g. Engine heat)
        } else if (index % 3 === 1) {
            val = (Math.random() * 2 - 1).toFixed(4); // Normalised telemetry deviation
        } else {
            val = Math.floor(Math.random() * 1000); // Integer coefficients
        }
        
        // Smooth input visual effect
        setTimeout(() => {
            input.value = val;
            const parent = input.closest('.input-card');
            parent.style.borderColor = 'var(--color-green)';
            setTimeout(() => {
                parent.style.borderColor = '';
            }, 300);
        }, index * 40); // Cascading drop-in animation
    });
    
    setTimeout(() => {
        logToTerminal("SUCCESS: 17 FEATURES SATURATED WITH TELEMETRY SAMPLES.", "green");
    }, inputs.length * 40 + 100);
}

// ==========================================
// 6. TELEMETRY GRAPHICS (ChartJS)
// ==========================================
function initTelemetryGraph() {
    const ctx = document.getElementById('telemetry-chart').getContext('2d');
    
    // Neon gradients
    const gradCyan = ctx.createLinearGradient(0, 0, 0, 180);
    gradCyan.addColorStop(0, 'rgba(0, 240, 255, 0.4)');
    gradCyan.addColorStop(1, 'rgba(0, 240, 255, 0.0)');
    
    const gradOrange = ctx.createLinearGradient(0, 0, 0, 180);
    gradOrange.addColorStop(0, 'rgba(255, 91, 0, 0.4)');
    gradOrange.addColorStop(1, 'rgba(255, 91, 0, 0.0)');

    state.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array.from({length: 10}, (_, i) => `T-${10 - i}s`),
            datasets: [
                {
                    label: 'FLIGHT PATH RESOLVER (m/s²)',
                    borderColor: '#00f0ff',
                    borderWidth: 2,
                    backgroundColor: gradCyan,
                    fill: true,
                    data: [12, 19, 3, 5, 2, 3, 10, 15, 11, 14],
                    tension: 0.4,
                    pointBackgroundColor: '#00f0ff'
                },
                {
                    label: 'THERMAL FLUX (K)',
                    borderColor: '#ff5b00',
                    borderWidth: 2,
                    backgroundColor: gradOrange,
                    fill: true,
                    data: [5, 12, 10, 8, 15, 22, 18, 25, 20, 28],
                    tension: 0.4,
                    pointBackgroundColor: '#ff5b00'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#d1f4ff',
                        font: { family: 'Orbitron', size: 10 }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(0, 240, 255, 0.07)' },
                    ticks: { color: '#6e94a8', font: { family: 'Share Tech Mono' } }
                },
                y: {
                    grid: { color: 'rgba(0, 240, 255, 0.07)' },
                    ticks: { color: '#6e94a8', font: { family: 'Share Tech Mono' } }
                }
            }
        }
    });
}

// Compute new graph datasets using the 17 input features
function calculateFlightPath(e) {
    e.preventDefault();
    
    // Read 17 inputs
    const inputs = Array.from(dom.form.querySelectorAll('input[type="number"]')).map(inp => parseFloat(inp.value) || 0);
    
    if (inputs.length < 17) {
        logToTerminal("CRITICAL: DATA MATRIX INCOMPLETE. PLEASE VERIFY 17 TELEMETRY BOXES.", "orange");
        return;
    }
    
    logToTerminal("INITIATING WARP ENGINE FLIGHT SOLVER...", "orange");
    state.isWarping = true;
    
    // Trigger warp audio/visual simulated shockwave in console
    setTimeout(() => logToTerminal("SOLVING GAUSSIAN EQUATION TRAJECTORIES...", "cyan"), 400);
    setTimeout(() => logToTerminal("RE-ROUTING ION FLOW VIA CORE COEFFICIENTS...", "cyan"), 800);
    
    // Generate new graph data points using 17 input parameters
    // We compute curves where inputs act as scale, frequency, phase, and offsets
    const dataPoints1 = [];
    const dataPoints2 = [];
    const labels = [];
    
    for (let t = 0; t < 15; t++) {
        labels.push(`T+${t}s`);
        
        // Complex sci-fi telemetry curves mapping features
        let val1 = Math.sin(t * (inputs[0] || 1) + (inputs[1] || 0)) * (inputs[2] || 15) 
                 + Math.cos(t * (inputs[3] || 0.5)) * (inputs[4] || 10) 
                 + (inputs[5] || 0) * 0.1 
                 + (inputs[16] || 0) * t * 0.05;
                 
        let val2 = Math.cos(t * (inputs[6] || 0.2) + (inputs[7] || 0.5)) * (inputs[8] || 25) 
                 + Math.sin(t * (inputs[9] || 0.1)) * (inputs[10] || 5) 
                 + (inputs[11] || 20) 
                 - (inputs[12] || 0.1) * t;
                 
        // Add random slight jitters from features 13, 14, 15
        val1 += (Math.random() - 0.5) * (inputs[13] || 1) * 0.5;
        val2 += (Math.random() - 0.5) * (inputs[14] || 1) * 0.5;
        
        dataPoints1.push(parseFloat(val1.toFixed(2)));
        dataPoints2.push(parseFloat(val2.toFixed(2)));
    }
    
    // Warp completed visual feedback
    setTimeout(() => {
        state.isWarping = false;
        
        // Update Chart
        state.chart.data.labels = labels;
        state.chart.data.datasets[0].data = dataPoints1;
        state.chart.data.datasets[1].data = dataPoints2;
        
        // Update line label dynamically to show calculation success
        state.chart.data.datasets[0].label = `SOLVED TRAJECTORY (coeff: ${inputs[0].toFixed(1)})`;
        state.chart.data.datasets[1].label = `CORE REACTOR TEMP (coeff: ${inputs[16].toFixed(1)})`;
        
        state.chart.update();
        
        // Randomise some visual cockpit dials slightly to show change
        document.querySelector('.thrust-fill').style.width = `${Math.min(100, Math.max(10, Math.floor(Math.abs(inputs[0] * 5))))}%`;
        document.querySelector('.reactor-fill').style.width = `${Math.min(100, Math.max(15, Math.floor(Math.abs(inputs[16] * 0.8))))}%`;
        document.querySelector('.plasma-fill').style.width = `${Math.min(100, Math.max(5, Math.floor(Math.abs(inputs[5] * 2))))}%`;
        
        // Determine anomaly status based on computed values
        const avgTemp = dataPoints2.reduce((sum, val) => sum + val, 0) / dataPoints2.length;
        const maxTrajectory = Math.max(...dataPoints1);
        const hasAnomaly = avgTemp > 300 || maxTrajectory > 120 || inputs[16] > 600 || inputs[0] < -20;
        
        const statusElement = document.querySelector('.system-status');
        if (hasAnomaly) {
            statusElement.innerHTML = '<span class="pulse-dot"></span>SYS STATUS: ANOMALY DETECTED';
            statusElement.classList.add('anomaly');
            
            // Set widgets to flashing warnings
            document.getElementById('hud-velocity').style.color = 'var(--color-orange)';
            document.getElementById('hud-altitude').style.color = 'var(--color-orange)';
            
            logToTerminal("WARNING: CRITICAL DIVERGENCE DETECTED. REACTOR CORE ENGINE FLUX STABILITY LOST!", "orange");
        } else {
            statusElement.innerHTML = '<span class="pulse-dot"></span>SYS STATUS: NOMINAL / STABLE';
            statusElement.classList.remove('anomaly');
            
            // Restore normal widget color
            document.getElementById('hud-velocity').style.color = '';
            document.getElementById('hud-altitude').style.color = '';
            
            logToTerminal("SUCCESS: HYPERSPACE MATRIX STABILIZED. FLIGHT NOMINAL.", "green");
        }
    }, 2000);
}

// ==========================================
// 7. INITIALIZER BINDING & BOOT SEQUENCE
// ==========================================
function runBootSequence() {
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += Math.floor(Math.random() * 5) + 1;
        if (progress >= 100) {
            progress = 100;
            clearInterval(progressInterval);
            
            dom.loaderStatus.innerText = "GDFC RECONFIGURED // ACTIVE";
            dom.loaderPercentage.innerText = "100%";
            dom.progressBar.style.width = "100%";
            
            setTimeout(() => {
                dom.bootLoader.classList.add('fade-out');
                logToTerminal("GDFC BOOT SEQUENCE COMPLETED.", "green");
                logToTerminal("ALL AVIONICS MATRIX CHANNELS ACTIVE.", "green");
            }, 600);
        } else {
            let status = "INITIALIZING AVIONICS MATRIX...";
            if (progress > 20 && progress <= 40) {
                status = "CALIBRATING SENSOR COHERENCE...";
            } else if (progress > 40 && progress <= 65) {
                status = "ESTABLISHING SATELLITE COMMS LINK...";
            } else if (progress > 65 && progress <= 85) {
                status = "STABILIZING THRUST REACTOR CHAMBERS...";
            } else if (progress > 85) {
                status = "ALIGNING GEOMAGNETIC FLIGHT CONTROLLER...";
            }
            
            dom.loaderStatus.innerText = status;
            dom.loaderPercentage.innerText = `${String(progress).padStart(2, '0')}%`;
            dom.progressBar.style.width = `${progress}%`;
        }
    }, 40 + Math.random() * 50);
}

document.addEventListener('DOMContentLoaded', () => {
    initStarfield();
    initRadar();
    initTelemetryGraph();
    startTelemetryOscillation();
    
    // Button listeners
    dom.btnFillSample.addEventListener('click', fillSampleData);
    dom.form.addEventListener('submit', calculateFlightPath);
    
    logToTerminal("WARP AVIONICS STABLE. AWAITING INPUT VECTOR MATRIX.", "green");
    
    // Start loader progress simulation
    runBootSequence();
});
