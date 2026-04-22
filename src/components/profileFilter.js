export function filterProfiles({
  profiles,
  myProfile,
  filters,
  selectedItems = [],
  selectedItemsToDonate = [],
  blockedIds = [],
  categoryMapping
}) {
  return profiles.filter(p => {

    // ❌ você mesmo
    if (p.id === myProfile.id) return false;

    // ❌ bloqueados
    if (blockedIds.includes(p.id)) return false;

    // ❌ privacidade
    if (p.show_only_to_opposite && p.is_donor === myProfile.is_donor) {
      return false;
    }

    // ❌ mapa (novo)
    if (!p.show_on_map) return false;

    // 🔥 tipo
    if (filters.type === "donor" && !p.is_donor) return false;
    if (filters.type === "receiver" && p.is_donor) return false;

    // 📍 localização
    if (filters.city && !p.city?.toLowerCase().includes(filters.city.toLowerCase())) return false;
    if (filters.state && !p.state?.toLowerCase().includes(filters.state.toLowerCase())) return false;
    if (filters.neighborhood && !p.neighborhood?.toLowerCase().includes(filters.neighborhood.toLowerCase())) return false;

    // 🐶 doação
    if (filters.accept_donation !== null && p.accept_donation !== filters.accept_donation) return false;
    if (filters.pet_donation !== null && p.pet_donation !== filters.pet_donation) return false;

    // 🟢 DOADOR → filtro por restrição
    if (myProfile?.is_donor === true) {
      if (selectedItemsToDonate.length > 0 && !selectedItemsToDonate.includes("todos")) {
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

    if (myProfile?.is_donor === false) {

      // 🛑 Se "todos", não filtra
      if (selectedItems.includes("todos") || selectedItems.length === 0) {
        return true;
      }

      const profileFoodNames = p.food_available?.map(f => f.item.toLowerCase()) || [];

      console.log("TESTEEEEE", {
        profile: p.name,
        foods: profileFoodNames,
        selectedItems
      });
      
      const hasMatch = selectedItems.some(selected => {
        const selectedLower = selected.toLowerCase();

        // 🔥 categoria (ex: "congelados")
        if (categoryMapping[selectedLower]) {
          const itemsInCategory = categoryMapping[selectedLower];
          return profileFoodNames.some(food => itemsInCategory.includes(food));
        }

        // 🔥 item direto
        return profileFoodNames.includes(selectedLower);
      });

      if (!hasMatch) return false;
    }
    return true;
  });
}