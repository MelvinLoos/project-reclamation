import { Schema, MapSchema, type } from "@colyseus/schema";
import { Player } from "./Player";

export class GameState extends Schema {
    // A Map of all connected players, synced automatically
    @type({ map: Player }) players = new MapSchema<Player>();

    createPlayer(sessionId: string) {
        const player = new Player();
        
        // Spawn somewhere random within the 800x600 mock world for now
        player.x = Math.random() * 800;
        player.y = Math.random() * 600;
        
        this.players.set(sessionId, player);
    }

    removePlayer(sessionId: string) {
        this.players.delete(sessionId);
    }

    movePlayer(sessionId: string, x: number, y: number) {
        const player = this.players.get(sessionId);
        if (player) {
            player.x = x;
            player.y = y;
        }
    }
}