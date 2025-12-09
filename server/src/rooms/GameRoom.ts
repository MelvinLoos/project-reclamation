import { Room, Client } from "colyseus";
import { WorldState } from "../../../shared/schemas/WorldState"; 
import { FluidSystem } from "../systems/FluidSystem";
import { MSG_FLUID, MSG_INPUT } from "../../../shared/constants/MessageTags";

export class GameRoom extends Room<WorldState> {
    
    // The Authoritative Simulation
    private fluidSystem!: FluidSystem;
    private fluidInterval: any;

    onCreate(options: any) {
        console.log("Creating GameRoom with Shared Schemas...");
        
        // 1. Set State to the Shared WorldState (TDD 01)
        this.setState(new WorldState());

        // 2. Initialize the Fluid System (100x100 Grid)
        this.fluidSystem = new FluidSystem(100, 100);

        // 3. Set Simulation Loop (20 TPS)
        // This calls update() 20 times per second
        this.setSimulationInterval((deltaTime) => this.update(deltaTime));

        // 4. Setup Network Broadcasting (10Hz)
        // We decouple simulation (20Hz) from network (10Hz) to save bandwidth
        this.fluidInterval = setInterval(() => this.broadcastFluid(), 100);

        // 5. Input Handlers
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
        
        // Create player using the WorldState logic
        this.state.createPlayer(client.sessionId, Math.random() * 800, Math.random() * 600);
        
        // Ethical Retention: Calculate Offline Gains
        const player = this.state.players.get(client.sessionId);
        if(player) {
            player.retention.calculateOfflineGain();
        }

        // Send Configuration Handshake
        client.send(MSG_FLUID.CONFIG, { width: this.fluidSystem.width, height: this.fluidSystem.height });
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
        // --- CRITICAL FIX: Run the Simulation ---
        // Previously this line was missing or commented out!
        // console.log("Server Tick"); // Too spammy, uncomment only if desperate
        this.fluidSystem.tick(deltaTime);
    }

    private broadcastFluid() {
        // Get the real data from the system
        const buffer = this.fluidSystem.getCompressedState();
        
        // DEBUG: Check if buffer has data
        let nonZero = 0;
        for(let i=0; i<100; i++) { // Check first 100 cells
             if(buffer[i] > 0) nonZero++;
        }
        // console.log(`Broadcasting Fluid. Size: ${buffer.length}, Sample Non-Zero: ${nonZero}`);

        // Broadcast via the Shared Constant Tag
        this.broadcast(MSG_FLUID.PATCH, buffer);
    }
}