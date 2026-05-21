import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { resetPassword } from "../services/authService";
import "../css/ForgotPassword.css"

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();

    const result = await resetPassword(email);

    if (result.success) {
      alert("Email de recuperação enviado!");
      
      // Volta pro login só depois de enviar
      navigate("/");
    } else {
      alert(result.error);
    }
  }

  return (
    
    <div className="forgot-container">
    
        <form className="forgot-form" onSubmit={handleSubmit}>
            <img
                src="/Fb-logo.png"
                alt="logo"
                className="login-logo"
            />
        <h2>Recuperar senha</h2>

        <input
            type="email"
            placeholder="Digite seu email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
        />

        <button type="submit">Enviar</button>
        <button type="button" onClick = {() => navigate("/")} style = {{marginTop: "10px", backgroundColor: "gray"}}>Sair</button>
        </form>
    </div>
  );
}

export default ForgotPassword;