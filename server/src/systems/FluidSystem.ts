import { TerrainSystem } from "./TerrainSystem";

export class FluidSystem {
    readonly width: number;
    readonly height: number;
    private size: number;

    private currentFluid: Float32Array;
    private nextFluid: Float32Array;
    
    private terrainSystem: TerrainSystem;

    // Toggle this to true/false to enable/disable fluid simulation
    public isFluidEnabled: boolean = true; 

    constructor(width: number, height: number, terrainSystem: TerrainSystem) {
        this.width = width;
        this.height = height;
        this.size = width * height;
        this.terrainSystem = terrainSystem;

        this.currentFluid = new Float32Array(this.size);
        this.nextFluid = new Float32Array(this.size);
        
        console.log("FluidSystem Initialized");
    }

    tick(deltaTime: number) {
        // If disabled, stop simulation logic
        if (!this.isFluidEnabled) return;

        this.nextFluid.set(this.currentFluid);

        // Source: Pump in center
        // TWEAK: Reduced from 5.0 to 0.5 for slower accumulation
        const centerIdx = Math.floor(this.size / 2) + (this.width / 2);
        this.nextFluid[centerIdx] += 0.5; 
        
        for (let i = 0; i < this.size; i++) {
            const fluid = this.currentFluid[i];
            if (fluid <= 0.01) continue; 
            this.spreadToNeighbors(i, fluid);
        }

        const temp = this.currentFluid;
        this.currentFluid = this.nextFluid;
        this.nextFluid = temp;
    }

    private spreadToNeighbors(i: number, amount: number) {
        // TWEAK: Reduced from 0.25 to 0.1 for more viscous movement
        const flowRate = 0.1; 
        const neighbors = [i - this.width, i + this.width, i - 1, i + 1];

        if (Math.random() > 0.5) {
            const temp = neighbors[0]; neighbors[0] = neighbors[3]; neighbors[3] = temp;
        }

        for (const nIdx of neighbors) {
            if (nIdx < 0 || nIdx >= this.size) continue;
            if (this.terrainSystem.isWallIndex(nIdx)) continue;

            const myLevel = this.currentFluid[i];
            const theirLevel = this.currentFluid[nIdx];

            if (myLevel > theirLevel) {
                const diff = myLevel - theirLevel;
                const flow = Math.min(amount, diff * flowRate);
                
                this.nextFluid[i] -= flow;
                this.nextFluid[nIdx] += flow;
                amount -= flow;
                if(amount <= 0) break;
            }
        }
    }

    getCompressedState(): Uint8Array {
        const buffer = new Uint8Array(this.size);
        
        // If disabled, send empty buffer so client clears any existing fluid
        if (!this.isFluidEnabled) return buffer;

        for(let i=0; i<this.size; i++) {
            // TWEAK: Adjusted visual scaling so 0.5 flow is still visible
            const val = Math.min(255, Math.floor(this.currentFluid[i] * 50.0)); 
            buffer[i] = val;
        }
        return buffer;
    }
}