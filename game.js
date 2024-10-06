const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const CANVAS_WIDTH = canvas.width;
const CANVAS_HEIGHT = canvas.height;
const CREATURE_SIZES = [10, 20, 40, 80, 100, 120, 140, 160, 180, 200];
const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#FFD700', '#FFA500', '#FFC0CB', '#9370DB', '#8FBC8F', '#FFB6C1'];
const GAME_OVER_HEIGHT = 0;

let creatures = [];
let gameOver = false;
let currentCreature = null;
let score = 0;

class Creature {
    constructor(x, y, size) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.color = COLORS[CREATURE_SIZES.indexOf(size)];
        this.vx = 0;
        this.vy = 0;
        this.friction = 0.9; // Increased friction for better control
        this.restitution = 0.3;
        this.mass = Math.PI * (size / 2) ** 2;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
        ctx.fill();
    }

    update() {
        const gravity = 0.5; // Increased gravity for faster falling
        this.vy += gravity;

        this.vx *= this.friction;
        this.vy *= 0.99; // Reduced air resistance

        this.x += this.vx;
        this.y += this.vy;

        // Boundary checks
        if (this.x - this.size / 2 < 0) {
            this.x = this.size / 2;
            this.vx *= -this.restitution;
        } else if (this.x + this.size / 2 > CANVAS_WIDTH) {
            this.x = CANVAS_WIDTH - this.size / 2;
            this.vx *= -this.restitution;
        }

        if (this.y + this.size / 2 > CANVAS_HEIGHT) {
            this.y = CANVAS_HEIGHT - this.size / 2;
            this.vy *= -this.restitution;
            if (Math.abs(this.vy) < 0.5) this.vy = 0; // Increased threshold for stopping
        }

        this.checkCollisions();
    }

    checkCollisions() {
        let isColliding = false;
        for (let creature of creatures) {
            if (creature !== this) {
                const dx = this.x - creature.x;
                const dy = this.y - creature.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const minDistance = (this.size + creature.size) / 2;

                if (distance < minDistance) {
                    isColliding = true;
                    // Collision detected
                    const angle = Math.atan2(dy, dx);
                    const targetX = creature.x + Math.cos(angle) * minDistance;
                    const targetY = creature.y + Math.sin(angle) * minDistance;

                    // Move creatures apart
                    const percent = 0.5; // Increased for more responsive separation
                    const slop = 0.01;
                    const correction = (Math.max(minDistance - distance, 0) / (this.mass + creature.mass)) * percent;

                    if (distance > slop) {
                        this.x += dx / distance * correction * creature.mass;
                        this.y += dy / distance * correction * creature.mass;
                        creature.x -= dx / distance * correction * this.mass;
                        creature.y -= dy / distance * correction * this.mass;
                    }

                    // Calculate relative velocity
                    const rvx = this.vx - creature.vx;
                    const rvy = this.vy - creature.vy;

                    // Calculate relative velocity in terms of the normal direction
                    const velocityAlongNormal = (rvx * dx + rvy * dy) / distance;

                    // Do not resolve if velocities are separating
                    if (velocityAlongNormal > 0) continue;

                    // Calculate impulse scalar
                    const e = Math.min(this.restitution, creature.restitution);
                    const j = -(1 + e) * velocityAlongNormal;
                    const impulse = j / (1 / this.mass + 1 / creature.mass);

                    // Apply impulse
                    const impulseX = (dx / distance) * impulse;
                    const impulseY = (dy / distance) * impulse;

                    this.vx += impulseX / this.mass;
                    this.vy += impulseY / this.mass;
                    creature.vx -= impulseX / creature.mass;
                    creature.vy -= impulseY / creature.mass;

                    // Check for merging
                    if (this.size === creature.size && this.size < CREATURE_SIZES[CREATURE_SIZES.length - 1]) {
                        const newSize = CREATURE_SIZES[CREATURE_SIZES.indexOf(this.size) + 1];
                        const newX = (this.x * this.mass + creature.x * creature.mass) / (this.mass + creature.mass);
                        const newY = (this.y * this.mass + creature.y * creature.mass) / (this.mass + creature.mass);
                        const newCreature = new Creature(newX, newY, newSize);
                        newCreature.vx = (this.vx * this.mass + creature.vx * creature.mass) / (this.mass + creature.mass);
                        newCreature.vy = (this.vy * this.mass + creature.vy * creature.mass) / (this.mass + creature.mass);
                        creatures.push(newCreature);
                        creatures = creatures.filter(c => c !== this && c !== creature);
                        
                        // Add score based on the size of the new creature
                        score += CREATURE_SIZES.indexOf(newSize) * 10;
                        
                        return;
                    }
                }
            }
        }

        // Apply a small downward force if not colliding to prevent floating
        if (!isColliding && Math.abs(this.vy) < 0.5) {
            this.vy += 0.1; // Increased downward force
        }
    }
}

function createNewCreature() {
    const size = Math.random() < 0.5 ? CREATURE_SIZES[0] : CREATURE_SIZES[1];
    currentCreature = new Creature(CANVAS_WIDTH / 2, 20, size);
}

function update() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    creatures.forEach(creature => {
        creature.update();
        creature.draw();
    });

    if (currentCreature) {
        currentCreature.draw();
    }

    if (creatures.some(creature => creature.y - creature.size / 2 <= GAME_OVER_HEIGHT)) {
        gameOver = true;
    }

    if (gameOver) {
        ctx.fillStyle = 'black';
        ctx.font = '30px Arial';
        ctx.fillText('Game Over!', CANVAS_WIDTH / 2 - 70, CANVAS_HEIGHT / 2);
        ctx.fillText(`Final Score: ${score}`, CANVAS_WIDTH / 2 - 80, CANVAS_HEIGHT / 2 + 40);
    } else {
        // Display the current score
        ctx.fillStyle = 'black';
        ctx.font = '20px Arial';
        ctx.fillText(`Score: ${score}`, 10, 30);
        
        requestAnimationFrame(update);
    }
}

function dropCreature() {
    if (currentCreature) {
        currentCreature.falling = true;
        creatures.push(currentCreature);
        createNewCreature();
    }
}

// Mouse control
canvas.addEventListener('mousemove', (event) => {
    if (currentCreature && !gameOver) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        currentCreature.x = Math.max(currentCreature.size / 2, Math.min(mouseX, CANVAS_WIDTH - currentCreature.size / 2));
    }
});

canvas.addEventListener('click', () => {
    if (gameOver) {
        creatures = [];
        gameOver = false;
        createNewCreature();
        update();
    } else {
        dropCreature();
    }
});

// Keyboard control
document.addEventListener('keydown', (event) => {
    if (!gameOver && currentCreature) {
        switch (event.key) {
            case 'ArrowLeft':
                currentCreature.x = Math.max(currentCreature.size / 2, currentCreature.x - 10);
                break;
            case 'ArrowRight':
                currentCreature.x = Math.min(CANVAS_WIDTH - currentCreature.size / 2, currentCreature.x + 10);
                break;
            case ' ':
                dropCreature();
                break;
        }
    }
});

createNewCreature();
update();