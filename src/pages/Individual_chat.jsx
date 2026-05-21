import React, { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { getChatById, getMessages, sendMessage} from "../services/chatService"
import "../css/ChatPage.css"
import BackButton from "../components/BackButton"
import { updateProfile } from "../services/profileService";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { registerLocale } from  "react-datepicker";
import ptBR from 'date-fns/locale/pt-BR';
import { updateDonationStatus, createDonation, createDonationWithMessage, parseDonationMessage} from "../services/donationService";
registerLocale('pt-BR', ptBR);

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
  const [originalItems, setOriginalItems] = useState([]);
  const [isChatBlocked, setIsChatBlocked] = useState(false);
 
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

  function getDisplayQuantity(food) {
    const value = food.unit === "un"
      ? food.measureValue
      : food.quantity;

    return value === "" || value === undefined ? "" : value;
  }
  // --- FUNÇÃO QUE SALVA NO BANCO E ENVIA MENSAGEM ---
  const handleConfirmAgendamento = async () => {
    // Não deixa reenviar se estiver carregando (já cliquei uma vez)
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
      const itensValidos = donationItems.filter(i => {
        const qty = i.unit === "un"
          ? Number(i.measureValue)
          : Number(i.quantity);

        return qty > 0;
      });

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

       //ATUALIZA STATUS IMEDIATAMENTE
      setDonationStatusMap(prev => ({
        ...prev,
        [data.donation.id]: "pendente"
      }));

      // 4. enviar mensagem
      await sendMessage(chatId, user.id, data.message);

      // 6. limpar estado
      const { data: updatedProfile } = await supabase
        .from("profiles")
        .select("food_available")
        .eq("id", user.id)
        .single();

      setDonationItems(updatedProfile.food_available || []);
      setSelectedDate(null);
    
      setOriginalItems(
        (updatedProfile.food_available || []).map(item => ({ ...item }))
      );

      // 7. fechar modal
      setIsModalOpen(false);

    } catch (err) {
      console.error("Erro geral:", err);
    } finally {
      // 8. liberar botão SEMPRE
      setLoading(false);
    }
  };

  const handleRemoveItem = (index) => {
    const confirmRemove = window.confirm("Remover este item da doação?");
    if (!confirmRemove) return;

    const updated = donationItems.filter((_, i) => i !== index);
    setDonationItems(updated);
  };

  const handleNaoRecebi = async (donationId) => {
    const confirm = window.confirm("Deseja cancelar?");
    if (!confirm) return;

    const { data, error } = await supabase
      .from("donations")
      .update({ status: "cancelado" })
      .eq("id", donationId)
      .select()

    if (error) {
      console.error("Erro ao cancelar:", error);
      alert("Erro ao cancelar doação");
      return;
    }

    // atualiza status na UI
    setDonationStatusMap(prev => ({
      ...prev,
      [donationId]: "cancelado"
    }));
     await reloadProfileItems();
  };
  const renderMessage = (msg) => {
  
    const parsed = parseDonationMessage(msg.message_text);
 
    // DOAÇÃO
     if (parsed && parsed.donationId && Array.isArray(parsed.items) && parsed.items.length > 0) {
      const deliveryDate = parsed.deliveryDate
        ? new Date(parsed.deliveryDate)
        : null;
       const status = parsed?.donationId
        ? donationStatusMap[parsed.donationId]
        : null;

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

  
            <div className={`donation-status ${status || "pendente"}`}>
              {status || "Pendente"}
            </div>

             {status === "cancelado" && (
                <div className="donation-status deleted">
                  Doação removida
                </div>
              )}


            {/* Botão de cancelamento pro donor apenas */}
            {msg.sender_id == user?.id && status === 'pendente' && (
                <div>
                  <button
                    onClick={() => {
                      handleNaoRecebi(parsed.donationId);
                      // handleDeleteMessage(msg.id);
                    }}
                    className={`cancel-donation-btn ${
                      new Date() >= deliveryDate ? 'danger' : 'disabled'
                    }`}
                  >
                    Cancelar
                  </button>
                </div>
            )}
          
            {msg.sender_id !== user?.id && deliveryDate && status == 'pendente' && (
              <div className="donation-actions">
                <button
                  disabled={new Date() < deliveryDate}
                  onClick={async () => {
                    const { error } = await updateDonationStatus(parsed.donationId, 'concluido');
                    console.log("FUNÇÃO:", updateDonationStatus);

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

    // TEXTO NORMAL
    return (
      msg.message_text
    );
  };
  useEffect(() => {
    if (!user?.id || !otherUser?.id) return;
    const channel = supabase
      .channel("blocked-users")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "blocked_users"
        },
          () => checkBlocked(user.id, otherUser.id)
      )
      .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "profiles",
        filter: `id=eq.${otherUser.id}`
      },
        () => {
          checkBlocked(user.id, otherUser.id);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user, otherUser]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("profile-update")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          setUser(prev => ({
            ...prev,
            ...payload.new
          }));

          //ATUALIZA OS ITENS AUTOMATICAMENTE
          setDonationItems(payload.new.food_available || []);
          setOriginalItems(
            (payload.new.food_available || []).map(i => ({ ...i }))
          );
        }
      )
      .subscribe((status) => {
        console.log("STATUS PROFILE:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleUpdateQuantity = (index, newQty) => {
    const updated = [...donationItems];

    // permite digitação livre
    if (newQty === "") {
      if (updated[index].unit === "un") {
        updated[index].measureValue = "";
      } else {
        updated[index].quantity = "";
      }
      setDonationItems(updated);
      return;
    }

    let value = parseInt(newQty, 10);
    if (isNaN(value)) value = ""; 
    const item = originalItems[index];
    if (!item) return;

    const maxQty =
      item.unit === "un"
        ? Number(item.measureValue || 0)
        : Number(item.quantity || 1);

    if (value > maxQty) value = maxQty;
    if (value < 1) value = 1;

    if (updated[index].unit === "un") {
      updated[index].measureValue = value;
    } else {
      updated[index].quantity = value;
    }

    setDonationItems(updated);
  };

  const reloadProfileItems = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("food_available")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Erro ao recarregar profile:", error);
      return;
    }

    setDonationItems(data.food_available || []);
    setOriginalItems(
      (data.food_available || []).map(i => ({ ...i }))
    );
  };

  const reloadDonations = async () => {
    const { data, error } = await supabase
      .from("donations")
      .select("id, status")
    
    if (!error) {
      const map = {};
      data.forEach(d => {
        map[d.id] = d.status;
      });

      setDonationStatusMap(map);
    }
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

        const checkBlocked = async (currentUserId, otherUserId) => {
          //verifica bloqueio
          
          const { data: blockedData } = await supabase
            .from("blocked_users")
            .select("*")
            .or(`and(user_id.eq.${currentUserId},blocked_user_id.eq.${otherUserId}),and(user_id.eq.${otherUserId},blocked_user_id.eq.${currentUserId})`);
          
          //verifica allow_chat_requests
          const { data: profile } = await supabase
            .from("profiles")
            .select("allow_chat_requests")
            .eq("id", otherUserId)
            .single();
          const isBlocked = blockedData?.length > 0;
          const doesNotAcceptChat = profile?.allow_chat_requests === false;

          setIsChatBlocked(isBlocked || doesNotAcceptChat);
        };
        const chat = await getChatById(chatId)
        if (!chat) { navigate("/chats"); return; }

        const otherUserId = chat.user_1_id === currentUser.id ? chat.user_2_id : chat.user_1_id
        if (otherUserId === currentUser.id) { navigate("/chats"); return; }

        const { data: profile } = await supabase
          .from("profiles")
          .select("name, last_seen, is_donor")
          .eq("id", otherUserId)
          .single()

        setOtherUser({
          id: otherUserId,
          name: profile.name,
          last_seen: profile.last_seen,
          is_donor: profile.is_donor
        });
        await checkBlocked(currentUser.id, otherUserId);
        setDonationItems(myProfile.food_available || []);
        setOriginalItems((myProfile.food_available || []).map(i => ({ ...i })));
        const msgs = await getMessages(chatId)
        setMessages(
          msgs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        );
        console.log("MESSAGES FROM DB:", msgs);
        // pegar IDs das doações nas mensagens
        const donationIds = msgs
          .map(m => {
            const parsed = parseDonationMessage(m.message_text);
            return parsed?.donationId;
          })
          .filter(Boolean);

        // Buscar status no banco
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

  useEffect(() => {
    if (!chatId) return;

    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chatId}`
        },
        (payload) => {
          console.log("REALTIME MSG:", payload.new);
          const newMessage = payload.new;

          // NOVO TRECHO (AQUI)
          const parsed = parseDonationMessage(newMessage.message_text);

          if (parsed?.donationId) {
            setDonationStatusMap(prev => ({
              ...prev,
              [parsed.donationId]: "pendente"
            }));
          }

          // JÁ EXISTENTE
          setMessages(prev => {
            const exists = prev.some(m => m.id === newMessage.id);
            if (exists) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe((status) => {
        console.log("STATUS MESSAGE:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId]);

  async function handleSend() {
    if (!text.trim() || !user) return
    if (isChatBlocked) {
      alert("🚫 Este usuário não aceita mensagens ou está bloqueado.");
      return;
    }
    await sendMessage(chatId, user.id, text)
    await reloadDonations();
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
                      {renderMessage(msg)}
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
            
            {isChatBlocked && (
              <div className="chat-blocked-warning">
                🚫 Você não pode interagir com este usuário
              </div>
            )}
            {!isChatBlocked && (
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
              )}

            <div className="chat-actions">
              {!isChatBlocked && (
                <button
                  className="btn-send"
                  onClick={handleSend}
                  disabled={isChatBlocked}
                >
                  ➤
                </button>
              )}
              
              {user?.is_donor === true && otherUser?.is_donor === false && !isChatBlocked && (
                <button
                  className="btn-agendar"
                  onClick={() => setIsModalOpen(true)}
                >
                  Agendar Doação
                </button>
              )}
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
                        <span className="food-name">
                          {food.item === "Outro" ? food.customItem : food.item}
                        </span>
                      </div>

                      <div className="food-controls">

                        <button
                          className="btn-remove-minus"
                          onClick={() => handleRemoveItem(index)                          }
                        >
                          −
                        </button>

                        <input
                          type="number"
                          className="input-qty"
                          min="1"
                          value={getDisplayQuantity(food)}
                          onChange={(e) => {
                            // Deixa digitar livre (string)
                            handleUpdateQuantity(index, e.target.value);
                          }}

                          onBlur={(e) => {
                            let value = Number(e.target.value);

                            const maxQty = originalItems[index]?.unit === "un"
                              ? Number(originalItems[index]?.measureValue || 0)
                              : Number(originalItems[index]?.quantity || 1);

                            // mínimo
                            if (!value || value < 1) value = 1;

                            // máximo
                            if (value > maxQty) value = maxQty;

                            handleUpdateQuantity(index, value);
                          }}
                        />

                        <span className="unit-label">un</span>
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
              {/* ---  Chama handleConfirmAgendamento --- */}
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