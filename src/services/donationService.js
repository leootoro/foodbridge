import { supabase } from "../lib/supabase";

export const createDonation = async (donorId, institutionId, deliveryDate, items) => {
  // 1. Inserir na tabela 'donations'
  const { data: donation, error: donationError } = await supabase
    .from("donations")
    .insert([
      {
        donor_id: donorId,
        institution_id: institutionId,
        delivery_date: deliveryDate,
        status: "pendente"
      }
    ])
    .select()
    .single();

  if (donationError) {
    console.error("ERRO DONATIONS:", donationError.message, donationError.details);
    return { data: null, error: donationError };
  }

  // 2. Inserir na tabela 'donation_itens'
  const itemsToInsert = items.map(item => {
    const name = item.item === "Outro" ? item.customItem : item.item;

    const isUnit = item.unit === "un";

    const quantity = isUnit
      ? Number(item.measureValue || 0)  
      : Number(item.quantity || 1);

    let volume = null;

    if (!isUnit && item.measureValue) {
      volume = `${item.measureValue}${item.unit}`;
    }

    return {
      donation_id: donation.id,
      food_name: name,
      quantity,
      unit: "un", // continua "un" porque usamos UN como unidade final
      volume
    };
  });

  const { error: itemsError } = await supabase
    .from("donation_itens")
    .insert(itemsToInsert);

  if (itemsError) {
    console.error("ERRO ITENS:", itemsError.message, itemsError.details);
    //Deletar a donation se os itens falharem (rollback manual)
    await supabase.from("donations").delete().eq("id", donation.id);
    return { data: null, error: itemsError };
  }

  return { data: donation, error: null };
  
};

export const updateDonationStatus = async (donationId, newStatus) => {
  const { data, error } = await supabase
    .from("donations")
    .update({ status: newStatus })
    .eq("id", donationId);
  return { data, error };
};

export const buildDonationMessage = (donationId, items, deliveryDate) => {
  const itensString = items
    .map(i => {
      const nome = i.item === "Outro" ? i.customItem : i.item;

      const isUnit = i.unit === "un";

      const quantity = isUnit
        ? Number(i.measureValue || 0)
        : Number(i.quantity || 1);

      const volume = !isUnit && i.measureValue
        ? `${i.measureValue}${i.unit}`
        : "";

      return `ITEM:${nome}:${quantity}:${volume}`;
    })
    .join("\n");

  return `PROPOSTA_DOACAO_ID:${donationId}
${itensString}
DATA_RETIRADA:${deliveryDate}`;
};

export const parseDonationMessage = (messageText) => {
  if (!messageText || !messageText.includes("PROPOSTA_DOACAO_ID:")) {
    return null;
  }

  const lines = messageText.split("\n").map(l => l.trim());

  // Pega o ID de forma segura
  const idLine = lines.find(l => l.startsWith("PROPOSTA_DOACAO_ID:"));
  const donationId = idLine?.split(":")[1]?.trim();

  // Pega os itens
  const items = lines
    .filter(l => l.startsWith("ITEM:"))
    .map(l => {
      const parts = l.split(':');
      const name = parts[1]?.trim();
      const quantity = parts[2]?.trim();
      const volumeRaw = parts[3]?.trim();

      // Regra: se for unidade, NÃO é volume
      let volume = null;
      let unit = "un";

      if (volumeRaw) {
        if (volumeRaw.toLowerCase().includes("un")) {
          unit = "un";
        } else {
          volume = volumeRaw;
        }
      }

      return {
        name,
        quantity,
        volume,
        unit
      };
    });

  // Pega a data
  const dataLine = lines.find(l => l.startsWith("DATA_RETIRADA:"));
  const deliveryDate = dataLine
    ? dataLine.replace("DATA_RETIRADA:", "").trim()
    : null;

  return {
    donationId,
    items,
    deliveryDate
  };
};

export const createDonationWithMessage = async (
  donorId,
  institutionId,
  deliveryDate,
  items
) => {
  const { data: donation, error } = await createDonation(
    donorId,
    institutionId,
    deliveryDate,
    items
  );

  if (error) return { data: null, error };

  const message = buildDonationMessage(
    donation.id,
    items,
    deliveryDate
  );

  return { data: { donation, message }, error: null };
};

export const getUserDonations = async (user, profile) => {
  let query = supabase
    .from("donations")
    .select(`
      id,
      created_at,
      status,
      points, 
      delivery_date,
      donor_id,
      institution_id,

      donor:profiles!donor_id (
        name
      ),

      institution:profiles!institution_id (
        name
      ),

      donation_itens (
        food_name,
        quantity,
        unit,
        volume
      )
    `)
    .order("created_at", { ascending: false });

  if (profile.is_donor === true) {
    query = query.eq("donor_id", user.id);
  } else {
    query = query.eq("institution_id", user.id);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao buscar doações:", error);
    return { data: [], error };
  }

  // Formata
  const formatted = data.map(d => {
    const otherName = profile.is_donor
      ? d.institution?.name
      : d.donor?.name;

    return {
      ...d,
      otherName,
      points: d.points ?? 0,
      items: d.donation_itens.map(i => ({
        name: i.food_name,
        quantity: i.quantity,
        unit: i.unit,
        volume: i.volume
      }))
    };
  });

  return { data: formatted, error: null };
};