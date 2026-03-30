import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { createPost, uploadPost } from "../services/mediaService"
import { getCurrentUser } from "../services/authService";
import { supabase } from "../lib/supabase";
import Cropper from "react-easy-crop";
import { getCroppedImg } from "../lib/canvasUtils";
import "../css/createPost.css"

function CreatePost() {

  const location = useLocation()
  const navigate = useNavigate()

  if (!location.state) {
    navigate("/profile")
    return null
  }

  const { file, previewUrl } = location.state
  const [message, setMessage] = useState("")
  const [user, setUser] = useState(null)
  // Estados do Crop
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  useEffect(() => {

    async function loadUser(){
        const currentUser = await getCurrentUser()
        setUser(currentUser)
    }

    loadUser()

  }, [])

  const onCropComplete = (croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  async function handlePost() {
    // 1. Evita erros se a função for chamada sem usuário ou sem texto/arquivo
    if (!user?.id) {
        console.error("Usuário não autenticado.");
        return;
    }

    try {
        let filePath = null;
        let mediaType = null;
        let finalFile = file;

        // Se for imagem, processa o corte antes de subir
        if (file && file.type.startsWith("image")) {
          const croppedBlob = await getCroppedImg(previewUrl, croppedAreaPixels);
          finalFile = new File([croppedBlob], "post_image.jpg", { type: "image/jpeg" });
        }

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

    <div className="create-post-container">
      <h2 className="post-title">Nova postagem</h2>

      {/* 1. ÁREA DA IMAGEM/VÍDEO (Centralizada) */}
      <div className="media-section">
        <div className="crop-container">
          {file.type.startsWith("video") ? (
            <video src={previewUrl} controls className="video-preview" />
          ) : (
            <Cropper
              image={previewUrl}
              crop={crop}
              zoom={zoom}
              aspect={1 / 1} // Defina aqui: 1/1 para quadrado ou 4/3 para retangular
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          )}
        </div>
      </div>

      {/* 2. ÁREA DE OPÇÕES (Embaixo) */}
      <div className="controls-section">
        {file.type.startsWith("image") && (
          <div className="zoom-wrapper">
            <label>Ajustar Zoom</label>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              onChange={(e) => setZoom(e.target.value)}
              className="zoom-slider"
            />
          </div>
        )}

        <textarea
          placeholder="Escreva uma legenda para sua postagem..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="post-caption"
        />

        <div className="post-actions">
          <button className="btn-cancel" onClick={() => navigate("/profile")}>
            Cancelar
          </button>
          <button className="btn-post" onClick={handlePost}>
            Publicar agora
          </button>
        </div>
      </div>
    </div>

  )

}

export default CreatePost