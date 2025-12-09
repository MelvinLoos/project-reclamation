import Phaser from "phaser";
import { Client, Room } from "colyseus.js";
import { MSG_FLUID, MSG_INPUT } from "../../../shared/constants/MessageTags"; 

type Player = any; 

export class GameScene extends Phaser.Scene {
    private client!: Client;
    private room!: Room<any>; 
    private players: Map<string, Phaser.GameObjects.Graphics> = new Map();

    // Fluid
    private fluidTexture!: Phaser.Textures.CanvasTexture | null; 
    private fluidDim = 100; 
    private fluidImageData!: ImageData; 
    private fluidImage!: Phaser.GameObjects.Image;
    
    // Terrain
    private map!: Phaser.Tilemaps.Tilemap;
    private terrainLayer!: Phaser.Tilemaps.TilemapLayer;

    constructor() {
        super("GameScene");
    }

    preload() {}

    create() {
        console.log("Initializing GameScene...");

        // 1. Generate the visuals for the map (Dirt/Wall)
        this.generateTileset();

        // 2. Setup Fluid Visuals (Layer 1 - Top)
        this.fluidTexture = this.textures.createCanvas('fluid_data', this.fluidDim, this.fluidDim);
        if (!this.fluidTexture) return;
        this.fluidImageData = this.fluidTexture.context.createImageData(this.fluidDim, this.fluidDim);

        this.fluidImage = this.add.image(0, 0, 'fluid_data').setOrigin(0, 0);
        this.fluidImage.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        this.fluidImage.setDepth(1); // Draw ABOVE the terrain

        // 3. Handle Resizing (Responsive Layout)
        this.scale.on('resize', this.resizeGame, this);
        this.time.delayedCall(10, () => this.resizeGame());

        // 4. Connect
        this.client = new Client("ws://localhost:2567");
        this.connect();

        // 5. Input
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (this.room) {
                this.room.send(MSG_INPUT.CLICK, { x: pointer.worldX, y: pointer.worldY });
            }
        });
    }

    private resizeGame() {
        const width = this.scale.width;
        const height = this.scale.height;

        // Target Aspect Ratio (Square 1:1)
        const minDim = Math.min(width, height);
        
        // Calculate centered position
        const x = (width - minDim) / 2;
        const y = (height - minDim) / 2;

        // Apply to Fluid Image
        if (this.fluidImage) {
            this.fluidImage.setPosition(x, y);
            this.fluidImage.setDisplaySize(minDim, minDim);
        }

        // Apply to Terrain Layer
        if (this.terrainLayer) {
            this.terrainLayer.setPosition(x, y);
            const scale = minDim / (this.fluidDim * 32); 
            this.terrainLayer.setScale(scale);
        }
        
        this.cameras.main.setViewport(0, 0, width, height);
    }

    /**
     * Enhanced Procedural Tileset
     * 0: Dirt, 1: Wall, 2: Road, 3: Park, 4: Water, 5: Canal
     */
    private generateTileset() {
        // Create a 192x32 texture containing six 32x32 tiles
        const canvas = this.textures.createCanvas('tileset', 192, 32);
        if (!canvas) return;
        const ctx = canvas.context;

        // Tile 0: Dirt (Brown)
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(0, 0, 32, 32);
        ctx.fillStyle = '#3e2723';
        ctx.fillRect(4, 4, 24, 24);

        // Tile 1: Wall/Ruin (Concrete Blue-Grey)
        ctx.fillStyle = '#455a64'; 
        ctx.fillRect(32, 0, 32, 32);
        ctx.fillStyle = '#cfd8dc'; // Rebar/Highlight
        ctx.fillRect(36, 4, 4, 24);
        ctx.fillRect(48, 4, 4, 12);

        // Tile 2: Road (Asphalt)
        ctx.fillStyle = '#212121';
        ctx.fillRect(64, 0, 32, 32);
        ctx.fillStyle = '#ffeb3b'; // Yellow Line
        ctx.fillRect(78, 12, 4, 8); // Dash

        // Tile 3: Park (Grass)
        ctx.fillStyle = '#2e7d32';
        ctx.fillRect(96, 0, 32, 32);
        ctx.fillStyle = '#a5d6a7'; // Flower/Light grass
        ctx.fillRect(100, 10, 4, 4); 

        // Tile 4: Water (Stagnant - Murky Green/Blue)
        ctx.fillStyle = '#006064'; 
        ctx.fillRect(128, 0, 32, 32);
        ctx.fillStyle = '#00838f'; // Ripple
        ctx.fillRect(132, 8, 20, 4);
        ctx.fillRect(140, 20, 10, 4);

        // Tile 5: Canal (Flowing Blue + Concrete Edges)
        ctx.fillStyle = '#90a4ae'; // Concrete Edge
        ctx.fillRect(160, 0, 32, 32);
        ctx.fillStyle = '#0277bd'; // Clean Blue Water
        ctx.fillRect(160, 4, 32, 24); // Channel in middle

        if (canvas) {
            canvas.refresh();
        }
    }

    private async connect() {
        try {
            this.room = await this.client.joinOrCreate("game_room");
            console.log("Joined Room:", this.room.name);

            // --- HANDLERS ---

            // 1. Terrain Map (Static, received once)
            this.room.onMessage(MSG_FLUID.TERRAIN, (message: any) => {
                console.log("Received Terrain Map");
                // Convert buffer to Uint8Array
                if (message instanceof ArrayBuffer || (message.buffer && message.byteLength !== undefined)) {
                    const data = new Uint8Array(message instanceof ArrayBuffer ? message : message.buffer);
                    this.createTerrainMap(data);
                }
            });

            // 2. Fluid Config
            this.room.onMessage(MSG_FLUID.CONFIG, (message: any) => {
                console.log("Fluid Config:", message);
            });

            // 3. Fluid Update (Dynamic)
            this.room.onMessage(MSG_FLUID.PATCH, (message: any) => {
                if (message instanceof ArrayBuffer || (message.buffer && message.byteLength !== undefined)) {
                    const buffer = message instanceof ArrayBuffer ? message : message.buffer;
                    const data = new Uint8Array(buffer);
                    this.updateFluidData(data);
                }
            });

            this.setupStateListeners();
        } catch (e) {
            console.error("Join error", e);
        }
    }

    private createTerrainMap(data: Uint8Array) {
        // Convert 1D array to 2D array for Phaser
        const mapData: number[][] = [];
        const width = 100; // Known from config
        
        for (let y = 0; y < width; y++) {
            const row: number[] = [];
            for (let x = 0; x < width; x++) {
                row.push(data[y * width + x]);
            }
            mapData.push(row);
        }

        this.map = this.make.tilemap({ data: mapData, tileWidth: 32, tileHeight: 32 });
        const tiles = this.map.addTilesetImage('tileset', 'tileset', 32, 32);
        if(tiles) {
            this.terrainLayer = this.map.createLayer(0, tiles, 0, 0)!;
            this.terrainLayer.setDepth(0); // Layer 0 - Bottom
            this.resizeGame();
        }
    }

    private updateFluidData(data: Uint8Array) {
        if (!this.fluidTexture) return;

        const size = this.fluidDim * this.fluidDim;
        if (data.length < size) return;

        const imgData = this.fluidImageData;
        const d = imgData.data; 
        
        for (let i = 0; i < size; i++) {
            const val = data[i]; 
            const idx = i * 4;
            
            if (val > 0) {
                // R, G, B, Alpha
                d[idx + 0] = 0;     
                d[idx + 1] = val + 50; // Bright Green
                d[idx + 2] = 0;     
                // Alpha: 180 (Semi-transparent) so we can see the ruins underneath!
                d[idx + 3] = 180;   
            } else {
                d[idx + 3] = 0;     // Transparent
            }
        }
        
        this.fluidTexture.context.putImageData(imgData, 0, 0);
        this.fluidTexture.refresh(); 
    }

    private setupStateListeners() {
        this.room.state.players.onAdd = (player: Player, sessionId: string) => {
            const graphics = this.add.graphics();
            graphics.fillStyle(0xffffff, 1); 
            graphics.fillCircle(0, 0, 10);
            graphics.x = player.x;
            graphics.y = player.y;
            graphics.setDepth(100); 
            this.players.set(sessionId, graphics);
            
            player.onChange = () => {
                this.tweens.add({ targets: graphics, x: player.x, y: player.y, duration: 50 });
            };
        };
        this.room.state.players.onRemove = (player: Player, sessionId: string) => {
            const p = this.players.get(sessionId);
            if(p) { p.destroy(); this.players.delete(sessionId); }
        };
    }

    update(time: number, delta: number) {}
}