/**
 * TerrainSystem.ts
 * Responsible for generating and managing the static world map.
 * 0 = Dirt
 * 1 = Wall/Ruin
 * 2 = Road
 * 3 = Park/Grass
 */

export class TerrainSystem {
    readonly width: number;
    readonly height: number;
    private map: Uint8Array;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.map = new Uint8Array(width * height);
        this.generateCityRuins();
    }

    private generateCityRuins() {
        const centerX = Math.floor(this.width / 2);
        const centerY = Math.floor(this.height / 2);

        this.map.fill(0); // Fill with Dirt

        const blockSize = 12;
        const streetWidth = 2;

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const i = y * this.width + x;
                const dx = x - centerX;
                const dy = y - centerY;
                const dist = Math.sqrt(dx*dx + dy*dy);

                if (dist < 8) {
                    this.map[i] = 3; // Center Park
                    continue;
                }

                // Grid Logic
                const gridX = x % blockSize;
                const gridY = y % blockSize;
                const isStreet = gridX < streetWidth || gridY < streetWidth;

                if (isStreet) {
                    this.map[i] = 2; // Road
                } else {
                    // Inside block
                    if (Math.random() < 0.6 && dist < 45) {
                        this.map[i] = 1; // Ruin
                    } else if (Math.random() < 0.1) {
                        this.map[i] = 3; // Pocket Park
                    } else {
                        this.map[i] = 0; // Dirt/Rubble
                    }
                }
            }
        }
        
        // No erosion for now to keep roads straight
    }

    getMap(): Uint8Array {
        return this.map;
    }

    isWall(x: number, y: number): boolean {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return true;
        return this.map[y * this.width + x] === 1; 
    }
    
    isWallIndex(i: number): boolean {
        if (i < 0 || i >= this.map.length) return true;
        return this.map[i] === 1;
    }
}