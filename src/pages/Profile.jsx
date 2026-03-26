import "../css/profile.css"
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom"; 
import { get_Profile, updateProfile } from "../services/profileService";
import { getUserPosts, getMediaUrl, get_profile_photo_Url } from "../services/mediaService";
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
              <li>
                <button className="button_conversas" onClick={() => navigate("/chats")}>
                  Conversas
                </button>
              </li>
              <li>
                <button className="button_map" onClick={() => navigate("/map")}>
                  Mapa
                </button>
              </li>
              <li>
                <button className="button_config" onClick={() => navigate("/config")}>
                  Configurações
                </button>
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
                  className="btn-primary"
                  onClick={() => navigate("/edit-profile")}
                >
                  Editar Perfil
                </button>
              )}

              {/* 🔥 nova postagem só para dono */}
              {isOwner && (
                <label className="btn-secondary">
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
                className="btn-primary"
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
                return <img key={post.id} src={url} />;
              }

              if (post.media_type === "video") {
                return (
                  <video key={post.id} controls>
                    <source src={url} type="video/mp4" />
                  </video>
                );
              }

              return null
            })}

          </div>

        </section>

      </main>

    </div>
  );
}

export default Profile;