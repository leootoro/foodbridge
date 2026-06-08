import { useState, useEffect} from "react"
import { supabase } from "../lib/supabase"
import BlockManagerModal from "../components/BlockManagerModal" // Certifique-se de usar o export default lá
import { useNavigate } from "react-router-dom"; 
import BackButton from "../components/BackButton";
import "../css/config.css"


function ConfigPage() {
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [myId, setMyId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasPassword, setHasPassword] = useState(true);
  const navigate = useNavigate()
  
  // Estado que controla TUDO na tela localmente
  const [settings, setSettings] = useState({
    show_only_to_opposite: false,
    show_exact_location: false,
    allow_chat_requests: true,
    show_on_map: true,
    blocked_users_list: [] // Lista local de bloqueados
  });

  useEffect(() => {
    const loadInitialData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const providers = user.app_metadata?.providers || [];

        // Se só possui Google, não mostra alterar senha
        setHasPassword(!(
          providers.length === 1 &&
          providers.includes("google")
        ));
        setMyId(user.id);
        
        // Busca perfil e bloqueios atuais do banco de uma vez
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        const { data: blocks } = await supabase.from('blocked_users')
          .select('blocked_user_id, profiles:blocked_user_id(name)')
          .eq('user_id', user.id);
        
        if (profile) {
          setSettings({
            ...profile,
            blocked_users_list: blocks || []
          });
        }
      }
    };
    loadInitialData();
  }, []);

  const handleToggle = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Esta função salva TUDO (checkboxes e bloqueios) de uma vez só
  const handleSave = async () => {
    setLoading(true);
    try {
      // 1. Salva as configurações de privacidade no profile
      await supabase.from('profiles').update({
        show_only_to_opposite: settings.show_only_to_opposite,
        show_exact_location: settings.show_exact_location,
        allow_chat_requests: settings.allow_chat_requests,
        show_on_map: settings.show_on_map
      }).eq('id', myId);

      // 2. Sincroniza a tabela de bloqueios (Deleta tudo e reinsere a lista local)
      await supabase.from('blocked_users').delete().eq('user_id', myId);
      
      const toInsert = settings.blocked_users_list.map(b => ({
        user_id: myId,
        blocked_user_id: b.blocked_user_id || b // Suporta objeto ou ID direto
      }));

      if (toInsert.length > 0) {
        await supabase.from('blocked_users').insert(toInsert);
      }

      alert("Todas as alterações foram salvas com sucesso!");
      navigate("/profile")
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar alterações.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    const pass = window.prompt("Digite sua nova senha (mínimo 6 caracteres):");
    if (pass && pass.length >= 6) {
      const { error } = await supabase.auth.updateUser({ password: pass });
      if (error) alert(error.message);
      else alert("Senha alterada!");
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("ATENÇÃO: Deseja realmente excluir sua conta? Esta ação é irreversível.")) {
      setLoading(true); // Para o usuário não clicar duas vezes
      try {
        // 1. Apaga os dados da tabela profiles. 
        // A nossa trigger no banco vai ouvir isso e apagar o Auth automaticamente!
        const { error } = await supabase.from('profiles').delete().eq('id', myId);
        
        if (error) throw error;

        // 2. Desloga o usuário localmente
        await supabase.auth.signOut();
        
        alert("Sua conta foi excluída com sucesso.");
        navigate("/"); // Redireciona para o Login
        
      } catch (err) {
        console.error(err);
        alert("Erro ao excluir conta: " + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <>
      <div className="config-back-button">
        <BackButton />
      </div>
      
      <div className="config-container">
        <h1>Configurações</h1>

        {/*  PRIVACIDADE E SEGURANÇA */}
        <section className="config-section">
          <h2>Privacidade e Segurança</h2>
          <div className="config-item">
            <label>Mostrar apenas para usuários do tipo oposto</label>
            <input type="checkbox" checked={settings.show_only_to_opposite} onChange={() => handleToggle("show_only_to_opposite")} />
          </div>
          <div className="config-item">
            <label>Mostrar minha localização exata</label>
            <input type="checkbox" checked={settings.show_exact_location} onChange={() => handleToggle("show_exact_location")} />
          </div>
          <div className="config-item">
            <label>Exibir meu perfil no mapa</label>
            <input type="checkbox" checked={settings.show_on_map} onChange={() => handleToggle("show_on_map")} />
          </div>
        </section>

        {/*  CONVERSAS */}
        <section className="config-section">
          <h2>Conversas</h2>
          <div className="config-item">
            <label>Permitir que outros iniciem conversa comigo</label>
            <input type="checkbox" checked={settings.allow_chat_requests} onChange={() => handleToggle("allow_chat_requests")} />
          </div>
          <div className="config-item">
            <label>Usuários bloqueados</label>
            <button className="config-button" onClick={() => setShowBlockModal(true)}>
              Gerenciar bloqueios
            </button>
          </div>
        </section>

        {/*  BOTÕES DE SALVAR E SAIR */}
        <div className="action-buttons-container" style={{ display: 'flex', gap: '10px', margin: '20px 0' }}>
          <button 
            className="config-button save-btn" 
            onClick={handleSave} 
            disabled={loading}
            style={{ flex: 3, backgroundColor: '#58af9b', color: 'white', fontWeight: 'bold' }}
          >
            {loading ? "Salvando..." : "Salvar Alterações"}
          </button>
          
          <button 
            className="config-button logout-btn" 
            onClick={() => navigate("/profile")}
          >
            Sair
          </button>
        </div>

        {/*  DADOS DA CONTA */}
        <section className="config-section">
          <h2>Dados da Conta</h2>
          <div className="config-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', marginLeft: '20px', marginRight: '20px', marginTop:'30px'}}>
          {hasPassword && (
            <button
              className="config-button-senha"
              onClick={handleChangePassword}
              style={{
                backgroundColor: "#58af9b",
                color: "white"
              }}
            >
              Alterar senha
            </button>
          )}
            <button className="config-button-danger" onClick={handleDeleteAccount}>
              Excluir conta
            </button>
          </div>
        </section>

        {/* MODAL */}
        {showBlockModal && (
          <BlockManagerModal 
            myId={myId} 
            currentBlocked={settings.blocked_users_list}
            onUpdate={(newList) => setSettings(prev => ({ ...prev, blocked_users_list: newList }))}
            onClose={() => setShowBlockModal(false)} 
          />
        )}
      </div>
    </>
  );
}

export default ConfigPage;