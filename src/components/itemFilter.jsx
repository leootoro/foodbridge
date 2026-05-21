import { FiInfo } from "react-icons/fi";
import { expandedMarketItems, categoryMapping } from "../lib/itemCategories";
import "../css/SearchPage.css"

function ItemFilter({
  type,
  selectedItems,
  setSelectedItems,
  itemSearch,
  setItemSearch,
  myProfile,
  useMyItems,
  setUseMyItems
}) {

  const marketItems = expandedMarketItems;

  // TOGGLE UNIFICADO
  const handleToggle = (item) => {
    if (item === "todos") {
      setSelectedItems(selectedItems.includes("todos") ? [] : ["todos"]);
      return;
    }

    let newSelection = selectedItems.filter(i => i !== "todos");
    const isSelected = newSelection.includes(item);

    // MODO DOADOR (COM CATEGORIA)
    if (type === "donate" && categoryMapping[item]) {
      const categoryItems = categoryMapping[item];

      if (isSelected) {
        newSelection = newSelection.filter(
          i => i !== item && !categoryItems.includes(i)
        );
      } else {
        newSelection.push(item);
        categoryItems.forEach(i => {
          if (!newSelection.includes(i)) newSelection.push(i);
        });
      }
    } else {
      // 🔵 MODO NORMAL
      if (isSelected) {
        newSelection = newSelection.filter(i => i !== item);
      } else {
        newSelection.push(item);
      }
    }

    setSelectedItems(newSelection);
  };

  //  FILTRO DE BUSCA
  const filteredItems = marketItems.filter(item =>
    item.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const handleUseMyItems = (checked) => {
    setUseMyItems(checked);

    if (checked && myProfile?.food_available) {
      const mappedItems = new Set();

      myProfile.food_available.forEach(f => {
        const item = f.item.toLowerCase();

        if (categoryMapping[item]) {
          mappedItems.add(item);
          categoryMapping[item].forEach(i => mappedItems.add(i));
        } else {
          mappedItems.add(item);
        }
      });

      setSelectedItems(Array.from(mappedItems));

    } else {
      setSelectedItems([]);
    }
  };
  return (
    <div className="items-filter-section">
      <label>
        {type === "receive"
          ? "Itens a receber (filtro por doador)"
          : "Itens a doar (filtro por Instituição Arrecadadora)"}
      </label>

      <div className="item-inner-search">
        <input
          type="text"
          placeholder="Procurar item..."
          value={itemSearch}
          onChange={(e) => setItemSearch(e.target.value)}
        />
      </div>

      {/* DOADOR */}
      {type === "donate" && (
        <div className="use-my-items">
          <input
            type="checkbox"
            checked={useMyItems}
            onChange={(e) => handleUseMyItems(e.target.checked)}
          />
          <span>Usar meus itens no filtro</span>
        </div>
      )}

      <div className="items-scroll-container">
        <div className={`item-row ${selectedItems.includes("todos") ? "selected" : ""}`}>
  
          <div
            className="item-main-clickable"
            onClick={() => handleToggle("todos")}
          >
            <input
              type="checkbox"
              checked={selectedItems.includes("todos")}
              readOnly
            />
            <span>Todos</span>
          </div>

        </div>

        {filteredItems.map(item => (
          <div key={item} className="item-wrapper-group">
            <div className={`item-row ${selectedItems.includes(item) ? "selected" : ""}`}>
              
              <div
                className="item-main-clickable"
                onClick={() => handleToggle(item)}
              >
                <input type="checkbox" checked={selectedItems.includes(item)} readOnly />
                <span>{item}</span>
              </div>

              {(item === "congelados" || item === "hortifruti") && (
                <div className="info-icon-trigger">
                  <FiInfo />
                  <div className="inline-description">
                    {item === "congelados"
                      ? "Hambúrguer, nuggets, batata frita..."
                      : "Alface, tomate, cenoura..."}
                  </div>
                </div>
              )}

            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ItemFilter;