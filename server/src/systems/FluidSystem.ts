/**
 * FluidSystem.ts
 * Implements TDD 04: Server-Side Fluid Simulation
 * Uses Float32Arrays for memory efficiency and Double Buffering for logic stability.
 */

export class FluidSystem {
    readonly width: number;
    readonly height: number;
    private size: number;

    // Double Buffering: Read from Current, Write to Next
    private currentFluid: Float32Array;
    private nextFluid: Float32Array;
    
    // Terrain: -128 (Deep Pit) to 127 (Mountain)
    private terrain: Int8Array;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.size = width * height;

        this.currentFluid = new Float32Array(this.size);
        this.nextFluid = new Float32Array(this.size);
        this.terrain = new Int8Array(this.size);
        
        // Init: Add a "Toxicity Emitter" in the center for testing
        const center = Math.floor(this.size / 2) + (width / 2);
        this.currentFluid[center] = 10.0; // 10 units of sludge
    }

    /**
     * The main simulation tick. 
     * Runs Cellular Automata rules to spread fluid to neighbors.
     */
    tick(deltaTime: number) {
        // 1. Reset 'Next' buffer to match 'Current' (Persistence)
        this.nextFluid.set(this.currentFluid);

        // 2. Iterate and Spread
        // Optimization (TDD 04): In real prod, use Bitboard Dirty Chunks here.
        for (let i = 0; i < this.size; i++) {
            const fluid = this.currentFluid[i];
            
            // Optimization: Skip dry cells to save CPU
            if (fluid <= 0.05) continue; 

            this.spreadToNeighbors(i, fluid);
        }

        // 3. Swap Buffers
        // We just swap references, we don't copy arrays (Zero cost)
        const temp = this.currentFluid;
        this.currentFluid = this.nextFluid;
        this.nextFluid = temp;

        // 4. Source Generation (Test Emitter)
        // Constantly add fluid to center to ensure we have flow to watch
        const center = Math.floor(this.size / 2) + (this.width / 2);
        this.currentFluid[center] += 0.5;
    }

    /**
     * Spreads fluid from index 'i' to its 4 neighbors based on height + pressure.
     */
    private spreadToNeighbors(i: number, amount: number) {
        const x = i % this.width;
        const y = Math.floor(i / this.width);
        
        // Simple diffusion: Give 10% of current stack to lower neighbors
        const flowRate = 0.1; 
        const amountToGive = amount * flowRate;

        // Neighbor Offsets: Up, Down, Left, Right
        const neighbors = [i - this.width, i + this.width, i - 1, i + 1];

        for (const nIdx of neighbors) {
            // Boundary checks
            if (nIdx < 0 || nIdx >= this.size) continue;
            
            // Logic: Water flows downhill. 
            // Total Height = Terrain Height + Fluid Depth
            const myHeight = this.terrain[i] + this.currentFluid[i];
            const theirHeight = this.terrain[nIdx] + this.currentFluid[nIdx];

            if (myHeight > theirHeight) {
                // Move fluid
                this.nextFluid[i] -= amountToGive;
                this.nextFluid[nIdx] += amountToGive;
            }
        }
    }

    /**
     * TDD 04 Section 3: Network Synchronization
     * Compresses the grid into a quantized binary packet.
     * 0.0 - 10.0 float -> 0 - 255 byte
     */
    getCompressedState(): Uint8Array {
        const buffer = new Uint8Array(this.size);
        for(let i=0; i<this.size; i++) {
            // Clamp 0-10 to 0-255
            const val = Math.min(255, Math.floor(this.currentFluid[i] * 25.5));
            buffer[i] = val;
        }
        return buffer;
    }
}