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

  const donor =
    userId < otherUserId ? userId : otherUserId

  const institution =
    userId < otherUserId ? otherUserId : userId

  // 🔎 tenta buscar
  const { data: existing } = await supabase
    .from("chats")
    .select("*")
    .eq("donor_id", donor)
    .eq("institution_id", institution)
    .maybeSingle()

  if (existing) return existing

  // 🔥 tenta criar
  const { data, error } = await supabase
    .from("chats")
    .insert([
      {
        donor_id: donor,
        institution_id: institution
      }
    ])
    .select()
    .maybeSingle()

  // 💥 se já existir (race condition)
  if (error && error.message.includes("duplicate")) {
    const { data: retry } = await supabase
      .from("chats")
      .select("*")
      .eq("donor_id", donor)
      .eq("institution_id", institution)
      .maybeSingle()

    return retry
  }

  if (error) throw error

  return data
}