import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { useNavigate } from "react-router-dom"
import { getUserChats, getLastMessage, getUserName } from "../services/chatService"
import "../css/chats.css"
import { get_profile_photo_Url } from "../services/mediaService"
import { get_Profile } from "../services/profileService"

function formatDate(dateString) {
  if (!dateString) return ""

  const date = new Date(dateString)
  const now = new Date()

  const isToday =
    date.toDateString() === now.toDateString()

  const yesterday = new Date()
  yesterday.setDate(now.getDate() - 1)

  const isYesterday =
    date.toDateString() === yesterday.toDateString()

  if (isToday) {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  if (isYesterday) {
    return "Ontem"
  }

  return date.toLocaleDateString("pt-BR")
}

function Chats() {

  const navigate = useNavigate()
  const [chats, setChats] = useState([])

  useEffect(() => {
    async function loadChats() {

      const { data } = await supabase.auth.getUser()
      const user = data.user

      if (!user) return

      const chatsData = await getUserChats(user.id)

      const formattedChats = await Promise.all(
        chatsData.map(async (chat) => {

          const otherUserId =
            chat.donor_id === user.id
              ? chat.institution_id
              : chat.donor_id

          const other_profile = await get_Profile(otherUserId)
          const name = await getUserName(otherUserId)
          const lastMessage = await getLastMessage(chat.id)

          return {
            id: chat.id,
            name: name || "Usuário",
            message: lastMessage?.message_text || "Sem mensagens",
            lastDate: lastMessage?.created_at || null,
            other_profile, 
            time: lastMessage
              ? new Date(lastMessage.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit"
                })
              : "",
            unread:
              lastMessage &&
              !lastMessage.read &&
              lastMessage.sender_id !== user.id
          }
        })
      )
      formattedChats.sort((a, b) => {
        if (!a.lastDate) return 1
        if (!b.lastDate) return -1
        return new Date(b.lastDate) - new Date(a.lastDate)
      })
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
              <li onClick = {() => navigate("/profile")}>Perfil </li>
               <li className="button_conversas" onClick={() => navigate("/search")}>
                 Procurar 🔎
              </li>
              <li className="active" onClick={() => navigate("/chats")}>
                  Conversas
              </li>
              <li className="button_map" onClick={() => navigate("/map")}>
                  Mapa
              </li>
              <li className="button_config" onClick={() => navigate("/config")}>
                  Configurações
              </li>
            </ul>
          </nav>
        </aside>
      {/* 🔥 CONTEÚDO DO LADO DIREITO */}
      <div className="chat-content">

        <div className="chat-header">
          <h2>Conversas</h2>
        </div>

        <div className="chat-list">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className="chat-item"
              onClick={() => navigate(`/chat/${chat.id}`)}
            >
            
              <img
                src={
                  chat.other_profile?.photo_url
                    ? get_profile_photo_Url(chat.other_profile.photo_url)
                    : "/default_user.png"
                }
                
                alt="avatar"
                style={avatarStyle}
              />
              <div className="chat-info">
                <div className="chat-top">
                  <span className="chat-name">{chat.name}</span>
                  <span className="chat-time">
                    {formatDate(chat.lastDate)}
                  </span>
                </div>

                <div className="chat-bottom">
                  <span className="chat-message">{chat.message}</span>

                  {chat.unread && (
                    <span className="chat-unread"></span>
                  )}
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

const avatarStyle = {
  width: "50px",
  height: "50px",
  borderRadius: "50%",
  objectFit: "cover",
}