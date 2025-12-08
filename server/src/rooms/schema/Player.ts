import { Schema, type } from "@colyseus/schema";

export class Player extends Schema {
    @type("number") x: number = 0;
    @type("number") y: number = 0;
    
    // We can add more specific player fields here later
    // e.g., @type("number") energy: number = 100;
}