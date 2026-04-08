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
export async function signup(email, password, name, userType) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        userType: {userType}
      }
    });

    if (error) {
      // Verifica se o erro do Supabase é de duplicidade (geralmente contém a palavra 'unique')
      if (error.message.includes('unique constraint') || error.message.includes('already exists')) {
        throw new Error('Este nome de usuário já está sendo utilizado. Por favor, escolha outro.');
      }
      throw error;
    }
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

export async function checkNameExists(name) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('name')
      .ilike('name', name)
      .maybeSingle(); // Retorna null se não achar nada em vez de dar erro

    if (error) throw error;
    
    // Se data não for nulo, significa que o nome já existe
    return data !== null; 
    
  } catch (error) {
    console.error("Erro ao verificar nome:", error.message);
    return false;
  }
}