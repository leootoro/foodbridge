import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { createPortal } from "react-dom";
import { FaStar } from "react-icons/fa";
import { calcRating } from "../services/ratingService";
import "../css/RatingModal.css"

function RatingModal({ profileId, onClose , setProfile}) {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isReviewing, setIsReviewing] = useState(false);
  const [hover, setHover] = useState(0);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [userId, setUserId] = useState(null);
  const [alreadyRated, setAlreadyRated] = useState(false);
  const [myRatingId, setMyRatingId] = useState(null);

  useEffect(() => {
    async function loadUser() {
        const { data } = await supabase.auth.getUser();
        setUserId(data?.user?.id);
    }

    loadUser();
  }, []);

  useEffect(() => {
      async function checkRating() {
        const { data: { user } } = await supabase.auth.getUser();
  
        const { data } = await supabase
          .from("rating")
          .select("id")
          .eq("reviewer_id", user.id)
          .eq("reviewed_id", profileId)
          .maybeSingle();
  
        if (data) {
          setAlreadyRated(true);
          setMyRatingId(data.id);
        }
      }
  
      checkRating();
    }, []);
  
  async function handleDeleteRating(ratingId) {
    const confirmDelete = window.confirm("Deseja excluir sua avaliação?");
    if (!confirmDelete) return;

    const { error } = await supabase
        .from("rating")
        .delete()
        .eq("id", ratingId);

    if (!error) {
        alert("Avaliação removida!");

        // Usa callback correto (evita estado antigo)
        setRatings(prev => {
        const updated = prev.filter(r => r.id !== ratingId);

        const numbers = updated.map(r => r.rating_number);

        const { avg, count } = calcRating(numbers);

        setProfile(prevProfile => ({
            ...prevProfile,
            avgRating: avg,
            ratingCount: count
        }));

        return updated;
        });

        setAlreadyRated(false);
        setMyRatingId(null);
    }
  }
  useEffect(() => {
    async function loadRatings() {
      const { data } = await supabase
        .from("rating")
        .select("id, reviewer_id, rating_number, comment")
        .eq("reviewed_id", profileId);

      // Pega nomes dos usuários
      const usersIds = data.map(r => r?.reviewer_id);

      const { data: users } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", usersIds);

      const usersMap = {};
      users.forEach(u => (usersMap[u.id] = u?.name));

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

    // Verifica se já avaliou
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
                    <div className="rating-content">
                        <strong>{r.reviewer_name}</strong>

                        <div className="stars">
                        {"★".repeat(Math.floor(r.rating_number))}
                        </div>

                        <p>{r.message || "Sem comentário"}</p>
                    </div>

                    {/* 🔥 SÓ MOSTRA SE FOR SUA */}
                    {r.reviewer_id === userId  && (
                        <button
                            className="delete-rating-btn"
                            onClick={() => handleDeleteRating(r.id)}
                        >
                            Excluir
                        </button>
                    )}
                </div>
                ))
            )}
        </div>

        {userId && userId !== profileId && (
            <>
                {/* BOTÃO AVALIAR */}
                {!isReviewing &&(
                <button className="btn-rate" onClick={() =>{
                 if (alreadyRated) {
                    alert("Você já avaliou este usuário.");
                    return;
                 }
                 setIsReviewing(true);  
                }}              
                 >
                    Avaliar
                </button>
                )}

                {/* FORM */}
                {isReviewing && (
                <div className="review-box">

                    {/* ESTRELAS 0.5 */}
                    <div className="star-input">
                    {[...Array(5)].map((_, i) => {
                        const value = i + 1;

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

                    <button className=" btn-send-rating" onClick={handleSubmit}>
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