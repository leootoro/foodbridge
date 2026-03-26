import React, { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import {
  getChatById,
  getMessages,
  sendMessage
} from "../services/chatService"
import "../css/ChatPage.css"
import BackButton from "../components/BackButton"

function Chat() {

  const navigate = useNavigate()
  const { chatId } = useParams()

  const [user, setUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [otherUser, setOtherUser] = useState(null)
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(true)

  // 🧠 FORMATA DATA (Hoje / Ontem / data)
  function formatDateLabel(dateString) {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date()

    yesterday.setDate(today.getDate() - 1)

    const isToday = date.toDateString() === today.toDateString()
    const isYesterday = date.toDateString() === yesterday.toDateString()

    if (isToday) return "Hoje"
    if (isYesterday) return "Ontem"

    return date.toLocaleDateString("pt-BR")
  }

  useEffect(() => {
    async function loadChat() {
      try {
        setLoading(true)

        const { data } = await supabase.auth.getUser()
        const currentUser = data.user

        if (!currentUser) return

        setUser(currentUser)

        const chat = await getChatById(chatId)

        if (!chat) return

        const otherUserId =
          chat.donor_id === currentUser.id
            ? chat.institution_id
            : chat.donor_id

        const { data: profile } = await supabase
          .from("profiles")
          .select("name, is_online")
          .eq("id", otherUserId)
          .single()

        if (!profile) return

        setOtherUser({
          id: otherUserId,
          name: profile.name,
          is_online: profile.is_online
        })

        const msgs = await getMessages(chatId)
        setMessages(msgs)
        await supabase
          .from("messages")
          .update({ read: true })
          .eq("chat_id", chatId)
          .neq("sender_id", currentUser.id)
          .eq("read", false)
        console.log("USER:", currentUser)

      } catch (err) {
        console.error("Erro ao carregar chat:", err)
      } finally {
        setLoading(false)
      }
    }

    if (chatId) loadChat()
  }, [chatId])

  // ✉️ enviar mensagem
  async function handleSend() {
    if (!text.trim() || !user) return

    await sendMessage(chatId, user.id, text)

    setMessages(prev => [
      ...prev,
      {
        id: Date.now(),
        sender_id: user.id,
        message_text: text,
        created_at: new Date().toISOString()
      }
    ])

    setText("")
  }

  if (loading) return <div>Carregando chat...</div>
  if (!otherUser) return <div>Carregando usuário...</div>

  return (
    <div className="chat-page">

      {/* HEADER */}
      <div className="chat-header">

        <div style={{ display: "flex", alignItems: "center" }}>
          <BackButton to="/chats" />

          <h3
            onClick={() => navigate(`/profile/${otherUser.id}`)}
            style={{ cursor: "pointer", margin: 0 }}
          >
            {otherUser.name}
          </h3>
        </div>

        <div className="status">
          <span
            className={`dot ${
              otherUser.is_online ? "online" : "offline"
            }`}
          ></span>

          <span>
            {otherUser.is_online ? "Online" : "Offline"}
          </span>
        </div>

      </div>

      {/* MENSAGENS */}
      <div className="messages">
        {messages.map((msg, index) => {
          const currentDate = new Date(msg.created_at).toDateString();
          const prevMsg = messages[index - 1];
          const prevDate = prevMsg ? new Date(prevMsg.created_at).toDateString() : null;
          const showDate = currentDate !== prevDate;

          // Usamos o <React.Fragment> ou apenas <> para não criar uma div pai que quebre o flexbox
          return (
            <React.Fragment key={msg.id}>
              
              {/* 📅 DATA - Ela ocupará a largura total por causa do CSS date-bubble */}
              {showDate && (
                <div className="date-bubble">
                  {formatDateLabel(msg.created_at)}
                </div>
              )}

              {/* 💬 MENSAGEM - Agora ela é filha direta do container .messages (considerando o Fragment) */}
              <div
                className={
                  msg.sender_id?.toString() === user?.id?.toString()
                    ? "message sent"
                    : "message received"
                }
              >
                <div className="message-text">
                  {msg.message_text}
                </div>

                <div className="message-time">
                  {new Date(msg.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </div>
              </div>

            </React.Fragment>
          );
        })}
      </div>

      {/* INPUT */}
      <div className="chat-input">

        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder="Digite uma mensagem..."
        />

        <button onClick={handleSend}>
          ➤
        </button>

      </div>

    </div>
  )
}

export default Chat