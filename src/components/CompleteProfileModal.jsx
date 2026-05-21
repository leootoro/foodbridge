import { useState } from "react";
import "../css/CompleteProfileModal.css"
import {supabase} from "../lib/supabase";

function CompleteProfileModal({ user, onClose }) {
  const [name, setName] = useState(user?.user_metadata?.name || "");
  const [userType, setUserType] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!name || !userType) {
      alert("Preencha todos os campos");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name,
          is_donor: userType === "doador"
        })
        .eq("id", user.id);

      if (error) {
        console.error(error);
        alert("Erro ao salvar");
        return;
      }

      onClose(); // 🔥 fecha modal
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h2>Complete seu cadastro</h2>

        <input
          type="text"
          placeholder="Seu nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div className="user-type">
          <label>
            <input
              type="radio"
              value="doador"
              checked={userType === "doador"}
              onChange={(e) => setUserType(e.target.value)}
            />
            Doador
          </label>

          <label>
            <input
              type="radio"
              value="instituicao"
              checked={userType === "instituicao"}
              onChange={(e) => setUserType(e.target.value)}
            />
            Instituição
          </label>
        </div>

        <button onClick={handleSave} disabled={loading}>
          {loading ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </div>
  );
}

export default CompleteProfileModal;