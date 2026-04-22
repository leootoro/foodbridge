import { useNavigate } from "react-router-dom"

function BackButton() {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => {
        if (window.history.length > 1) {
          navigate(-1)
        } else {
          navigate("/profile") // ou qualquer rota padrão
        }
      }}
      style={{
        background: "white",
        border: "none",
        color: "black",

        fontSize: 20,
        cursor: "pointer",
        marginLeft: 10,
        marginRight:15,
        padding: 6,
        borderRadius: "50%",

        display: "flex",
        alignItems: "center",
        justifyContent: "center",

        lineHeight: 1
      }}
    >
      ←
    </button>
  )
}

export default BackButton