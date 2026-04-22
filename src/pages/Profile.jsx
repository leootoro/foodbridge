import "../css/profile.css"
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom"; 
import { get_Profile, updateProfile } from "../services/profileService";
import { getUserPosts, getMediaUrl, get_profile_photo_Url, deletePost, updatePostText } from "../services/mediaService";
import { getCurrentUser } from "../services/authService";
import { getOrCreateChat } from "../services/chatService"
import { calcRating } from "../services/ratingService";
import { supabase } from "../lib/supabase";
import RatingModal from "../components/RatingModal";
import { FaStar } from "react-icons/fa";
import { MapContainer, TileLayer, Marker, Circle, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function getDisplayLocation(profile) {
  if (profile.show_exact_location) {
    return [profile.lat, profile.lng];
  }
  // Cria um deslocamento pseudo-aleatório fixo baseado no ID
  const seed = profile.id.charCodeAt(0); 
  const offset = 0.0015; // Aproximadamente 150-200 metros
  const randomLat = profile.lat + ((seed % 10) - 5) * (offset / 10);
  const randomLng = profile.lng + ((seed % 7) - 3) * (offset / 10);

  return [randomLat, randomLng];
}

function RecenterMap({ position, isPhysical }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      // Ajuste dinâmico: 
      // Se zoom for pequeno (ex: 10), usamos um offset grande (0.04) para mover bastante o mapa.
      // Se zoom for grande (ex: 15), usamos um offset pequeno (0.005) para não sumir com o pin.
      const offsetValue = isPhysical ? 0.009 : 0.22; 
      
      const newCenter = [position[0] - offsetValue, position[1]];

      map.setView(newCenter, map.getZoom());
      map.invalidateSize(); 
    }
  }, [position, map, isPhysical]);

  return null;
}

