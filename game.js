import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// Ensure death-fade overlay exists before any game logic
if (!document.getElementById('death-fade')) {
    const fade = document.createElement('div');
    fade.id = 'death-fade';
    fade.style.position = 'fixed';
    fade.style.top = '0';
    fade.style.left = '0';
    fade.style.width = '100vw';
    fade.style.height = '100vh';
    fade.style.background = 'black';
    fade.style.opacity = '0';
    fade.style.pointerEvents = 'none';
    fade.style.transition = 'opacity 1s';
    fade.style.zIndex = '999'; // Lower than death menu
    document.body.appendChild(fade);
}

// Game variables
let score = 0;
let ammo = 10;
let maxAmmo = 10;
let isReloading = false;
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let prevTime = performance.now();
const MOVEMENT_SPEED = 200.0;
let solarPanels = [];
let eskomTargets = [];
let isAiming = false;
const NORMAL_SPEED = 20.0;
const AIM_SPEED = 10.0;
const NORMAL_CROSSHAIR_MIN_GAP = 8;
const AIM_CROSSHAIR_MIN_GAP = 2;
const NORMAL_CROSSHAIR_MAX_GAP = 20;
const AIM_CROSSHAIR_MAX_GAP = 8;
const NORMAL_SPREAD = Math.PI / 18; // ~10 deg
const AIM_SPREAD = Math.PI / 90;    // ~2 deg
let canJump = true;
let verticalVelocity = 0;
const GRAVITY = 350;
const JUMP_STRENGTH = 75;
const GROUND_Y = 2;
let generators = [];
let boxes = [];
let stairs = [];
let isDead = false;
let startTime = Date.now();
let invulnerableUntil = 0;

let isSprinting = false;
const SPRINT_SPEED = 36.0; // 80% faster than normal

let crosshairGap = 8;
const crosshairStep = 1.5;

let isCrawling = false;
const CRAWL_SPEED = 10.0; // Half normal speed

let targetCameraHeight = 1.6;

let playerFeetY = 2; // Initial feet position

// Minimap setup
const minimapCanvas = document.getElementById('minimap');
const minimapCtx = minimapCanvas.getContext('2d');
minimapCanvas.width = 200;
minimapCanvas.height = 200;
const MAP_SCALE = 2; // Scale factor for the minimap
const MAP_OFFSET = 50; // Offset to center the map

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x00ffff); // Cyan for debug
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// Add this global array to track all solid surfaces
let solidSurfaces = [];

// Create the power station environment
createPowerStation();

// Set camera above terrain and looking at center
camera.position.set(0, 15, 30);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('game-container').appendChild(renderer.domElement);

// Controls
const controls = new PointerLockControls(camera, document.body);

// Create stars
function createStars() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({
        color: 0xFFFFFF,
        size: 0.1,
        transparent: true
    });

    const starsVertices = [];
    for (let i = 0; i < 10000; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = (Math.random() - 0.5) * 2000;
        starsVertices.push(x, y, z);
    }

    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);
}

// Create moon
function createMoon() {
    const moonGeometry = new THREE.SphereGeometry(5, 32, 32);
    const moonMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFFFCC,
        emissive: 0xFFFFCC,
        emissiveIntensity: 0.5
    });
    const moon = new THREE.Mesh(moonGeometry, moonMaterial);
    moon.position.set(50, 50, -100);
    scene.add(moon);

    // Add moon glow
    const moonGlow = new THREE.PointLight(0xFFFFCC, 0.5, 200);
    moonGlow.position.copy(moon.position);
    scene.add(moonGlow);
}

