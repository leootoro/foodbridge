import React, { useEffect, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { FiSearch } from "react-icons/fi"
import { FaStar } from "react-icons/fa" // Import para a estrela
import "../css/SearchPage.css"
import { supabase } from "../lib/supabase"
import { getCurrentUser } from "../services/authService"
import { getBlockedIds } from "../services/blockService" 
import BackButton from "../components/BackButton"
import defaultAvatar from "/default_user.png"
import { categoryMapping } from '../lib/itemCategories';
import ItemFilter from "../components/itemFilter"

function SearchPage() {
  const navigate = useNavigate()
  
  const [myProfile, setMyProfile] = useState(null)
  const [blockedIds, setBlockedIds] = useState([])
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [itemSearch, setItemSearch] = useState("")
  const [selectedItems, setSelectedItems] = useState(["todos"])
  const [selectedItemsToDonate, setSelectedItemsToDonate] = useState([]);
  const [useMyItems, setUseMyItems] = useState(false);
  const [itemSearchDonate, setItemSearchDonate] = useState("");
  
  
  const [filters, setFilters] = useState({
    type: "all",
    city: "",
    state: "",
    neighborhood: "",
    accept_donation: null,
    pet_donation: null,
    minRating: 0 // Novo filtro
  })
  
  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true)
        const currentUser = await getCurrentUser()
        if (!currentUser) { navigate("/"); return; }

        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .single()

        setMyProfile(profile)
        const blocks = await getBlockedIds(currentUser.id)
        setBlockedIds(blocks)
      } catch (err) {
        console.error("Erro no carregamento inicial:", err)
      } finally {
        setLoading(false)
      }
    }
    loadInitialData()
  }, [navigate])

  useEffect(() => {
    setSelectedItems(["todos"]);
    setSelectedItemsToDonate([]);
  }, [filters.type]);

  const loadData = useCallback(async () => {
    if (!myProfile) return;

    try {
      let query = supabase.from("profiles").select("*");

      // Filtros básicos
      if (filters.type === "donor") query = query.eq("is_donor", true);
      if (filters.type === "receiver") query = query.eq("is_donor", false);
      if (filters.city) query = query.ilike("city", `%${filters.city}%`);
      if (filters.state) query = query.ilike("state", `%${filters.state}%`);
      if (filters.neighborhood) query = query.ilike("neighborhood", `%${filters.neighborhood}%`);
      if (filters.accept_donation !== null) query = query.eq("accept_donation", filters.accept_donation);
      if (filters.pet_donation !== null) query = query.eq("pet_donation", filters.pet_donation);
      if (searchTerm.trim()) query = query.ilike("name", `%${searchTerm.trim()}%`);

      const { data: profilesData, error: profilesError } = await query;
      if (profilesError) throw profilesError;

      // 2. BUSCA AS NOTAS (Com tratamento de erro para evitar o 404)
      const { data: allRatings, error: ratingsError } = await supabase.from("rating").select("reviewed_id, rating_number");
      
      if (ratingsError) {
        console.warn("Tabela de ratings não encontrada ou inacessível. Usando nota padrão.");
      }

      // 3. PROCESSAMENTO FINAL
      const ratingsMap = {};

        allRatings?.forEach(r => {
          if (!ratingsMap[r.reviewed_id]) {
            ratingsMap[r.reviewed_id] = [];
          }
          ratingsMap[r.reviewed_id].push(r.rating_number);
        });
      const finalProfiles = profilesData
        .map(p => {
          const userRatings = ratingsMap[p.id] || [];
          const count = userRatings.length;
          
          let avg = 5.0; // Padrão para novos
          if (count >= 3) {
            const sum = userRatings.reduce((acc, curr) => acc + curr.rating_number, 0);
            avg = parseFloat((sum / count).toFixed(1));
          }

          return { ...p, avgRating: avg, ratingCount: count };
        })
        .filter(p => {
          // --- Trava de Privacidade e Bloqueio ---
          if (p.id === myProfile.id) return false;
          if (blockedIds.includes(p.id)) return false;
          if (p.show_only_to_opposite && p.is_donor === myProfile.is_donor) return false;
          
          // 🟢 filtro para DOADOR (instituições)
          if (myProfile?.is_donor === true) {
            if (!selectedItemsToDonate.includes("todos") && selectedItemsToDonate.length > 0) {
              
              const restrictions = (p.food_restrictions || "")
                .toLowerCase()
                .split(",")
                .map(i => i.trim());

             const blocked = selectedItemsToDonate.some(selected =>
              restrictions.includes(selected.toLowerCase())
            );
              if (blocked) return false;
            }
          }
          // --- Filtro de Nota ---
          if (p.avgRating < filters.minRating) return false;

          // --- FILTRO DE ALIMENTOS (Agora dentro do filter corretamente) ---
          // 🔵 MODO RECEBEDOR
          if (myProfile?.is_donor === false) {
            if (selectedItems.includes("todos") || selectedItems.length === 0) return true;

            const profileFoodNames = p.food_available?.map(f => f.item.toLowerCase()) || [];

            return selectedItems.every(selected => {
              const selectedLower = selected.toLowerCase();

              if (selectedLower === "hortifruti" || selectedLower === "congelados") {
                const itemsInCategory = categoryMapping[selectedLower] || [];
                return profileFoodNames.some(food => itemsInCategory.includes(food));
              }

              return profileFoodNames.includes(selectedLower);
            });
          }

          // 🟢 MODO DOADOR → NÃO usa esse filtro
          return true;
        });

      setProfiles(finalProfiles);
    } catch (err) {
      console.error("Erro na busca:", err);
    }
  }, [
    myProfile,
    filters,
    searchTerm,
    blockedIds,
    loading,
    selectedItems,
    selectedItemsToDonate
  ]);

  useEffect(() => {
    const getData = setTimeout(() => loadData(), 300) 
    return () => clearTimeout(getData) 
  }, [loadData, filters, searchTerm, selectedItems, selectedItemsToDonate])

  if (loading && !myProfile) return <div className="loading">Carregando...</div>

  return (
    <div className="search-page-container">
      <div className="search-header">
        <BackButton to="/profile" />
        <div className="search-bar-wrapper">
          <FiSearch className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Buscar por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="search-content">
        <div className="search-filters-panel">
          <h3>Filtros Avançados</h3>
        
          <label>Tipo de Perfil</label>
          <select value={filters.type} onChange={(e) => setFilters(f => ({ ...f, type: e.target.value }))}>
            <option value="all">Todos</option>
            <option value="donor">Doadores</option>
            <option value="receiver">Recebedores</option>
          </select>

          <label>Cidade</label>
          <input type="text" value={filters.city} onChange={(e) => setFilters(f => ({ ...f, city: e.target.value }))} placeholder="Ex: São Paulo" />
          <label>Estado (UF)</label>
          <input type="text" maxLength="2" value={filters.state} onChange={(e) => setFilters(f => ({ ...f, state: e.target.value.toUpperCase() }))} placeholder="Ex: SP" />
          <label>Bairro</label>
          <input type="text" value={filters.neighborhood} onChange={(e) => setFilters(f => ({ ...f, neighborhood: e.target.value }))} placeholder="Ex: Centro" />
          
          {myProfile?.is_donor && (
            <>
              <label>Aceita Doação?</label>
              <select onChange={(e) => setFilters(f => ({ ...f, accept_donation: e.target.value === "" ? null : e.target.value === "true" }))}>
                <option value="">Todos</option>
                <option value="true">Sim</option>
                <option value="false">Não</option>
              </select>
              <label>Doação para Pets?</label>
              <select onChange={(e) => setFilters(f => ({ ...f, pet_donation: e.target.value === "" ? null : e.target.value === "true" }))}>
                <option value="">Todos</option>
                <option value="true">Sim</option>
                <option value="false">Não</option>
              </select>
            </>
          )}

          {/* FILTRO DE NOTA MÍNIMA */}
          <label>Avaliação Mínima</label>
          <select 
            value={filters.minRating} 
            onChange={(e) => setFilters(f => ({ ...f, minRating: Number(e.target.value) }))}
          >
            <option value="0">Todas as notas</option>
            <option value="3">3.0+ Estrelas</option>
            <option value="4">4.0+ Estrelas</option>
            <option value="4.5">4.5+ Estrelas</option>
          </select>

          {/* FILTRO DE ITENS */}
          {myProfile?.is_donor === false && (
            <ItemFilter
              type="receive"
              selectedItems={selectedItems}
              setSelectedItems={setSelectedItems}
              itemSearch={itemSearch}
              setItemSearch={setItemSearch}
            />
          )}

          {myProfile?.is_donor === true && (
            <ItemFilter
              type="donate"
              selectedItems={selectedItemsToDonate}
              setSelectedItems={setSelectedItemsToDonate}
              itemSearch={itemSearchDonate}
              setItemSearch={setItemSearchDonate}
              myProfile={myProfile}
              useMyItems={useMyItems}
              setUseMyItems={setUseMyItems}
            />
          )}
          <button onClick={loadData} className="filter-apply-btn">Refinar Busca</button>
        </div>

        <div className="search-results-area">
          {profiles.length === 0 ? (
            <div className="no-results">Nenhum resultado encontrado.</div>
          ) : (
            <div className="results-grid">
              {profiles.map(p => (
                <div key={p.id} className="profile-card" onClick={() => navigate(`/profile/${p.id}`)}>
                  <img src={p.avatar_url || defaultAvatar} alt={p.name} className="card-avatar" />
                  <div className="card-info">
                    <h4>{p.name}</h4>
                    
                    {/* EXIBIÇÃO DA MÉDIA */}
                    <div className="profile-card-rating">
                      <FaStar className="star-icon" />
                      <span>{p.avgRating > 0 ? p.avgRating : "Novo"}</span>
                    </div>

                    <span className={`badge ${p.is_donor ? "donor" : "receiver"}`}>
                      {p.is_donor ? "Doador" : "Recebedor"}
                    </span>
                    <p className="card-location">{p.neighborhood}, {p.city}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SearchPage