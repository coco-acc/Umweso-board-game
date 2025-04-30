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
    constructor(game, x, y, owner) {
        this.game = game;
        this.context = game.context;
        this.x = x;
        this.y = y;
        this.owner = owner; // new line! 'player' or 'opponent'
        this.radius = 64 * this.game.ratio; // dynamically scaled

        this.seedCount = 2;
        this.isFlashing = false;
        this.flashTimer = 0;


        this.initSeeds(); 
    }

    initSeeds() {
        this.seeds = [];
        const angleStep = (Math.PI * 2) / this.seedCount;
        const seedRingRadius = this.radius / 2.4;

        for (let i = 0; i < this.seedCount; i++) {
            const angle = i * angleStep;
            this.seeds.push(new Seed(this, angle, seedRingRadius));
        }
    }

   draw() {
        this.context.beginPath();
        this.context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);

        if (this.isFlashing) {
            this.context.fillStyle = this.flashColor || 'gold'; // use stored flash color
        } else {
            this.context.fillStyle = 'orange'; // normal color
        }

        this.context.fill();
        this.context.strokeStyle = 'black';
        this.context.stroke();

        // Draw seeds
        for (const seed of this.seeds) {
            seed.draw();
        }

        // Draw seed count text
        this.context.fillStyle = 'black';
        this.context.font = `${12 * this.game.ratio}px Arial`;
        this.context.textAlign = 'center';
        this.context.textBaseline = 'middle';
        this.context.fillText(this.seedCount, this.x, this.y);
    }
 
}

class FlyingSeed {
    constructor(startX, startY, endX, endY, game) {
        this.startX = startX;
        this.startY = startY;
        this.endX = endX;
        this.endY = endY;
        this.game = game;

        this.x = startX;
        this.y = startY;
        this.progress = 0; // progress from 0 to 1
        this.speed = 0.02; // controls flying speed
    }

    update() {
        this.progress += this.speed;
        if (this.progress > 1) this.progress = 1;

        this.x = this.startX * (1 - this.progress) + this.endX * this.progress;
        this.y = this.startY * (1 - this.progress) + this.endY * this.progress;
    }

    draw(context) {
        context.beginPath();
        context.arc(this.x, this.y, 6 * this.game.ratio, 0, Math.PI * 2);
        context.fillStyle = 'gold';
        context.fill();
        context.strokeStyle = 'black';
        context.stroke();
    }

    isFinished() {
        return this.progress >= 1;
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
        this.currentPitIndex = null; // track which pit you're sowing into
        this.originPit = null; 
        this.isManualPickup = false;
        this.expectedPitIndex = null; // during sowing, the next correct pit index
        this.pendingSowFromCaptureOrigin = null; // stores the origin pit of the capture

        this.initPits();
        this.initClickHandling();
        this.flyingSeeds = []; // for flying captured seeds

    }

    flashPit(pit, color = 'gold') {
        pit.isFlashing = true;
        pit.flashTimer = 20; // number of frames to stay flashing
        pit.flashColor = color; // store the flash color
    }

    // startTrackingMouse(event = null) {
    //     if (this.trackMouse) return;
    //     this.trackMouse = true;

    //     if (event) {
    //         const rect = this.game.canvas.getBoundingClientRect();
    //         this.mouseX = event.clientX - rect.left;
    //         this.mouseY = event.clientY - rect.top;
    //     }

