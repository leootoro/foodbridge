import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { useNavigate } from "react-router-dom"
import {
  getChatById,
  getMessages,
  sendMessage,
  getUserName
} from "../services/chatService"

function Chat() {

  const navigate = useNavigate()
  const { chatId } = useParams()

  const [user, setUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [otherUser, setOtherUser] = useState(null)
  const [text, setText] = useState("")

  useEffect(() => {
    async function loadChat() {

      const { data } = await supabase.auth.getUser()
      const currentUser = data.user
      setUser(currentUser)

      const chat = await getChatById(chatId)

      const otherUserId =
        chat.donor_id === currentUser.id
          ? chat.institution_id
          : chat.donor_id

     const { data: profile } = await supabase
      .from("profiles")
      .select("name, is_online")
      .eq("id", otherUserId)
      .single()

    setOtherUser({
      id: otherUserId,
      name: profile.name,
      is_online: profile.is_online
    })

      const msgs = await getMessages(chatId)
      setMessages(msgs)
    }

    loadChat()
  }, [chatId])

  // ✉️ enviar mensagem
  async function handleSend() {

    if (!text.trim()) return

    await sendMessage(chatId, user.id, text)

    setMessages(prev => [
      ...prev,
      {
        id: Date.now(),
        sender_id: user.id,
        message_text: text
      }
    ])

    setText("")
  }

  // 🔥 verifica se o OUTRO está digitando
  const otherTyping = messages.some(
    msg =>
      msg.sender_id === otherUser?.id &&
      msg.is_typing === true
  )

  return (
    <div className="chat-page">

      {/* HEADER */}
      <div className="chat-header">
       <h3
        onClick={() => navigate(`/profile/${otherUser?.id}`)}
        style={{ cursor: "pointer" }}
      >
        {otherUser?.name}
      </h3>
        <div className="status">
          <span
            className={`dot ${
              otherUser?.is_online ? "online" : "offline"
            }`}
          ></span>

          <span>
            {otherUser?.is_online ? "Online" : "Offline"}
          </span>
        </div>
      </div>

      {/* MENSAGENS */}
      <div className="messages">

        {messages.map(msg => (
          <div
            key={msg.id}
            className={
              msg.sender_id === user?.id
                ? "message sent"
                : "message received"
            }
          >
            {msg.message_text}
          </div>
        ))}

        {/* 🔥 DIGITANDO DO OUTRO */}
        {otherTyping && (
          <div className="typing">
            digitando...
          </div>
        )}

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