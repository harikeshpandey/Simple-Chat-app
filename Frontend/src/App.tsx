import { useEffect, useRef, useState } from "react";

export default function App() {
  const [messages,setMessages] = useState(["hi there","Hello"]);
  const wsRef = useRef();
  useEffect(()=>{
    const ws = new WebSocket("http://localhost:8080");
    ws.onmessage=(event)=>{
      setMessages(m=> [...m , event.data])
    }
    wsRef.current=ws;
    ws.onopen = ()=>{
      ws.send(JSON.stringify({
        type : "join",
        payload : {
          roomId : "red"
        }
      }))
    }
  },[])
  return (
    <div className="h-screen bg-black">
      <div className="h-[90vh] bg-red-300">
        {messages.map(message => <div className="my-8"><span className="m-8 p-4 bg-white p-2 rounded-full text-black outline-none">{message}</span></div>)}
      </div>
      <div className="flex w-full p-2 bg-black">
        <input id ="message" type="text" className="p-4 flex-grow p-2 rounded-l-full text-black outline-none"></input>
        <button onClick={()=>{
          const message = document.getElementById("message")?.value;
         wsRef.current.send(JSON.stringify({
          type:"chat",
          payload:{
            event :message
          }
         }))
        }} className="bg-blue-600 text-white px-4 rounded-r-full hover:bg-blue-700 transition">Send</button>
      </div>
    </div>
  );
}
