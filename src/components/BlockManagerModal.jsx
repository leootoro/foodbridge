import { useState, useEffect } from "react";
import { blockUser, unblockUser, getBlockedUsers_with_name } from "../services/blockService";
import { supabase } from "../lib/supabase";

export default function BlockManagerModal({ myId, currentBlocked, onUpdate, onClose }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  
  // Garantimos que trabalhamos com a lista que veio da ConfigPage
  const tempList = currentBlocked || [];

  async function handleSearch(e) {
    const term = e.target.value;
    setSearchTerm(term);
    if (term.length > 2) {
      const { data } = await supabase
        .from("profiles")
        .select("id, name")
        .ilike("name", `%${term}%`)
        .limit(5);
      setSearchResults(data || []);
    }
  }

  const addBlock = (user) => {
    // Verifica se já não está na lista para não duplicar
    if (!tempList.some(item => (item.blocked_user_id || item) === user.id)) {
      const newList = [...tempList, { blocked_user_id: user.id, profiles: { name: user.name } }];
      onUpdate(newList); // Atualiza o estado na ConfigPage
    }
  };

  const removeBlock = (id) => {
    const newList = tempList.filter(item => (item.blocked_user_id || item) !== id);
    onUpdate(newList); // Atualiza o estado na ConfigPage
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ padding: '20px', minHeight: '400px' }}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h3>Gerenciar Bloqueios</h3>
        <p style={{ fontSize: '12px', color: '#666' }}>*Alterações pendentes até você salvar a página.</p>
        
        <div className="search-box" style={{ width: '100%', marginBottom: '20px' }}>
          <input 
            type="text" 
            placeholder="Buscar nome..." 
            value={searchTerm}
            onChange={handleSearch}
            style={{ width: '85%', padding: '8px' }}
          />
          
          {searchResults.map(user => (
            <div key={user.id} className="food-item-row">
              <span>{user.name}</span>
              <button className="food-badge" onClick={() => addBlock(user)}>+</button>
            </div>
          ))}
        </div>

        <div className="blocked-list" style={{ width: '100%' }}>
          <h4>Usuários na lista:</h4>
          {tempList.map(item => (
            <div key={item.blocked_user_id || item} className="food-item-row">
              <button 
                style={{ border: 'none', background: 'none', color: 'red', cursor: 'pointer' }} 
                onClick={() => removeBlock(item.blocked_user_id || item)}
              >
                ✕
              </button>
              <span>{item.profiles?.name || "Usuário selecionado"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}