// Create the power station environment
function createPowerStation() {
    // Create stars and moon
    createStars();
    createMoon();

    // Create a larger ground plane
    const groundGeometry = new THREE.PlaneGeometry(200, 200); // Doubled size
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.9,
        metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    solidSurfaces.push(ground);

    // Night lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.2);
    scene.add(ambientLight);

    // Moonlight (directional light)
    const moonLight = new THREE.DirectionalLight(0xFFFFCC, 0.5);
    moonLight.position.set(50, 50, -100);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 2048;
    moonLight.shadow.mapSize.height = 2048;
    scene.add(moonLight);

    // Add some subtle blue ambient light for night atmosphere
    const nightAmbient = new THREE.AmbientLight(0x4040ff, 0.1);
    scene.add(nightAmbient);

    // Create buildings and structures
    const buildingMaterial = new THREE.MeshStandardMaterial({
        color: 0x666666,
        roughness: 0.7,
        metalness: 0.3
    });

    const windowMaterial = new THREE.MeshStandardMaterial({
        color: 0x88ccff,
        emissive: 0x88ccff,
        emissiveIntensity: 0.2,
        metalness: 0.8,
        roughness: 0.2
    });

    solidSurfaces = [];

    // Main street buildings (inspired by King's Row)
    function createBuilding(width, height, depth, x, z) {
        const building = new THREE.Group();
        
        // Main structure
        const main = new THREE.Mesh(
            new THREE.BoxGeometry(width, height, depth),
            buildingMaterial
        );
        building.add(main);

        // Add windows
        const windowSize = 2;
        const windowSpacing = 4;
        const numWindowsX = Math.floor(width / windowSpacing);
        const numWindowsY = Math.floor(height / windowSpacing);
        
        for (let i = 0; i < numWindowsX; i++) {
            for (let j = 0; j < numWindowsY; j++) {
                const window = new THREE.Mesh(
                    new THREE.BoxGeometry(windowSize, windowSize, 0.1),
                    windowMaterial
                );
                window.position.set(
                    -width/2 + windowSpacing/2 + i * windowSpacing,
                    -height/2 + windowSpacing/2 + j * windowSpacing,
                    depth/2 + 0.1
                );
                building.add(window);
            }
        }

        building.position.set(x, height/2, z);
        building.castShadow = true;
        building.receiveShadow = true;
        scene.add(building);
        // Add the main mesh to solidSurfaces for collision (do NOT move its position)
        solidSurfaces.push(main);
        return building;
    }

    // Create the main street buildings
    createBuilding(20, 15, 10, -70, 0);  // Left side building (was -80)
    createBuilding(20, 15, 10, 70, 0);   // Right side building (was 80)
    createBuilding(15, 20, 8, 0, -70);   // Back building (was -80)
    createBuilding(15, 12, 8, 0, 70);    // Front building (was 80)
    // Additional buildings
    createBuilding(18, 16, 9, -50, -50); // Corner buildings (was -60)
    createBuilding(18, 16, 9, 50, -50);
    createBuilding(18, 16, 9, -50, 50);
    createBuilding(18, 16, 9, 50, 50);
    createBuilding(16, 14, 8, -30, -30); // Inner buildings (was -40)
    createBuilding(16, 14, 8, 30, -30);
    createBuilding(16, 14, 8, -30, 30);
    createBuilding(16, 14, 8, 30, 30);

    // Create high ground platforms (like the balconies in King's Row)
    function createPlatform(width, depth, x, y, z) {
        const platform = new THREE.Mesh(
            new THREE.BoxGeometry(width, 1, depth),
            new THREE.MeshStandardMaterial({
                color: 0x444444,
                roughness: 0.6,
                metalness: 0.4
            })
        );
        platform.position.set(x, y, z);
        platform.castShadow = true;
        platform.receiveShadow = true;
        scene.add(platform);
        solidSurfaces.push(platform);

        // Add railings
        const railingMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            metalness: 0.8,
            roughness: 0.2
        });

        // Left railing
        const leftRailing = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 1, depth),
            railingMaterial
        );
        leftRailing.position.set(x - width/2, y + 0.5, z);
        scene.add(leftRailing);
        solidSurfaces.push(leftRailing);

        // Right railing
        const rightRailing = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 1, depth),
            railingMaterial
        );
        rightRailing.position.set(x + width/2, y + 0.5, z);
        scene.add(rightRailing);
        solidSurfaces.push(rightRailing);

        return platform;
    }

    // Create high ground platforms
    createPlatform(10, 5, -50, 8, 0);  // Left high ground (was -60)
    createPlatform(10, 5, 50, 8, 0);   // Right high ground (was 60)
    createPlatform(8, 4, 0, 10, -50);  // Back high ground (was -60)
    createPlatform(8, 4, 0, 6, 50);    // Front high ground (was 60)
    // Additional platforms
    createPlatform(8, 4, -40, 12, -40); // Corner platforms (was -50)
    createPlatform(8, 4, 40, 12, -40);
    createPlatform(8, 4, -40, 12, 40);
    createPlatform(8, 4, 40, 12, 40);
    createPlatform(6, 3, -20, 8, -20); // Inner platforms (was -30)
    createPlatform(6, 3, 20, 8, -20);
    createPlatform(6, 3, -20, 8, 20);
    createPlatform(6, 3, 20, 8, 20);

    // Replace stairs with ramps
    function createRamp(width, height, depth, x, y, z, rotation) {
        const ramp = new THREE.Mesh(
            new THREE.BoxGeometry(width, height, depth),
            new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.2, roughness: 0.8 })
        );
        ramp.position.set(x, y + height / 2, z);
        ramp.rotation.z = -Math.atan(height / depth); // Slope
        ramp.rotation.y = rotation;
        ramp.castShadow = true;
        ramp.receiveShadow = true;
        scene.add(ramp);
        solidSurfaces.push(ramp);
        return ramp;
    }

    // Main ramp (replace stairs)
    createRamp(6, 5, 10, 40, 0, -35, 0); // Example ramp (was 50, -45)

    // Add some industrial elements (pipes, etc.)
    function createPipe(radius, height, x, y, z) {
        const pipe = new THREE.Mesh(
            new THREE.CylinderGeometry(radius, radius, height, 8),
            new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.2 })
        );
        pipe.position.set(x, y, z);
        pipe.castShadow = true;
        pipe.receiveShadow = true;
        scene.add(pipe);
        solidSurfaces.push(pipe);
        return pipe;
    }

    // Add pipes
    createPipe(0.5, 10, -35, 5, 0); // was -45
    createPipe(0.5, 10, 35, 5, 0);  // was 45
    createPipe(0.5, 8, 0, 4, -35);  // was -45
    createPipe(0.5, 8, 0, 4, 35);   // was 45

    // Add generators (now as industrial equipment)
    const generatorPositions = [
        { x: -30, z: -30 },
        { x: 30, z: -30 },
        { x: -30, z: 30 },
        { x: 30, z: 30 },
        { x: 45, z: 0 },
        { x: -45, z: 0 },
        { x: 0, z: 45 },
        { x: 0, z: -45 }
    ];
    generators = [];
    generatorPositions.forEach(pos => {
        const generator = new THREE.Group();
        
        // Main cylinder
        const mainCylinder = new THREE.Mesh(
            new THREE.CylinderGeometry(2, 2, 6, 16),
            new THREE.MeshStandardMaterial({ color: 0xff2222, metalness: 0.8, roughness: 0.2 })
        );
        generator.add(mainCylinder);

        // Warning light
        const warningLight = new THREE.PointLight(0xff0000, 1, 10);
        warningLight.position.set(0, 4, 0);
        generator.add(warningLight);

        // Light fixture
        const lightFixture = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 16, 16),
            new THREE.MeshStandardMaterial({ 
                color: 0xff0000,
                emissive: 0xff0000,
                emissiveIntensity: 0.5
            })
        );
        lightFixture.position.set(0, 4, 0);
        generator.add(lightFixture);

        // Add pipes
        const pipeMaterial = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.2 });
        for (let i = 0; i < 4; i++) {
            const pipe = new THREE.Mesh(
                new THREE.CylinderGeometry(0.3, 0.3, 4, 8),
                pipeMaterial
            );
            pipe.position.set(
                Math.cos(i * Math.PI/2) * 2,
                2,
                Math.sin(i * Math.PI/2) * 2
            );
            pipe.rotation.x = Math.PI/2;
            generator.add(pipe);
        }

        generator.position.set(pos.x, 3, pos.z);
        generator.castShadow = true;
        generator.receiveShadow = true;
        scene.add(generator);
        generators.push(generator);
    });

    // Add more cars
    const carPositions = [
        { x: -65, z: 0, rotation: 0 },
        { x: 65, z: 0, rotation: Math.PI },
        { x: 0, z: -65, rotation: Math.PI/2 },
        { x: 0, z: 65, rotation: -Math.PI/2 },
        { x: -45, z: -45, rotation: Math.PI/4 },
        { x: 45, z: -45, rotation: 3*Math.PI/4 },
        { x: -45, z: 45, rotation: -Math.PI/4 },
        { x: 45, z: 45, rotation: -3*Math.PI/4 },
        { x: -25, z: -25, rotation: Math.PI/3 },
        { x: 25, z: -25, rotation: 2*Math.PI/3 },
        { x: -25, z: 25, rotation: -Math.PI/3 },
        { x: 25, z: 25, rotation: -2*Math.PI/3 }
    ];
    
    carPositions.forEach(pos => {
        createCar(pos.x, pos.z, pos.rotation);
    });
    
    // Add more boxes with increased spacing
    const boxPositions = [
        // Outer ring
        { x: -30, z: 30, size: 4, color: 0x888888 },
        { x: 30, z: -30, size: 6, color: 0x666666 },
        { x: 45, z: 45, size: 5, color: 0x444444 },
        { x: -45, z: -45, size: 3, color: 0xaaaaaa },
        { x: -60, z: 0, size: 4, color: 0x777777 },
        { x: 60, z: 0, size: 4, color: 0x777777 },
        // Inner ring
        { x: -15, z: 15, size: 3, color: 0x999999 },
        { x: 15, z: -15, size: 4, color: 0x777777 },
        { x: 22, z: 22, size: 3, color: 0x555555 },
        { x: -22, z: -22, size: 4, color: 0xbbbbbb }
    ];
    
    boxPositions.forEach(pos => {
        const box = new THREE.Mesh(
            new THREE.BoxGeometry(pos.size, pos.size, pos.size),
            new THREE.MeshStandardMaterial({ 
                color: pos.color,
                metalness: 0.3,
                roughness: 0.7
            })
        );
        box.position.set(pos.x, pos.size/2, pos.z);
        box.castShadow = true;
        box.receiveShadow = true;
        scene.add(box);
        boxes.push(box);
        solidSurfaces.push(box);
    });

    // Add more ramps
    const rampPositions = [
        { x: 40, y: 0, z: -35, rotation: 0 },
        { x: -40, y: 0, z: 35, rotation: Math.PI },
        { x: 35, y: 0, z: 40, rotation: Math.PI/2 },
        { x: -35, y: 0, z: -40, rotation: -Math.PI/2 }
    ];
    
    rampPositions.forEach(pos => {
        createRamp(6, 5, 10, pos.x, pos.y, pos.z, pos.rotation);
    });
}

