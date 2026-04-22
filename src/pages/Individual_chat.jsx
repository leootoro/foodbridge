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
import { updateProfile } from "../services/profileService";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { registerLocale } from  "react-datepicker";
import ptBR from 'date-fns/locale/pt-BR';
registerLocale('pt-BR', ptBR);
import { updateDonationStatus, createDonation, createDonationWithMessage, parseDonationMessage} from "../services/donationService";

function Chat() {
  const navigate = useNavigate()
  const { chatId } = useParams()

  const [user, setUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [otherUser, setOtherUser] = useState(null)
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [donationItems, setDonationItems] = useState([]);
  const [donationStatusMap, setDonationStatusMap] = useState({});

  const handleDeleteMessage = async (messageId) => {
    const confirmDelete = window.confirm("Apagar mensagem?");
    if (!confirmDelete) return;

    try {
      await supabase.from("messages").delete().eq("id", messageId);

      // remove da tela
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (err) {
      console.error("Erro ao deletar mensagem:", err);
    }
  };
  // --- FUNÇÃO QUE SALVA NO BANCO E ENVIA MENSAGEM ---
  const handleConfirmAgendamento = async () => {
    // 🛑 trava botão durante execução
    if (loading) return;

    setLoading(true);

    try {
      // 1. validar data
      if (!selectedDate) {
        alert("Selecione uma data!");
        setLoading(false);
        return;
      }

      // 2. validar itens
      const itensValidos = donationItems.filter(
        i => Number(i.quantity) > 0
      );

      if (itensValidos.length === 0) {
        alert("Adicione pelo menos um item!");
        setLoading(false);
        return;
      }

      console.log("Itens válidos:", itensValidos);

      // 3. criar doação + mensagem
      const { data, error } = await createDonationWithMessage(
        user.id,
        otherUser.id,
        selectedDate.toISOString(),
        itensValidos
      );

      if (error) {
        console.error("Erro ao criar doação:", error);
        setLoading(false);
        return;
      }

      console.log("Doação criada:", data);

      // 4. enviar mensagem
      await sendMessage(chatId, user.id, data.message);

      // 5. atualizar UI (IMPORTANTE!)
      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          sender_id: user.id,
          message_text: data.message,
          created_at: new Date().toISOString()
        }
      ]);

      // 6. limpar estado
      setDonationItems([]);
      setSelectedDate(null);

      // 7. fechar modal
      setIsModalOpen(false);

    } catch (err) {
      console.error("Erro geral:", err);
    } finally {
      // 8. liberar botão SEMPRE
      setLoading(false);
    }
  };

  const handleNaoRecebi = async (donationId) => {
    const confirm = window.confirm("Deseja marcar como não recebido? Isso excluirá o registro da doação.");
    if (!confirm) return;

    try {
      await supabase.from("donation_itens").delete().eq("donation_id", donationId);
      await supabase.from("donations").delete().eq("id", donationId);
      alert("Registro removido.");
      // Opcional: recarregar mensagens ou enviar aviso no chat
    } catch (err) {
      console.error(err);
    }
    setDonationStatusMap(prev => ({
      ...prev,
      [donationId]: 'removido'
    }));
  };

  const renderMessage = (msg, user, updateDonationStatus, handleNaoRecebi) => {
    const parsed = parseDonationMessage(msg.message_text);
  
    // 📦 DOAÇÃO
    if (parsed) {
      const deliveryDate = parsed.deliveryDate
        ? new Date(parsed.deliveryDate)
        : null;
      const status = donationStatusMap[parsed.donationId];

      return (
        <div className="donation-card-message">
          <div className="donation-header">
            📅 Agendamento de Doação
          </div>

          {/* ITENS */}
          <div className="donation-items">
            {parsed.items.map((item, idx) => (
              <div key={idx} className="donation-item">
                <span className="donation-item-name">
                  {item.name} {item.volume ? `(${item.volume})` : ""}
                </span>
                <strong className="donation-item-qty">
                  {item.quantity} {item.unit || "un"}
                </strong>
              </div>
            ))}
          </div>

          {/* DATA */}
          <div className="donation-date">
            <div className="donation-date-box">
              {deliveryDate ? (
                <>
                  📍 Retirada em<br />
                  <strong>
                    {deliveryDate.toLocaleString('pt-BR', {
                      dateStyle: 'short',
                      timeStyle: 'short'
                    })}
                  </strong>
                </>
              ) : (
                <>📍 Data não informada</>
              )}
            </div>

            <div className={`donation-status ${status}`}>
              {status || "Doação Removida"}
            </div>

            {/* BOTÕES */}
            {msg.sender_id !== user?.id && deliveryDate && status && status != 'concluido' && (
              <div className="donation-actions">
                <button
                  disabled={new Date() < deliveryDate}
                  onClick={async () => {
                    const { error } = await updateDonationStatus(parsed.donationId, 'concluido');

                    if (error) {
                      console.error(error);
                      alert("Erro ao atualizar status");
                      return;
                    }
                    alert("Recebido!");

                    setDonationStatusMap(prev => ({
                      ...prev,
                      [parsed.donationId]: 'concluido'
                    }));
                  }}

                  className={`donation-btn ${
                    new Date() >= deliveryDate ? 'success' : 'disabled'
                  }`}
                >
                  Recebi
                </button>

                <button
                  disabled={new Date() < deliveryDate}
                  onClick={() => handleNaoRecebi(parsed.donationId)}
                  className={`donation-btn ${
                    new Date() >= deliveryDate ? 'danger' : 'disabled'
                  }`}
                >
                  Não recebi
                </button>
              </div>
            )}
          </div>


          
        </div>
      );
    }

    // 💬 TEXTO NORMAL
    return msg.message_text;
  };

  useEffect(() => {
    if (user?.food_available && user.food_available.length > 0) {
      setDonationItems(user.food_available);
    } else {
      console.warn("food_available vazio ou null");
    }
  }, [user]);

  const handleUpdateQuantity = (index, newQty) => {
    const updated = [...donationItems];
    updated[index].quantity = newQty;
    setDonationItems(updated);
  };

  const handleRemoveItem = (index) => {
    setDonationItems(donationItems.filter((_, i) => i !== index));
  };

  const isOnline = (lastSeen) => {
    if (!lastSeen) return false;
    const diff = Date.now() - new Date(lastSeen).getTime();
    return diff < 2 * 60 * 1000;
  };

  function formatDateLabel(dateString) {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)
    if (date.toDateString() === today.toDateString()) return "Hoje"
    if (date.toDateString() === yesterday.toDateString()) return "Ontem"
    return date.toLocaleDateString("pt-BR")
  }

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      updateProfile(user.id, { last_seen: new Date().toISOString() });
    }, 60000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    async function loadChat() {
      try {
        setLoading(true)
        const { data: authData } = await supabase.auth.getUser()
        const currentUser = authData.user
        if (!currentUser) return

        const { data: myProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .single()

        setUser({ ...currentUser, ...myProfile })

        const chat = await getChatById(chatId)
        if (!chat) { navigate("/chats"); return; }

        const otherUserId = chat.user_1_id === currentUser.id ? chat.user_2_id : chat.user_1_id
        if (otherUserId === currentUser.id) { navigate("/chats"); return; }

        const { data: profile } = await supabase
          .from("profiles")
          .select("name, last_seen")
          .eq("id", otherUserId)
          .single()

        setOtherUser({ id: otherUserId, name: profile.name, last_seen: profile.last_seen })
        const msgs = await getMessages(chatId)
        setMessages(msgs)
        // 🔥 pegar IDs das doações nas mensagens
        const donationIds = msgs
          .map(m => {
            const parsed = parseDonationMessage(m.message_text);
            return parsed?.donationId;
          })
          .filter(Boolean);

        // 🔥 buscar status no banco
        if (donationIds.length > 0) {
          const { data } = await supabase
            .from("donations")
            .select("id, status")
            .in("id", donationIds);

          const map = {};
          data.forEach(d => {
            map[d.id] = d.status;
          });

          setDonationStatusMap(map);
        }

        await supabase.from("messages").update({ read: true }).eq("chat_id", chatId).neq("sender_id", currentUser.id).eq("read", false)
      } catch (err) {
        console.error("Erro ao carregar chat:", err)
      } finally {
        setLoading(false)
      }
    }
    if (chatId) loadChat()
  }, [chatId, navigate])

  async function handleSend() {
    if (!text.trim() || !user) return
    await sendMessage(chatId, user.id, text)
    setMessages(prev => [...prev, { id: Date.now(), sender_id: user.id, message_text: text, created_at: new Date().toISOString() }])
    setText("")
  }

  if (loading) return <div className="loading-screen">Carregando chat...</div>
  if (!otherUser) return <div className="loading-screen">Carregando usuário...</div>
  
  return (
    <div className={`chat-container-master ${isModalOpen ? "blur-content" : ""}`}>
      <div className="chat-page">
        <div className="chat-header">
          <div style={{ display: "flex", alignItems: "center" }}>
            <BackButton to="/chats" />
            <div className="header-info" onClick={() => navigate(`/profile/${otherUser.id}`)} style={{ cursor: "pointer" }}>
              <h3 style={{ margin: 0 }}>{otherUser.name}</h3>
              <div className="status">
                <span className={`dot ${isOnline(otherUser.last_seen) ? "online" : "offline"}`}></span>
                <span>{isOnline(otherUser.last_seen) ? "Online" : "Offline"}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="messages">
          {messages.map((msg, index) => {
            const currentDate = new Date(msg.created_at).toDateString();
            const prevMsg = messages[index - 1];
            const prevDate = prevMsg ? new Date(prevMsg.created_at).toDateString() : null;
            const showDate = currentDate !== prevDate;

            return (
              <React.Fragment key={msg.id}>
                {showDate && (
                  <div className="date-bubble">
                    {formatDateLabel(msg.created_at)}
                  </div>
                )}

                <div className="message-wrapper">
                  <div className={`message ${msg.sender_id === user?.id ? "sent" : "received"}`}>
                    <div className="message-text">
                      {renderMessage(msg, user, updateDonationStatus, handleNaoRecebi)}
                    </div>

                    <div className="message-time">
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </div>
                  </div>

                  {msg.sender_id === user?.id && (
                    <button
                      className="delete-message-btn"
                      onClick={() => handleDeleteMessage(msg.id)}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </div>

        <div className="chat-input-container">
          <div className="chat-input-box">
            
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Digite uma mensagem..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />

            <div className="chat-actions">
              <button
                className="btn-send"
                onClick={handleSend}
              >
                ➤
              </button>

              <button
                className="btn-agendar"
                onClick={() => setIsModalOpen(true)}
              >
                Agendar Doação
              </button>
            </div>

          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="donation-modal">
            <button className="close-modal" onClick={() => setIsModalOpen(false)}>×</button>
            <h2>Programar Doação</h2>
            <div className="donation-layout-grid">
              <div className="food-selection-section">
                <h3>Itens Disponíveis</h3>
                <div className="food-scroll">
                  {donationItems.map((food, index) => (
                    <div key={index} className="food-edit-row">
                      <div className="food-info">
                        <span className="food-name">{food.item === "Outro" ? food.customItem : food.item}</span>
                      </div>
                      <div className="food-controls">
                        <input type="number" className="input-qty" min="1" value={food.unit === "un" ? food.measureValue : food.quantity} onChange={(e) => handleUpdateQuantity(index, e.target.value)} />
                        <span className="unit-label">un</span>
                        <button className="btn-remove-minus" onClick={() => handleRemoveItem(index)}>−</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="calendar-section">
                <h3>Data de Retirada</h3>
                <DatePicker selected={selectedDate} onChange={(date) => setSelectedDate(date)} showTimeSelect dateFormat="dd/MM/yyyy HH:00" locale="pt-BR" inline />
              </div>
            </div>

            <div className="modal-footer">
              {/* --- BOTÃO CORRIGIDO AQUI: CHAMA handleConfirmAgendamento --- */}
              <button 
                className="btn-enviar-proposta"
                onClick={handleConfirmAgendamento}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#27ae60',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '16px'
                }}
              >
                Confirmar Agendamento e Enviar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Chat