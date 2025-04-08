"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const wss = new ws_1.WebSocketServer({ port: 8080 });
let userCount = 0;
let allSockets = [];
wss.on("connection", function connection(ws) {
    ws.on("message", function message(event) {
        const parsedEvent = JSON.parse(event);
        if (parsedEvent.type == "join") {
            allSockets.push({
                ws,
                room: parsedEvent.payload.roomId
            });
        }
        if (parsedEvent.type == "chat") {
            // const currentUserRoom = allSockets.find((x)=>x.ws == ws);
            let currentUserRoom = null;
            for (let i = 0; i < allSockets.length; i++) {
                if (allSockets[i].ws == ws) {
                    currentUserRoom = allSockets[i].room;
                }
            }
            for (let i = 0; i < allSockets.length; i++) {
                if (allSockets[i].room == currentUserRoom) {
                    allSockets[i].ws.send(parsedEvent.payload.event);
                }
            }
        }
    });
});
