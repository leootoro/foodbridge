import { useState } from "react";
import { useNavigate } from "react-router-dom"; 
import { login, signup, loginComGoogle, checkNameExists } from "../services/authService";
import "../css/Login.css"

function Login() {
  const navigate = useNavigate(); 

  const [mode, setMode] = useState("signin");

  // Estados para Cadastro
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [userType, setUserType] = useState(""); 

  // Estados para Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  async function handleSignup(e) {
    e.preventDefault();
     setLoading(true);

    try {
      // 1. Validação do Tipo de Usuário (que fizemos antes)
      if (!userType) {
        alert("Por favor, selecione se você é um Doador ou uma Instituição.");
        return;
      }

      // 2. NOVA VERIFICAÇÃO: O nome já existe?
      const nameExists = await checkNameExists(signupName);
      
      if (nameExists) {
        alert("Este nome já está em uso. Por favor, escolha outro nome.");
        return; // Para a execução aqui e não deixa cadastrar!
      }
      const result = await signup(signupEmail, signupPassword, signupName, userType);

      if (result.success) {
        if (result.session) {
          navigate("/profile");
        } else {
          alert("Conta criada! Verifique seu email para confirmar.");
          setMode("signin"); // volta pro login
        }
      } else {
        alert(result.error);
      } 

    } finally {
    setLoading(false);
      }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    const result = await login(loginEmail, loginPassword);

    try{
      if (result.success) {
        // Redireciona para a rota /profile definida no App.jsx
        navigate("/profile"); 
      } else {
        alert(result.error);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSocialLogin(e) {
    e.preventDefault();
    setLoading(true);
    const result = await loginComGoogle();
    
    try{
      if (result.success) {
        // Redireciona para a rota /profile definida no App.jsx
        navigate("/profile"); 
      } else {
        alert(result.error);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className={`login-container 
        ${mode === "signup" ? "sign-up-js" : "sign-in-js"} 
        ${hasAnimated ? "animate" : ""}
      `}>
        {/* SEÇÃO DE CADASTRO (Aparece quando o modo é signup) */}
        <div className="login-content first-content">
          <div className="login-first-column">
            
            <h2 className="login-title title-primary">Bem-Vindo De Volta!</h2>
            <p className="login-description description-primary">Se já possui conta</p>
            <p className="login-description description-primary">Clique no botão abaixo</p>
            <button className="login-btn btn-primary" 
            onClick={() =>{
              setMode("signin");
              setHasAnimated(true);
            }}>
              sign in
            </button>
          </div>

          <div className="login-second-column">


            <img
              src="/Fb-logo.png"
              alt="logo"
              className="login-logo-fp"
            />
            <h2 className="login-title title-second">Criar uma Conta</h2>
            <div className="login-social-media">
              <ul className="login-list-social-media">
                <button className="login-link-social-media" href="#" onClick={handleSocialLogin}>
                    <li className ="login-item-social-media">
                        <i className ="fa-brands fa-google-plus-g"></i>
                    </li>
                </button>
              </ul>
            </div>
            <p className="description description-second">ou use o seu email para se cadastrar:</p>
            
            <form className="login-form" onSubmit={handleSignup}>

              {/* SELEÇÃO DE TIPO DE USUÁRIO */}
              <div className="user-type-container" style={{ display: 'flex', gap: '20px', marginBottom: '15px', justifyContent: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="userType" 
                    value="doador" 
                    checked={userType === "doador"}
                    onChange={(e) => setUserType(e.target.value)}
                  />
                  Doador
                </label>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="userType" 
                    value="instituicao" 
                    checked={userType === "instituicao"}
                    onChange={(e) => setUserType(e.target.value)}
                  />
                  Instituição
                </label>
              </div>
              <label className="login-label-input">
                <i className="far fa-user icon-modify"></i>
                <input 
                  type="text" 
                  placeholder="Name" 
                  required 
                  value={signupName} 
                  onChange={(e) => setSignupName(e.target.value)} 
                />
              </label>

              <label className="login-label-input">
                <i className="far fa-envelope icon-modify"></i>
                <input 
                  type="email" 
                  placeholder="Email" 
                  required 
                  value={signupEmail} 
                  onChange={(e) => setSignupEmail(e.target.value)} 
                />
              </label>

              <label className="login-label-input">
                <i className="fas fa-lock icon-modify"></i>
                <input 
                  type="password" 
                  placeholder="Password" 
                  required 
                  value={signupPassword} 
                  onChange={(e) => setSignupPassword(e.target.value)} 
                />
              </label>
              <button type="submit" className="login-btn btn-second" disabled={loading}>sign up</button>
            </form>
          </div>
        </div>

        {/* SEÇÃO DE LOGIN (Aparece quando o modo é signin) */}
        <div className="login-content second-content">
          <div className="login-first-column">
            <h2 className="login-title title-primary">Olá, amigo!</h2>
            <p className="login-description description-primary">Entre com as suas informações de negócio</p>
            <p className="login-description description-primary">e comece a sua jornada conosco</p>
            <button className="login-btn btn-primary" 
            onClick={() => {
              setMode("signup")
              setHasAnimated(true);
            }}>
              sign up
            </button>
          </div>

          <div className="login-second-column">
            <img
              src="/Fb-logo.png"
              alt="logo"
              className="login-logo"
            />
            <h2 className="login-title title-second">Faça Login aqui</h2>
            <div className="login-social-media">
              <ul className="login-list-social-media">
                <a className ="login-link-social-media" href="#" onClick={handleSocialLogin}>
                    <li className ="login-item-social-media">
                        <i className ="fa-brands fa-google-plus-g"></i>
                    </li>
                </a>
              </ul>
            </div>
            <p className="login-description description-second">ou use a sua conta de email:</p>

            <form className="login-form" onSubmit={handleLogin}>
              <label className="login-label-input">
                <i className="far fa-envelope icon-modify"></i>
                <input 
                  type="email" 
                  placeholder="Email" 
                  required 
                  value={loginEmail} 
                  onChange={(e) => setLoginEmail(e.target.value)} 
                />
              </label>

              <label className="login-label-input">
                <i className="fas fa-lock icon-modify"></i>
                <input 
                  type="password" 
                  placeholder="Password" 
                  required 
                  value={loginPassword} 
                  onChange={(e) => setLoginPassword(e.target.value)} 
                />
              </label>

              <a className="password" onClick={() => navigate("/forgot-password")}>
                Esqueceu a sua senha?
              </a>
              <button type="submit" className="login-btn btn-second" disabled={loading}>sign in</button>
            </form>
          </div>
        </div>
      </div>
      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
        </div>
      )}
    </>
  )
}

export default Login;