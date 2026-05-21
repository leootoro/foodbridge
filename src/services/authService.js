import {supabase} from "../lib/supabase";

export async function loginComGoogle() {

  const redirectUrl = `${window.location.origin}/profile`;
  await supabase.auth.signOut();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      queryParams: {
        prompt: 'consent select_account'
      },
      redirectTo: redirectUrl
    }
  });

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function signup(email, password, name, userType) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { 
          name,
          userType
        }
      }
    });

    if (error) {
      if (
        error.message.includes('unique constraint') ||
        error.message.includes('already exists') ||
        error.message.includes('already registered')
      ) {
        return { success: false, error: 'Este nome de usuário já está sendo utilizado.' };
      }

      return { success: false, error: error.message };
    }

    return {
      success: true,
      user: data.user,
      session: data.session
    };

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

    if (error) {
      if (error.message === "Invalid login credentials") {
        return { success: false, error: "Email ou senha incorretos" };
      }

      return { success: false, error: "Erro ao fazer login" };
    }

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

export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'http://localhost:5173/update-password' // página pra redefinir senha
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}