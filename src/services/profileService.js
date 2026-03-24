import { supabase } from "../lib/supabase";
import { getLatLng } from "./geocode"

export async function get_Profile(userId) {

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function updateProfile(userId, profileData) {

  const {data, error } = await supabase
    .from("profiles")
    .update(profileData)
    .eq("id", userId)

  if (error) {
    if (error.message.includes("duplicate key")) {
      throw new Error("Esse nome já está em uso")
    }
    throw error
  }
  return data;
}


export async function updateDonationSettings(userId, settings) {

  const { data, error } = await supabase
    .from("profiles")
    .update(settings)
    .eq("id", userId);

  if (error) throw error;

  return data;
}

export async function save_lat_and_long(userId, profile) {

  const addressParts = [
    profile.address,
    profile.address_number,
    profile.neighborhood,
    profile.city,
    profile.state
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