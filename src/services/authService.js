import {supabase} from "../lib/supabase";

//Login com Google
export async function loginComGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'http://localhost:5173/profile' // URL do seu site
    }
  });

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

// cadastro
export async function signup(email, password, name) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    });

    if (error) throw error;

    return { success: true, user: data.user };

  } catch (error) {
    return { success: false, error: error.message };
  }
}


// login
export async function login(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    return { success: true, user: data.user };

  } catch (error) {
    return { success: false, error: error.message };
  }
}


// usuário atual
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}


// logout (recomendado adicionar)
export async function logout() {
  await supabase.auth.signOut();
}