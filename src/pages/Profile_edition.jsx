import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { updateProfile, save_lat_and_long } from "../services/profileService"
import { upload_profile_photo, get_profile_photo_Url } from "../services/mediaService"
import { useNavigate } from "react-router-dom"; 
import Cropper from "react-easy-crop"
import "../css/profile_edition.css"

function EditProfile() {

  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [imageSrc, setImageSrc] = useState(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [selectedFile, setSelectedFile] = useState(null)

  const [form, setForm] = useState({
    name: "",
    bio: "",
    location: "",
    accept_donation: false,
    pet_donation: false,
    food_restrictions: "",
    photo_url: "",
    city: "",
    state: "",
    neighborhood:"",
    address:"",
    address_number:"",
    address_complement:"",
  })

  // 🔄 Carregar dados do banco
  useEffect(() => {
    async function loadData() {

      const { data } = await supabase.auth.getUser()
      const currentUser = data.user

      setUser(currentUser)

      if (!currentUser) return

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single()

      if (profile) {
        setForm({
          name: profile.name || "",
          bio: profile.bio || "",
          location: profile.location || "",
          accept_donation: profile.accept_donation || false,
          pet_donation: profile.pet_donation || false,
          food_restrictions: profile.food_restrictions || "",
          photo_url: profile.photo_url || "",
          city: profile.city || "",
          state: profile.state || "",
          neighborhood: profile.neighborhood || "",
          address: profile.address || "",
          address_number: profile.address_number || "",
          address_complement: profile.address_complement|| "",
        })
      }
    }

    loadData()
  }, [])


  // ✏️ Atualizar inputs
  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  // 🔘 Switch
  function handleSwitch(name) {
    setForm(prev => ({ ...prev, [name]: !prev[name] }))
  }

  // 💾 Salvar
  async function handleSave() {
    try {
      if (!user) return

      await updateProfile(user.id, form)
      await save_lat_and_long(user.id,form)

      alert("Perfil atualizado!")
      navigate("/profile")
    } catch (error) {
      console.error(error)
      alert("Erro ao salvar")
    }
  }

 async function handleSavePhoto() {
    try {
      if (!selectedFile || !user) return

      // 🔥 upload usando sua função
      const filePath = await upload_profile_photo(selectedFile, user.id)

      if (!filePath) return

      // 🔥 salvar no banco
      await updateProfile(user.id, {
        photo_url: filePath
      })

      setForm(prev => ({
      ...prev,
      photo_url: filePath
    }))

      console.log("form_photo",form.photo_url)
      setImageSrc(null)
      setSelectedFile(null)

      alert("Foto atualizada!")

    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div style={containerStyle}>

      <h2>Editar perfil</h2>

      {/* Foto */}
      <div style={{ textAlign: "center" }}>
        <img
          src={
            form?.photo_url
              ? get_profile_photo_Url(form.photo_url)
              : "/default_user.png"
          }
          
          alt="avatar"
          style={avatarStyle}
        />
        <label style={editPhotoStyle}>
          Editar foto
          <input
            type="file"
            accept="image/png, image/jpeg"
            onChange={(e) => {
              const file = e.target.files[0]
              if (!file) return

              const allowedTypes = ["image/jpeg", "image/png"]

              if (!allowedTypes.includes(file.type)) {
                alert("Só é permitido enviar imagens JPG ou PNG")
                e.target.value = null
                return
              }

              const url = URL.createObjectURL(file)

              setSelectedFile(file)
              setImageSrc(url)
            }}
            style={{ display: "none" }}
          />
        </label>
      </div>


      {/* Nome */}
      <input
        name="name"
        placeholder="Nome"
        value={form.name}
        onChange={handleChange}
        style={inputStyle}
      />

      {/* Bio */}
      <textarea
        name="bio"
        placeholder="Bio"
        value={form.bio}
        onChange={handleChange}
        style={inputStyle}
      />

      {/* Estado */}
      <input
        name="state"
        placeholder="Estado"
        value={form.state}
        onChange={handleChange}
        style={inputStyle}
      />

      {/* Cidade */}
      <input
        name="city"
        placeholder="Cidade"
        value={form.city}
        onChange={handleChange}
        style={inputStyle}
      />

      {/* Bairro */}
      <input
        name="neighborhood"
        placeholder="Bairro"
        value={form.neighborhood}
        onChange={handleChange}
        style={inputStyle}
      />

      {/* Endereço */}
      <input
        name="address"
        placeholder="Endereço"
        value={form.address}
        onChange={handleChange}
        style={inputStyle}
      />

      {/* Número do endereço */}
      <input
        name="address_number"
        placeholder="Nº"
        value={form.address_number}
        onChange={handleChange}
        style={inputStyle}
      />

      
      {/* Complemento do endereço */}
      <input
        name="address_complement"
        placeholder="Complemento"
        value={form.address_complement}
        onChange={handleChange}
        style={inputStyle}
      />

      {/* Switches */}
      <div style={switchContainer}>
        <span>Aceitando doação</span>
        <input
          type="checkbox"
          checked={form.accept_donation}
          onChange={() => handleSwitch("accept_donation")}
        />
      </div>

      <div style={switchContainer}>
        <span>Aceita alimento para pet</span>
        <input
          type="checkbox"
          checked={form.pet_donation}
          onChange={() => handleSwitch("pet_donation")}
        />
      </div>

      {/* Food Restrictions (texto simples) */}
      <textarea
        name="food_restrictions"
        placeholder="Não recebimento de certos alimentos (ex: congelados, bebidas, carnes ... )"
        value={form.food_restrictions}
        onChange={handleChange}
        style={inputStyle}
      />


      {imageSrc && (
        <div style={modalStyle}>
          <div style={{ position: "relative", width: 300, height: 300 }}>
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"   // 🔥 ISSO AQUI
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
            />
          </div>

          <button
            onClick={handleSavePhoto}
            style={saveButtonStyle}
          >
            Concluir
          </button>

          <button
            onClick={() => setImageSrc(null)}
            style={cancelButtonStyle}
          >
            Cancelar
          </button>
        </div>
      )}
      <button onClick={handleSave} style={buttonStyle}>
        Salvar
      </button>

    </div>
  )
}
/* 🎨 Styles */

const containerStyle = {
  maxWidth: 400,
  margin: "auto",
  padding: 20
}

const avatarStyle = {
  width: 90,
  height: 90,
  borderRadius: "50%",
  objectFit: "cover"
}

const editPhotoStyle = {
  color: "#3897f0",
  cursor: "pointer"
}

const inputStyle = {
  width: "100%",
  padding: 10,
  marginTop: 10,
  borderRadius: 10,
  border: "1px solid #ccc"
}

const switchContainer = {
  display: "flex",
  justifyContent: "space-between",
  marginTop: 15
}

const buttonStyle = {
  width: "100%",
  marginTop: 20,
  padding: 12,
  background: "#3897f0",
  color: "white",
  border: "none",
  borderRadius: 10,
  cursor: "pointer"
}
const modalStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.9)",
  zIndex: 999,
  display: "flex",
  justifyContent: "center",
  alignItems: "center"
}
const saveButtonStyle = {
  position: "absolute",
  bottom: 40,
  left: "50%",
  transform: "translateX(-50%)",
  padding: "12px 24px",
  background: "#4caf50",
  color: "white",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  zIndex: 1000
}

export default EditProfile