import Phaser from "phaser";
import { Client, Room } from "colyseus.js";
import { MSG_FLUID, MSG_INPUT } from "../../../shared/constants/MessageTags"; 

type Player = any; 

export class GameScene extends Phaser.Scene {
    private client!: Client;
    private room!: Room<any>; 
    private players: Map<string, Phaser.GameObjects.Graphics> = new Map();

    // Fluid
    private fluidTexture!: Phaser.Textures.CanvasTexture; 
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

        this.generateTileset();

        // Setup Fluid Visuals
        this.fluidTexture = this.textures.createCanvas('fluid_data', this.fluidDim, this.fluidDim);
        this.fluidImageData = this.fluidTexture.context.createImageData(this.fluidDim, this.fluidDim);

        this.fluidImage = this.add.image(0, 0, 'fluid_data').setOrigin(0, 0);
        this.fluidImage.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        this.fluidImage.setDepth(1); 

        // Handle Resizing
        this.scale.on('resize', this.resizeGame, this);
        this.time.delayedCall(10, () => this.resizeGame());

        this.client = new Client("ws://localhost:2567");
        this.connect();

        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (this.room) {
                this.room.send(MSG_INPUT.CLICK, { x: pointer.worldX, y: pointer.worldY });
            }
        });
    }

    private resizeGame() {
        const width = this.scale.width;
        const height = this.scale.height;
        const minDim = Math.min(width, height);
        const x = (width - minDim) / 2;
        const y = (height - minDim) / 2;

        if (this.fluidImage) {
            this.fluidImage.setPosition(x, y);
            this.fluidImage.setDisplaySize(minDim, minDim);
        }

        if (this.terrainLayer) {
            this.terrainLayer.setPosition(x, y);
            const scale = minDim / (this.fluidDim * 32); 
            this.terrainLayer.setScale(scale);
        }
        
        this.cameras.main.setViewport(0, 0, width, height);
    }

    /**
     * Enhanced Procedural Tileset
     */
    private generateTileset() {
        // Create a 128x32 texture containing four 32x32 tiles
        const canvas = this.textures.createCanvas('tileset', 128, 32);
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
        ctx.fillRect(100, 100, 4, 4); 

        canvas.refresh();
    }

    private async connect() {
        try {
            this.room = await this.client.joinOrCreate("game_room");
            console.log("Joined Room:", this.room.name);

            this.room.onMessage(MSG_FLUID.TERRAIN, (message: any) => {
                if (message instanceof ArrayBuffer || (message.buffer && message.byteLength !== undefined)) {
                    const data = new Uint8Array(message instanceof ArrayBuffer ? message : message.buffer);
                    this.createTerrainMap(data);
                }
            });

            this.room.onMessage(MSG_FLUID.CONFIG, (message: any) => {
                console.log("Fluid Config:", message);
            });

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
        const mapData: number[][] = [];
        const width = 100;
        
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
            this.terrainLayer.setDepth(0);
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
                // Toxic Green Sludge
                d[idx + 0] = 50;     
                d[idx + 1] = val + 100; 
                d[idx + 2] = 50;     
                d[idx + 3] = 200;   
            } else {
                d[idx + 3] = 0;     
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