import { useEffect, useState } from "react";
import { getUserDonations } from "../services/donationService";
import { supabase } from "../lib/supabase";
import BackButton from "../components/BackButton"
import "../css/DonationHistory.css";


function DonationHistory() {
  const [donations, setDonations] = useState([]);
  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [hoveredDonation, setHoveredDonation] = useState(null);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    // 🔥 pega usuário
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Erro ao pegar usuário:", userError);
      return;
    }

    setUser(user);

    // 🔥 pega profile
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("is_donor")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Erro ao pegar profile:", profileError);
      return;
    }

    setProfile(profileData);

    // 🔥 carrega doações
    loadDonations(user, profileData);
  }

  async function loadDonations(user, profile) {
    const { data, error } = await getUserDonations(user, profile);

    if (error) return;

    setDonations(data);
  }

  const formatDate = (date) => {
    if (!date) return "Não definida";

    const d = new Date(date);

    return (
      d.toLocaleDateString("pt-BR") +
      " • " +
      d.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
      })
    );
  };

  return (
    <div className="history-container">

      <div className="back-button-wrapper">
        <BackButton />
      </div>
      <div className="history-page">
      
        {/* TÍTULO */}
        {profile?.is_donor === true && (
          <h2>📦 Histórico de Doações feitas</h2>
        )}

        {profile?.is_donor === false && (
          <h2>📦 Histórico de Doações recebidas</h2>
        )}

        {/* EMPTY */}
        {donations.length === 0 && (
          <p className="empty">Nenhuma doação encontrada</p>
        )}

        <div className="history-list">
          {donations.map((donation) => (
            <div key={donation.id} className="history-card">

              {/* HEADER */}
              <div className="history-header">
                <span className={`status ${donation.status}`}>
                  {donation.status}
                </span>

                <span className="date">
                  {new Date(donation.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="history-user">
              👤 {donation.otherName || "Usuário"}
              </div>
      
              {/* ITENS */}
              <div className="items">
                {donation.items.map((item, idx) => (
                  <div key={idx} className="item-row">
                    <span className="item-name">
                      {item.name} {item.volume ? `(${item.volume})` : ""}
                    </span>

                    <span className="item-qty">
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                ))}
              </div>

              {/* DATA */}
              <div className="delivery">
                📍 Retirada:{" "}
                {donation.delivery_date
                  ? formatDate(donation.delivery_date)
                  : "Não definida"}
              </div>
              <div
              key={donation.id}
              className="history-card"
              onMouseEnter={() => setHoveredDonation(donation)}
              onMouseLeave={() => setHoveredDonation(null)}
              >
                  {hoveredDonation && (
                      <div className="modal-overlay">
                          <div className="modal-history" onClick={(e) => e.stopPropagation()}>

                          <button
                              className="close-modal"
                              onClick={() => setHoveredDonation(null)}
                          >
                              ×
                          </button>

                          <h2>📦 Detalhes da Doação</h2>

                          <p><strong>Usuário:</strong> {hoveredDonation.otherName}</p>

                          <div className="items">
                              {hoveredDonation.items.map((item, i) => (
                              <div key={i} className="item-row">
                                  <span>
                                  {item.name} {item.volume ? `(${item.volume})` : ""}
                                  </span>
                                  <span>
                                  {item.quantity} {item.unit}
                                  </span>
                              </div>
                              ))}
                          </div>

                          <div className="delivery">
                              📍 Retirada: {formatDate(hoveredDonation.delivery_date)}
                          </div>

                          </div>
                      </div>
                  )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DonationHistory;