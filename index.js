class Seed {
    constructor(pit, angle, radius) {
        this.pit = pit;
        this.context = pit.context;
        this.angle = angle;
        this.radius = radius; // distance from center of pit
        this.size = 8 * pit.game.ratio; // seed circle size
        console.log(pit.game.ratio);
    }

    draw() {
        const centerX = this.pit.x + this.radius * Math.cos(this.angle);
        const centerY = this.pit.y + this.radius * Math.sin(this.angle);

        this.context.beginPath();
        this.context.arc(centerX, centerY, this.size, 0, Math.PI * 2);
        this.context.fillStyle = 'brown';
        this.context.fill();
        this.context.strokeStyle = 'black';
        this.context.stroke();
    }
}

class Pit {
    constructor(game, x, y) {
        this.game = game;
        this.context = game.context;
        this.x = x;
        this.y = y;
        this.radius = 64 * this.game.ratio; // dynamically scaled

        this.seedCount = 2;
        this.initSeeds(); 
    }

    initSeeds() {
        this.seeds = [];
        const angleStep = (Math.PI * 2) / this.seedCount;
        const seedRingRadius = this.radius / 4;

        for (let i = 0; i < this.seedCount; i++) {
            const angle = i * angleStep;
            this.seeds.push(new Seed(this, angle, seedRingRadius));
        }
    }

    draw() {
        this.context.beginPath(); 
        this.context.arc(this.x, this.y, this.radius, 0, Math.PI * 2); 
        this.context.fillStyle = 'orange'; 
        this.context.fill(); 
        this.context.strokeStyle = 'black'; 
        this.context.stroke();

         // draw the seeds
        for (const seed of this.seeds) {
            seed.draw();
        } 
    }  
}

class Board {
    constructor(game) {
        this.game = game;
        this.width = this.game.canvas.width - 300;
        this.height = this.game.canvas.height - 100

        this.x = this.game.canvas.width / 2 - this.width / 2 + 120;
        this.y = this.game.canvas.height / 2 - this.height / 2;
        this.rows = 4;
        this.cols = 8;
        this.pits = [];

        this.initPits();
    }

    initPits() {
        const pitSpacingX = this.width / this.cols;
        const basePitSpacingY = (this.height / this.rows) - 15;
        const extraGap = 35 * this.game.ratio;

        for (let row = 0; row < this.rows; row++) {
            this.pits[row] = [];
            for (let col = 0; col < this.cols; col++) {
                const x = this.x + col * pitSpacingX + pitSpacingX / 2;

                // Add extra space between row 1 and row 2 (which are index 1 and 2)
                let yOffset = row * basePitSpacingY;
                if (row >= 2) yOffset += extraGap;

                const y = this.y + yOffset + basePitSpacingY / 1.8;
                const pit = new Pit(this.game, x, y);
                this.pits[row][col] = pit;
            }
        }
    }

    draw() {
        // draw board background
        this.game.context.fillStyle = 'gray';
        this.game.context.fillRect(this.x, this.y, this.width, this.height);

        // draw pits
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                this.pits[row][col].draw();
            }
        }
    }
}

class Game {
    constructor(canvas, context) {
        this.canvas = canvas;
        this.canvas.width = canvas.width;
        this.canvas.height = canvas.height;
        this.context = context;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        this.baseHeight = this.canvas.height - 100;
        this.baseWidth = this.canvas.width - 300;
        this.ratioH = this.baseHeight / this.height;
        this.ratioW = this.baseWidth / this.width;
        this.ratio = this.ratioH;
        console.log(this.ratioH);

        this.board = new Board (this);
    }

    render(context) {
        this.board.draw();
    }
}

window.addEventListener('load', () => {
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const umwesoGame = new Game(canvas, context);
    umwesoGame.render();
});
