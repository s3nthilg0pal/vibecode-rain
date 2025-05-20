const canvas = document.getElementById('rainCanvas');
const ctx = canvas.getContext('2d');

// Control elements
const controlPanel = document.getElementById('controlPanel');
const controlToggle = document.getElementById('controlToggle');
const windSpeedInput = document.getElementById('windSpeed');
const rainSpeedInput = document.getElementById('rainSpeed');
const dropSizeInput = document.getElementById('dropSize');
const backgroundColorInput = document.getElementById('backgroundColor');
const rainColorInput = document.getElementById('rainColor');
const lightningOnBtn = document.getElementById('lightningOn');
const lightningOffBtn = document.getElementById('lightningOff');
const lightningFlashBtn = document.getElementById('lightningFlash');

// Audio context for thunder
let audioContext;
const thunderSounds = [
    'https://assets.mixkit.co/sfx/preview/mixkit-thunder-rumble-1434.mp3',
    'https://assets.mixkit.co/sfx/preview/mixkit-thunder-clap-1435.mp3',
    'https://assets.mixkit.co/sfx/preview/mixkit-thunder-rumble-1436.mp3'
];

// Initialize audio
function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// Play thunder sound
async function playThunder() {
    if (!audioContext) initAudio();
    
    try {
        const soundIndex = Math.floor(Math.random() * thunderSounds.length);
        const response = await fetch(thunderSounds[soundIndex]);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        const source = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();
        
        // Random volume between 0.3 and 0.7
        gainNode.gain.value = Math.random() * 0.4 + 0.3;
        
        source.buffer = audioBuffer;
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        source.start(0);
    } catch (error) {
        console.error('Error playing thunder sound:', error);
    }
}

// Update value displays
function updateValueDisplay(input) {
    input.nextElementSibling.textContent = input.value;
}

// Add event listeners to inputs
[windSpeedInput, rainSpeedInput, dropSizeInput].forEach(input => {
    input.addEventListener('input', () => updateValueDisplay(input));
});

// Set canvas size to window size
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// Initial resize
resizeCanvas();

// Handle window resize
window.addEventListener('resize', resizeCanvas);

// Random number between min and max
function random(min, max) {
    return Math.random() * (max - min) + min;
}

// Convert hex to rgba
function hexToRGBA(hex, alpha = 1) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Lightning class
class Lightning {
    constructor() {
        this.reset();
        this.autoMode = true;
        this.strikePoints = [];
    }

    reset() {
        this.active = false;
        this.intensity = 0;
        this.duration = random(50, 150);
        this.fadeSpeed = random(0.02, 0.05);
        this.nextFlash = random(300, 1000);
        this.countdown = this.nextFlash;
        this.strikePoints = [];
    }

    generateStrikePoints() {
        this.strikePoints = [];
        const startX = random(0, canvas.width);
        const segments = Math.floor(random(3, 6));
        let currentX = startX;
        let currentY = 0;
        
        // Generate main strike path
        for (let i = 0; i < segments; i++) {
            const nextX = currentX + random(-50, 50);
            const nextY = currentY + (canvas.height / segments);
            
            // Add main segment
            this.strikePoints.push({
                x1: currentX,
                y1: currentY,
                x2: nextX,
                y2: nextY,
                width: random(2, 4)
            });
            
            // Add branches
            if (i > 0 && Math.random() > 0.5) {
                const branchLength = random(20, 50);
                const angle = random(-Math.PI/4, Math.PI/4);
                const branchX = nextX + Math.cos(angle) * branchLength;
                const branchY = nextY + Math.sin(angle) * branchLength;
                
                this.strikePoints.push({
                    x1: nextX,
                    y1: nextY,
                    x2: branchX,
                    y2: branchY,
                    width: random(1, 2)
                });
            }
            
            currentX = nextX;
            currentY = nextY;
        }
    }

    update() {
        if (this.active) {
            this.intensity -= this.fadeSpeed;
            if (this.intensity <= 0) {
                this.active = false;
                if (this.autoMode) {
                    this.reset();
                }
            }
        } else if (this.autoMode) {
            this.countdown--;
            if (this.countdown <= 0) {
                this.trigger();
            }
        }
    }

    trigger() {
        this.active = true;
        this.intensity = 1;
        this.generateStrikePoints();
    }

