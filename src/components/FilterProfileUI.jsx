import ItemFilter from "./itemFilter";

function ProfileFilters({
  className = "",
  onClose,
  filters,
  setFilters,
  myProfile,
  selectedItems,
  setSelectedItems,
  selectedItemsToDonate,
  setSelectedItemsToDonate,
  itemSearch,
  setItemSearch,
  itemSearchDonate,
  setItemSearchDonate,
  useMyItems,
  setUseMyItems,
  onApply 
}) {
  return (
    <div className={`search-filters-panel ${className}`}>
      <h3>Filtros Avançados</h3>
      <button
          className="close-filters-btn"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
        ✕
      </button>
      {/* Tipo */}
      <label>Tipo de Perfil</label>
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

      {/* Modalidade */}
      <label>Modalidade</label>
      <select
        value={filters.addressType}
        onChange={(e) =>
          setFilters(f => ({ ...f, addressType: e.target.value }))
        }
      >
        <option value="all">Todos</option>
        <option value="online">Online</option>
        <option value="physical">Físico</option>
      </select>

      {/* Localização */}
      <label>Cidade</label>
      <input
        placeholder="Ex: São Paulo"
        value={filters.city}
        onChange={(e) =>
          setFilters(f => ({ ...f, city: e.target.value }))
        }
      />

      <label>Estado</label>
      <input
        placeholder="Ex: SP"
        value={filters.state}
        onChange={(e) =>
          setFilters(f => ({ ...f, state: e.target.value }))
        }
      />

      {filters.addressType !== "online" && (
        <>
          <label>Bairro</label>
          <input
             placeholder="Ex: Centro"
            value={filters.neighborhood}
            onChange={(e) =>
              setFilters(f => ({ ...f, neighborhood: e.target.value }))
            }
          />
        </>
      )}

      {/* RECEBEDOR */}
      {myProfile?.is_donor && (
        <>
          <label>Aceita Doação</label>
          <select
            onChange={(e) =>
              setFilters(f => ({
                ...f,
                accept_donation:
                  e.target.value === "" ? null : e.target.value === "true"
              }))
            }
          >
            <option value="">Todos</option>
            <option value="true">Sim</option>
            <option value="false">Não</option>
          </select>

          <label>Pets</label>
          <select
            onChange={(e) =>
              setFilters(f => ({
                ...f,
                pet_donation:
                  e.target.value === "" ? null : e.target.value === "true"
              }))
            }
          >
            <option value="">Todos</option>
            <option value="true">Sim</option>
            <option value="false">Não</option>
          </select>
        </>
      )}

      {/* DOADOR */}
      {!myProfile?.is_donor && (
        <>
          <label>Disponibilidade</label>
          <select
            onChange={(e) =>
              setFilters(f => ({
                ...f,
                immediate_availability:
                  e.target.value === "" ? null : e.target.value === "true"
              }))
            }
          >
            <option value="">Todos</option>
            <option value="true">Sim</option>
            <option value="false">Não</option>
          </select>

          <label>Retirada</label>
          <select
            onChange={(e) =>
              setFilters(f => ({
                ...f,
                local_pickup:
                  e.target.value === "" ? null : e.target.value === "true"
              }))
            }
          >
            <option value="">Todos</option>
            <option value="true">Sim</option>
            <option value="false">Não</option>
          </select>
        </>
      )}

      {/* NOTA */}
      <label>Avaliação mínima</label>
      <select
        value={filters.minRating}
        onChange={(e) =>
          setFilters(f => ({
            ...f,
            minRating: Number(e.target.value)
          }))
        }
      >
        <option value="0">Todas</option>
        <option value="3">3+</option>
        <option value="4">4+</option>
        <option value="4.5">4.5+</option>
      </select>

      {/* ITENS */}
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
          setItemSearchDonate={setItemSearchDonate}
          myProfile={myProfile}
          useMyItems={useMyItems}
          setUseMyItems={setUseMyItems}
        />
      )}

      {onApply && (
        <button
          onClick={() => {
            onApply && onApply();
            onClose && onClose();
          }}
        >
          Aplicar filtros
        </button>
      )}
    </div>
  );
}

export default ProfileFilters;