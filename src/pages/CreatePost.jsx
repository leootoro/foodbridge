import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { createPost, uploadPost } from "../services/mediaService"
import { getCurrentUser } from "../services/authService";
import { supabase } from "../lib/supabase";

function CreatePost() {

  const location = useLocation()
  const navigate = useNavigate()

  const { file, previewUrl } = location.state

  if (!location.state) {
    navigate("/profile")
    return null
  }
  const [message, setMessage] = useState("")
  const [user, setUser] = useState(null)

  useEffect(() => {

    async function loadUser(){
        const currentUser = await getCurrentUser()
        setUser(currentUser)
    }

    loadUser()

  }, [])

  async function handlePost() {
    // 1. Evita erros se a função for chamada sem usuário ou sem texto/arquivo
    if (!user?.id) {
        console.error("Usuário não autenticado.");
        return;
    }

    try {
        let filePath = null;
        let mediaType = null;

        // 2. Só tenta fazer o upload e checar o tipo se existir um arquivo
        if (file) {
          filePath = await uploadPost(file, user.id);
          mediaType = file.type.startsWith("video") ? "video" : "image";
        }

        // 3. Insere os dados no Supabase
        const { data, error } = await supabase
        .from("posts")
        .insert({
            user_id: user.id, // Recomendo adicionar o autor do post
            media_url: filePath,
            media_type: mediaType,
            text: message
        })
        // .select();
      

        if (error) {
        console.error("Erro ao inserir post:", error.message);
        // Aqui você poderia colocar um toast, ex: toast.error("Falha ao postar")
        return; 
        }

        console.log("Post criado com sucesso:", data);
        
        // 4. Navega para o perfil após o sucesso
        navigate("/profile");

    } catch (err) {
        // 5. Captura falhas do uploadPost ou outros erros não previstos
        console.error("Erro inesperado durante a criação do post:", err);
    }
  }
  
  return (

    <div className="create-post-page">

      <h2>Nova postagem</h2>

      <div className="preview-container">

        {file.type.startsWith("video") ? (
          <video src={previewUrl} controls />
        ) : (
          <img src={previewUrl} />
        )}

      </div>

      <textarea
        placeholder="Escreva uma mensagem..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      <button onClick={handlePost}>
        Postar
      </button>

    </div>

  )

}

export default CreatePost