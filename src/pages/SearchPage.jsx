import React, { useEffect, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { FiSearch, FiInfo } from "react-icons/fi"
import { FaStar } from "react-icons/fa" // Import para a estrela
import "../css/SearchPage.css"
import { supabase } from "../lib/supabase"
import { getCurrentUser } from "../services/authService"
import { getBlockedIds } from "../services/blockService" 
import BackButton from "../components/BackButton"
import defaultAvatar from "/default_user.png"
import { expandedMarketItems } from '../lib/itemCategories';
import { categoryMapping } from '../lib/itemCategories';

// 1. CORREÇÃO: Movido para fora para evitar erro de inicialização
const marketItems = [
  "arroz", "feijão", "macarrão", "leite", "óleo", "açúcar", "café", "sal", "farinha de trigo", 
  "farinha de milho", "farinha de mandioca", "molho de tomate", "vinagre", 
  "azeite de oliva", "milho de pipoca", "maionese", "ketchup", "mostarda", "achocolatado", 
  "chá", "aveia", "cereal matinal", "geleia", "mel", "fermento",
  "pão de forma", "pão francês", "bisnaguinha", "bolacha","biscoito", "torrada", "bolo",
  "carnes em geral", "queijo", "presunto", "peito de peru", 
  "manteiga", "margarina", "iogurte", "requeijão", "creme de leite", "leite condensado", 
  "salame", "frutas", "hortifruti", "congelados", "água mineral", "suco de caixa", 
  "suco concentrado", "refrigerante", "água tônica", "cerveja", "vinho", "aguardente",
  "papel higiênico", "sabonete", "shampoo", "condicionador", "creme dental", "fio dental", 
  "desodorante", "escova de dentes", "absorvente", "espuma de barbear", "lâmina de barbear", 
  "algodão", "hastes flexíveis", "detergente", "sabão em pó", "sabão líquido", "amaciante", 
  "desinfetante", "água sanitária", "limpador multiuso", "álcool em gel"
];

function SearchPage() {
  const navigate = useNavigate()
  
  const [myProfile, setMyProfile] = useState(null)
  const [blockedIds, setBlockedIds] = useState([])
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [itemSearch, setItemSearch] = useState("")
  const [selectedItems, setSelectedItems] = useState(["todos"])
  
  const [filters, setFilters] = useState({
    type: "all",
    city: "",
    state: "",
    neighborhood: "",
    accept_donation: null,
    pet_donation: null,
    minRating: 0 // Novo filtro
  })

  // Lógica de seleção de itens (Checkboxes)
  const handleItemToggle = (item) => {
    if (item === "todos") {
      setSelectedItems(selectedItems.includes("todos") ? [] : ["todos"]);
      return;
    }
    let newSelection = selectedItems.filter(i => i !== "todos");
    if (newSelection.includes(item)) {
      newSelection = newSelection.filter(i => i !== item);
    } else {
      newSelection.push(item);
    }
    setSelectedItems(newSelection);
  };

  const filteredMarketItems = marketItems.filter(item => 
    item.toLowerCase().includes(itemSearch.toLowerCase())
  );

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

  const loadData = useCallback(async () => {
    if (!myProfile || loading) return

    try {
      let query = supabase.from("profiles").select("*")

      // Filtros básicos
      if (filters.type === "donor") query = query.eq("is_donor", true)
      if (filters.type === "receiver") query = query.eq("is_donor", false)
      if (filters.city) query = query.ilike("city", `%${filters.city}%`)
      if (filters.state) query = query.ilike("state", `%${filters.state}%`)
      if (filters.neighborhood) query = query.ilike("neighborhood", `%${filters.neighborhood}%`)
      if (filters.accept_donation !== null) query = query.eq("accept_donation", filters.accept_donation)
      if (filters.pet_donation !== null) query = query.eq("pet_donation", filters.pet_donation)
      if (searchTerm.trim()) query = query.ilike("name", `%${searchTerm.trim()}%`)

      const { data: profilesData, error } = await query
      if (error) throw error

      // 2. BUSCA AS NOTAS PARA CALCULAR MÉDIA
      const { data: allRatings } = await supabase.from("ratings").select("reviewed_id, rating_number")

      // 3. PROCESSAMENTO FINAL (Privacidade + Bloqueio + Nota Mínima)
      const finalProfiles = profilesData
        .map(p => {
            const userRatings = allRatings?.filter(r => r.reviewed_id === p.id) || [];
            const count = userRatings.length;
            
            let avg;
            if (count < 3) {
            // Regra de negócio: Menos de 3 avaliações = 5 estrelas
            avg = 5.0;
            } else {
            // Média real para 3 ou mais avaliações
            const sum = userRatings.reduce((acc, curr) => acc + curr.rating_number, 0);
            avg = parseFloat((sum / count).toFixed(1));
            }

            return { 
            ...p, 
            avgRating: avg,
            ratingCount: count // Guardamos a contagem caso queira exibir "5.0 (Novo)"
            };
        })
        .filter(p => {
            if (p.id === myProfile.id) return false;
            if (blockedIds.includes(p.id)) return false;
            if (p.show_only_to_opposite && p.is_donor === myProfile.is_donor) return false;
            
            // O filtro de nota mínima agora respeita a regra (novos sempre passam em filtros < 5)
            return p.avgRating >= filters.minRating;
        });

      setProfiles(finalProfiles)
    } catch (err) {
      console.error("Erro na busca:", err)
    }
  }, [myProfile, filters, searchTerm, blockedIds, loading])

  useEffect(() => {
    const getData = setTimeout(() => loadData(), 300) 
    return () => clearTimeout(getData) 
  }, [loadData, filters, searchTerm])

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
            <div className="items-filter-section">
              <label>Itens Necessários</label>
              <div className="item-inner-search">
                <input 
                  type="text" 
                  placeholder="Procurar item..." 
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                />
              </div>

              <div className="items-scroll-container">
                <div 
                  className={`item-row ${selectedItems.includes("todos") ? "selected" : ""}`}
                  onClick={() => handleItemToggle("todos")}
                >
                  <input type="checkbox" checked={selectedItems.includes("todos")} readOnly />
                  <span>Todos</span>
                </div>
                {filteredMarketItems.map(item => (
                  <div key={item} className="item-wrapper-group"> 
                    <div className={`item-row ${selectedItems.includes(item) ? "selected" : ""}`}>
                      <div className="item-main-clickable" onClick={() => handleItemToggle(item)}>
                        <input type="checkbox" checked={selectedItems.includes(item)} readOnly />
                        <span>{item}</span>
                      </div>
                      {(item === "congelados" || item === "hortifruti") && (
                        <div className="info-icon-trigger">
                          <FiInfo />
                          <div className="inline-description">
                            {item === "congelados" 
                              ? "Hambúrguer, nuggets, batata frita, pizza, lasanha, sorvete..." 
                              : "Alface, tomate, batata, cebola, alho, cenoura..."}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}             
              </div>
            </div>
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