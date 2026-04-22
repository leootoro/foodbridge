import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { useNavigate } from "react-router-dom"
import { getUserChats, getLastMessage, getUserName, DeleteChat } from "../services/chatService"
import "../css/chats.css"
import { get_profile_photo_Url } from "../services/mediaService"
import { get_Profile } from "../services/profileService";


function formatDate(dateString) {
  if (!dateString) return ""
  const date = new Date(dateString)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const yesterday = new Date()
  yesterday.setDate(now.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()

  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }
  if (isYesterday) return "Ontem"
  return date.toLocaleDateString("pt-BR")
}

function Chats() {
  const navigate = useNavigate()
  const [chats, setChats] = useState([])
  const [currentUser, setCurrentUser] = useState(null)

  // Função para deletar (esconder) a conversa
  const handleDeleteChat = async (e, chat) => {
    e.stopPropagation();

    const confirmDelete = window.confirm("Remover esta conversa da sua lista?");
    if (confirmDelete && currentUser) {
      try {
        await DeleteChat(chat.id, currentUser.id, chat);
        setChats(prev => prev.filter(c => c.id !== chat.id));
      } catch (err) {
        alert("Erro ao remover conversa.");
      }
    }
  };

  useEffect(() => {
    async function loadChats() {
      const { data } = await supabase.auth.getUser()
      const user = data.user
      if (!user) return
      setCurrentUser(user)

      const chatsData = await getUserChats(user.id)

      const formattedChats = await Promise.all(
        chatsData
          // 🔥 FILTRO: Só mostra se o usuário logado não tiver marcado como deletado
          .filter(chat => {
            if (chat.user_1_id === user.id) return !chat.deleted_by_user_1;
            if (chat.user_2_id === user.id) return !chat.deleted_by_user_2;
            return true;
          })
          .map(async (chat) => {
            // Lógica genérica: se eu sou o user_1, o outro é o 2, e vice-versa
            const otherUserId = chat.user_1_id === user.id ? chat.user_2_id : chat.user_1_id

            const other_profile = await get_Profile(otherUserId)
            const name = await getUserName(otherUserId)
            const lastMessage = await getLastMessage(chat.id)

            return {
              ...chat, // Mantemos os dados originais (user_1_id, etc) para o delete
              name: name || "Usuário",
              message: lastMessage?.message_text || "Sem mensagens",
              lastDate: lastMessage?.created_at || null,
              other_profile,
              unread: lastMessage && !lastMessage.read && lastMessage.sender_id !== user.id
            }
          })
      )

      formattedChats.sort((a, b) => new Date(b.lastDate || 0) - new Date(a.lastDate || 0))
      setChats(formattedChats)
    }

    loadChats()
  }, [])

  return (
    <div className="chat-container">
      <aside className="sidebar">
        <h2 className="logo">FoodBridge</h2>
        <nav>
          <ul>
            <li onClick={() => navigate("/profile")}>Perfil</li>
            <li onClick={() => navigate("/search")}>Procurar 🔎</li>
            <li className="active" onClick={() => navigate("/chats")}>Conversas</li>
            <li onClick={() => navigate("/map")}>Mapa</li>
            <li onClick={() => navigate("/config")}>Configurações</li>
            <li className="button_sair" onClick={() => navigate("/")}>Sair</li>
          </ul>
        </nav>
      </aside>

      <div className="chat-content">
        <div className="chat-header">
          <h2>Conversas</h2>
        </div>

        <div className="chat-list">
          {chats.map((chat) => (
            <div key={chat.id} className="chat-item" onClick={() => navigate(`/chat/${chat.id}`)}>
              <img
                src={chat.other_profile?.photo_url ? get_profile_photo_Url(chat.other_profile.photo_url) : "/default_user.png"}
                alt="avatar"
                style={avatarStyle}
              />
              <div className="chat-info">
                <div className="chat-top">
                  <span className="chat-name">{chat.name}</span>
                  <span className="chat-time">{formatDate(chat.lastDate)}</span>
                </div>
                <div className="chat-bottom">
                  <span className="chat-message">{chat.message}</span>
                  <div className="chat-actions">
                    {chat.unread && <span className="chat-unread"></span>}
                    <button className="btn-delete-chat" onClick={(e) => handleDeleteChat(e, chat)}>
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Chats
const avatarStyle = { width: "50px", height: "50px", borderRadius: "50%", objectFit: "cover" }