// Load Eskom logo texture
const eskomTexture = new THREE.TextureLoader().load('eskom.png');

// Create initial targets
for (let i = 0; i < 5; i++) {
    createEskomTarget();
}

// Shooting mechanics
document.addEventListener('mousedown', (event) => {
    if (event.button === 0 && ammo > 0 && !isReloading) { // Left click
        createSolarPanel();
        ammo--;
        document.getElementById('ammo').textContent = `Solar Panels: ${ammo}`;
        if (ammo === 0 && !isReloading) {
            reload();
        }
    }
});

// Function to draw the minimap
function drawMinimap() {
    // Clear the minimap
    minimapCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    minimapCtx.fillRect(0, 0, minimapCanvas.width, minimapCanvas.height);
    
    // Draw the walls
    minimapCtx.strokeStyle = 'white';
    minimapCtx.lineWidth = 2;
    minimapCtx.strokeRect(0, 0, minimapCanvas.width, minimapCanvas.height);
    
    // Draw the player as a smaller arrow, tip at player position
    const px = (camera.position.x + MAP_OFFSET) * MAP_SCALE;
    const pz = (camera.position.z + MAP_OFFSET) * MAP_SCALE;
    const arrowLength = 12; // smaller
    const arrowWidth = 7;   // smaller
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();
    const angle = Math.atan2(-direction.x, direction.z) + Math.PI;
    
    minimapCtx.save();
    minimapCtx.translate(px, pz);
    minimapCtx.rotate(angle);
    minimapCtx.beginPath();
    minimapCtx.moveTo(0, 0); // Tip of arrow at player position
    minimapCtx.lineTo(-arrowWidth / 2, arrowLength); // Left base
    minimapCtx.lineTo(arrowWidth / 2, arrowLength);  // Right base
    minimapCtx.closePath();
    minimapCtx.fillStyle = 'blue';
    minimapCtx.fill();
    minimapCtx.restore();
    
    // Draw Eskom targets
    eskomTargets.forEach(target => {
        minimapCtx.fillStyle = 'red';
        minimapCtx.beginPath();
        minimapCtx.arc(
            (target.position.x + MAP_OFFSET) * MAP_SCALE,
            (target.position.z + MAP_OFFSET) * MAP_SCALE,
            3, 0, Math.PI * 2
        );
        minimapCtx.fill();
    });
    
    // Draw solar panels
    solarPanels.forEach(panel => {
        minimapCtx.fillStyle = 'green';
        minimapCtx.beginPath();
        minimapCtx.arc(
            (panel.position.x + MAP_OFFSET) * MAP_SCALE,
            (panel.position.z + MAP_OFFSET) * MAP_SCALE,
            2, 0, Math.PI * 2
        );
        minimapCtx.fill();
    });
}

