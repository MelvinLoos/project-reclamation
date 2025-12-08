import { Room, Client } from "colyseus";
import { GameState } from "./schema/GameState";
import { MSG_FLUID, MSG_INPUT } from "../../../shared/constants/MessageTags";

export class GameRoom extends Room<GameState> {
    
    // Simulation Loop Timer
    private fluidInterval: any;

    onCreate(options: any) {
        this.setState(new GameState());

        // Set the simulation tick rate (e.g., 20fps for logic)
        this.setSimulationInterval((deltaTime) => this.update(deltaTime));

        // Setup a separate interval for broadcasting Fluid Data (Bandwidth optimization)
        // We might calculate fluid every tick, but only send it every 100ms (10Hz)
        this.fluidInterval = setInterval(() => this.broadcastFluid(), 100);

        // Handle Input
        this.onMessage(MSG_INPUT.CLICK, (client, message) => {
            this.state.movePlayer(client.sessionId, message.x, message.y);
        });
    }

    onJoin(client: Client, options: any) {
        console.log(client.sessionId, "joined!");
        this.state.createPlayer(client.sessionId);
        
        // Send initial config
        client.send(MSG_FLUID.CONFIG, { width: 100, height: 100 });
    }

    onLeave(client: Client, consented: boolean) {
        console.log(client.sessionId, "left!");
        this.state.removePlayer(client.sessionId);
    }

    onDispose() {
        console.log("room", this.roomId, "disposing...");
        if (this.fluidInterval) clearInterval(this.fluidInterval);
    }

    update(deltaTime: number) {
        // Standard Game Logic (Entity movement, etc.)
        // this.fluidSystem.tick(deltaTime); 
    }

    /**
     * Broadcasting the Fluid Data
     * This replaces the old "fluidParams" or "fluidPatch" strings with the Constant
     */
    private broadcastFluid() {
        // Mocking the binary buffer for now. 
        // In reality, this comes from FluidSystem.getCompressedBuffer()
        const mockSize = 100 * 100;
        const buffer = new Uint8Array(mockSize);

        // Fill with some dummy noise to verify client rendering
        for(let i=0; i<mockSize; i++) {
            // Simple moving wave pattern
            buffer[i] = (Math.sin(i * 0.1 + Date.now() * 0.005) * 127) + 128; 
        }

        // --- THE FIX: Using Shared Constant ---
        this.broadcast(MSG_FLUID.PATCH, buffer);
    }
}