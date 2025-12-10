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

    // Interaction & Camera
    private dragOrigin: { x: number, y: number } | null = null;
    private targetZoom: number = 1.0;
    private targetScroll: { x: number, y: number } = { x: 0, y: 0 };
    private isDragging: boolean = false;
    
    // Debug Border to verify alignment
    private alignmentBorder!: Phaser.GameObjects.Graphics;

    constructor() {
        super("GameScene");
    }

    preload() {}

    create() {
        console.log("Initializing GameScene...");

        // 1. Generate the visuals for the map
        this.generateTileset();

        // 2. Setup Fluid Visuals (Layer 1 - Top)
        const fluidCanvas = this.textures.createCanvas('fluid_data', this.fluidDim, this.fluidDim);
        if (!fluidCanvas) return;
        this.fluidTexture = fluidCanvas;
        this.fluidImageData = this.fluidTexture.context.createImageData(this.fluidDim, this.fluidDim);

        this.fluidImage = this.add.image(0, 0, 'fluid_data').setOrigin(0, 0);
        this.fluidImage.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        this.fluidImage.setDepth(1); 
        
        // Debug alignment border
        this.alignmentBorder = this.add.graphics();
        this.alignmentBorder.setDepth(100);

        // 3. Setup Camera & Interaction
        this.setupCamera();

        // 4. Connect
        this.client = new Client("ws://localhost:2567");
        this.connect();

        // 5. Input
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            // Drag on Left Click (Primary) now
            if (pointer.primaryDown) {
                this.dragOrigin = { x: pointer.x, y: pointer.y };
                this.isDragging = true;
            } else {
                // Right click for game interaction
                const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
                if (this.room) {
                    this.room.send(MSG_INPUT.CLICK, { x: worldPoint.x, y: worldPoint.y });
                }
            }
        });

        this.input.on('pointerup', () => {
            this.dragOrigin = null;
            this.isDragging = false;
        });

        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (this.isDragging && this.dragOrigin) {
                const dx = pointer.x - this.dragOrigin.x;
                const dy = pointer.y - this.dragOrigin.y;
                
                // Update Target Scroll instead of direct scroll for smoothness
                this.targetScroll.x -= dx / this.cameras.main.zoom;
                this.targetScroll.y -= dy / this.cameras.main.zoom;
                
                this.dragOrigin = { x: pointer.x, y: pointer.y };
            }
        });

        this.input.on('wheel', (pointer: Phaser.Input.Pointer, gameObjects: any, deltaX: number, deltaY: number) => {
            const zoomAmount = 0.1;
            
            if (deltaY > 0) {
                this.targetZoom -= zoomAmount;
            } else {
                this.targetZoom += zoomAmount;
            }

            // Clamp zoom
            this.targetZoom = Phaser.Math.Clamp(this.targetZoom, 0.5, 4.0);
        });
        
        // Disable context menu on the game canvas to prevent accidental right-click actions
        this.game.canvas.oncontextmenu = (e) => {
            e.preventDefault();
        };
        
        this.input.mouse?.disableContextMenu();
    }

    private setupCamera() {
        const worldWidth = this.fluidDim * 32;
        const worldHeight = this.fluidDim * 32;

        this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
        this.cameras.main.centerOn(worldWidth / 2, worldHeight / 2);
        
        // Initialize targets
        this.targetZoom = 1.0;
        this.targetScroll = { x: this.cameras.main.scrollX, y: this.cameras.main.scrollY };
    }

    // ... [generateTileset, connect, createTerrainMap, updateFluidData, setupStateListeners remain unchanged] ...
    /**
     * Enhanced Procedural Tileset
     * 0: Dirt, 1: Wall, 2: Road, 3: Park, 4: Water, 5: Canal
     * 6: Industrial Tank, 7: Skyscraper
     */
    private generateTileset() {
        const canvas = this.textures.createCanvas('tileset', 256, 32);
        if (!canvas) return;
        const ctx = canvas.context;

        // Tile 0: Dirt
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(0, 0, 32, 32);
        ctx.fillStyle = '#3e2723';
        ctx.fillRect(4, 4, 24, 24);

        // Tile 1: Wall
        ctx.fillStyle = '#455a64'; 
        ctx.fillRect(32, 0, 32, 32);
        ctx.fillStyle = '#cfd8dc'; 
        ctx.fillRect(36, 4, 4, 24);
        ctx.fillRect(48, 4, 4, 12);

        // Tile 2: Road
        ctx.fillStyle = '#212121';
        ctx.fillRect(64, 0, 32, 32);
        ctx.fillStyle = '#ffeb3b'; 
        ctx.fillRect(78, 12, 4, 8); 

        // Tile 3: Park
        ctx.fillStyle = '#2e7d32';
        ctx.fillRect(96, 0, 32, 32);
        ctx.fillStyle = '#a5d6a7'; 
        ctx.fillRect(100, 10, 4, 4); 

        // Tile 4: Water
        ctx.fillStyle = '#006064'; 
        ctx.fillRect(128, 0, 32, 32);
        ctx.fillStyle = '#00838f'; 
        ctx.fillRect(132, 8, 20, 4);
        ctx.fillRect(140, 20, 10, 4);

        // Tile 5: Canal
        ctx.fillStyle = '#90a4ae'; 
        ctx.fillRect(160, 0, 32, 32);
        ctx.fillStyle = '#0277bd'; 
        ctx.fillRect(160, 4, 32, 24); 

        // Tile 6: Tank
        ctx.fillStyle = '#3e2723'; 
        ctx.fillRect(192, 0, 32, 32);
        ctx.fillStyle = '#bf360c'; 
        ctx.beginPath();
        ctx.arc(208, 16, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffccbc'; 
        ctx.beginPath();
        ctx.arc(204, 12, 4, 0, Math.PI * 2);
        ctx.fill();

        // Tile 7: Skyscraper
        ctx.fillStyle = '#263238'; 
        ctx.fillRect(224, 0, 32, 32);
        ctx.fillStyle = '#81d4fa'; 
        ctx.fillRect(226, 2, 12, 12);
        ctx.fillRect(242, 2, 8, 12);
        ctx.fillRect(226, 18, 12, 12);
        ctx.fillRect(242, 18, 8, 12);

        canvas.refresh();
    }

    private async connect() {
        try {
            this.room = await this.client.joinOrCreate("game_room");
            console.log("Joined Room:", this.room.name);

            // --- HANDLERS ---

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
            this.terrainLayer.setDepth(0); 
            
            // Set world size to match the map
            // 100 tiles * 32px = 3200px
            const worldSize = 100 * 32;
            
            // FIX: Fluid Image must match the world size exactly
            this.fluidImage.setDisplaySize(worldSize, worldSize);
            // FIX: Origin is 0,0, so position should be 0,0 to match map layer at 0,0
            this.fluidImage.setPosition(0, 0); 
            
            // Draw a debug border around the world
            if (this.alignmentBorder) {
                this.alignmentBorder.clear();
                this.alignmentBorder.lineStyle(4, 0xff0000, 1);
                this.alignmentBorder.strokeRect(0, 0, worldSize, worldSize);
            }
            
            // Re-set camera bounds now that we have data
            this.cameras.main.setBounds(0, 0, worldSize, worldSize);
            
            // Center camera on the map initially
            this.cameras.main.centerOn(worldSize / 2, worldSize / 2);
            this.targetScroll = { x: this.cameras.main.scrollX, y: this.cameras.main.scrollY };
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
                d[idx + 1] = val + 50; 
                d[idx + 2] = 0;     
                d[idx + 3] = 180;   
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

    update(time: number, delta: number) {
        // Smooth Camera Movement (Lerp)
        const lerpFactor = 0.1;
        
        // Zoom
        if (Math.abs(this.cameras.main.zoom - this.targetZoom) > 0.001) {
            const newZoom = Phaser.Math.Linear(this.cameras.main.zoom, this.targetZoom, lerpFactor);
            this.cameras.main.setZoom(newZoom);
        }

        // Scroll
        // We only interpolate scroll if NOT dragging, or if we want smoother drag.
        // Direct setting is usually preferred for drag to feel 1:1, but lerp feels "heavy".
        // Let's use lerp for wheel zoom centering, but for dragging we might want direct.
        // Actually, let's just lerp everything for consistent feel.
        
        if (Math.abs(this.cameras.main.scrollX - this.targetScroll.x) > 0.1 || 
            Math.abs(this.cameras.main.scrollY - this.targetScroll.y) > 0.1) {
            
            this.cameras.main.scrollX = Phaser.Math.Linear(this.cameras.main.scrollX, this.targetScroll.x, lerpFactor);
            this.cameras.main.scrollY = Phaser.Math.Linear(this.cameras.main.scrollY, this.targetScroll.y, lerpFactor);
        }
    }
}