// Game loop
function animate() {
    if (isDead) return; // Stop updating if dead
    requestAnimationFrame(animate);
    
    const time = performance.now();
    const delta = (time - prevTime) / 1000;
    let MOVEMENT_SPEED = NORMAL_SPEED;
    if (isAiming) MOVEMENT_SPEED = AIM_SPEED;
    else if (isCrawling) MOVEMENT_SPEED = CRAWL_SPEED;
    else if (isSprinting && (moveForward||moveBackward||moveLeft||moveRight)) MOVEMENT_SPEED = SPRINT_SPEED;
    const standHeight = 1.6;
    const crawlHeight = 0.2;

    // --- X/Z movement with robust collision ---
    let moveX = 0, moveZ = 0;
    if (moveForward) moveZ += MOVEMENT_SPEED * delta;
    if (moveBackward) moveZ -= MOVEMENT_SPEED * delta;
    if (moveLeft) moveX -= MOVEMENT_SPEED * delta;
    if (moveRight) moveX += MOVEMENT_SPEED * delta;

    let intendedPosition = camera.position.clone();
    let forward = new THREE.Vector3();
    controls.getDirection(forward);
    forward.y = 0;
    forward.normalize();
    let right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
    intendedPosition.add(forward.clone().multiplyScalar(moveZ));
    intendedPosition.add(right.clone().multiplyScalar(moveX));

    let collision = false;
    let stepUp = false;
    let stepUpY = 0;
    for (const surface of solidSurfaces) {
        surface.updateMatrixWorld();
        const box = new THREE.Box3().setFromObject(surface);
        const surfaceTop = box.max.y;
        // Use intended Y for collision check
        if (
            intendedPosition.x > box.min.x - 0.45 && intendedPosition.x < box.max.x + 0.45 &&
            intendedPosition.z > box.min.z - 0.45 && intendedPosition.z < box.max.z + 0.45
        ) {
            const feetAbove = intendedPosition.y - surfaceTop;
            // Allow walking/jumping on top
            if (feetAbove > -0.25 && feetAbove < 1.2) continue;
            // Allow a small step up if close to the top
            if (feetAbove > -0.6 && feetAbove <= -0.25) {
                stepUp = true;
                stepUpY = surfaceTop;
                continue;
            }
            // Otherwise, block if inside
            if (
                intendedPosition.y > box.min.y - 0.15 && intendedPosition.y < box.max.y + 0.15
            ) {
                collision = true;
                break;
            }
        }
    }
    if (!collision) {
        camera.position.x = intendedPosition.x;
        camera.position.z = intendedPosition.z;
        if (stepUp) {
            camera.position.y = stepUpY;
            verticalVelocity = 0;
            canJump = true;
        }
    }

    // --- Y movement (gravity, jumping, standing on structures) ---
    verticalVelocity -= GRAVITY * delta;
    playerFeetY += verticalVelocity * delta;

    let onSurface = false;
    let highestSurfaceY = GROUND_Y;
    solidSurfaces.forEach(surface => {
        surface.updateMatrixWorld();
        const box = new THREE.Box3().setFromObject(surface);
        if (
            camera.position.x > box.min.x - 0.3 && camera.position.x < box.max.x + 0.3 &&
            camera.position.z > box.min.z - 0.3 && camera.position.z < box.max.z + 0.3
        ) {
            const surfaceTop = box.max.y;
            const feetAbove = playerFeetY - surfaceTop;
            const headAbove = (playerFeetY + (isCrawling ? crawlHeight : standHeight)) - surfaceTop;
            // Check if we're on a surface or about to land on one
            if (
                (feetAbove >= -0.1 && feetAbove <= 1.2) || // Standing on surface
                (verticalVelocity <= 0 && feetAbove > -0.1 && feetAbove < 1.2) // About to land
            ) {
                if (headAbove > 0.1 && surfaceTop > highestSurfaceY) {
                    highestSurfaceY = surfaceTop;
                    onSurface = true;
                    if (verticalVelocity < 0) {
                        verticalVelocity = 0;
                    }
                }
            }
        }
    });

    if (onSurface || (verticalVelocity <= 0 && playerFeetY <= highestSurfaceY + 0.1)) {
        playerFeetY = highestSurfaceY;
        verticalVelocity = 0;
        canJump = true;
    } else if (!onSurface && playerFeetY <= GROUND_Y) {
        playerFeetY = GROUND_Y;
        verticalVelocity = 0;
        canJump = true;
    }

    // Set camera height based on crawl/stand
    camera.position.y = playerFeetY + (isCrawling ? crawlHeight : standHeight);
    
    // Update Eskom targets
    eskomTargets.forEach(target => {
        // Move target
        target.position.add(target.userData.velocity);
        // Bounce off walls
        if (Math.abs(target.position.x) > 45) {
            target.userData.velocity.x *= -1;
        }
        if (Math.abs(target.position.z) > 45) {
            target.userData.velocity.z *= -1;
        }
        // Spin the whole box
        if (target.userData.spinSpeed) {
            target.rotation.y += target.userData.spinSpeed;
        }
    });
    
    // Update solar panels
    for (let i = solarPanels.length - 1; i >= 0; i--) {
        const panel = solarPanels[i];
        panel.position.add(panel.userData.velocity);
        panel.rotation.x += 0.1;
        
        // Check for collisions with Eskom targets
        for (let j = eskomTargets.length - 1; j >= 0; j--) {
            const target = eskomTargets[j];
            if (panel.position.distanceTo(target.position) < 2) {
                // Hit effect
                const flash = new THREE.PointLight(0x00ff00, 1, 10);
                flash.position.copy(target.position);
                scene.add(flash);
                setTimeout(() => scene.remove(flash), 100);
                
                scene.remove(target);
                eskomTargets.splice(j, 1);
                scene.remove(panel);
                solarPanels.splice(i, 1);
                score += 100;
                document.getElementById('score').textContent = `Score: ${score}`;
                createEskomTarget();
                break;
            }
        }
        
        // Remove panels that are too far away or hit walls
        if (panel.position.length() > 100 || 
            Math.abs(panel.position.x) > 49 || 
            Math.abs(panel.position.z) > 49) {
            scene.remove(panel);
            solarPanels.splice(i, 1);
        }
    }
    
    // Update crosshair
    const isMoving = moveForward || moveBackward || moveLeft || moveRight;
    updateCrosshair(isMoving);
    
    // Draw the minimap
    drawMinimap();
    
    // Generator collision detection
    for (const generator of generators) {
        const dist = camera.position.distanceTo(generator.position);
        if (Date.now() < invulnerableUntil) continue; // Skip collision if invulnerable
        if (dist < 3.5 && camera.position.y < generator.position.y + 3) {
            isDead = true;
            playDeathAnimation(() => {
                // Show death menu after fade
                const menu = document.getElementById('death-menu');
                const timeSurvived = ((Date.now() - startTime) / 1000).toFixed(1);
                document.getElementById('death-stats').innerHTML = `Score: ${score}<br>Time Survived: ${timeSurvived} seconds`;
                menu.style.display = 'flex';
            });
            return;
        }
    }
    
    // At the end of animate, update sprint UI
    updateSprintUI();
    updateCrawlUI();
    
    prevTime = time;
    renderer.render(scene, camera);
}

