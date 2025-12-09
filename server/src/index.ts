/**
 * Server Entry Point
 * Initializes the Colyseus Game Server and registers Rooms.
 */
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { createServer } from "http";
import express from "express";
import cors from "cors";
import { GameRoom } from "./rooms/GameRoom";

const port = Number(process.env.PORT || 2567);
const app = express();

app.use(cors());
app.use(express.json());

const httpServer = createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({
    server: httpServer,
  }),
});

// Register the Main Game Room
gameServer.define("game_room", GameRoom);

gameServer.listen(port);
console.log(`[GameServer] Listening on ws://localhost:${port}`);