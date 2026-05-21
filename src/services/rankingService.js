import { supabase } from "../lib/supabase";

export const getDonorRanking = async () => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, photo_url, points")
    .eq("is_donor", true)
    .order("points", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return data;
};