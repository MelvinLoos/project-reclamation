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
        if (!this.isFluidEnabled) return;

        this.nextFluid.set(this.currentFluid);

        // Source: Pump in center
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
        // Base flow rate
        let flowRate = 0.1; 
        
        // --- TERRAIN TYPE MODIFIER ---
        // Canals (5) and Water (4) allow faster flow
        // We need to access the map data directly or add a helper
        // Since TerrainSystem exposes getMap(), we can use that if we cache it, 
        // or just accept the overhead of a helper call.
        // For performance, let's assume we can access the type.
        // But for now, we rely on getFlow returning a vector to imply it's a canal.
        
        const flow = this.terrainSystem.getFlow(i);
        const hasFlow = (Math.abs(flow.x) > 0.01 || Math.abs(flow.y) > 0.01);

        if (hasFlow) {
            flowRate = 0.4; // Canals flow 4x faster
        }

        const neighbors = [i - this.width, i + this.width, i - 1, i + 1];
        const neighborDirs = [
            {x: 0, y: -1}, // Up
            {x: 0, y: 1},  // Down
            {x: -1, y: 0}, // Left
            {x: 1, y: 0}   // Right
        ];

        if (Math.random() > 0.5) {
            const temp = neighbors[0]; neighbors[0] = neighbors[3]; neighbors[3] = temp;
            const tempD = neighborDirs[0]; neighborDirs[0] = neighborDirs[3]; neighborDirs[3] = tempD;
        }

        for (let k = 0; k < 4; k++) {
            const nIdx = neighbors[k];
            const nDir = neighborDirs[k];

            if (nIdx < 0 || nIdx >= this.size) continue;
            if (this.terrainSystem.isWallIndex(nIdx)) continue;

            const myLevel = this.currentFluid[i];
            const theirLevel = this.currentFluid[nIdx];

            // Modified Logic: Canals push fluid even if levels are equal!
            // This is "Pressure" logic.
            const alignment = hasFlow ? (flow.x * nDir.x) + (flow.y * nDir.y) : 0;
            
            // Artificial height difference based on flow
            // If flowing towards neighbor, pretend I am higher than I am.
            const flowPressure = alignment > 0.5 ? 0.5 : 0;

            if (myLevel + flowPressure > theirLevel) {
                let diff = (myLevel + flowPressure) - theirLevel;
                let moveAmount = Math.min(amount, diff * flowRate);
                
                // --- FLOW BIAS ---
                if (hasFlow) {
                    if (alignment > 0.5) {
                        // Boost flow downstream significantly
                        moveAmount *= 3.0; 
                    } else if (alignment < -0.5) {
                        moveAmount *= 0.1;
                    }
                }

                moveAmount = Math.min(moveAmount, amount);

                this.nextFluid[i] -= moveAmount;
                this.nextFluid[nIdx] += moveAmount;
                amount -= moveAmount;
                if(amount <= 0) break;
            }
        }
    }

    getCompressedState(): Uint8Array {
        const buffer = new Uint8Array(this.size);
        if (!this.isFluidEnabled) return buffer;

        for(let i=0; i<this.size; i++) {
            const val = Math.min(255, Math.floor(this.currentFluid[i] * 50.0)); 
            buffer[i] = val;
        }
        return buffer;
    }
}