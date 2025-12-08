import Phaser from "phaser";
import { Client, Room } from "colyseus.js";
import { MSG_FLUID, MSG_INPUT } from "../../../shared/constants/MessageTags"; 

// Types for clarity
type Player = any; 
type GameState = any;

export class GameScene extends Phaser.Scene {
    private client!: Client;
    private room!: Room<GameState>;
    private players: Map<string, Phaser.GameObjects.Graphics> = new Map();

    // Fluid Sim Visuals
    private fluidTexture!: Phaser.Textures.CanvasTexture;
    private fluidDim = 100; 
    private gridGraphics!: Phaser.GameObjects.Graphics;

    constructor() {
        super("GameScene");
    }

    create() {
        console.log("Initializing GameScene...");

        // 1. Setup Visuals
        this.createFluidGrid();

        // 2. Connect
        this.client = new Client("ws://localhost:2567");
        this.connect();

        // 3. Input
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

            // --- FLUID HANDLERS ---
            
            // 1. Fluid Data Patch (The flowing sludge)
            this.room.onMessage(MSG_FLUID.PATCH, (message: any) => {
                if (message instanceof ArrayBuffer || (message.buffer && message.byteLength !== undefined)) {
                    const data = new Uint8Array(message);
                    this.updateFluidTexture(data);
                }
            });

            // 2. Fluid Configuration (The handshake)
            // This silences the "onMessage() not registered" warning
            this.room.onMessage(MSG_FLUID.CONFIG, (message: { width: number, height: number }) => {
                console.log("Fluid Simulation Configured:", message);
                // In the future, we can use this to resize the texture dynamically
                // if the server decides to change the map size.
                if (message.width !== this.fluidDim) {
                    console.warn(`Server map size (${message.width}) differs from local default (${this.fluidDim})`);
                }
            });

            this.setupStateListeners();

        } catch (e) {
            console.error("Join error", e);
        }
    }

    private setupStateListeners() {
        this.room.state.players.onAdd = (player: Player, sessionId: string) => {
            const graphics = this.add.graphics();
            graphics.fillStyle(0xff0000, 1);
            graphics.fillRect(-16, -16, 32, 32); 
            graphics.x = player.x;
            graphics.y = player.y;
            this.players.set(sessionId, graphics);

            if (sessionId === this.room.sessionId) {
                this.cameras.main.startFollow(graphics);
            }

            player.onChange = () => {
                this.tweens.add({
                    targets: graphics,
                    x: player.x,
                    y: player.y,
                    duration: 50,
                });
            };
        };

        this.room.state.players.onRemove = (player: Player, sessionId: string) => {
            const graphics = this.players.get(sessionId);
            if (graphics) {
                graphics.destroy();
                this.players.delete(sessionId);
            }
        };
    }

    private createFluidGrid() {
        const texture = this.textures.createCanvas('fluid_grid', this.fluidDim, this.fluidDim);
        if (!texture) throw new Error('Failed to create fluid texture');
        this.fluidTexture = texture;
        const fluidImage = this.add.image(0, 0, 'fluid_grid').setOrigin(0, 0);
        fluidImage.setScale(4); 
        fluidImage.setDepth(0);
        
        // Debug Text
        this.add.text(10, 10, "Debug: Green = Fluid", { color: '#ffffff', backgroundColor: '#000000' }).setDepth(200);
    }

    private updateFluidTexture(data: Uint8Array) {
        const size = this.fluidDim * this.fluidDim;
        if (data.length < size) return;

        const ctx = this.fluidTexture.context;
        const imgData = ctx.createImageData(this.fluidDim, this.fluidDim);
        
        for (let i = 0; i < size; i++) {
            const val = data[i];
            const idx = i * 4;
            if (val > 10) { 
                imgData.data[idx + 0] = 0;     
                imgData.data[idx + 1] = Math.min(255, val + 50);   
                imgData.data[idx + 2] = 0;     
                imgData.data[idx + 3] = 255;   
            } else {
                imgData.data[idx + 3] = 0; 
            }
        }
        ctx.putImageData(imgData, 0, 0);
        this.fluidTexture.refresh();
    }

    update(time: number, delta: number) {
    }
}