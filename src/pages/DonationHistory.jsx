import { useEffect, useState } from "react";
import { getUserDonations } from "../services/donationService";
import { supabase } from "../lib/supabase";
import BackButton from "../components/BackButton";
import "../css/DonationHistory.css";

function DonationHistory() {
  const [donations, setDonations] = useState([]);
  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [selectedDonation, setSelectedDonation] = useState(null);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Erro ao pegar usuário:", userError);
      return;
    }

    setUser(user);

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

        <div className="points-info">
          <p>
            ⭐ <strong>Sistema de Pontos</strong><br />
            Você ganha pontos ao concluir doações com base nos critérios abaixo:
          </p>

          <ul>
            <li>
              <strong>📦 Base:</strong> 1 ponto por item doado
            </li>

            <li>
              <strong>⏱ Frequência:</strong>
              <ul>
                <li>Até 7 dias: +30 pontos</li>
                <li>Até 30 dias: +15 pontos</li>
                <li>Acima de 30 dias: 0 pontos</li>
              </ul>
            </li>

            <li>
              <strong>🔥 Streak (sequência de doações dentro de 30 dias):</strong>
              <ul>
                <li>3 doações seguidas: +15 pontos</li>
                <li>5 doações seguidas: +30 pontos</li>
                <li>10+ doações seguidas: +40 pontos</li>
              </ul>
            </li>
          </ul>

          <p>
            📦 Os pontos de cada doação podem ser visualizados nos cards de doações concluídas.
          </p>

          <hr />

          <p>
            🏆 <strong>Reconhecimento Anual</strong><br />
            Ao final de cada ano, os <strong>3 maiores doadores</strong> receberão:
          </p>

          <ul>
            <li>🏅 Selo de Assistência Social</li>
            <li>📢 Divulgação nas nossas páginas</li>
            <li>🚀 Divulgação gratuita do perfil</li>
            <li>🌱 Créditos de carbono (em parceria com empresas apoiadoras)</li>
          </ul>
        </div>

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
            <div
              key={donation.id}
              className="history-card"
              onClick={() => setSelectedDonation(donation)}
            >
              <div className="history-header">
                <span className={`status ${donation.status}`}>
                  {donation.status}
                </span>

                <span className="date">
                  {new Date(donation.created_at).toLocaleDateString()}
                </span>
              </div>

              {profile?.is_donor === true && (
                <div className="history-user">
                  👤 Para:  {donation.otherName || "Usuário"}
                </div>
              )}

              {profile?.is_donor === false && (
                <div className="history-user">
                  👤 De:  {donation.otherName || "Usuário"}
                </div>
              )}



              <div className="delivery">
                📍 Retirada:{" "}
                {donation.delivery_date
                  ? formatDate(donation.delivery_date)
                  : "Não definida"}
              </div>
              {donation.status === "concluido" && (
                <div className="points-badge">
                  ⭐ {donation.points || 0} pts
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* MODAL FORA DO MAP */}
      {selectedDonation && (
        <div
          className="modal-overlay-history"
          onClick={() => setSelectedDonation(null)}
        >
          <div
            className="modal-history"
            onClick={(e) => e.stopPropagation()}
          >

            <button
              className="close-modal"
              onClick={() => setSelectedDonation(null)}
            >
              ×
            </button>

            <h2>📦 Detalhes da Doação</h2>

            <p>
              <strong>Usuário:</strong> {selectedDonation.otherName}
            </p>

            <div className="items">
              {selectedDonation.items.map((item, idx) => (
                <div key={idx} className="donation-item">

                  {/* NOME + VOLUME */}
                  <span className="donation-item-row">
                    {item.name}{" "}
                    {item.volume ? `(${item.volume})` : ""}
                  </span>

                  {/* QUANTIDADE SEMPRE UN */}
                  <strong className="donation-item-qty">
                    {item.quantity} UN
                  </strong>

                </div>
              ))}
            </div>

            <div className="delivery">
              📍 Retirada: {formatDate(selectedDonation.delivery_date)}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default DonationHistory;