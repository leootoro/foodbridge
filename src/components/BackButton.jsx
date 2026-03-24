import { useNavigate } from "react-router-dom"

function BackButton({ to }) {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate(to)}
      style={{
        background: "none",
        border: "white",
        fontSize: 20,
        cursor: "pointer",
        marginRight: 10
      }}
    >
      ←
    </button>
  )
}

export default BackButton