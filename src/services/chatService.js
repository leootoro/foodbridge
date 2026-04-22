import { supabase } from "../lib/supabase"

// 🔹 Buscar chats do usuário
export async function getUserChats(userId) {

  const { data: chats, error } = await supabase
    .from("chats")
    .select("*")
    .or(`user_1_id.eq.${userId},user_2_id.eq.${userId}`)

  if (error) throw error

  return chats
}


// 🔹 Buscar última mensagem de um chat
export async function getLastMessage(chatId) {

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error && error.code !== "PGRST116") throw error

  return data
}


// 🔹 Buscar nome do outro usuário
export async function getUserName(userId) {

  const { data, error } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", userId)
    .single()

  if (error) throw error

  return data?.name
}

// 🔹 pegar chat por id
export async function getChatById(chatId) {
  const { data, error } = await supabase
    .from("chats")
    .select("*")
    .eq("id", chatId)
    .maybeSingle()

  if (error) throw error
  return data
}

// 🔹 pegar mensagens
export async function getMessages(chatId) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true })
    .limit(20)

  if (error) throw error
  return data
}

// 🔹 enviar mensagem
export async function sendMessage(chatId, senderId, text) {
  const { error } = await supabase
    .from("messages")
    .insert({
      chat_id: chatId,
      sender_id: senderId,
      message_text: text
    })

  if (error) throw error
}

export async function getOrCreateChat(userId, otherUserId) {
  // Ordenamos os IDs para garantir consistência (o menor sempre será o user_1)
  const u1 = userId < otherUserId ? userId : otherUserId;
  const u2 = userId < otherUserId ? otherUserId : userId;

  // 1. 🔎 Tenta buscar a conversa existente
  const { data: existing } = await supabase
    .from("chats")
    .select("*")
    .eq("user_1_id", u1)
    .eq("user_2_id", u2)
    .maybeSingle();

  // Se a conversa já existe, mas um dos usuários a "deletou" (soft delete),
  // precisamos reativá-la (voltar deleted para false)
  if (existing) {
    const isUser1 = userId === u1;
    const deletedColumn = isUser1 ? "deleted_by_user_1" : "deleted_by_user_2";

    if (existing[deletedColumn]) {
      const { data: reactivated } = await supabase
        .from("chats")
        .update({ [deletedColumn]: false })
        .eq("id", existing.id)
        .select()
        .single();
      return reactivated;
    }
    return existing;
  }

  // 2. 🔥 Se não existe, tenta criar
  const { data, error } = await supabase
    .from("chats")
    .insert([
      {
        user_1_id: u1,
        user_2_id: u2,
        deleted_by_user_1: false, // Por padrão, começa visível
        deleted_by_user_2: false
      }
    ])
    .select()
    .maybeSingle();

  // 3. 💥 Tratamento de erro para Race Condition (dois usuários clicando ao mesmo tempo)
  if (error && (error.code === "23505" || error.message?.includes("duplicate"))) {
    const { data: retry } = await supabase
      .from("chats")
      .select("*")
      .eq("user_1_id", u1)
      .eq("user_2_id", u2)
      .maybeSingle();

    return retry;
  }

  if (error) {
    console.error("Erro ao criar chat:", error);
    throw error;
  }

  return data;
}

export async function DeleteChat(chatId, userId, chatData) {
  try {
    // 1. Identifica qual coluna atualizar baseado em quem está logado
    const isUser1 = chatData.user_1_id === userId;
    const updateData = isUser1 ? { deleted_by_user_1: true } : { deleted_by_user_2: true };

    const { data, error } = await supabase
      .from("chats")
      .update(updateData)
      .eq("id", chatId)
      .select()
      .single();

    if (error) throw error;

    // 2. Opcional: Se AMBOS deletaram, aí sim removemos do banco permanentemente
    if (data.deleted_by_user_1 && data.deleted_by_user_2) {
      await supabase.from("chats").delete().eq("id", chatId);
    }

    return true;
  } catch (err) {
    console.error("Erro ao ocultar chat:", err);
    throw err;
  }
}