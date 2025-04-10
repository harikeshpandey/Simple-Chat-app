import { WebSocketServer, WebSocket } from "ws";

// Define interfaces for typed data structures
interface User {
  ws: WebSocket;
  room: string;
  clientId?: string;
}

interface ChatMessage {
  type: string;
  msgId?: string;
  message?: string;
  roomId?: string;
  clientId?: string;
  payload?: {
    event?: string;
    roomId?: string;
  };
}

// Create WebSocket server
const wss = new WebSocketServer({ port: 8080 });
console.log("WebSocket server running on port 8080");

// Track connected users
let allSockets: User[] = [];

wss.on("connection", function connection(ws) {
  console.log("New client connected");
  
  ws.on("message", function message(eventData) {
    try {
      // Parse the incoming message
      const parsedEvent = JSON.parse(eventData.toString()) as ChatMessage;
      console.log("Received message:", parsedEvent);
      
      // Handle JOIN requests
      if (parsedEvent.type === "join") {
        const roomId = parsedEvent.roomId || parsedEvent.payload?.roomId;
        const clientId = parsedEvent.clientId;
        
        if (!roomId) {
          console.error("Room ID missing in join request");
          return;
        }
        
        // Store user connection info
        allSockets.push({
          ws,
          room: roomId,
          clientId: clientId
        });
        
        console.log(`User joined room: ${roomId}`);
        
        // Confirm room join to the client
        ws.send(JSON.stringify({
          type: "join_confirmation",
          roomId: roomId,
          msgId: "join-confirm-" + Date.now()
        }));
      }
      
      // Handle CHAT messages
      else if (parsedEvent.type === "chat") {
        // Find the room for this user
        let currentUserRoom = null;
        let sendingClientId = parsedEvent.clientId;
        
        for (let i = 0; i < allSockets.length; i++) {
          if (allSockets[i].ws === ws) {
            currentUserRoom = allSockets[i].room;
            break;
          }
        }
        
        if (!currentUserRoom) {
          console.error("Could not find user's room");
          return;
        }
        
        // Extract the message text
        const messageText = parsedEvent.message || parsedEvent.payload?.event || "";
        
        // Create a formatted message to broadcast
        const broadcastMessage = {
          type: "chat",
          fromServer: true,
          msgId: parsedEvent.msgId || "server-" + Date.now(),
          message: messageText,
          roomId: currentUserRoom,
          timestamp: new Date().toISOString()
        };
        
        console.log(`Broadcasting message to room ${currentUserRoom}:`, broadcastMessage);
        
        // Send to all users in the same room
        for (let i = 0; i < allSockets.length; i++) {
          if (allSockets[i].room === currentUserRoom && allSockets[i].ws !== ws) {
            // Don't send back to the original sender
            allSockets[i].ws.send(JSON.stringify(broadcastMessage));
          }
        }
      }
    } catch (error) {
      console.error("Error processing message:", error);
    }
  });
  
  // Handle disconnection
  ws.on("close", function close() {
    console.log("Client disconnected");
    
    // Remove user from list
    allSockets = allSockets.filter(socket => socket.ws !== ws);
  });
});

console.log("WebSocket server initialized");