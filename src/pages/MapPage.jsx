import { useEffect, useState } from "react"
import "../css/MapPage.css"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import { supabase } from "../lib/supabase"
import { getCurrentUser } from "../services/authService"
import {getOrCreateChat} from "../services/chatService"
import BackButton from "../components/BackButton"


function MapPage() {

  const [profiles, setProfiles] = useState([])
  const [user, setUser] = useState(null)

  const [filters, setFilters] = useState({
    type: "all",
    city: "",
    state: "",
    neighborhood: "",
    accept_donation: null,
    pet_donation: null
  })

  async function handleChatClick(otherUserId) {
    try {
      const { data } = await supabase.auth.getUser();
      const currentUser = data.user;

      if (!currentUser) return;

      const chat = await getOrCreateChat(currentUser.id, otherUserId);

      if (chat && chat.id) {
        console.log("✅ Chat pronto, redirecionando...");
        // Usamos window.location para forçar a limpeza do Leaflet e evitar tela branca
        window.location.href = `/chat/${chat.id}`;
      }
    } catch (error) {
      console.error("❌ Erro ao processar chat:", error);
    }
  }

  // 🔥 Carrega usuário
  useEffect(() => {
    async function loadUser() {
      console.log("🔍 Carregando usuário...")

      const currentUser = await getCurrentUser()
      console.log("👤 Usuário:", currentUser)

      setUser(currentUser)

      if (!currentUser) return

      const { data: myProfile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single()

      console.log("📄 Meu profile:", myProfile)

      if (error) {
        console.error("Erro ao buscar profile:", error)
        return
      }

      // 🔥 define tipo oposto
      setFilters(f => ({
        ...f,
        type: myProfile.is_donor ? "receiver" : "donor"
      }))
    }

    loadUser()
  }, [])

  // 🔥 Auto carregar dados
  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  // 🔍 Buscar profiles
  async function loadData() {
    console.log("🚀 Buscando dados com filtros:", filters)

    if (!user) {
      console.log("❌ Usuário ainda não carregado")
      return
    }

    let query = supabase.from("profiles").select("*")

    if (filters.type === "donor") {
      query = query.eq("is_donor", true)
    }

    if (filters.type === "receiver") {
      query = query.eq("is_donor", false)
    }

    if (filters.city) {
      query = query.ilike("city", `%${filters.city}%`)
    }

    if (filters.state) {
      query = query.ilike("state", `%${filters.state}%`)
    }

    if (filters.neighborhood) {
      query = query.ilike("neighborhood", `%${filters.neighborhood}%`)
    }

    if (filters.accept_donation !== null) {
      query = query.eq("accept_donation", filters.accept_donation)
    }

    if (filters.pet_donation !== null) {
      query = query.eq("pet_donation", filters.pet_donation)
    }

    const { data, error } = await query

    if (error) {
      console.error("❌ Erro na query:", error)
      return
    }

    console.log("📍 Profiles encontrados:", data)

    setProfiles(data)
  }

  // 🔥 separa profiles válidos
  const validProfiles = profiles.filter(p => p.lat && p.lng)
  const invalidProfiles = profiles.filter(p => !p.lat || !p.lng)

  console.log("✅ Profiles válidos:", validProfiles)
  console.log("❌ Profiles sem coordenadas:", invalidProfiles)

  return (
    <div style={{ height: "100vh", width: "100%" }}>

      <div className="filters">

        <select
          value={filters.type}
          onChange={(e) =>
            setFilters(f => ({ ...f, type: e.target.value }))
          }
        >
          <option value="all">Todos</option>
          <option value="donor">Doadores</option>
          <option value="receiver">Recebedores</option>
        </select>

        <input
          placeholder="Cidade"
          value={filters.city}
          onChange={(e) => setFilters(f => ({ ...f, city: e.target.value }))}
        />

        <input
          placeholder="Estado"
          value={filters.state}
          onChange={(e) => setFilters(f => ({ ...f, state: e.target.value }))}
        />

        <input
          placeholder="Bairro"
          value={filters.neighborhood}
          onChange={(e) => setFilters(f => ({ ...f, neighborhood: e.target.value }))}
        />

        <select
          onChange={(e) =>
            setFilters(f => ({
              ...f,
              accept_donation: e.target.value === "" ? null : e.target.value === "true"
            }))
          }
        >
          <option value="">Aceita doação (todos)</option>
          <option value="true">Sim</option>
          <option value="false">Não</option>
        </select>

        <select
          onChange={(e) =>
            setFilters(f => ({
              ...f,
              pet_donation: e.target.value === "" ? null : e.target.value === "true"
            }))
          }
        >
          <option value="">Pet (todos)</option>
          <option value="true">Sim</option>
          <option value="false">Não</option>
        </select>

        <button onClick={loadData} className="search-btn">
          Buscar
        </button>
      </div>
      <BackButton to="/profile" />
      <MapContainer
        key={user?.id}
        center={[-23.55, -46.63]}
        zoom={12}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {validProfiles.map(p => {
          console.log("📌 Renderizando marker:", p)

          return (
            <Marker key={p.id} position={[p.lat, p.lng]}>
              <Popup>
                <strong>{p.name}</strong><br />
                {p.city} - {p.neighborhood}<br />
                {p.accept_donation ? "Aceitando doação" : "Não pegando doação no momento"}
                <br /><br />

                {/* BOTÃO VER PERFIL - Usando redirecionamento nativo */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Força a saída do mapa sem deixar o React tentar limpar o Popup
                    window.location.href = `/profile/${p.id}`;
                  }}
                  style={{
                    background: "#58af9b",
                    color: "white",
                    border: "none",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    marginRight: "8px"
                  }}
                >
                  Ver perfil
                </button>
                  
                {/* BOTÃO CONVERSAR */}
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      const { data: { user: currentUser } } = await supabase.auth.getUser();
                      if (!currentUser) return;

                      const chat = await getOrCreateChat(currentUser.id, p.id);
                      if (chat && chat.id) {
                        // Redireciona nativamente para evitar o erro de 'removeChild'
                        window.location.href = `/chat/${chat.id}`;
                      }
                    } catch (err) {
                      console.error("Erro ao ir para o chat:", err);
                    }
                  }}
                  style={{
                    background: "#58af9b",
                    color: "white",
                    border: "none",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    cursor: "pointer"
                  }}
                >
                  Conversar
                </button>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

    </div>
  )
}

export default MapPage