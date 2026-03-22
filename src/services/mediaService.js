import { useNavigate } from "react-router-dom"
import { useRef } from "react"
import { supabase } from "../lib/supabase"
 
export async function getUserPosts(userId) {

  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data;
}

export async function createPost(post) {

  const { data, error } = await supabase
    .from("posts")
    .insert([post])
    .single()

  if (error) throw error;

  return data;
}


export async function uploadPost(file, user_id) {

  const filePath = `posts/${user_id}/${Date.now()}_${file.name}`;

  const { error } = await supabase.storage
    .from("media")
    .upload(filePath, file);

  if (error) {
    navigate("/profile")
    console.error(error);
    return null;
  }

  return filePath;

}

export function getMediaUrl(path) {

  const { data } = supabase
    .storage
    .from("media")
    .getPublicUrl(path);

  return data.publicUrl;
}

export async function upload_profile_photo(file, user_id) {

  const filePath = `profile_photo/${user_id}/${Date.now()}_${file.name}`;

  const { error } = await supabase.storage
    .from("Profile_photos")
    .upload(filePath, file);

  if (error) {
    console.error(error);
    return null;
  }

  return filePath;

}

export function get_profile_photo_Url(path) {

  if (!path){
    return
  }
  const { data } = supabase
    .storage
    .from("Profile_photos")
    .getPublicUrl(path);

  return data.publicUrl;
}