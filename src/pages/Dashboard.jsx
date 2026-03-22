import { useEffect, useState } from "react";
import { checkAuth } from  "../services/protectedService";
import { useNavigate } from "react-router-dom";

function Dashboard() {


  return (
    <div className="dashboard">
      <h1>
        Bem-vindo, {user.user_metadata?.name || user.email}! 👋
      </h1>

      <p style={{ color: "#666", margin: "10px 0" }}>
        {user.email}
      </p>
    </div>
  );
}

export default Dashboard;