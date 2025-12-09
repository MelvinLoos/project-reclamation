/**
 * TerrainSystem.ts
 * Responsible for generating and managing the static world map.
 * 0 = Dirt (Rubble/Nature)
 * 1 = Wall (Standard Structure)
 * 2 = Road (Asphalt)
 * 3 = Park (Overgrowth)
 * 4 = Water (Stagnant)
 * 5 = Canal (Flowing)
 * 6 = Industrial Tank (Round Structure)
 * 7 = Skyscraper (Dense Structure)
 */

export class TerrainSystem {
    readonly width: number;
    readonly height: number;
    private map: Uint8Array;
    
    // Flow Vectors: packed [vx, vy] for each cell
    private flowMap: Float32Array;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.map = new Uint8Array(width * height);
        this.flowMap = new Float32Array(width * height * 2);
        this.generateRuinedCity();
    }

    private generateRuinedCity() {
        const centerX = Math.floor(this.width / 2);
        const centerY = Math.floor(this.height / 2);

        this.map.fill(0);
        this.flowMap.fill(0);

        const blockSize = 12;
        const streetWidth = 2;

        // --- 0. Define Highway Parameters ---
        const highways: { angle: number, curve: number, width: number }[] = [];
        const numHighways = 4;
        
        for (let k = 0; k < numHighways; k++) {
            const baseAngle = (k * (Math.PI * 2) / numHighways);
            const offset = (Math.random() - 0.5) * 0.5; 
            
            highways.push({
                angle: baseAngle + offset,
                curve: (Math.random() - 0.5) * 0.02, 
                width: 0.12 
            });
        }

        const isCentralPark = Math.random() > 0.5;

        // Pre-calculate block types (0=Standard, 1=Industrial, 2=Skyscraper)
        const blockTypeMap = new Uint8Array(Math.ceil(this.width/blockSize) * Math.ceil(this.height/blockSize));
        for(let i=0; i<blockTypeMap.length; i++) {
            const r = Math.random();
            if (r < 0.1) blockTypeMap[i] = 2; // Skyscraper
            else if (r < 0.3) blockTypeMap[i] = 1; // Industrial
            else blockTypeMap[i] = 0; // Standard Residential/Commercial
        }

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const i = y * this.width + x;
                const dx = x - centerX;
                const dy = y - centerY;
                
                const angle = Math.atan2(dy, dx);
                const dist = Math.sqrt(dx*dx + dy*dy);

                // --- 1. Organic City Boundary ---
                const maxRadius = 35 + (Math.sin(angle * 5) * 10) + (Math.cos(angle * 13) * 5);

                if (dist < 8) {
                    if (isCentralPark) {
                        this.map[i] = 3; 
                        continue;
                    } 
                }

                // --- HIGHWAY LOGIC ---
                let isHighway = false;

                const ringNoise = Math.sin(angle * 6) * 1.5; 
                if (Math.abs(dist - (30 + ringNoise)) < 1.5) { 
                    isHighway = true;
                }

                for (const hw of highways) {
                    let targetAngle = hw.angle + (dist * hw.curve);
                    let diff = Math.atan2(Math.sin(angle - targetAngle), Math.cos(angle - targetAngle));
                    if (Math.abs(diff) < hw.width / (dist * 0.15)) { 
                         if (Math.abs(diff) < 0.25) isHighway = true;
                    }
                }

                if (dist > maxRadius && !isHighway) {
                    if (Math.random() < 0.02) this.map[i] = 1;
                    continue;
                }

                // --- 2. City Grid Logic ---
                const gridX = x % blockSize;
                const gridY = y % blockSize;
                const blockX = Math.floor(x / blockSize);
                const blockY = Math.floor(y / blockSize);
                const blockType = blockTypeMap[blockY * Math.ceil(this.width/blockSize) + blockX];
                
                const isStreetX = gridX < streetWidth + (Math.random() * 0.5);
                const isStreetY = gridY < streetWidth + (Math.random() * 0.5);
                
                const blockStreetX = (blockX * 123 + blockY * 456) % 7 === 0;
                const blockStreetY = (blockX * 789 + blockY * 101) % 5 === 0;

                let isRoad = (isStreetX && !blockStreetX) || (isStreetY && !blockStreetY);

                if (isHighway) isRoad = true;

                if (isRoad) {
                    if (isHighway || Math.random() > 0.05) {
                        this.map[i] = 2; // Road
                    }
                } else {
                    // --- 3. Improved Building Blocks with Variation ---
                    const density = (dist < 20) ? 0.85 : 0.4;
                    const bx = Math.floor(x / 2); 
                    const by = Math.floor(y / 2);
                    const structureHash = Math.abs(Math.sin(bx * 12.9898 + by * 78.233) * 43758.5453) % 1;
                    
                    const lakeNoise = Math.sin(x * 0.05) * Math.cos(y * 0.05);
                    const puddleNoise = Math.sin(x * 0.15) * Math.cos(y * 0.15);

                    if (lakeNoise > 0.7 && dist > 15) {
                        this.map[i] = 4; // Water
                    } 
                    else if (blockType === 2 && dist < 25) {
                        // Skyscraper Block (Type 7)
                        if (structureHash < 0.9) this.map[i] = 7; 
                        else this.map[i] = 0;
                    }
                    else if (blockType === 1) {
                        // Industrial Block (Type 6)
                        const localX = gridX - (blockSize/2);
                        const localY = gridY - (blockSize/2);
                        const localDist = Math.sqrt(localX*localX + localY*localY);
                        
                        if (localDist < 3.5) this.map[i] = 6; // Round Tank
                        else if (Math.random() < 0.2) this.map[i] = 0; // Debris
                        else this.map[i] = 3; // Overgrowth
                    }
                    else {
                        // Standard Residential (Type 1)
                        if (structureHash < density) {
                            this.map[i] = 1; 
                        } else if (structureHash < density + 0.1) {
                            this.map[i] = 3; 
                        } else {
                            if (puddleNoise > 0.6) this.map[i] = 4;
                            else this.map[i] = 0;
                        }
                    }
                }
            }
        }
        
        // --- 5. Canal Generation ---
        const numCanals = 2;
        for (let k = 0; k < numCanals; k++) {
             let cx = (k===0) ? 0 : Math.random() * this.width;
             let cy = (k===0) ? Math.random() * this.height : 0;
             let vx = (k===0) ? 1 : 0; 
             let vy = (k===0) ? 0 : 1; 
             
             const steps = 250;
             for(let s=0; s<steps; s++) {
                 const wiggle = Math.sin(s * 0.05) * 0.5;
                 vx = Math.cos(wiggle + (k===0?0:Math.PI/2));
                 vy = Math.sin(wiggle + (k===0?0:Math.PI/2));

                 cx += vx * 0.8;
                 cy += vy * 0.8;
                 
                 const ix = Math.floor(cx);
                 const iy = Math.floor(cy);
                 
                 for(let dy=-1; dy<=1; dy++) {
                     for(let dx=-1; dx<=1; dx++) {
                         const idx = (iy+dy) * this.width + (ix+dx);
                         if (idx >= 0 && idx < this.map.length) {
                             if(this.map[idx] !== 2) { 
                                 this.map[idx] = 5; 
                                 this.flowMap[idx*2] = vx;
                                 this.flowMap[idx*2+1] = vy;
                             }
                         }
                     }
                 }
             }
        }

        this.applyDecay(2);
    }

    private applyDecay(iterations: number) {
        const tempMap = new Uint8Array(this.map);

        for(let k=0; k<iterations; k++) {
            for (let y = 1; y < this.height - 1; y++) {
                for (let x = 1; x < this.width - 1; x++) {
                    const i = y * this.width + x;
                    const type = this.map[i];

                    let walls = 0;
                    let nature = 0;
                    let roads = 0;
                    let water = 0;

                    for(let dy=-1; dy<=1; dy++) {
                        for(let dx=-1; dx<=1; dx++) {
                            if (dx===0 && dy===0) continue;
                            const nType = this.map[(y+dy)*this.width + (x+dx)];
                            // Count all structural types as walls for support
                            if (nType === 1 || nType === 6 || nType === 7) walls++;
                            if (nType === 2) roads++;
                            if (nType === 3) nature++;
                            if (nType === 4 || nType === 5) water++;
                        }
                    }

                    // Solidify Standard Buildings
                    if (type === 0 && walls >= 5) tempMap[i] = 1;

                    // Erode lonely walls (Apply to all structure types)
                    if ((type === 1 || type === 6 || type === 7) && walls < 2) tempMap[i] = 0; 
                    
                    if (type === 0 && nature > 1 && Math.random() < 0.1) tempMap[i] = 3;
                    if (type === 2 && roads < 1) tempMap[i] = 0; 
                    if (type === 0 && water > 3 && Math.random() < 0.2) tempMap[i] = 4;
                }
            }
            this.map.set(tempMap);
        }
    }

    getMap(): Uint8Array {
        return this.map;
    }

    isWall(x: number, y: number): boolean {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return true;
        const t = this.map[y * this.width + x];
        // 1=Standard, 6=Tank, 7=Skyscraper are walls
        return t === 1 || t === 6 || t === 7;
    }
    
    isWallIndex(i: number): boolean {
        if (i < 0 || i >= this.map.length) return true;
        const t = this.map[i];
        return t === 1 || t === 6 || t === 7;
    }

    getFlow(i: number): { x: number, y: number } {
        return {
            x: this.flowMap[i*2],
            y: this.flowMap[i*2+1]
        };
    }
}