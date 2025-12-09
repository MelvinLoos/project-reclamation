import Phaser from "phaser";
import { Client, Room } from "colyseus.js";
import { MSG_FLUID, MSG_INPUT } from "../../../shared/constants/MessageTags"; 

type Player = any; 

export class GameScene extends Phaser.Scene {
    private client!: Client;
    private room!: Room<any>; 
    private players: Map<string, Phaser.GameObjects.Graphics> = new Map();

    private fluidTexture!: Phaser.Textures.CanvasTexture; 
    private fluidDim = 100; 
    private fluidImageData!: ImageData; 

    constructor() {
        super("GameScene");
    }

    preload() {}

    create() {
        console.log("Initializing GameScene...");

        // 1. Create the Fluid Texture
        // This acts as the main visual for now.
        // We create it at 100x100 resolution.
        this.fluidTexture = this.textures.createCanvas('fluid_data', this.fluidDim, this.fluidDim);
        this.fluidImageData = this.fluidTexture.context.createImageData(this.fluidDim, this.fluidDim);

        // 2. Add it to the Scene
        // We scale it up 8x to fill the 800x800 world space
        // setFilter(Phaser.Textures.FilterMode.NEAREST) makes it look pixelated (retro) instead of blurry
        const fluidImage = this.add.image(0, 0, 'fluid_data').setOrigin(0, 0);
        fluidImage.setScale(8); 
        fluidImage.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        fluidImage.setDepth(0);

        // 3. Connect Network
        this.client = new Client("ws://localhost:2567");
        this.connect();

        // 4. Input
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (this.room) {
                this.room.send(MSG_INPUT.CLICK, { x: pointer.worldX, y: pointer.worldY });
            }
        });
    }

    private async connect() {
        try {
            this.room = await this.client.joinOrCreate("game_room");
            console.log("Joined Room:", this.room.name);

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

    private updateFluidData(data: Uint8Array) {
        if (!this.fluidTexture) return;

        const size = this.fluidDim * this.fluidDim;
        if (data.length < size) return;

        const imgData = this.fluidImageData;
        const d = imgData.data; 
        
        for (let i = 0; i < size; i++) {
            const val = data[i]; 
            const idx = i * 4;
            
            // Visualization Logic:
            // If val > 0, we show it. 
            // We can map intensity to color here directly in CPU since the grid is small (100x100).
            
            if (val > 0) {
                d[idx + 0] = 0;     // R
                d[idx + 1] = val + 50; // G (Base green + intensity)
                d[idx + 2] = 0;     // B
                d[idx + 3] = 255;   // Alpha
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

    // No longer needed: generateProceduralTextures()
    
    update(time: number, delta: number) {
        // No shader updates needed
    }
}