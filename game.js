import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

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

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222); // Dark industrial background
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.getElementById('game-container').appendChild(renderer.domElement);

// Controls
const controls = new PointerLockControls(camera, document.body);

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

// Enhanced Lighting
const ambientLight = new THREE.AmbientLight(0x444444, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 10);
directionalLight.castShadow = true;
scene.add(directionalLight);

// Add emergency lights
function createEmergencyLight(x, z) {
    const light = new THREE.PointLight(0xff0000, 0.5, 20);
    light.position.set(x, 8, z);
    scene.add(light);
}

// Create power station environment
function createPowerStation() {
    // Floor
    const floorGeometry = new THREE.PlaneGeometry(100, 100);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x333333,
        roughness: 0.8,
        metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Outer Walls
    const wallMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x666666,
        roughness: 0.6
    });

    // North Wall
    const northWall = new THREE.Mesh(
        new THREE.BoxGeometry(100, 10, 1),
        wallMaterial
    );
    northWall.position.set(0, 5, -50);
    scene.add(northWall);

    // South Wall
    const southWall = new THREE.Mesh(
        new THREE.BoxGeometry(100, 10, 1),
        wallMaterial
    );
    southWall.position.set(0, 5, 50);
    scene.add(southWall);

    // East Wall
    const eastWall = new THREE.Mesh(
        new THREE.BoxGeometry(1, 10, 100),
        wallMaterial
    );
    eastWall.position.set(50, 5, 0);
    scene.add(eastWall);

    // West Wall
    const westWall = new THREE.Mesh(
        new THREE.BoxGeometry(1, 10, 100),
        wallMaterial
    );
    westWall.position.set(-50, 5, 0);
    scene.add(westWall);

    // Add Power Generators (decorative)
    for (let i = 0; i < 6; i++) {
        const generator = new THREE.Mesh(
            new THREE.CylinderGeometry(2, 2, 6, 8),
            new THREE.MeshStandardMaterial({ 
                color: 0x444444,
                metalness: 0.8,
                roughness: 0.2
            })
        );
        generator.position.set(
            (Math.random() - 0.5) * 60,
            3,
            (Math.random() - 0.5) * 60
        );
        generator.castShadow = true;
        generator.receiveShadow = true;
        scene.add(generator);
    }

    // Add Emergency Lights
    createEmergencyLight(-40, -40);
    createEmergencyLight(40, -40);
    createEmergencyLight(-40, 40);
    createEmergencyLight(40, 40);
}

// Create Eskom targets (power drain units)
function createEskomTarget() {
    const geometry = new THREE.Group();
    
    // Main body
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(2, 4, 2),
        new THREE.MeshStandardMaterial({ 
            color: 0xff0000,
            metalness: 0.6,
            roughness: 0.2
        })
    );
    
    // Energy drain effect (spinning top part)
    const drainEffect = new THREE.Mesh(
        new THREE.ConeGeometry(1, 2, 8),
        new THREE.MeshStandardMaterial({ 
            color: 0xff6666,
            emissive: 0xff0000,
            emissiveIntensity: 0.5
        })
    );
    drainEffect.position.y = 3;
    
    geometry.add(body);
    geometry.add(drainEffect);
    
    // Random position
    geometry.position.x = Math.random() * 80 - 40;
    geometry.position.z = Math.random() * 80 - 40;
    geometry.position.y = 2;
    
    // Add movement properties
    geometry.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.1,
        0,
        (Math.random() - 0.5) * 0.1
    );
    geometry.userData.spinSpeed = Math.random() * 0.05 + 0.02;
    
    scene.add(geometry);
    eskomTargets.push(geometry);
}

// Create solar panel projectile
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
    panel.userData.velocity = direction.multiplyScalar(1); // Increased speed
    
    scene.add(panel);
    solarPanels.push(panel);
}

// Create the power station environment
createPowerStation();

// Create initial targets
for (let i = 0; i < 5; i++) {
    createEskomTarget();
}

// Shooting mechanics
document.addEventListener('mousedown', (event) => {
    if (event.button === 0 && ammo > 0) { // Left click
        createSolarPanel();
        ammo--;
        document.getElementById('ammo').textContent = `Solar Panels: ${ammo}`;
    }
});

// Game loop
function animate() {
    requestAnimationFrame(animate);
    
    const time = performance.now();
    const delta = (time - prevTime) / 1000;
    
    // Update player movement
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;
    
    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();
    
    if (moveForward || moveBackward) velocity.z -= direction.z * MOVEMENT_SPEED * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * MOVEMENT_SPEED * delta;
    
    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);
    
    // Keep player within bounds
    camera.position.x = Math.max(-48, Math.min(48, camera.position.x));
    camera.position.z = Math.max(-48, Math.min(48, camera.position.z));
    
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
        
        // Spin the drain effect
        if (target.userData.spinSpeed) {
            target.children[1].rotation.y += target.userData.spinSpeed;
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