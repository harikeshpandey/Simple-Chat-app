import { WebSocketServer ,WebSocket } from "ws";

const wss = new WebSocketServer({port : 8080});
interface User{
    ws : WebSocket;
    room : String;
}
let userCount = 0;
let allSockets : User [] = [];
wss.on("connection",function connection(ws){
    
   
    ws.on("message" , function message(event){
       const parsedEvent = JSON.parse(event as unknown as string); 
       if(parsedEvent.type == "join"){
            allSockets.push({
                ws,
                room : parsedEvent.payload.roomId
            })
       }

       if(parsedEvent.type =="chat"){
            // const currentUserRoom = allSockets.find((x)=>x.ws == ws);
            let currentUserRoom = null;
            for(let i = 0 ; i < allSockets.length ; i++){
                if(allSockets[i].ws == ws){
                    currentUserRoom = allSockets[i].room;
                }
            }

            for(let i =0 ; i < allSockets.length ; i++){
                if(allSockets[i].room == currentUserRoom){
                    allSockets[i].ws.send(parsedEvent.payload.event);
                }
            }
        }

    })

    
})