class Seed {
    constructor(pit, angle, radius) {
        this.pit = pit;
        this.context = pit.context;
        this.angle = angle;
        this.radius = radius; // distance from center of pit
        this.size = 8 * pit.game.ratio; // seed circle size
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

        this.context.fillStyle = 'black';
        this.context.font = `${12 * this.game.ratio}px Arial`;
        this.context.textAlign = 'center';
        this.context.textBaseline = 'middle';
        this.context.fillText(this.seedCount, this.x, this.y);
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

        this.heldSeeds = 0;
        this.isSowing = false;

        this.mouseX = 0;
        this.mouseY = 0;
        this.trackMouse = false; // new flag
        this.mouseMoveHandler = null; // store listener reference


        this.initPits();
        this.initClickHandling();
    }

    startTrackingMouse(event = null) {
        if (this.trackMouse) return;
        this.trackMouse = true;

        if (event) {
            const rect = this.game.canvas.getBoundingClientRect();
            this.mouseX = event.clientX - rect.left;
            this.mouseY = event.clientY - rect.top;
        }

        this.mouseMoveHandler = (e) => {
            const rect = this.game.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        };
        this.game.canvas.addEventListener('mousemove', this.mouseMoveHandler);
    }

    stopTrackingMouse() {
        if (!this.trackMouse) return; // not tracking
        this.trackMouse = false;
        this.game.canvas.removeEventListener('mousemove', this.mouseMoveHandler);
        this.mouseMoveHandler = null;
    }

    getLinearPits() {
        return this.pits.flat();
    }

    getPitByIndex(index) {
        const total = this.rows * this.cols;
        const i = index % total;
        const row = Math.floor(i / this.cols);
        const col = i % this.cols;
        return this.pits[row][col];
    }

    getIndex(row, col) {
        return row * this.cols + col;
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

    initClickHandling() {
        this.game.canvas.addEventListener('click', (event) => {
            const rect = this.game.canvas.getBoundingClientRect();
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;

            // Update board's mouse coordinates immediately
            this.mouseX = mouseX;
            this.mouseY = mouseY;

            for (let row = 0; row < this.rows; row++) {
                for (let col = 0; col < this.cols; col++) {
                    const pit = this.pits[row][col];
                    const dx = mouseX - pit.x;
                    const dy = mouseY - pit.y;
                    if (Math.sqrt(dx * dx + dy * dy) < pit.radius) {
                        this.handlePitClick(pit, row, col, event);
                        return;
                    }
                }
            }
        });
    }

    // sowFrom(pit, row, col) {
    //     // Only allow sowing if the pit is in row 2 or 3
    //     if (row < 2) return; // do nothing if clicked pit is in row 0 or 1

    //     const seedsToSow = pit.seeds.length;
    //     if (seedsToSow === 0) return;

    //     pit.seeds = [];
    //     pit.seedCount = 0;

    //     const startIndex = this.getIndex(row, col);

    //     for (let i = 1; i <= seedsToSow; i++) {
    //         const nextIndex = (startIndex + i) % (this.rows * this.cols);
    //         const targetPit = this.getPitByIndex(nextIndex);

    //         // Only place seeds into pits in row 2 or 3
    //         const targetRow = Math.floor(nextIndex / this.cols);
    //         if (targetRow >= 2) {
    //             targetPit.seedCount++;
    //             targetPit.initSeeds(); // redraw seeds for this pit
    //         }
    //     }

    //     this.game.render(); // refresh the canvas
    // }

    handlePitClick(pit, row, col) {
        if (!this.isSowing) {
            if (pit.seedCount > 0) {
                this.heldSeeds = pit.seedCount;
                pit.seedCount = 0;
                pit.seeds = [];
                this.isSowing = true;
                this.startTrackingMouse(); // start tracking!
            }
        } else {
            if (this.heldSeeds > 0) {
                pit.seedCount++;
                pit.initSeeds();
                this.heldSeeds--;

                if (this.heldSeeds === 0) {
                    this.isSowing = false;
                    this.stopTrackingMouse(); // stop tracking!
                }
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

        // draw held seeds following the mouse
    if (this.isSowing && this.heldSeeds > 0) {
            const ctx = this.game.context;
            ctx.beginPath();
            ctx.arc(this.mouseX, this.mouseY, 12 * this.game.ratio, 0, Math.PI * 2);
            ctx.fillStyle = 'brown';
            ctx.fill();
            ctx.strokeStyle = 'black';
            ctx.stroke();

            // optional: draw number of held seeds
            ctx.fillStyle = 'white';
            ctx.font = `${14 * this.game.ratio}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.heldSeeds, this.mouseX, this.mouseY);
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
        // console.log(this.ratioH);

        this.board = new Board (this);
        this.start(); // start the game loop
    }

    start() {
        this.loop(); // begin render loop
    }

    loop() {
        this.render();
        requestAnimationFrame(() => this.loop());
    }

    render(context) {
        this.context.clearRect(0, 0, this.width, this.height);
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
