import { useState } from "react";
import { useNavigate } from "react-router-dom"; // Importante para a navegação
import { login, signup, loginComGoogle } from "../services/authService";

function Login() {
  const navigate = useNavigate(); // Inicializa o hook de navegação

  const [mode, setMode] = useState("signin");

  // Estados para Cadastro
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  // Estados para Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  async function handleSignup(e) {
    e.preventDefault();
    const result = await signup(signupEmail, signupPassword, signupName);

    if (result.success) {
      // Redireciona para a rota /profile definida no seu App.jsx
      navigate("/profile"); 
    } else {
      alert(result.error);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    const result = await login(loginEmail, loginPassword);

    if (result.success) {
      // Redireciona para a rota /profile definida no seu App.jsx
      navigate("/profile"); 
    } else {
      alert(result.error);
    }
  }

  async function handleSocialLogin(e) {
    e.preventDefault();
    const result = await loginComGoogle();
    
    if (result.success) {
      // Redireciona para a rota /profile definida no seu App.jsx
      navigate("/profile"); 
    } else {
      alert(result.error);
    }
  }

  return (
    <div className={`container ${mode === "signup" ? "sign-up-js" : "sign-in-js"}`}>
      {/* SEÇÃO DE CADASTRO (Aparece quando o modo é signup) */}
      <div className="content first-content">
        <div className="first-column">
          <h2 className="title title-primary">Bem-Vindo De Volta!</h2>
          <p className="description description-primary">Se já possui conta</p>
          <p className="description description-primary">Clique no botão abaixo</p>
          <button className="btn btn-primary" onClick={() => setMode("signin")}>
            sign in
          </button>
        </div>

        <div className="second-column">
          <h2 className="title title-second">Criar uma Conta</h2>
          <div className="social-media">
            <ul className="list-social-media">
              <a className="link-social-media" href="#" onClick={handleSocialLogin}>
                  <li className ="item-social-media">
                      <i className ="fa-brands fa-google-plus-g"></i>
                  </li>
              </a>
            </ul>
          </div>
          <p className="description description-second">ou use o seu email para se cadastrar:</p>
          
          <form className="form" onSubmit={handleSignup}>
            <label className="label-input">
              <i className="far fa-user icon-modify"></i>
              <input 
                type="text" 
                placeholder="Name" 
                required 
                value={signupName} 
                onChange={(e) => setSignupName(e.target.value)} 
              />
            </label>

            <label className="label-input">
              <i className="far fa-envelope icon-modify"></i>
              <input 
                type="email" 
                placeholder="Email" 
                required 
                value={signupEmail} 
                onChange={(e) => setSignupEmail(e.target.value)} 
              />
            </label>

            <label className="label-input">
              <i className="fas fa-lock icon-modify"></i>
              <input 
                type="password" 
                placeholder="Password" 
                required 
                value={signupPassword} 
                onChange={(e) => setSignupPassword(e.target.value)} 
              />
            </label>
            <button type="submit" className="btn btn-second">sign up</button>
          </form>
        </div>
      </div>

      {/* SEÇÃO DE LOGIN (Aparece quando o modo é signin) */}
      <div className="content second-content">
        <div className="first-column">
          <h2 className="title title-primary">Olá, amigo!</h2>
          <p className="description description-primary">Entre com as suas informações de negócio</p>
          <p className="description description-primary">e comece a sua jornada conosco</p>
          <button className="btn btn-primary" onClick={() => setMode("signup")}>
            sign up
          </button>
        </div>

        <div className="second-column">
          <h2 className="title title-second">Faça Login aqui</h2>
          <div className="social-media">
            <ul className="list-social-media">
              <a className ="link-social-media" href="#" onClick={handleSocialLogin}>
                  <li className ="item-social-media">
                      <i className ="fa-brands fa-google-plus-g"></i>
                  </li>
              </a>
            </ul>
          </div>
          <p className="description description-second">ou use a sua conta de email:</p>

          <form className="form" onSubmit={handleLogin}>
            <label className="label-input">
              <i className="far fa-envelope icon-modify"></i>
              <input 
                type="email" 
                placeholder="Email" 
                required 
                value={loginEmail} 
                onChange={(e) => setLoginEmail(e.target.value)} 
              />
            </label>

            <label className="label-input">
              <i className="fas fa-lock icon-modify"></i>
              <input 
                type="password" 
                placeholder="Password" 
                required 
                value={loginPassword} 
                onChange={(e) => setLoginPassword(e.target.value)} 
              />
            </label>

            <a className="password" href="#">Esqueceu a sua senha?</a>
            <button type="submit" className="btn btn-second">sign in</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;