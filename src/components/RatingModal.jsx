import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { FaStar } from "react-icons/fa";

function RatingModal({ profileId, onClose }) {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isReviewing, setIsReviewing] = useState(false);
  const [hover, setHover] = useState(0);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    async function loadUser() {
        const { data } = await supabase.auth.getUser();
        setUserId(data?.user?.id);
    }

    loadUser();
  }, []);

  useEffect(() => {
    async function loadRatings() {
      const { data } = await supabase
        .from("rating")
        .select("*")
        .eq("reviewed_id", profileId);

      // 🔥 pega nomes dos usuários
      const usersIds = data.map(r => r.reviewer_id);

      const { data: users } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", usersIds);

      const usersMap = {};
      users.forEach(u => (usersMap[u.id] = u.name));

      const final = data.map(r => ({
        ...r,
        reviewer_name: usersMap[r.reviewer_id] || "Usuário"
      }));

      setRatings(final);
      setLoading(false);
    }

    loadRatings();
  }, [profileId]);

  const handleSubmit = async () => {
    if (!rating) {
        alert("Selecione uma nota");
        return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user.id;

    // 🔥 verifica se já avaliou
    const { data: existing } = await supabase
    .from("rating")
    .select("id")
    .eq("reviewed_id", profileId)
    .eq("reviewer_id", userId)
    .maybeSingle();

    if (existing) {
    alert("Você já avaliou este usuário.");
    onClose();
    return;
    }
    const { error } = await supabase.from("rating").insert({
        reviewed_id: profileId,
        reviewer_id: userData.user.id,
        rating_number: rating,
        comment: text
    });

    if (error) {
        console.error(error);
        alert("Erro ao enviar avaliação");
        return;
    }

    onClose();
    window.location.reload();
};

  return (
    <div className="modal-overlay">
      <div className="rating-modal">

        <h3>Avaliações</h3>

        {/* LISTA */}
        <div className="ratings-list">
            {loading ? (
                "Carregando..."
            ) : ratings.length === 0 ? (
                <div className="no-ratings">
                    <div className="no-ratings-icon">⭐</div>
                    <div className="no-ratings-title">Nenhuma avaliação ainda</div>
                    {userId && userId !== profileId && (
                    <div className="no-ratings-subtitle">
                        Seja o primeiro a avaliar este perfil
                    </div>
                    )}
                </div>
            ) : (
                ratings.map((r, i) => (
                <div key={i} className="rating-item">
                    <strong>{r.reviewer_name}</strong>

                    <div className="stars">
                    {"★".repeat(Math.floor(r.rating_number))}
                    </div>

                    <p>{r.message || "Sem comentário"}</p>
                </div>
                ))
            )}
        </div>

        {userId && userId !== profileId && (
            <>
                {/* BOTÃO AVALIAR */}
                {!isReviewing &&(
                <button onClick={() => setIsReviewing(true)}>
                    Avaliar
                </button>
                )}

                {/* FORM */}
                {isReviewing && (
                <div className="review-box">

                    {/* ⭐ ESTRELAS 0.5 */}
                    <div className="star-input">
                    {[...Array(10)].map((_, i) => {
                        const value = (i + 1) / 2;

                        return (
                        <FaStar
                            key={i}
                            size={20}
                            onMouseEnter={() => setHover(value)}
                            onMouseLeave={() => setHover(0)}
                            onClick={() => setRating(value)}
                            color={(hover || rating) >= value ? "#ffc107" : "#e4e5e9"}
                            style={{ cursor: "pointer" }}
                        />
                        );
                    })}
                    </div>

                    <textarea
                    placeholder="Escreva sua avaliação..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    />

                    <button onClick={handleSubmit}>
                    Enviar
                    </button>
                </div>
                )}
            </>
        )}

        <button className="close-btn" onClick={onClose}>Fechar</button>

      </div>
    </div>
  );
}

export default RatingModal;