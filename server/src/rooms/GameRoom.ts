import { Room, Client } from "colyseus";
import { WorldState } from "../../../shared/schemas/WorldState"; 
import { FluidSystem } from "../systems/FluidSystem";
import { TerrainSystem } from "../systems/TerrainSystem";
import { MSG_FLUID, MSG_INPUT } from "../../../shared/constants/MessageTags";

export class GameRoom extends Room<WorldState> {
    
    private fluidSystem!: FluidSystem;
    private terrainSystem!: TerrainSystem;
    private fluidInterval: any;

    onCreate(options: any) {
        console.log("Creating GameRoom...");
        this.setState(new WorldState());

        // 1. Initialize Terrain FIRST
        this.terrainSystem = new TerrainSystem(100, 100);

        // 2. Initialize Fluid (Pass Terrain dependency)
        this.fluidSystem = new FluidSystem(100, 100, this.terrainSystem);

        // 3. Set Loops
        this.setSimulationInterval((deltaTime) => this.update(deltaTime));
        this.fluidInterval = setInterval(() => this.broadcastFluid(), 100);

        // 4. Input
        this.onMessage(MSG_INPUT.CLICK, (client, message) => {
            if(message && typeof message.x === 'number' && typeof message.y === 'number') {
                const player = this.state.players.get(client.sessionId);
                if (player) {
                    player.x = message.x;
                    player.y = message.y;
                }
            }
        });
    }

    onJoin(client: Client, options: any) {
        console.log(client.sessionId, "joined!");
        this.state.createPlayer(client.sessionId, Math.random() * 800, Math.random() * 600);
        
        // Send Config & Terrain Map
        client.send(MSG_FLUID.CONFIG, { width: 100, height: 100 });
        client.send(MSG_FLUID.TERRAIN, this.terrainSystem.getMap());
    }

    onLeave(client: Client, consented: boolean) {
        this.state.removePlayer(client.sessionId);
    }

    onDispose() {
        if (this.fluidInterval) clearInterval(this.fluidInterval);
    }

    update(deltaTime: number) {
        this.fluidSystem.tick(deltaTime);
    }

    private broadcastFluid() {
        const buffer = this.fluidSystem.getCompressedState();
        this.broadcast(MSG_FLUID.PATCH, buffer);
    }
}