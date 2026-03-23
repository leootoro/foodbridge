import { supabase } from "../lib/supabase";
import { getLatLng } from "../services/geocode"

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

  const { data, error } = await supabase
    .from("profiles")
    .update(profileData)
    .eq("id", userId);

  if (error) throw error;

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

  const address = `${profile.neighborhood}, ${profile.city}, ${profile.state}, ${profile.address}, ${profile.address_number}, ${profile.address_complement}`

  const coords = await getLatLng(address)
  if (!coords) {
    console.log("Endereço não encontrado")
    return
  }
  await supabase
    .from("profiles")
    .update({
      lat: coords?.lat,
      lng: coords?.lng
    })
    .eq("id", userId)
}