    draw() {
        if (this.active) {
            // Draw lightning bolts
            ctx.strokeStyle = `rgba(255, 255, 255, ${this.intensity * 0.8})`;
            ctx.lineCap = 'square';
            
            this.strikePoints.forEach(segment => {
                ctx.lineWidth = segment.width;
                ctx.beginPath();
                ctx.moveTo(segment.x1, segment.y1);
                ctx.lineTo(segment.x2, segment.y2);
                ctx.stroke();
            });

            // Draw ground impact
            const lastPoint = this.strikePoints[this.strikePoints.length - 1];
            if (lastPoint) {
                const impactSize = 20 * this.intensity;
                ctx.fillStyle = `rgba(255, 255, 255, ${this.intensity * 0.5})`;
                ctx.fillRect(
                    lastPoint.x2 - impactSize/2,
                    lastPoint.y2 - 5,
                    impactSize,
                    10
                );
            }

            // Draw flash overlay
            ctx.fillStyle = `rgba(255, 255, 255, ${this.intensity * 0.1})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }

    setAutoMode(enabled) {
        this.autoMode = enabled;
        if (!enabled) {
            this.active = false;
            this.intensity = 0;
        }
    }
}

// Rain drop class
class RainDrop {
    constructor() {
        this.reset();
    }

    reset() {
        // Create a grid-based distribution
        const gridSize = 30; // Size of each grid cell
        const gridX = Math.floor(random(0, canvas.width / gridSize));
        const gridY = Math.floor(random(-3, 0)); // Start above screen
        
        this.x = gridX * gridSize + random(0, gridSize);
        this.y = gridY * gridSize + random(0, gridSize);
        
        this.speed = random(2, 4); // Reduced speed range
        this.size = random(1, parseInt(dropSizeInput.value));
        this.opacity = random(0.3, 0.7); // Adjusted opacity range
        this.windVariation = random(-0.5, 0.5); // Reduced wind variation
        this.angle = random(-0.1, 0.1); // Reduced angle variation
        this.life = random(0.9, 1); // Slower fade
    }

    update() {
        // Apply base speed and rain speed control
        this.y += this.speed * parseFloat(rainSpeedInput.value);
        
        // Apply wind with random variation and angle
        const windEffect = parseFloat(windSpeedInput.value) + this.windVariation;
        this.x += windEffect + this.angle;
        
        // Gradually reduce opacity
        this.opacity *= this.life;
        
        // Reset if drop goes off screen or becomes too transparent
        if (this.y > canvas.height || this.x < 0 || this.x > canvas.width || this.opacity < 0.1) {
            this.reset();
        }
    }

    draw() {
        ctx.fillStyle = hexToRGBA(rainColorInput.value, this.opacity);
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }
}

// Create rain drops
const drops = [];
const dropCount = Math.floor((canvas.width * canvas.height) / 2000); // Reduced density

for (let i = 0; i < dropCount; i++) {
    drops.push(new RainDrop());
}

// Create lightning
const lightning = new Lightning();

// Lightning control event listeners
lightningOnBtn.addEventListener('click', () => {
    lightning.setAutoMode(true);
    lightningOnBtn.classList.add('active');
    lightningOffBtn.classList.remove('active');
});

lightningOffBtn.addEventListener('click', () => {
    lightning.setAutoMode(false);
    lightningOffBtn.classList.add('active');
    lightningOnBtn.classList.remove('active');
});

lightningFlashBtn.addEventListener('click', () => {
    lightning.trigger();
});

// Set initial state
lightningOnBtn.classList.add('active');

// Toggle control panel
controlToggle.addEventListener('click', () => {
    controlPanel.classList.toggle('visible');
});

// Close control panel when clicking outside
document.addEventListener('click', (event) => {
    if (!controlPanel.contains(event.target) && !controlToggle.contains(event.target)) {
        controlPanel.classList.remove('visible');
    }
});

// Animation loop
function animate() {
    // Use background color with fade effect
    const bgColor = hexToRGBA(backgroundColorInput.value, 0.1);
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update and draw lightning
    lightning.update();
    lightning.draw();

    // Draw rain drops
    drops.forEach(drop => {
        drop.update();
        drop.draw();
    });

    requestAnimationFrame(animate);
}

// Start animation
animate(); 