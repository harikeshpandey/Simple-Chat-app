import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from './pages/layout.tsx';
import Chat from './pages/chat.tsx';
import Home from './pages/home.tsx';

export default function App(){
  return(
    <BrowserRouter>
    <Routes>
     
        <Route index element={<Home/>} />
        <Route path='chat' element={<Chat />}/>
      
    </Routes>
    </BrowserRouter>
  )
}