// Initial camera position
camera.position.y = 2;

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start animation
animate();

// Add a function to create generators and obstacles
function createGeneratorsAndObstacles() {
    // Generators (stationary, deadly)
    const generatorPositions = [
        { x: -40, z: -40 },
        { x: 40, z: -40 },
        { x: -40, z: 40 },
        { x: 40, z: 40 },
        { x: 60, z: 0 },
        { x: -60, z: 0 },
        { x: 0, z: 60 },
        { x: 0, z: -60 }
    ];
    generators = [];
    generatorPositions.forEach(pos => {
        const generator = new THREE.Group();
        
        // Main cylinder
        const mainCylinder = new THREE.Mesh(
            new THREE.CylinderGeometry(2, 2, 6, 16),
            new THREE.MeshStandardMaterial({ color: 0xff2222, metalness: 0.8, roughness: 0.2 })
        );
        generator.add(mainCylinder);

        // Add warning lights
        const warningLight = new THREE.PointLight(0xff0000, 1, 10);
        warningLight.position.set(0, 4, 0);
        generator.add(warningLight);

        // Add warning light fixture
        const lightFixture = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 16, 16),
            new THREE.MeshStandardMaterial({ 
                color: 0xff0000,
                emissive: 0xff0000,
                emissiveIntensity: 0.5
            })
        );
        lightFixture.position.set(0, 4, 0);
        generator.add(lightFixture);

        // Add pipes
        const pipeMaterial = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.2 });
        for (let i = 0; i < 4; i++) {
            const pipe = new THREE.Mesh(
                new THREE.CylinderGeometry(0.3, 0.3, 4, 8),
                pipeMaterial
            );
            pipe.position.set(
                Math.cos(i * Math.PI/2) * 2,
                2,
                Math.sin(i * Math.PI/2) * 2
            );
            pipe.rotation.x = Math.PI/2;
            generator.add(pipe);
        }

        generator.position.set(pos.x, 3, pos.z);
        generator.castShadow = true;
        generator.receiveShadow = true;
        scene.add(generator);
        generators.push(generator);
    });

    // Boxes (obstacles) with more variety
    const boxPositions = [
        { x: -20, z: 20, size: 4, color: 0x888888 },
        { x: 20, z: -20, size: 6, color: 0x666666 },
        { x: 30, z: 30, size: 5, color: 0x444444 },
        { x: -30, z: -30, size: 3, color: 0xaaaaaa },
        { x: -40, z: 0, size: 4, color: 0x777777 },
        { x: 40, z: 0, size: 4, color: 0x777777 }
    ];
    boxes = [];
    boxPositions.forEach(pos => {
        const box = new THREE.Mesh(
            new THREE.BoxGeometry(pos.size, pos.size, pos.size),
            new THREE.MeshStandardMaterial({ 
                color: pos.color,
                metalness: 0.3,
                roughness: 0.7
            })
        );
        box.position.set(pos.x, pos.size/2, pos.z);
        box.castShadow = true;
        box.receiveShadow = true;
        scene.add(box);
        boxes.push(box);
        solidSurfaces.push(box);
    });

    // Stairs (more complex structure)
    stairs = [];
    const stairMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x555555,
        metalness: 0.2,
        roughness: 0.8
    });
    
    // Main staircase
    for (let i = 0; i < 5; i++) {
        const stair = new THREE.Mesh(
            new THREE.BoxGeometry(6, 1, 2),
            stairMaterial
        );
        stair.position.set(30, 0.5 + i, -30 + i * 2);
        stair.castShadow = true;
        stair.receiveShadow = true;
        scene.add(stair);
        stairs.push(stair);
        solidSurfaces.push(stair);
    }

    // Add railings to the stairs
    const railingMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x333333,
        metalness: 0.8,
        roughness: 0.2
    });
    
    // Left railing
    for (let i = 0; i < 5; i++) {
        const railing = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.1, 1, 8),
            railingMaterial
        );
        railing.position.set(33, 1 + i, -30 + i * 2);
        railing.castShadow = true;
        railing.receiveShadow = true;
        scene.add(railing);
        stairs.push(railing);
        solidSurfaces.push(railing);
    }

    // Right railing
    for (let i = 0; i < 5; i++) {
        const railing = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.1, 1, 8),
            railingMaterial
        );
        railing.position.set(27, 1 + i, -30 + i * 2);
        railing.castShadow = true;
        railing.receiveShadow = true;
        scene.add(railing);
        stairs.push(railing);
        solidSurfaces.push(railing);
    }
}

