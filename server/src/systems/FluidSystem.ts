export class FluidSystem {
    readonly width: number;
    readonly height: number;
    private size: number;

    private currentFluid: Float32Array;
    private nextFluid: Float32Array;
    private terrain: Int8Array;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.size = width * height;

        this.currentFluid = new Float32Array(this.size);
        this.nextFluid = new Float32Array(this.size);
        this.terrain = new Int8Array(this.size);
        
        this.generateTerrain();
        console.log("FluidSystem Initialized");
    }

    private generateTerrain() {
        const centerX = this.width / 2;
        const centerY = this.height / 2;

        for(let y=0; y<this.height; y++) {
            for(let x=0; x<this.width; x++) {
                const i = y * this.width + x;
                const dx = x - centerX;
                const dy = y - centerY;
                const dist = Math.sqrt(dx*dx + dy*dy);
                const height = (dist / (this.width / 2)); 
                this.terrain[i] = Math.floor(height * 20) + (Math.random() * 5); 
            }
        }
    }

    tick(deltaTime: number) {
        // 1. Reset 'Next' to 'Current' so we don't lose mass
        this.nextFluid.set(this.currentFluid);

        // 2. Pump: Add fluid to center
        const centerIdx = Math.floor(this.size / 2) + (this.width / 2);
        this.nextFluid[centerIdx] += 5.0; 
        
        // DEBUG: Verify Pump
        // if (this.nextFluid[centerIdx] <= 0) console.error("Pump Failed!");

        // 3. Spread
        let activeCells = 0;
        for (let i = 0; i < this.size; i++) {
            const fluid = this.currentFluid[i];
            if (fluid <= 0.01) continue; 
            
            activeCells++;
            this.spreadToNeighbors(i, fluid);
        }

        // 4. Swap Buffers
        const temp = this.currentFluid;
        this.currentFluid = this.nextFluid;
        this.nextFluid = temp;

        // DEBUG: Log status
        if (Math.random() < 0.05) {
             console.log(`Tick Stats: Center=${this.currentFluid[centerIdx].toFixed(2)}, ActiveCells=${activeCells}`);
        }
    }

    private spreadToNeighbors(i: number, amount: number) {
        const flowRate = 0.25; 
        const neighbors = [i - this.width, i + this.width, i - 1, i + 1];

        if (Math.random() > 0.5) {
            const temp = neighbors[0]; neighbors[0] = neighbors[3]; neighbors[3] = temp;
        }

        for (const nIdx of neighbors) {
            if (nIdx < 0 || nIdx >= this.size) continue;
            
            const myHeight = this.terrain[i] + this.currentFluid[i];
            const theirHeight = this.terrain[nIdx] + this.currentFluid[nIdx];

            if (myHeight > theirHeight) {
                const diff = myHeight - theirHeight;
                const flow = Math.min(amount, diff * flowRate);
                
                // Move from Next buffer logic
                // We subtract from source in nextFluid (which started as copy of current)
                // We add to neighbor in nextFluid
                this.nextFluid[i] -= flow;
                this.nextFluid[nIdx] += flow;
                
                amount -= flow;
                if(amount <= 0) break; 
            }
        }
    }

    getCompressedState(): Uint8Array {
        const buffer = new Uint8Array(this.size);
        for(let i=0; i<this.size; i++) {
            // Visual scale: 10 units = 255 byte (Increased sensitivity)
            const val = Math.min(255, Math.floor(this.currentFluid[i] * 25.0)); 
            buffer[i] = val;
        }
        return buffer;
    }
}