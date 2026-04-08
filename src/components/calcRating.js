export function calcRating(ratings = []) {
  const count = ratings.length;

  if (count < 3) {
    return { avg: 5.0, count };
  }

  const sum = ratings.reduce((acc, curr) => acc + curr, 0);
  const avg = parseFloat((sum / count).toFixed(1));

  return { avg, count };
}