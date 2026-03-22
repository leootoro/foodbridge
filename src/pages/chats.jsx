import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { useNavigate } from "react-router-dom"
import { getUserChats, getLastMessage, getUserName } from "../services/chatService"
import "../css/chats.css"

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

          const name = await getUserName(otherUserId)
          const lastMessage = await getLastMessage(chat.id)

          return {
            id: chat.id,
            name: name || "Usuário",
            message: lastMessage?.message_text || "Sem mensagens",
            time: lastMessage
              ? new Date(lastMessage.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit"
                })
              : "",
            unread: lastMessage ? !lastMessage.read : false
          }
        })
      )

      setChats(formattedChats)
    }

    loadChats()
  }, [])

  return (

    <div className="chat-container">

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
            <div className="chat-avatar"></div>

            <div className="chat-info">

              <div className="chat-top">
                <span className="chat-name">{chat.name}</span>
                <span className="chat-time">{chat.time}</span>
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
  )
}

export default Chats