function playDeathAnimation(callback) {
    const fade = document.getElementById('death-fade');
    fade.style.opacity = '1';
    fade.style.pointerEvents = 'auto';
    setTimeout(() => {
        fade.style.pointerEvents = 'none'; // Allow clicks on menu
        if (callback) callback();
    }, 1200); // Wait for fade in
}

function playRespawnAnimation() {
    const fade = document.getElementById('death-fade');
    fade.style.opacity = '0';
    fade.style.pointerEvents = 'none';
}

// Add death menu HTML overlay
if (!document.getElementById('death-menu')) {
    const menu = document.createElement('div');
    menu.id = 'death-menu';
    menu.style.position = 'fixed';
    menu.style.top = '0';
    menu.style.left = '0';
    menu.style.width = '100vw';
    menu.style.height = '100vh';
    menu.style.background = 'rgba(0,0,0,0.85)';
    menu.style.display = 'none';
    menu.style.flexDirection = 'column';
    menu.style.justifyContent = 'center';
    menu.style.alignItems = 'center';
    menu.style.zIndex = '1000'; // Above fade overlay
    menu.innerHTML = `
        <div style="color:white;font-size:2em;margin-bottom:20px;">You Died!</div>
        <div id="death-stats" style="color:white;font-size:1.2em;margin-bottom:20px;"></div>
        <button id="respawn-btn" style="font-size:1.2em;padding:10px 30px;">Respawn</button>
    `;
    document.body.appendChild(menu);
    document.getElementById('respawn-btn').onclick = () => {
        menu.style.display = 'none';
        restartGame();
    };
}

// Add restartGame function
function restartGame() {
    // Always respawn at the original starting point
    playerFeetY = 2;
    camera.position.set(0, playerFeetY + (isCrawling ? 0.7 : 1.6), 0);
    velocity.set(0, 0, 0);
    verticalVelocity = 0;
    canJump = true;
    moveForward = false;
    moveBackward = false;
    moveLeft = false;
    moveRight = false;
    // Remove all targets, panels, generators, boxes, stairs
    eskomTargets.forEach(t => scene.remove(t));
    eskomTargets = [];
    solarPanels.forEach(p => scene.remove(p));
    solarPanels = [];
    generators.forEach(g => scene.remove(g));
    boxes.forEach(b => scene.remove(b));
    stairs.forEach(s => scene.remove(s));
    // Reset score/ammo
    score = 0;
    ammo = maxAmmo;
    isReloading = false;
    document.getElementById('score').textContent = `Score: ${score}`;
    document.getElementById('ammo').textContent = `Solar Panels: ${ammo}`;
    // Recreate targets and obstacles
    for (let i = 0; i < 5; i++) createEskomTarget();
    createGeneratorsAndObstacles();
    isDead = false;
    startTime = Date.now();
    playRespawnAnimation();
    // Unlock and re-lock pointer to regain movement
    if (controls.isLocked) controls.unlock();
    setTimeout(() => { controls.lock(); }, 200);
    // Restart the animate loop if it was stopped
    requestAnimationFrame(animate);
    // Set invulnerability for 2 seconds
    invulnerableUntil = Date.now() + 2000;
}

// Movement controls
const onKeyDown = function(event) {
    switch(event.code) {
        case 'ArrowUp':
        case 'KeyW':
            moveForward = true;
            break;
        case 'ArrowDown':
        case 'KeyS':
            moveBackward = true;
            break;
        case 'ArrowLeft':
        case 'KeyA':
            moveLeft = true;
            break;
        case 'ArrowRight':
        case 'KeyD':
            moveRight = true;
            break;
        case 'KeyR':
            if (!isReloading && ammo < maxAmmo) {
                reload();
            }
            break;
        case 'Space':
            if (canJump) {
                verticalVelocity = JUMP_STRENGTH;
                canJump = false;
            }
            break;
        case 'ShiftLeft':
        case 'ShiftRight':
            isSprinting = true;
            break;
        case 'ControlLeft':
        case 'ControlRight':
            if (!isCrawling) {
                isCrawling = true;
                isSprinting = false;
            } else {
                isCrawling = false;
            }
            break;
    }
};

const onKeyUp = function(event) {
    switch(event.code) {
        case 'ArrowUp':
        case 'KeyW':
            moveForward = false;
            break;
        case 'ArrowDown':
        case 'KeyS':
            moveBackward = false;
            break;
        case 'ArrowLeft':
        case 'KeyA':
            moveLeft = false;
            break;
        case 'ArrowRight':
        case 'KeyD':
            moveRight = false;
            break;
        case 'KeyR':
            if (!isReloading && ammo < maxAmmo) {
                reload();
            }
            break;
        case 'Space':
            if (canJump) {
                verticalVelocity = JUMP_STRENGTH;
                canJump = false;
            }
            break;
        case 'ShiftLeft':
        case 'ShiftRight':
            isSprinting = false;
            break;
    }
};

