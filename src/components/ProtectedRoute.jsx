import { useEffect, useState } from "react";
import { getCurrentUser } from "../services/authService";
import { Navigate } from "react-router-dom";

function ProtectedRoute({ children }) {

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkUser() {
      const u = await getCurrentUser();
      setUser(u);
      setLoading(false);
    }

    checkUser();
  }, []);

  if (loading) {
    return <p>Carregando...</p>;
  }

  if (!user) {
    return <Navigate to="/" />;
  }

  return children;
}

export default ProtectedRoute;