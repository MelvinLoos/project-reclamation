import { Schema, MapSchema, type } from "@colyseus/schema";

/**
 * PlayerRetention (TDD 02)
 * Tracks offline time to reward healthy play habits (Accumulation Model).
 */
export class PlayerRetention extends Schema {
    @type("number") lastLogoutTime: number = Date.now();
    @type("number") restedPool: number = 0; // 0-100%

    // TDD 02: 72 Hour Cap
    static MAX_POOL_HOURS = 72;
    static GAIN_PER_HOUR = 100 / PlayerRetention.MAX_POOL_HOURS;

    calculateOfflineGain() {
        const now = Date.now();
        // Convert ms to hours
        const hoursOffline = (now - this.lastLogoutTime) / (1000 * 60 * 60);

        // Ethical Check: Minimum 15 min break required to count as "rest"
        if (hoursOffline > 0.25) { 
            const gain = hoursOffline * PlayerRetention.GAIN_PER_HOUR;
            this.restedPool = Math.min(100, this.restedPool + gain);
        }
        this.lastLogoutTime = now;
    }
}

/**
 * Player
 * Represents a connected user. 
 * Note: Visuals (x, y) are synced, but logic inputs are processed on server.
 */
export class Player extends Schema {
    @type("string") id: string;
    @type("number") x: number;
    @type("number") y: number;
    
    // Composition over Inheritance for systems
    @type(PlayerRetention) retention = new PlayerRetention();

    constructor(id: string, x: number, y: number) {
        super();
        this.id = id;
        this.x = x;
        this.y = y;
    }
}

/**
 * WorldState
 * The root synchronization object.
 */
export class WorldState extends Schema {
    @type({ map: Player }) players = new MapSchema<Player>();

    // TDD 04: Fluid Simulation Metadata
    // We do NOT sync the full Float32Array here directly via Schema (too heavy).
    // We sync a "version" number or compressed patch binary via custom messages.
    @type("number") fluidTick: number = 0;

    createPlayer(sessionId: string, x: number, y: number) {
        this.players.set(sessionId, new Player(sessionId, x, y));
    }

    removePlayer(sessionId: string) {
        // Trigger save to DB here in production
        const player = this.players.get(sessionId);
        if (player) {
            player.retention.lastLogoutTime = Date.now();
            // TODO: Persist player.retention to Database
        }
        this.players.delete(sessionId);
    }
}