import { supabase } from "../lib/supabase"

export async function getBlockedIds(currentUserId) {
  try {
    // 1. Buscar quem EU bloqueei
    const { data: myBlocks } = await supabase
      .from("blocked_users")
      .select("blocked_user_id")
      .eq("user_id", currentUserId);
  
    // 2. Buscar quem ME bloqueou
    const { data: blockedByOthers } = await supabase
      .from("blocked_users")
      .select("user_id")
      .eq("blocked_user_id", currentUserId);

    // Unificar todos os IDs em um único array
    const idsIBlocked = myBlocks?.map(b => b.blocked_user_id) || [];
    const idsWhoBlockedMe = blockedByOthers?.map(b => b.user_id) || [];

    // Retorna um array sem duplicatas
    return [...new Set([...idsIBlocked, ...idsWhoBlockedMe])];
  } catch (error) {
    console.error("Erro ao buscar bloqueios:", error);
    return [];
  }
}

/**
 * Função para bloquear um usuário
 */
export async function blockUser(myId, targetId) {
  const { error } = await supabase
    .from("blocked_users")
    .insert([{ user_id: myId, blocked_user_id: targetId }]);
  return !error;
}

// Nova função para remover bloqueio
export async function unblockUser(myId, targetId) {
  const { error } = await supabase
    .from("blocked_users")
    .delete()
    .match({ user_id: myId, blocked_user_id: targetId });
  return !error;
}

// Função para buscar lista de bloqueados com nomes
export async function getBlockedUsers_with_name(myId) {
  const { data, error } = await supabase
    .from("blocked_users")
    .select(`
      blocked_user_id,
      profiles:blocked_user_id ( name )
    `)
    .eq("user_id", myId);
  
  if (error) return [];
  return data;
}