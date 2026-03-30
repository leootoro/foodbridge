import "../css/profile.css"
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom"; 
import { get_Profile, updateProfile } from "../services/profileService";
import { getUserPosts, getMediaUrl, get_profile_photo_Url, deletePost, updatePostText } from "../services/mediaService";
import { getCurrentUser } from "../services/authService";
import { getOrCreateChat } from "../services/chatService"


function show_location(profile) {

  if (!profile) return "Carregando..."

  if (profile.show_exact_location) {
    return `${profile.address} ${profile.address_number} ${profile.address_complement}, ${profile.neighborhood} - ${profile.state}`
  }

  return `${profile.address}, ${profile.neighborhood} - ${profile.state}`
}

function Profile() {

  const { userId } = useParams()
  const navigate = useNavigate()

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  // Adicione um novo estado para o modo de edição
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");

  // Função para Deletar
  const handleDelete = async (post) => {
    if (window.confirm("Tem certeza que deseja excluir esta postagem?")) {
      try {
        await deletePost(post.id, post.media_url);
        setPosts(posts.filter(p => p.id !== post.id)); // Remove da tela na hora
        setSelectedPost(null); // Fecha o modal
        alert("Postagem excluída!");
      } catch (err) {
        console.error(err);
        alert("Erro ao excluir postagem.");
      }
    }
  };

  // Função para Salvar Edição
  const handleSaveEditPost = async () => {
    try {
      await updatePostText(selectedPost.id, editText);
      // Atualiza o post na lista local para refletir a mudança
      setPosts(posts.map(p => p.id === selectedPost.id ? { ...p, text: editText } : p));
      setIsEditing(false);
      selectedPost.text = editText; // Atualiza o objeto aberto
    } catch (err) {
      alert("Erro ao atualizar legenda.");
    }
  };
  // 🔹 carregar dados
  useEffect(() => {

    async function loadData() {

      const currentUser = await getCurrentUser();
      setUser(currentUser);

      const idToLoad = userId || currentUser?.id

      if (idToLoad) {
        const profileData = await get_Profile(idToLoad);
        setProfile(profileData);

        const postsData = await getUserPosts(idToLoad);
        setPosts(postsData);
      }
    }

    loadData();

  }, [userId]);

  // 🔹 online/offline (SÓ PARA DONO)
  useEffect(() => {
    if (!user) return

    // só atualiza se for o próprio perfil
    if (userId && userId !== user.id) return

    const setOnline = async () => {
      await updateProfile(user.id, { is_online: true })
    }

    const setOffline = async () => {
      await updateProfile(user.id, { is_online: false })
    }

    setOnline()

    window.addEventListener("beforeunload", setOffline)

    return () => {
      setOffline()
      window.removeEventListener("beforeunload", setOffline)
    }
  }, [user, userId])

  // 🔹 dono ou não
  const isOwner = user?.id === (userId || user?.id)

  function handleFileSelected(event) {
    const file = event.target.files[0]
    if (!file) return

    const previewUrl = URL.createObjectURL(file)
    return { file, previewUrl }
  }

  function handleFileSelected_post(event){
    const result = handleFileSelected(event)
    if (!result) return

    const { file, previewUrl } = result

    navigate("/create-post", {
      state: { file, previewUrl }
    })

    event.target.value = null
  }

  return (
    <div className="profile-page">

      {isOwner && (
        // {/* SIDEBAR */}
        <aside className="sidebar">
          <h2 className="logo">FoodBridge</h2>

          <nav>
            <ul>
              <li className="active">Perfil</li>
               <li className="button_conversas" onClick={() => navigate("/search")}>
                 Procurar 🔎
              </li>
              <li className="button_conversas" onClick={() => navigate("/chats")}>
                  Conversas
              </li>
              <li className="button_map" onClick={() => navigate("/map")}>
                  Mapa
              </li>
              <li className="button_config" onClick={() => navigate("/config")}>
                  Configurações
              </li>
            </ul>
          </nav>
        </aside>
      )}

      {/* CONTEÚDO */}
      <main className="profile-content">

        {/* HEADER */}
        <section className="profile-header">

          <div className="profile-photo">
            <img
              src={
                profile?.photo_url
                  ? get_profile_photo_Url(profile.photo_url)
                  : "/default_user.png"
              }
              alt="profile"
            />
          </div>

          <div className="profile-info">

            <div className="name-row">
              <h2>{profile?.name}</h2>

              <div
                className={`status-dot ${
                  profile?.is_online ? "online" : "offline"
                }`}
              ></div>
            </div>

            <p className="location">📍{show_location(profile)}</p>

            <p className="bio">{profile?.bio}</p>

            <div className="profile-buttons">

              {/* 🔥 botão editar só para dono */}
              {isOwner && (
                <button
                  className="btn-primary-profile"
                  onClick={() => navigate("/edit-profile")}
                >
                  Editar Perfil
                </button>
              )}

              {/* 🔥 nova postagem só para dono */}
              {isOwner && (
                <label className="btn-secondary-profile">
                  Nova Postagem
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileSelected_post}
                    style={{ display: "none" }}
                  />
                </label>
              )}

              {/* 🔥 botão conversar se for outro */}
              {!isOwner && (
                <button
                className="btn-primary-profile"
                onClick={async () => {
                  if (!user || !profile) return

                  const chat = await getOrCreateChat(user.id, profile.id)

                  navigate(`/chat/${chat.id}`)
                }}
              >
                Conversar
              </button>
              )}

            </div>

          </div>

        </section>

        {/* CARDS */}
      
        <section className="profile-cards">

          {profile?.is_donor == false && (
          <div className="card donation-card">

            <div className="switch-row">
              <span>Está recebendo doações</span>

              <div className="status-container">
                <div
                  className={`status-circle ${
                    profile?.accept_donation ? "green" : "red"
                  }`}
                ></div>

                <span className="status-text">
                  {profile?.accept_donation ? "Sim" : "Não"}
                </span>
              </div>
            </div>

            <div className="switch-row">
              <span>Recebe doação para Pet</span>

              <div className="status-container">
                <div
                  className={`status-circle ${
                    profile?.pet_donation ? "green" : "red"
                  }`}
                ></div>

                <span className="status-text">
                  {profile?.pet_donation ? "Sim" : "Não"}
                </span>
              </div>
            </div>

            <div className="food-restrictions">

              <div className="restriction-title">
                Restrição de alimentos
                <span className="help">?</span>
              </div>

              <div className="restriction-tags">
                {profile?.food_restrictions
                  ?.split(",")
                  .map((item, index) => (
                    <span key={index} className="tag">
                      {item.trim()}
                    </span>
                  ))}
              </div>

            </div>

          </div>
          )}


          {profile?.is_donor == true && (
          <div className="card donation-card">

            <div className="switch-row">
              <span>Retirada no local</span>

              <div className="status-container">
                <div
                  className={`status-circle ${
                    profile?.local_pickup ? "green" : "red"
                  }`}
                ></div>

                <span className="status-text">
                  {profile?.local_pickup ? "Sim" : "Não"}
                </span>
              </div>
            </div>

            <div className="switch-row">
              <span>Disponibilidade Imediata</span>

              <div className="status-container">
                <div
                  className={`status-circle ${
                    profile?.immediate_availability ? "green" : "red"
                  }`}
                ></div>

                <span className="status-text">
                  {profile?.immediate_availability ? "Sim" : "Não"}
                </span>
              </div>
            </div>

            <div className="food-restrictions">

              <div className="restriction-title">
                Alimentos disponíveis
                <span className="help" title="Lista de itens para doação">?</span>
              </div>

              <div className="food-display-scroll-container">
                {profile?.food_available && Array.isArray(profile.food_available) ? (
                  profile?.food_available.map((food, index) => (
                    <div key={index} className="food-item-row">
                      {/* Nome do Alimento */}
                      <span className = "food-name">
                        {food.item === "Outro" ? food.customItem : food.item}
                      </span>

                      {/* Quantidade e Unidade */}
                      <span className="food-badge">
                        {food.quantity} {food.unit}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="empty-food-list">
                    Nenhum alimento listado no momento
                  </div>
                )}
              </div>
            </div>

          </div>
          )}
        




          <div className="card map-card">
            <h3>📍 Localização</h3>

            <iframe
              title="map"
              src="https://maps.google.com/maps?q=sao%20paulo&t=&z=13&ie=UTF8&iwloc=&output=embed"
            ></iframe>
          </div>

        </section>

        {/* GALERIA */}
        <section className="gallery">

          <h2>Fotos e Vídeos</h2>

          <div className="gallery-grid">
            {posts.map((post) => {
              const url = getMediaUrl(post.media_url);

              if (post.media_type === "image") {
                return (
                  <img 
                    key={post.id} 
                    src={url} 
                    onClick={() => setSelectedPost(post)} 
                    style={{ cursor: 'pointer' }} 
                  />
                );
              }

              if (post.media_type === "video") {
                return (
                  <div key={post.id} className="video-thumbnail-container" onClick={() => setSelectedPost(post)}>
                    <video src={url} />
                    <div className="video-play-icon">▶</div> {/* Ícone visual opcional */}
                  </div>
                );
              }

              return null;
            })}
          </div>
          {/* 2. O MODAL LOGO ABAIXO DA DIV GALLERY-GRID */}
          {selectedPost && (
            <div className="modal-overlay" onClick={() => { setSelectedPost(null); setIsEditing(false); }}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={() => setSelectedPost(null)}>&times;</button>
                
                {/* Botões de Ação (Aparecem apenas se o isOwner for true) */}
                {isOwner && (
                  <div className="modal-actions-top">
                    <button onClick={() => { setIsEditing(true); setEditText(selectedPost.text); }} title="Editar">✏️</button>
                    <button onClick={() => handleDelete(selectedPost)} title="Excluir" className="btn-delete">🗑️</button>
                  </div>
                )}

                <div className="modal-media-wrapper">
                  {selectedPost.media_type === "image" ? (
                    <img src={getMediaUrl(selectedPost.media_url)} alt="Zoom" />
                  ) : (
                    <video controls autoPlay><source src={getMediaUrl(selectedPost.media_url)} type="video/mp4" /></video>
                  )}
                </div>
                
                <div className="modal-footer-message">
                  {isEditing ? (
                    <div className="edit-container">
                      <textarea value={editText} onChange={(e) => setEditText(e.target.value)} />
                      <button onClick={handleSaveEditPost}>Salvar</button>
                      <button onClick={() => setIsEditing(false)}>Cancelar</button>
                    </div>
                  ) : (
                    <p>{selectedPost.text || "Sem legenda"}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

      </main>

    </div>
  )
}

export default Profile;