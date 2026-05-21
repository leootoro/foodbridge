import React, { useEffect, useState } from "react"
import "../css/MapPage.css"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import { supabase } from "../lib/supabase"
import { getCurrentUser } from "../services/authService"
import {getOrCreateChat} from "../services/chatService"
import BackButton from "../components/BackButton"
import { Circle } from "react-leaflet"
import { getBlockedIds } from "../services/blockService"
import { filterProfiles } from "../components/profileFilter";
import { categoryMapping } from '../lib/itemCategories';
import ItemFilter from "../components/itemFilter";
import ProfileFilters from "../components/FilterProfileUI";

function getDisplayLocation(profile) {
  if (profile.show_exact_location) {
    return [profile.lat, profile.lng]
  }

  const seed = profile.id.charCodeAt(0) 
  const offset = 0.001

  const randomLat = profile.lat + ((seed % 10) - 5) * (offset / 10)
  const randomLng = profile.lng + ((seed % 7) - 3) * (offset / 10)

  return [randomLat, randomLng]
}

function MapPage() {

  const [myProfile, setMyProfile] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [user, setUser] = useState(null)
  const [selectedItems, setSelectedItems] = useState(["todos"]);
  const [selectedItemsToDonate, setSelectedItemsToDonate] = useState([]);
  const [itemSearch, setItemSearch] = useState("");
  const [itemSearchDonate, setItemSearchDonate] = useState("");
  const [useMyItems, setUseMyItems] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [filters, setFilters] = useState({
    type: "all",
    city: "",
    state: "",
    neighborhood: "",
    accept_donation: null,
    pet_donation: null,
    immediate_availability: null,
    local_pickup: null,
    addressType: "all",
    minRating: 0
  })

  // Função separada que recebe o evento (e) e o ID do outro usuário
  async function handleChatClick(e, otherUserId) {
    e.stopPropagation()
    
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) return

      const chat = await getOrCreateChat(currentUser.id, otherUserId)
      if (chat && chat.id) {
        window.location.href = `/chat/${chat.id}`
      }
    } catch (err) {
      console.error("Erro ao ir para o chat:", err)
    }
  }

  useEffect(() => {
    setSelectedItems(["todos"]);
    setSelectedItemsToDonate([]);
  }, [filters.type]);

  // Carrega usuário
  useEffect(() => {
    async function loadUser() {
      console.log("🔍 Carregando usuário...")

      const currentUser = await getCurrentUser()
        setUser(currentUser)

      if (!currentUser) return

      const { data: myProfile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single()
        
      setMyProfile(myProfile)
      if (error) {
        console.error("Erro ao buscar profile:", error)
        return
      }

      // Define tipo oposto
      setFilters(f => ({
        ...f,
        type: myProfile.is_donor ? "receiver" : "donor"
      }))
    }

    loadUser()
  }, [])

  useEffect(() => {
    if (user && myProfile) {
      loadData();
    }
  }, [
    user,
    myProfile,
    filters,
    selectedItems,
    selectedItemsToDonate
  ]);

  useEffect(() => {
      if (filters.addressType === "online") {
        setFilters(f => ({ ...f, neighborhood: "" }));
      }
  }, [filters.addressType]);
  // Buscar profiles
  async function loadData() {
    if (!user || !myProfile) return;

    try {
      const blockedIds = await getBlockedIds(user.id);

      // Busca profiles
      const { data: profilesData, error } = await supabase
        .from("profiles")
        .select("*");

      if (error) throw error;

      // Busca ratings
      const { data: allRatings } = await supabase
        .from("rating")
        .select("reviewed_id, rating_number");

      const ratingsMap = {};

      allRatings?.forEach(r => {
        if (!ratingsMap[r.reviewed_id]) {
          ratingsMap[r.reviewed_id] = [];
        }
        ratingsMap[r.reviewed_id].push(r.rating_number);
      });

      // Adiciona avg e count
      const profilesWithRating = profilesData.map(p => {
        const userRatings = ratingsMap[p.id] || [];
        const count = userRatings.length;

        let avg = 0;
        if (count >= 3) {
          const sum = userRatings.reduce((acc, curr) => acc + curr, 0);
          avg = parseFloat((sum / count).toFixed(1));
        }

        return { ...p, avgRating: avg, ratingCount: count };
      });

      // 🔥 filtro único
      const filtered = filterProfiles({
        profiles: profilesWithRating,
        myProfile,
        filters,
        selectedItems,
        selectedItemsToDonate,
        blockedIds,
        categoryMapping
      });

      setProfiles(filtered);

    } catch (err) {
      console.error(err);
    }
  }

  // Separa profiles válidos
  const validProfiles = profiles.filter(
    p => typeof p.lat === "number" && typeof p.lng === "number"
  );
  const invalidProfiles = profiles.filter(p => !p.lat || !p.lng)
  return (
    <div className="map-page" style={{background:"white", height: "100vh", width: "100%" }}>
      <div className="map-header">
        <BackButton marginRight = "-10" />
        
        <button 
          className="open-filter-btn"
          onClick={() => setIsFilterOpen(true)}
        >
          Filtrar
        </button>
      </div>
      {isFilterOpen && (
        <>
          <div
            className="filters-overlay"
            onClick={() => setIsFilterOpen(false)}
          />

          <ProfileFilters
            className="open"
            onClose={() => setIsFilterOpen(false)}
            filters={filters}
            setFilters={setFilters}
            myProfile={myProfile}
            selectedItems={selectedItems}
            setSelectedItems={setSelectedItems}
            selectedItemsToDonate={selectedItemsToDonate}
            setSelectedItemsToDonate={setSelectedItemsToDonate}
            itemSearch={itemSearch}
            setItemSearch={setItemSearch}
            itemSearchDonate={itemSearchDonate}
            setItemSearchDonate={setItemSearchDonate}
            useMyItems={useMyItems}
            setUseMyItems={setUseMyItems}
            onApply={() => {
              loadData();
              setIsFilterOpen(false);
            }}
          />
        </>
      )}
      <div className = "map-container">
        <MapContainer
          key={user?.id}
          center={[-23.55, -46.63]}
          zoom={12}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {validProfiles.map(p => {
            if (!p.show_on_map) return null

            const position = getDisplayLocation(p)

            return (
              <React.Fragment key={p.id}>

                {/* CÍRCULO (se localização não for exata) */}
                {!p.show_exact_location && (
                  <Circle
                    center={position}
                    radius={900}
                    pathOptions={{
                      color: "#58af9b",
                      fillColor: "#58af9b",
                      fillOpacity: 0.2
                    }}
                  />
                )}

                {/* MARCADOR */}
                <Marker position={position}>
                  <Popup>
                    <div style={{ marginBottom: "4px" }}>
                      <strong>{p.name} - {p.is_donor? "Doador": "ONG"}</strong>
                    </div>

                    <div style={{ marginBottom: "4px" }}>
                      {p.city} - {p.neighborhood}
                    </div>
                    <div style={{ marginBottom: "4px" }}>
                      {p.is_donor === false && (
                        p.accept_donation
                          ? "Aceitando doação"
                          : "Não aceitando doação no momento"
                      )}
                    </div>
                  

                    {!p.show_exact_location && (
                      <div style={{ fontSize: "12px", color: "gray", marginTop: "5px"}}>
                        📍 Localização aproximada
                      </div>
                    )}


                    {/* BOTÃO PERFIL */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        window.location.href = `/profile/${p.id}`
                      }}
                      style={{
                        background: "#58af9b",
                        color: "white",
                        border: "none",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        cursor: "pointer",
                        marginRight: "8px",
                        marginTop: "10px"
                      }}
                    >
                      Ver perfil
                    </button>

                    {/* BOTÃO CHAT */}
                    <button
                      onClick={(e) => {
                        // Só executa a função se o chat estiver permitido
                        if (p.allow_chat_requests !== false) {
                          handleChatClick(e, p.id)
                        }
                      }}
                      // O title cria a mensagem nativa ao passar o mouse
                      title={p.allow_chat_requests === false ? "Essa pessoa desativou o chat" : ""}
                      // Desabilita o botão fisicamente no HTML
                      disabled={p.allow_chat_requests === false}
                      style={{
                        background: "#58af9b",
                        color: "white",
                        border: "none",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        // Muda o cursor e a opacidade se o chat estiver desativado
                        cursor: p.allow_chat_requests === false ? "not-allowed" : "pointer",
                        opacity: p.allow_chat_requests === false ? 0.5 : 1
                      }}
                    >
                      Conversar
                    </button>
                  </Popup>
                </Marker>

              </React.Fragment>
            )
          })}
        </MapContainer>
      </div>     

    </div>
  )
}

export default MapPage