// import './App.css';
import './css/profile.css';
import './css/Login.css';
import "leaflet/dist/leaflet.css"
// import "./css/chatPages";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Profile from  "./pages/Profile";
import CreatePost from './pages/CreatePost';
import EditProfile from './pages/Profile_edition'
import Chats from './pages/chats'
import Chat from './pages/Individual_chat'
import MapPage from './pages/MapPage'
import ProtectedRoute from "./components/ProtectedRoute";

import { BrowserRouter, Routes, Route } from "react-router-dom";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>}/>
        <Route path="/profile/:userId" element={<ProtectedRoute><Profile /></ProtectedRoute>}/>
        <Route path="/create-post" element={<ProtectedRoute><CreatePost /></ProtectedRoute>} />
        <Route path="/edit-profile" element = {<ProtectedRoute><EditProfile /></ProtectedRoute>} />
        <Route path="/chats" element = {<ProtectedRoute><Chats /></ProtectedRoute>} />
        <Route path="/chat/:chatId" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path="/map" element={<ProtectedRoute><MapPage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App