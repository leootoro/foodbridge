import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import { supabase } from "../lib/supabase"
import { getCurrentUser } from "../services/authService"

function MapPage() {

  const [profiles, setProfiles] = useState([])
  const [user, setUser] = useState(null)

  const [filters, setFilters] = useState({
    type: "", // donor / receiver / all
    city: "",
    state: "",
    neighborhood: "",
    accept_donation: null,
    pet_donation: null
  })

  useEffect(() => {
    async function loadUser() {
      const currentUser = await getCurrentUser()
      setUser(currentUser)

      if (!currentUser) return

      const { data: myProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single()

      // 🔥 define filtro inicial oposto
      setFilters(f => ({
        ...f,
        type: myProfile.is_donor ? "Recebedor" : "Doador"
      }))
    

      // 🔥 filtros adicionais
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

      const { data } = await query

      setProfiles(data)
    }

    loadData()
  }, [filters])

  return (
    <div style={{ height: "100vh" }}>

      {/* 🔥 FILTROS */}
      <div className="filters">

        <select
          value={filters.type}
          onChange={(e) =>
            setFilters(f => ({ ...f, type: e.target.value }))
          }
        >
          <option value="donor">Doadores</option>
          <option value="receiver">Recebedores</option>
        </select>

        <input
          placeholder="Cidade"
          onChange={(e) => setFilters(f => ({ ...f, city: e.target.value }))}
        />

        <input
          placeholder="Estado"
          onChange={(e) => setFilters(f => ({ ...f, state: e.target.value }))}
        />

        <input
          placeholder="Bairro"
          onChange={(e) => setFilters(f => ({ ...f, neighborhood: e.target.value }))}
        />

        <select onChange={(e) =>
          setFilters(f => ({
            ...f,
            accept_donation: e.target.value === "" ? null : e.target.value === "true"
          }))
        }>
          <option value="">Aceita doação (todos)</option>
          <option value="true">Sim</option>
          <option value="false">Não</option>
        </select>

        <select onChange={(e) =>
          setFilters(f => ({
            ...f,
            pet_donation: e.target.value === "" ? null : e.target.value === "true"
          }))
        }>
          <option value="">Pet (todos)</option>
          <option value="true">Sim</option>
          <option value="false">Não</option>
        </select>

        <button onClick={loadData} className="search-btn">
          Buscar
        </button>
      </div>


      {/* 🗺️ MAPA */}
      <MapContainer center={[-23.55, -46.63]} zoom={12} style={{ height: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {profiles.map(p => (
          <Marker key={p.id} position={[p.lat, p.lng]}>
            <Popup>
              <strong>{p.name}</strong><br />
              {p.city}<br />
              {p.accept_donation ? "Aceita doação" : "Não aceita"}
            </Popup>
          </Marker>
        ))}

      </MapContainer>

    </div>
  )
}

export default MapPage