import { supabase } from "../lib/supabase";


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
