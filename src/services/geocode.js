export async function getLatLng(address) {
  const apiKey = "SUA_API_KEY"

  const response = await fetch(
    `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(address)}&key=${apiKey}`
  )

  const data = await response.json()

  if (data.results.length === 0) return null

  const { lat, lng } = data.results[0].geometry

  return { lat, lng }
}