import { useState } from "react"
import "../css/config.css"

function ConfigPage() {

  const [settings, setSettings] = useState({
    // PRIVACIDADE
    show_only_to_opposite: false,
    show_exact_location: false,
    allow_chat_requests: true,
    show_on_map: true,

    // CHAT
    blocked_users: [],

  })

  function handleToggle(key) {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  function handleDeleteAccount() {
    const confirmDelete = window.confirm("Tem certeza que deseja excluir sua conta?")
    if (confirmDelete) {
      console.log("Excluir conta...")
    }
  }

  function handleChangePassword() {
    console.log("Abrir modal de alteração de senha")
  }

  return (
    <div className="config-container">

      <h1>Configurações</h1>

      {/* 🔒 PRIVACIDADE */}
      <section className="config-section">
        <h2>Privacidade e Segurança</h2>

        <div className="config-item">
          <label>Mostrar apenas para usuários do tipo oposto</label>
          <input type="checkbox"
            checked={settings.show_only_to_opposite}
            onChange={() => handleToggle("show_only_to_opposite")}
          />
        </div>

        <div className="config-item">
          <label>Mostrar minha localização exata</label>
          <input type="checkbox"
            checked={settings.show_exact_location}
            onChange={() => handleToggle("show_exact_location")}
          />
        </div>

        <div className="config-item">
          <label>Exibir meu perfil no mapa</label>
          <input type="checkbox"
            checked={settings.show_on_map}
            onChange={() => handleToggle("show_on_map")}
          />
        </div>
      </section>

      {/* 💬 CONVERSAS */}
      <section className="config-section">
        <h2>Conversas</h2>

        <div className="config-item">
          <label>Permitir que outros iniciem conversa comigo</label>
          <input type="checkbox"
            checked={settings.allow_chat_requests}
            onChange={() => handleToggle("allow_chat_requests")}
          />
        </div>

        <div className="config-item">
          <label>Usuários bloqueados</label>
          <button className="config-button">
            Gerenciar bloqueios
          </button>
        </div>
      </section>

      {/* 🧾 CONTA */}
      <section className="config-section">
        <h2>Dados da Conta</h2>

        <button className="config-button" onClick={handleChangePassword}>
          Alterar senha
        </button>

        <button className="config-button danger" onClick={handleDeleteAccount}>
          Excluir conta
        </button>
      </section>

    </div>
  )
}

export default ConfigPage