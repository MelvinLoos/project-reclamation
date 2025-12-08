/**
 * Server Entry Point
 * Initializes the Colyseus Game Server and registers Rooms.
 */
import { Server } from "colyseus";
import { createServer } from "http";
import express from "express";
import cors from "cors";
import { GameRoom } from "./rooms/GameRoom"; // Ensure you place GameRoom.ts in /rooms

const port = Number(process.env.PORT || 2567);
const app = express();

app.use(cors());
app.use(express.json());

const gameServer = new Server({
  server: createServer(app),
});

// Register the Main Game Room
gameServer.define("game_room", GameRoom);

gameServer.listen(port);
console.log(`[GameServer] Listening on ws://localhost:${port}`);