document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);
document.addEventListener('click', () => {
    controls.lock();
});

controls.addEventListener('lock', function() {
    document.getElementById('game-container').style.cursor = 'none';
});

controls.addEventListener('unlock', function() {
    document.getElementById('game-container').style.cursor = 'auto';
});

// Reload function
function reload() {
    if (isReloading) return;
    
    isReloading = true;
    document.getElementById('ammo').textContent = 'Reloading...';
    
    setTimeout(() => {
        ammo = maxAmmo;
        isReloading = false;
        document.getElementById('ammo').textContent = `Solar Panels: ${ammo}`;
    }, 2000); // 2 second reload time
}

// Add emergency lights
function createEmergencyLight(x, z) {
    const light = new THREE.PointLight(0xff0000, 0.5, 20);
    light.position.set(x, 8, z);
    scene.add(light);
}

// Create Eskom targets (power drain units)
function createEskomTarget() {
    const geometry = new THREE.BoxGeometry(2, 4, 2);
    const materials = [
        new THREE.MeshStandardMaterial({ map: eskomTexture }), // right
        new THREE.MeshStandardMaterial({ map: eskomTexture }), // left
        new THREE.MeshStandardMaterial({ map: eskomTexture }), // top
        new THREE.MeshStandardMaterial({ map: eskomTexture }), // bottom
        new THREE.MeshStandardMaterial({ map: eskomTexture }), // front
        new THREE.MeshStandardMaterial({ map: eskomTexture })  // back
    ];
    const target = new THREE.Mesh(geometry, materials);
    // Random position
    target.position.x = Math.random() * 80 - 40;
    target.position.z = Math.random() * 80 - 40;
    target.position.y = 2;
    // Add movement properties
    target.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.1,
        0,
        (Math.random() - 0.5) * 0.1
    );
    target.userData.spinSpeed = Math.random() * 0.05 + 0.02;
    scene.add(target);
    eskomTargets.push(target);
}

// Crosshair animation
function updateCrosshair(moving) {
    const minGap = isAiming ? AIM_CROSSHAIR_MIN_GAP : NORMAL_CROSSHAIR_MIN_GAP;
    const maxGap = isAiming ? AIM_CROSSHAIR_MAX_GAP : NORMAL_CROSSHAIR_MAX_GAP;
    if (moving) {
        crosshairGap = Math.min(maxGap, crosshairGap + crosshairStep);
    } else {
        crosshairGap = Math.max(minGap, crosshairGap - crosshairStep);
    }
    document.getElementById('crosshair').style.setProperty('--gap', crosshairGap + 'px');
}

// Mouse events for aiming
window.addEventListener('mousedown', (event) => {
    if (event.button === 2) { // Right mouse button
        isAiming = true;
    }
});
window.addEventListener('mouseup', (event) => {
    if (event.button === 2) {
        isAiming = false;
    }
});
window.addEventListener('contextmenu', (e) => e.preventDefault()); // Prevent context menu

// Modify createSolarPanel to add spread if moving or not aiming
function createSolarPanel() {
    const panel = new THREE.Group();
    
    // Panel base
    const base = new THREE.Mesh(
        new THREE.BoxGeometry(1, 0.1, 1),
        new THREE.MeshStandardMaterial({ 
            color: 0x222222,
            metalness: 0.8
        })
    );
    
    // Solar cells
    const cells = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.05, 0.9),
        new THREE.MeshStandardMaterial({ 
            color: 0x0066ff,
            metalness: 0.5,
            emissive: 0x0044aa,
            emissiveIntensity: 0.5
        })
    );
    cells.position.y = 0.05;
    
    panel.add(base);
    panel.add(cells);
    
    // Position at camera
    panel.position.copy(camera.position);
    
    // Set velocity
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    // Add spread based on movement state
    const isMoving = moveForward || moveBackward || moveLeft || moveRight;
    let spread = 0;
    if (isSprinting) {
        spread = NORMAL_SPREAD * 1.5; // Sprinting: less accurate
    } else if (isCrawling) {
        spread = NORMAL_SPREAD * 0.6; // Crawling: more accurate
    } else if (isMoving && !isAiming) {
        spread = NORMAL_SPREAD;
    } else if (isMoving && isAiming) {
        spread = AIM_SPREAD;
    } else if (!isMoving && isAiming) {
        spread = AIM_SPREAD / 2;
    } else {
        spread = NORMAL_SPREAD / 2;
    }
    if (spread > 0) {
        const randomSpread = (Math.random() - 0.5) * spread;
        const spreadAxis = new THREE.Vector3(0, 1, 0); // Yaw only
        direction.applyAxisAngle(spreadAxis, randomSpread);
    }
    panel.userData.velocity = direction.multiplyScalar(1);
    
    scene.add(panel);
    solarPanels.push(panel);
}

