import { useEffect, useRef, useState } from "react";

const Home = () => {
  // Track sent message IDs to avoid duplicates
  const [messages, setMessages] = useState([]);
  const [roomId, setRoomId] = useState("");
  const [connected, setConnected] = useState(false);
  const [joinedRoom, setJoinedRoom] = useState(false);
  
  // Create refs to track state and sent messages
  const wsRef = useRef(null);
  const processedMsgsRef = useRef(new Set());
  const messagesEndRef = useRef(null);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);
  
  useEffect(() => {
    // Create WebSocket connection
    const ws = new WebSocket("ws://localhost:8080");
    wsRef.current = ws;
    
    ws.onopen = () => {
      console.log("Connected to server");
      setConnected(true);
    };
    
    ws.onclose = () => {
      console.log("Disconnected from server");
      setConnected(false);
    };
    
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
    
    ws.onmessage = (event) => {
      // Handle incoming messages from server
      console.log("Received from server:", event.data);
      
      try {
        // Try to parse as JSON
        const data = JSON.parse(event.data);
        
        // Skip if we've already processed this message
        const msgId = data.msgId || JSON.stringify(data);
        if (processedMsgsRef.current.has(msgId)) {
          console.log("Skipping duplicate message:", msgId);
          return;
        }
        
        // Add to processed set
        processedMsgsRef.current.add(msgId);
        
        // Handle different message types
        if (data.type === "join_confirmation") {
          setJoinedRoom(true);
          setMessages(prev => [...prev, {
            id: msgId,
            text: `Joined room: ${data.roomId || roomId}`,
            type: "system",
            timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
          }]);
        } else if (data.type === "chat" && data.fromServer) {
          // This is a chat message from another user via server
          setMessages(prev => [...prev, {
            id: msgId,
            text: data.message || "",
            type: "received",
            timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
          }]);
        }
      } catch (e) {
        // Handle plain text message
        if (!processedMsgsRef.current.has(event.data)) {
          processedMsgsRef.current.add(event.data);
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            text: event.data,
            type: "received",
            timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
          }]);
        }
      }
    };
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [roomId]);
  
  const joinRoom = () => {
    if (!roomId || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    
    const joinMsg = {
      type: "join",
      roomId: roomId,
      clientId: Date.now().toString()
    };
    
    console.log("Joining room:", joinMsg);
    wsRef.current.send(JSON.stringify(joinMsg));
    
    // Add temporary joining message
    setMessages(prev => [...prev, {
      id: "joining-" + Date.now(),
      text: `Joining room: ${roomId}...`,
      type: "system",
      timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    }]);
  };
  
  const sendMessage = () => {
    const inputElem = document.getElementById("chat");
    if (!inputElem || !inputElem.value.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    
    const messageText = inputElem.value.trim();
    const msgId = "msg-" + Date.now();
    
    // Create message object
    const chatMsg = {
      type: "chat",
      msgId: msgId,
      message: messageText,
      roomId: roomId,
      clientId: "this-client-" + Date.now()
    };
    
    // Add to our UI immediately (sender side)
    setMessages(prev => [...prev, {
      id: msgId,
      text: messageText,
      type: "sent",
      timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    }]);
    
    // Track this message ID to avoid duplicates
    processedMsgsRef.current.add(msgId);
    
    // Send to server
    console.log("Sending message:", chatMsg);
    wsRef.current.send(JSON.stringify(chatMsg));
    
    // Clear input
    inputElem.value = "";
  };
  
  const handleKeyPress = (e, action) => {
    if (e.key === "Enter") {
      action();
    }
  };

  // Function to detect and format code blocks
  const formatMessage = (text) => {
    // Check if this might be code (contains common code indicators)
    const codeIndicators = ['{', '}', '()', '=>', 'function', 'const ', 'let ', 'var ', 'import ', 'export ', '</', '/>'];
    const mightBeCode = codeIndicators.some(indicator => text.includes(indicator));
    
    // If explicit code block with backticks
    if (text.includes('```')) {
      const parts = text.split('```');
      return (
        <>
          {parts[0] && <div>{parts[0]}</div>}
          {parts[1] && (
            <pre className="mt-2 bg-gray-800 p-3 rounded-md overflow-x-auto">
              <code className="text-green-400 font-mono text-sm">{parts[1]}</code>
            </pre>
          )}
          {parts[2] && <div className="mt-2">{parts[2]}</div>}
        </>
      );
    }
    // If it looks like code but doesn't have explicit markers
    else if (mightBeCode && text.length > 20) {
      return (
        <pre className="bg-gray-800 p-3 rounded-md overflow-x-auto">
          <code className="text-green-400 font-mono text-sm">{text}</code>
        </pre>
      );
    }
    // Regular text
    return <div>{text}</div>;
  };

  return (
    <div className="h-screen bg-black text-white flex flex-col">
      {/* Room join area */}
      {!joinedRoom ? (
        <div className="w-full p-4 bg-black border-b border-gray-800">
          <div className="flex items-center">
            <input
              id="roomIdInput"
              type="text"
              placeholder="Room ID"
              className="flex-grow p-3 rounded-l-lg bg-gray-900 text-white outline-none border border-gray-800 focus:border-blue-600"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              onKeyPress={(e) => handleKeyPress(e, joinRoom)}
              disabled={!connected}
            />
            <button
              onClick={joinRoom}
              className={`px-6 py-3 rounded-r-lg transition ${
                connected ? 'bg-blue-700 hover:bg-blue-600 text-white' : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
              disabled={!connected}
            >
              Join
            </button>
          </div>
          {!connected && (
            <div className="text-blue-400 text-sm mt-2 flex items-center">
              <div className="animate-pulse w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
              Connecting to server...
            </div>
          )}
        </div>
      ) : (
        <div className="w-full py-2 px-4 bg-black text-blue-500 text-sm text-center border-b border-gray-800">
          Joined room: {roomId}
        </div>
      )}

      {/* Messages area */}
      <div className="flex-grow bg-black p-4 overflow-y-auto" id="messages-container">
        <div className="flex flex-col space-y-4">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex ${msg.type === "sent" ? 'justify-end' : msg.type === "system" ? 'justify-center' : 'justify-start'}`}
            >
              {msg.type === "system" ? (
                <div className="bg-gray-900 text-blue-400 px-4 py-2 rounded-md text-sm border border-gray-800">
                  {msg.text}
                </div>
              ) : (
                <div 
                  className={`px-4 py-2 rounded-lg max-w-xs md:max-w-md ${
                    msg.type === "sent" 
                      ? 'bg-blue-700 text-white rounded-br-none' 
                      : 'bg-gray-900 text-white rounded-bl-none border border-gray-800'
                  }`}
                >
                  {/* Format message content - detect code */}
                  {formatMessage(msg.text)}
                  <div className="text-xs text-gray-400 mt-1 text-right">{msg.timestamp}</div>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} /> {/* Auto-scroll anchor */}
        </div>
      </div>

      {/* Message input */}
      <div className="w-full p-4 bg-black border-t border-gray-800">
        <div className="flex items-center">
          <input
            id="chat"
            type="text"
            placeholder="Type a message..."
            className="flex-grow p-3 rounded-l-lg bg-gray-900 text-white outline-none border border-gray-800 focus:border-blue-600"
            onKeyPress={(e) => handleKeyPress(e, sendMessage)}
            disabled={!joinedRoom}
          />
          <button
            onClick={sendMessage}
            className={`px-6 py-3 rounded-r-lg transition ${
              joinedRoom ? 'bg-blue-700 hover:bg-blue-600 text-white' : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            }`}
            disabled={!joinedRoom}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;