    //     this.mouseMoveHandler = (e) => {
    //         const rect = this.game.canvas.getBoundingClientRect();
    //         this.mouseX = e.clientX - rect.left;
    //         this.mouseY = e.clientY - rect.top;
    //     };
    //     this.game.canvas.addEventListener('mousemove', this.mouseMoveHandler);
    // }
    startTrackingMouse(event = null) {
        if (this.trackMouse) return;
        this.trackMouse = true;

        const rect = this.game.canvas.getBoundingClientRect();

        if (event) {
            this.mouseX = event.clientX - rect.left;
            this.mouseY = event.clientY - rect.top;
        } else if (this.originPit) {
            // fallback if event is null (e.g. post-capture resume)
            this.mouseX = this.originPit.x - rect.left;
            this.mouseY = this.originPit.y - rect.top;
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
        const linearPits = [];

        // Row 3: left to right
        for (let col = 0; col < this.cols; col++) {
            linearPits.push(this.pits[3][col]);
        }

        // Row 2: right to left
        for (let col = this.cols - 1; col >= 0; col--) {
            linearPits.push(this.pits[2][col]);
        }

        // Row 1: left to right
        for (let col = 0; col < this.cols; col++) {
            linearPits.push(this.pits[1][col]);
        }

        // Row 0: right to left
        for (let col = this.cols - 1; col >= 0; col--) {
            linearPits.push(this.pits[0][col]);
        }

        return linearPits;
    }

    getPitByIndex(index) {
        const pits = this.getLinearPits();
        const total = pits.length;
        return pits[index % total];
    }

    getIndex(pit) {
        const pits = this.getLinearPits();
        return pits.indexOf(pit);
    }

    getRowFromIndex(index) {
        // Based on your anti-clockwise order in getLinearPits()
        if (index >= 0 && index <= 7) return 3;  // bottom row
        if (index >= 8 && index <= 15) return 2;
        if (index >= 16 && index <= 23) return 1;
        if (index >= 24 && index <= 31) return 0;
        return -1; // error
    }

    getColFromIndex(index) {
        if (index >= 0 && index <= 7) return index;
        if (index >= 8 && index <= 15) return 15 - index; // because row 2 is right to left
        if (index >= 16 && index <= 23) return index - 16;
        if (index >= 24 && index <= 31) return 31 - index; // because row 0 is right to left
        return -1; // error
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

                // Determine owner
                let owner = (row <= 1) ? "opponent" : "player";

                const pit = new Pit(this.game, x, y, owner);
                this.pits[row][col] = pit;
            }
        }
        console.log('ratio: ', this.game.ratio);
    }

    initClickHandling() {
        this.game.canvas.addEventListener('click', (event) => {
            this.handleClick(event, false);
        });
        this.game.canvas.addEventListener('dblclick', (event) => {
            this.handleClick(event, true);
        });
    }

    handleClick(event, isDoubleClick) {
        const rect = this.game.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        this.mouseX = mouseX;
        this.mouseY = mouseY;

        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const pit = this.pits[row][col];
                const dx = mouseX - pit.x;
                const dy = mouseY - pit.y;
                if (Math.sqrt(dx * dx + dy * dy) < pit.radius) {
                    this.handlePitClick(pit, row, col, event, isDoubleClick);
                    return;
                }
            }
        }
    }

    handlePitClick(pit, row, col, event, isDoubleClick) {
    if (!this.isSowing) {
        // Pickup phase
        if (!isDoubleClick && pit.owner === "player" && pit.seedCount > 1) {
            this.heldSeeds = pit.seedCount;
            pit.seedCount = 0;
            pit.seeds = [];
            this.flashPit(pit, 'white');
            this.isSowing = true;
            this.startTrackingMouse(event);
            this.currentPitIndex = this.getIndex(pit);
            this.expectedPitIndex = (this.currentPitIndex + 1 + this.rows * this.cols) % 16
            //(this.rows * this.cols); // anti-clockwise (decrement index)

            this.originPit = pit;
            this.isManualPickup = true;
        }
    } else {
        // Sowing phase
        if (isDoubleClick) {
            // Double-click during sowing
            if (this.isManualPickup && this.originPit) {
                // Double-click cancel
                this.originPit.seedCount += this.heldSeeds;
                this.originPit.initSeeds();
                this.heldSeeds = 0;
                this.isSowing = false;
                this.stopTrackingMouse();
                this.originPit = null;
                this.isManualPickup = false;
            } else if (pit === this.originPit) {
                // Special case: double-click sow into origin pit
                pit.seedCount++;
                pit.initSeeds();
                this.heldSeeds--;

                if (this.heldSeeds === 0) {
                    if (pit.seedCount > 1) {
                        this.heldSeeds = pit.seedCount;
                        pit.seedCount = 0;
                        pit.seeds = [];
                        this.flashPit(pit);
                        this.originPit = pit; // New origin if re-pickup
                        this.isManualPickup = false; // now automatic pickup
                    } else {
                        this.isSowing = false;
                        this.stopTrackingMouse();
                        this.originPit = null;
                        this.isManualPickup = false;
                    }
                }
            }
        } else {
                // Check if correct pit (anti-clockwise move)
                const clickedPitIndex = this.getIndex(pit);
                if (clickedPitIndex !== this.expectedPitIndex) {
                    return; // clicked wrong pit, do nothing
                }

                // Correct pit, proceed to sow
                if (this.heldSeeds > 0 && pit.owner === "player") {
                    pit.seedCount++;
                    pit.initSeeds();
                    this.heldSeeds--;

                    if (this.heldSeeds === 0) {
                        const row = this.getRowFromIndex(clickedPitIndex);
                        const col = this.getColFromIndex(clickedPitIndex);

                        let captured = false;

                        if (row === 2) {
                            const opponentRow0Pit = this.pits[0][col];
                            const opponentRow1Pit = this.pits[1][col];

                            if (opponentRow0Pit.seedCount > 0 && opponentRow1Pit.seedCount > 0) {
                                const capturedSeeds = opponentRow0Pit.seedCount + opponentRow1Pit.seedCount;

                                const origin = this.originPit;
                                this.captureMouseX = this.mouseX;
                                this.captureMouseY = this.mouseY;


                                // Fly seeds
                                for (let i = 0; i < opponentRow0Pit.seedCount; i++) {
                                    this.flyingSeeds.push(new FlyingSeed(
                                        opponentRow0Pit.x, opponentRow0Pit.y,
                                        this.captureMouseX, this.captureMouseY,
                                        this.game
                                    ));
                                }
                                for (let i = 0; i < opponentRow1Pit.seedCount; i++) {
                                    this.flyingSeeds.push(new FlyingSeed(
                                        opponentRow1Pit.x, opponentRow1Pit.y,
                                        this.captureMouseX, this.captureMouseY,
                                        this.game
                                    ));
                                }

                                opponentRow0Pit.seedCount = 0;
                                opponentRow1Pit.seedCount = 0;
                                opponentRow0Pit.initSeeds();
                                opponentRow1Pit.initSeeds();

                                // origin.pendingCapturedSeeds = capturedSeeds;
                                this.pendingCapturedSeedsCount = capturedSeeds;
                                this.pendingSowFromCaptureOrigin = origin;

                                this.flashPit(origin, 'lime');

                                // End sowing
                                this.isSowing = false;
                                // this.stopTrackingMouse();
                                // this.heldSeeds = 0;
                                this.heldSeeds = this.pendingCapturedSeedsCount;
                                this.originPit = null;
                                this.isManualPickup = false;
                                this.currentPitIndex = null;
                                this.expectedPitIndex = null;

                                console.log("Captured seeds to origin pit index:", this.getIndex(origin));
                                return;
                            }
                        }

                        // ONLY if no capture, check for re-pickup
                        if (pit.seedCount > 1) {
                            this.heldSeeds = pit.seedCount;
                            pit.seedCount = 0;
                            pit.seeds = [];
                            this.flashPit(pit);
                            this.originPit = pit; // now valid to update origin
                            this.isManualPickup = false;
                            this.currentPitIndex = clickedPitIndex;
                            this.expectedPitIndex = (this.currentPitIndex + 1 + this.rows * this.cols) % 16;
                        } else {
                            this.isSowing = false;
                            this.stopTrackingMouse();
                            this.originPit = null;
                            this.isManualPickup = false;
                            this.currentPitIndex = null;
                            this.expectedPitIndex = null;
                        }

                    } else {
                        // Update expected pit normally
                        this.expectedPitIndex = (clickedPitIndex + 1 + this.rows * this.cols) % 16;
                    }
                }
            }
        }
        console.log("seeds: ",this.heldSeeds);
        console.log("original pit index: ",this.getIndex(this.originPit));
    }

    draw() {
        // draw board background
        this.game.context.fillStyle = 'gray';
        this.game.context.fillRect(this.x, this.y, this.width, this.height);

        // draw pits
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const pit = this.pits[row][col];
                pit.draw();

                // Update flashing animation
                if (pit.isFlashing) {
                    pit.flashTimer--;
                    if (pit.flashTimer <= 0) {
                        pit.isFlashing = false; // stop flashing after timer ends
                    }
                }
            }
        }

        // Draw flying seeds
        for (let i = 0; i < this.flyingSeeds.length; i++) {
            const seed = this.flyingSeeds[i];
            seed.update();
            seed.draw(this.game.context);
        }

        // Remove finished flying seeds
        this.flyingSeeds = this.flyingSeeds.filter(seed => !seed.isFinished());

        // After flying seeds finished, add to pit
        for (let row of this.pits) {
            for (let pit of row) {
                    
                if (this.flyingSeeds.length === 0 && this.pendingSowFromCaptureOrigin) {
                    const pit = this.pendingSowFromCaptureOrigin;

                    // Resume sowing from original pit using captured seeds
                    this.heldSeeds = this.pendingCapturedSeedsCount;
                    this.isSowing = true;
                    this.originPit = pit;
                    this.currentPitIndex = this.getIndex(pit);
                    this.expectedPitIndex = (this.currentPitIndex + 1 + this.rows * this.cols) % 16;
                    this.flashPit(pit, 'white');
                    this.startTrackingMouse(); // 🟢 Start tracking the mouse again

                    // Reset
                    this.pendingSowFromCaptureOrigin = null;
                    this.pendingCapturedSeedsCount = 0;
                }
            }
        }

        // Draw held seeds following the mouse
        if (this.isSowing && this.heldSeeds > 0) {
            const ctx = this.game.context;
            ctx.beginPath();
            ctx.arc(this.mouseX, this.mouseY, 12 * this.game.ratio, 0, Math.PI * 2);
            ctx.fillStyle = 'brown';
            ctx.fill();
            ctx.strokeStyle = 'black';
            ctx.stroke();

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
