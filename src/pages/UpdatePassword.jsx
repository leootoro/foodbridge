import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "../css/UpdatePassword.css"


function UpdatePassword() {
  const [password, setPassword] = useState("");
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function handleSession() {
      const hash = window.location.hash;

      if (hash) {
        const params = new URLSearchParams(hash.substring(1));

        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (error) {
            alert("Link inválido ou expirado");
          } else {
            setReady(true);
          }
        }
      }
    }

    handleSession();
  }, []);

  async function handleUpdate(e) {
    e.preventDefault();

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      alert(error.message);
    } else {
      alert("Senha atualizada com sucesso!");

      //  volta pro login
      navigate("/");
    }
  }

  if (!ready) return <p>Validando link...</p>;

  return (
    <div className="update-container">
      <form className="update-form" onSubmit={handleUpdate}>
         <img
            src="/Fb-logo.png"
            alt="logo"
            className="login-logo-up"
          />
        <h2>Nova senha</h2>

        <input
          type="password"
          placeholder="Digite sua nova senha"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit">Atualizar senha</button>
      </form>
    </div>
  );
}

export default UpdatePassword;