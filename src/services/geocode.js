import {supabase} from "../lib/supabase";

export async function getLatLng(address) {

  const apiKey = "5035fd3fb89548b7be2871773e180925"

  const response = await fetch(
    `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(address)}&key=${apiKey}`
  )

  const data = await response.json()

  if (data.results.length === 0) return null

  const { lat, lng } = data.results[0].geometry
  console.log("📍 Buscando endereço:", address)
  console.log("📍 Resultado API:", data)
  return { lat, lng }
}

export async function save_lat_and_long(userId, profile) {

  const addressParts = [
    profile.address,
    profile.address_number,
    profile.neighborhood,
    profile.city,
    profile.state,
    'Brazil'
  ]
  const fullAddress = addressParts
    .filter(Boolean)
    .join(", ")

  const coords = await getLatLng(fullAddress)
  if (!coords) {
    return
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      lat: coords.lat,
      lng: coords.lng
    })
    .eq("id", userId)

  if (error) {
    console.error("❌ Erro ao salvar lat/lng:", error)
  } else {
    console.log("✅ Coordenadas salvas com sucesso!")
  }
}
