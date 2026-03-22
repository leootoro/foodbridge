import { supabase } from "../lib/supabase"

// 🔹 Buscar chats do usuário
export async function getUserChats(userId) {

  const { data: chats, error } = await supabase
    .from("chats")
    .select("*")
    .or(`donor_id.eq.${userId},institution_id.eq.${userId}`)

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
    .single()

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
    .single()

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

  // 🔍 procurar chat existente
  const { data: existing, error } = await supabase
    .from("chats")
    .select("*")
    .or(
      `and(donor_id.eq.${userId},institution_id.eq.${otherUserId}),and(donor_id.eq.${otherUserId},institution_id.eq.${userId})`
    )
    .maybeSingle()

  if (error) throw error

  if (existing) return existing

  // ➕ criar novo chat
  const { data: newChat, error: createError } = await supabase
    .from("chats")
    .insert({
      donor_id: userId,
      institution_id: otherUserId
    })
    .select()
    .single()

  if (createError) throw createError

  return newChat
}