// Add this function to create cars
function createCar(x, z, rotation) {
    const car = new THREE.Group();
    
    // Car body
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(4, 1.5, 2),
        new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.2 })
    );
    car.add(body);
    
    // Car roof
    const roof = new THREE.Mesh(
        new THREE.BoxGeometry(3, 0.5, 1.8),
        new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.2 })
    );
    roof.position.y = 1;
    car.add(roof);
    
    // Wheels
    const wheelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.3, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.1 });
    
    const wheelPositions = [
        { x: 1.5, y: -0.75, z: 1 },
        { x: -1.5, y: -0.75, z: 1 },
        { x: 1.5, y: -0.75, z: -1 },
        { x: -1.5, y: -0.75, z: -1 }
    ];
    
    wheelPositions.forEach(pos => {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.position.set(pos.x, pos.y, pos.z);
        wheel.rotation.x = Math.PI / 2;
        car.add(wheel);
    });
    
    car.position.set(x, 0.75, z);
    car.rotation.y = rotation;
    car.castShadow = true;
    car.receiveShadow = true;
    scene.add(car);
    solidSurfaces.push(body); // Add car body to solid surfaces
    return car;
}

// Sprint UI setup
if (!document.getElementById('sprint-indicator')) {
    const sprintDiv = document.createElement('div');
    sprintDiv.id = 'sprint-indicator';
    sprintDiv.style.position = 'fixed';
    sprintDiv.style.left = '50%';
    sprintDiv.style.bottom = '32px';
    sprintDiv.style.transform = 'translateX(-50%)';
    sprintDiv.style.width = '64px';
    sprintDiv.style.height = '64px';
    sprintDiv.style.background = 'rgba(80,80,80,0.85)';
    sprintDiv.style.borderRadius = '50%';
    sprintDiv.style.display = 'flex';
    sprintDiv.style.flexDirection = 'column';
    sprintDiv.style.alignItems = 'center';
    sprintDiv.style.justifyContent = 'center';
    sprintDiv.style.zIndex = '1001';
    sprintDiv.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
    sprintDiv.style.userSelect = 'none';
    sprintDiv.style.pointerEvents = 'none';
    sprintDiv.style.transition = 'opacity 0.2s';
    sprintDiv.style.opacity = '0';
    // SVG running man
    sprintDiv.innerHTML = `
        <svg width="32" height="32" viewBox="0 0 32 32" style="margin-bottom:2px;" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="16" fill="none"/>
            <ellipse cx="16" cy="7" rx="3" ry="3.5" fill="#222"/>
            <rect x="14.5" y="10" width="3" height="8" rx="1.5" fill="#222"/>
            <rect x="13" y="18" width="2.5" height="7" rx="1.2" transform="rotate(-20 13 18)" fill="#222"/>
            <rect x="16.5" y="18" width="2.5" height="7" rx="1.2" transform="rotate(20 16.5 18)" fill="#222"/>
            <rect x="10" y="13" width="2.5" height="7" rx="1.2" transform="rotate(-40 10 13)" fill="#222"/>
            <rect x="19.5" y="13" width="2.5" height="7" rx="1.2" transform="rotate(40 19.5 13)" fill="#222"/>
        </svg>
        <div style="color:#fff;font-size:13px;font-family:sans-serif;line-height:1;background:#444;padding:2px 8px;border-radius:8px;opacity:0.85;display:flex;align-items:center;gap:4px;">
            <span style="font-size:15px;">⇧</span> Shift
        </div>
    `;
    document.body.appendChild(sprintDiv);
}

function updateSprintUI() {
    const sprintDiv = document.getElementById('sprint-indicator');
    if (!sprintDiv) return;
    // Always show unless dead or in menu
    if (!isDead) {
        sprintDiv.style.opacity = '1';
    } else {
        sprintDiv.style.opacity = '0';
    }
}

// Crawl UI setup
if (!document.getElementById('crawl-indicator')) {
    const crawlDiv = document.createElement('div');
    crawlDiv.id = 'crawl-indicator';
    crawlDiv.style.position = 'fixed';
    crawlDiv.style.left = 'calc(50% + 48px)';
    crawlDiv.style.bottom = '32px';
    crawlDiv.style.transform = 'translateX(-50%)';
    crawlDiv.style.width = '64px';
    crawlDiv.style.height = '64px';
    crawlDiv.style.background = 'rgba(80,80,80,0.85)';
    crawlDiv.style.borderRadius = '50%';
    crawlDiv.style.display = 'flex';
    crawlDiv.style.flexDirection = 'column';
    crawlDiv.style.alignItems = 'center';
    crawlDiv.style.justifyContent = 'center';
    crawlDiv.style.zIndex = '1001';
    crawlDiv.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
    crawlDiv.style.userSelect = 'none';
    crawlDiv.style.pointerEvents = 'none';
    crawlDiv.style.transition = 'opacity 0.2s';
    crawlDiv.style.opacity = '0';
    // SVG crawling man
    crawlDiv.innerHTML = `
        <svg width="32" height="32" viewBox="0 0 32 32" style="margin-bottom:2px;" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="16" cy="8" rx="3" ry="3.5" fill="#222"/>
            <rect x="13" y="12" width="6" height="3" rx="1.5" fill="#222"/>
            <rect x="10" y="15" width="10" height="2.5" rx="1.2" fill="#222"/>
            <rect x="8" y="18" width="7" height="2" rx="1" transform="rotate(-10 8 18)" fill="#222"/>
            <rect x="17" y="18" width="7" height="2" rx="1" transform="rotate(10 17 18)" fill="#222"/>
        </svg>
        <div style="color:#fff;font-size:13px;font-family:sans-serif;line-height:1;background:#444;padding:2px 8px;border-radius:8px;opacity:0.85;display:flex;align-items:center;gap:4px;">
            <span style="font-size:15px;">Ctrl</span>
        </div>
    `;
    document.body.appendChild(crawlDiv);
}

function updateCrawlUI() {
    const crawlDiv = document.getElementById('crawl-indicator');
    if (!crawlDiv) return;
    // Always show unless dead or in menu
    if (!isDead) {
        crawlDiv.style.opacity = '1';
    } else {
        crawlDiv.style.opacity = '0';
    }
} 