import { getCurrentUser } from "./authService";

export async function checkAuth() {
  const user = await getCurrentUser();

  if (!user) {
    window.location.href = "/";
    return null;
  }

  return user;
}