function show_location(profile) {

  if (!profile?.address){
    return ("Sem localização")
  }
  if (!profile) return "Carregando..."

  if(profile?.address == 'Online'){
    return `${profile?.address} - ${profile?.city}, ${profile?.state} `
  }

  else if (profile.show_exact_location) {
    return `${profile?.address} ${profile?.address_number} ${profile?.address_complement}, ${profile?.neighborhood} - ${profile?.city}, ${profile?.state}`
  }

  return `${profile?.address}, ${profile?.neighborhood} - ${profile?.city}, ${profile?.state}`
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
  const [showModal, setShowModal] = useState(false);
  const position = profile?.lat && profile?.lng ? getDisplayLocation(profile) : null;

  const handleMapClick = () => {
    if (profile?.lat && profile?.lng) {
      // Gera a URL de busca do Google Maps com as coordenadas
      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${profile.lat},${profile.lng}`;
      window.open(googleMapsUrl, '_blank'); // Abre em uma nova aba
    }
  };

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

      if (!currentUser && !userId) return; // 🔥 proteção

      setUser(currentUser);

      const idToLoad = userId || currentUser.id;

      if (!idToLoad) return;

      // 🔹 1. busca profile
      const profileData = await get_Profile(idToLoad);


      // 🔹 2. busca ratings
      const { data: ratingsData } = await supabase
        .from("rating")
        .select("rating_number")
        .eq("reviewed_id", idToLoad);

      const numbers = ratingsData?.map(r => r.rating_number) || [];

      const { avg, count } = calcRating(numbers);

      // 🔹 3. seta profile com rating
      setProfile({
        ...profileData,
        avgRating: avg,
        ratingCount: count
      });


      const postsData = await getUserPosts(idToLoad);
      setPosts(postsData);
    }

    loadData();

  }, [userId]);

  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      updateProfile(user.id, {
        last_seen: new Date().toISOString()
      });
    }, 30000); // 30s

    return () => clearInterval(interval);
  }, [user]);

  // 🔹 online/offline (SÓ PARA DONO)
  useEffect(() => {
    if (!user) return

    // só atualiza se for o próprio perfil
    if (userId && userId !== user.id) return

    const setOnline = async () => {
      await updateProfile(user.id, {
        is_online: true,
        last_seen: new Date().toISOString()
      })
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

  const isOnline = (lastSeen) => {
    if (!lastSeen) return false;

    const diff = Date.now() - new Date(lastSeen).getTime();
    return diff < 2 * 60 * 1000; // 2 minutos
  };

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
               <li className="button_busca" onClick={() => navigate("/search")}>
                 Procurar 🔎
              </li>
              <li className="button_conversas" onClick={() => navigate("/chats")}>
                  Conversas
              </li>
              <li className="button_map" onClick={() => navigate("/map")}>
                  Mapa
              </li>
              <li className="button_map" onClick={() => navigate("/donation-history")}>
                  Histórico de Doações
              </li>
              <li className="button_config" onClick={() => navigate("/config")}>
                  Configurações
              </li>
              <li className="button_sair" onClick={() => navigate("/")}>
                  Sair
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
            {!isOwner && (
              <button className="back-btn-overlay" onClick={() => navigate(-1)}>
                ←
              </button>
            )}
            <img
              src={
                profile?.photo_url
                  ? get_profile_photo_Url(profile.photo_url)
                  : "/default_user.png"
              }
              alt="profile"
            />
            <div
              className="profile-rating-inline"
              onClick={(e) => {
                e.stopPropagation();
                setShowModal(true);
              }}
              style={{ cursor: "pointer" }}
            >
              <FaStar className="star-icon" />

              <span>
                {profile?.avgRating > 0 ? profile.avgRating : "Novo"}
              </span>
            </div>

            {/* 🔥 MODAL FORA */}
            {showModal && profile && (
              <RatingModal
                profileId={profile.id}
                onClose={() => setShowModal(false)}
              />
            )}
            </div>

          <div className="profile-info">
            <div className="name-row">
              <h2>{profile?.name}</h2>
              <div className={`status-dot ${isOnline(profile?.last_seen) ? "online" : "offline"}`} />
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
                <span className="help" title = 'Alimentos não recebidos pela instituição'>?</span>
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

                      {/* Lado Esquerdo: Nome + Medida entre parênteses (se não for "un") */}
                      <div className="food-name-wrapper">
                        <span className="food-name" style={{ fontWeight: '500' }}>
                          {food.item === "Outro" ? food.customItem : food.item}
                        </span>
                        
                        {/* Só mostra os parênteses se a medida for diferente de "un" */}
                        {food.unit !== "un" && food.measureValue && (
                          <span className="food-measure-inline" style={{ marginLeft: '6px', color: '#64748b', fontSize: '0.95em' }}>
                            ({food.measureValue}{food.unit})
                          </span>
                        )}
                      </div>
                      {/* Lado Direito: Badge com a Quantidade Final */}
                      <span className="food-badge">
                        {/* Se a unidade for 'un', o badge mostra o valor da medida. 
                            Se for kg/ml, o badge mostra a quantidade de unidades (ex: 5 un) */}
                        {food.unit === "un" 
                          ? `${food.measureValue || 0} UN` 
                          : `${food.quantity || 1} UN`
                        }
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
            <p style={{ fontSize: '14px', marginBottom: '10px', color: '#666' }}>
              {show_location(profile) === 'Sem localização' ? null : show_location(profile)}
            </p>

            {position ? (
              <div style={{ height: "300px", width: "100%", borderRadius: "12px", overflow: "hidden", position: "relative"}}>
                <button 
                  onClick={() => {
                    const url = `https://www.google.com/maps/search/?api=1&query=${profile.lat},${profile.lng}`;
                    window.open(url, '_blank');
                  }} 
                  className="button_google_maps" 
                  title="Clique para abrir no Google Maps"
                >
                  ➣
                </button>

                {/* A key abaixo garante que o mapa recarregue se o status do endereço mudar */}
                <MapContainer 
                  key={`${profile.id}-${profile.physical_address}`} 
                  center={position} 
                  zoom={profile.physical_address ? 15 : 10} // Zoom 10 é melhor para SP
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <RecenterMap position={position} isPhysical={profile.physical_address} />

                  {/* REGRA 1: Se for localização exata E tiver endereço físico, mostra o Pin */}
                  {profile.show_exact_location && profile.physical_address ? (
                    <Marker position={position} />
                  ) : (
                    /* REGRA 2: Caso contrário (Online, ou Escondido), mostra SEMPRE o círculo */
                    <Circle
                      center={position}
                      // Se não tem endereço físico (seu caso do print), raio de 7km
                      radius={profile.physical_address ? 200 : 7000} 
                      pathOptions={{ 
                        color: "#1a73e8", 
                        fillColor: "#1a73e8", 
                        fillOpacity: 0.3, 
                        weight: 2 
                      }}
                    />
                  )}
                </MapContainer>
              </div>
            ) : (
              <div className="map-placeholder">Localização não disponível</div>
            )}
          </div>

        </section>

        {/* GALERIA */}
        <section className="gallery">

          <h2>Fotos e Vídeos</h2>
           <div className={`gallery-grid ${isOwner ? "owner" : ""}`}>
            
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