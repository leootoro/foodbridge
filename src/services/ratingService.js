import { supabase } from "../lib/supabase";

// Busca a média de um usuário específico
export async function getUserAverage(userId) {
    const { data, error } = await supabase
        .from("ratings")
        .select("rating_number")
        .eq("reviewed_id", userId);

    if (error) return 0;
    if (data.length === 0) return 0;

    const sum = data.reduce((acc, curr) => acc + curr.rating_number, 0);
    return (sum / data.length).toFixed(1);
}

// Envia uma nova avaliação
export async function submitRating(reviewerId, reviewedId, score, comment) {
    const { data, error } = await supabase
        .from("ratings")
        .insert([
        { reviewer_id: reviewerId, reviewed_id: reviewedId, rating_number: score, comment }
        ]);
    return { data, error };
};

export function calcRating(ratings = []) {
  const count = ratings.length;

  if (count < 3) {
    return { avg: 5.0, count };
  }

  const sum = ratings.reduce((acc, curr) => acc + curr, 0);
  const avg = parseFloat((sum / count).toFixed(1));

  return { avg, count };
}