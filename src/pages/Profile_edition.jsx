import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { updateProfile, save_lat_and_long } from "../services/profileService"
import { upload_profile_photo, get_profile_photo_Url } from "../services/mediaService"
import { useNavigate } from "react-router-dom"; 
import Cropper from "react-easy-crop"
import "../css/profile_edition.css"
import { expandedMarketItems } from '../lib/itemCategories';

function EditProfile() {

  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [imageSrc, setImageSrc] = useState(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [selectedFile, setSelectedFile] = useState(null)
  const [foodList, setFoodList] = useState([{ item: "", customItem: "", quantity: 1, unit: "un" }]);
  const [foodSearch, setFoodSearch] = useState("");
  const estadosBR = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", 
  "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", 
  "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

  // Adiciona uma nova linha em branco no formulário de alimentos disponíveis.
  const handleAddFoodRow = () => {
    setFoodList([...foodList, { item: "", customItem: "", quantity: 1, unit: "un" }]);
  };

  //Remove linha específica do formulário de alimentos
  const handleRemoveFoodRow = (index) => {
    const newList = foodList.filter((_, i) => i !== index);
    setFoodList(newList);
  };

  // Atualiza os valores de uma linha específica
  const handleFoodChange = (index, field, value) => {
    const newList = [...foodList];
    newList[index][field] = value;
    
    // Se o usuário selecionar um item real, podemos resetar erros ou customItem
    if (field === "item" && value !== "Outro") {
      newList[index].customItem = "";
    }
    
    setFoodList(newList);
  };

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
    is_donor: false,
    immediate_availability: false,
    local_pickup: true,
    food_available: "",
    physical_address: ""
  })

  // 🔄 Carregar dados do banco
  useEffect(() => {
    async function loadData() {
      window.scrollTo(0, 0);
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
          is_donor: profile.is_donor || false,
          immediate_availability: profile.immediate_availability|| false,
          local_pickup: profile.local_pickup || true,
          food_available: profile.food_available || "",
          physical_address: profile.physical_address ?? false,
        })
      }

      //Sincroniza a lista de alimentos
      // Se houver dados no banco e for um array, carregamos. 
      if (profile.food_available && Array.isArray(profile.food_available) && profile.food_available.length > 0) {
        setFoodList(profile.food_available);
      } else {
        setFoodList([{ item: "", customItem: "", quantity: 1, unit: "un" }]);
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

      // 1. Limpeza Inteligente: ignora linhas onde o item não foi selecionado
      // Também garante que se for "Outro", o campo customItem não esteja vazio
      const cleanedFoodList = foodList.filter(row => {
        const hasItem = row.item !== "" && row.item !== "Selecione...";
        const isCustomValid = row.item === "Outro" ? row.customItem?.trim() !== "" : true;
        
        return hasItem && isCustomValid;
      });

      // 2. Prepara o objeto final
      const finalFormData = {
        ...form,

        accept_donation: !!form.accept_donation,
        pet_donation: !!form.pet_donation,
        immediate_availability: !!form.immediate_availability,
        local_pickup: !!form.local_pickup,
        is_donor: !!form.is_donor,
        physical_address: !!form.physical_address,
        food_available: cleanedFoodList
      };
      if (finalFormData.physical_address == false){
        finalFormData.address = 'Online'
      }

      await updateProfile(user.id, finalFormData);
      await save_lat_and_long(user.id, finalFormData);

      alert("Perfil atualizado com sucesso!");
      navigate("/profile");
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar alterações.");
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
  <div className="perfil-form-container">

    {/* HEADER */}
    <div style={{ textAlign: "center", marginBottom: "50px" }}>
      <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "20px" }}>
        Editar perfil
      </h2>

      <div style={{ display: "inline-block" }}>
        <img
          src={
            form?.photo_url
              ? get_profile_photo_Url(form.photo_url)
              : "/default_user.png"
          }
          alt="avatar"
          style={{ ...avatarStyle, width: "110px", height: "110px" }}
        />

        <label style={{ ...editPhotoStyle, marginTop: "5px", display: "block" }}>
          Editar foto
          <input
            type="file"
            accept="image/png, image/jpeg"
            onChange={(e) => {
              const file = e.target.files[0]
              if (!file) return

              const allowedTypes = ["image/jpeg", "image/png"]

              if (!allowedTypes.includes(file.type)) {
                alert("Só JPG ou PNG")
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
    </div>

    {/* COLUNAS */}
    <div
      className="perfil-duas-colunas-wrapper"
      style={{
        display: "flex",
        gap: "60px",
        alignItems: "flex-start",
        flexWrap: "wrap"
      }}
    >

      {/* ESQUERDA */}
      <div
        style={{
          flex: 1,
          minWidth: "320px",
          display: "flex",
          flexDirection: "column",
          gap: "15px"
        }}
      >
        {/* 4. TROCADO O RÁDIO POR UM SWITCH COMPLETO */}
        <div style={switchContainer1}>
          <span>Possui endereço físico?</span>
          <input
            type="checkbox"
            checked={!!form.physical_address}
            onChange={() => handleSwitch("physical_address")}
          />
        </div>
        
        <input name="name" value={form.name} onChange={handleChange} placeholder="Nome" style={inputStyle} />

        <textarea
          name="bio"
          value={form.bio}
          onChange={handleChange}
          placeholder="Bio"
          style={{ ...inputStyle, minHeight: "100px" }}
        />

        <div style={{ display: "flex", gap: "10px" }}>
          {/* Estado (Select) */}
          <select 
            name="state" 
            value={form.state} 
            onChange={handleChange} 
            style={{ ...inputStyle, width: "35%", backgroundColor: "white" }}
          >
            <option value="" disabled>UF</option>
            {estadosBR.map((sigla) => (
              <option key={sigla} value={sigla}>
                {sigla}
              </option>
            ))}
          </select>
          <input name="city" value={form.city} onChange={handleChange} placeholder="Cidade" style={inputStyle} />
        </div>

        {form?.physical_address === true && (
          <>
            <input name="neighborhood" value={form.neighborhood} onChange={handleChange} placeholder="Bairro" style={inputStyle} />
            <input name="address" value={form.address} onChange={handleChange} placeholder="Logradouro" style={inputStyle} />

            <div style={{ display: "flex", gap: "10px" }}>
              <input name="address_number" value={form.address_number} onChange={handleChange} placeholder="Nº" style={inputStyle} />
              <input name="address_complement" value={form.address_complement} onChange={handleChange} placeholder="Complemento" style={inputStyle} />
            </div>
          </>
        )}

        {/* DOADOR */}
        {form?.is_donor === true && (
          <>
            <div style={switchContainer1}>
              <span>Retirada no local</span>
              <input
                type="checkbox"
                checked={form.local_pickup}
                onChange={() => handleSwitch("local_pickup")}
              />
            </div>

            <div style={switchContainer2}>
              <span>Disponibilidade imediata</span>
              <input
                type="checkbox"
                checked={form.immediate_availability}
                onChange={() => handleSwitch("immediate_availability")}
              />
            </div>
          </>
        )}

      </div>

      {/* DIREITA */}

      <div style={{ flex: 1, minWidth: "320px" }}>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {/* RECEBEDOR */}
          {form?.is_donor == false  && (
            <>
              <div style={switchContainer1}>
                <span>Aceitando doação</span>
                <input
                  type="checkbox"
                  checked={form.accept_donation}
                  onChange={() => handleSwitch("accept_donation")}
                />
              </div>

              <div style={switchContainer2}>
                <span>Aceita alimento para pet</span>
                <input
                  type="checkbox"
                  checked={form.pet_donation}
                  onChange={() => handleSwitch("pet_donation")}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                <label style={{
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "#64748b"
                }}>
                  Restrições de certos alimentos
                </label>

                <textarea
                  name="food_restrictions"
                  value={form.food_restrictions}
                  onChange={handleChange}
                  placeholder="Ex: congelados, carne, bebidas"
                  style={inputStyle}
                />
              </div>
            </>
          )}
        </div>

        {form?.is_donor === true && (
          <div style={{ width: "100%" }}>
            <label style={{ fontWeight: "bold", marginBottom: "12px", display: "block", color: "#334155" }}>
              Alimentos Disponíveis
            </label>

            <div className="food-container">
              {foodList.map((row, index) => (
                <div key={index} style={{ marginBottom: "15px" }}>
                  <div className="food-row">
                    
                    {/* SELETOR CUSTOMIZADO COM BUSCA */}
                    <div className="custom-select-wrapper">
                      <div
                        className="select-display"
                        onClick={() => {
                          const newList = [...foodList];
                          newList[index].open = !newList[index].open;
                          setFoodList(newList);
                        }}
                      >
                        {row.item || "Selecione..."}
                      </div>

                      {row.open && (
                        <div className="select-dropdown">
                          <input
                            type="text"
                            placeholder="Pesquisar..."
                            autoFocus
                            value={row.search || ""}
                            onChange={(e) => {
                              const newList = [...foodList];
                              newList[index].search = e.target.value;
                              setFoodList(newList);
                            }}
                            className="select-search"
                            onClick={(e) => e.stopPropagation()} 
                          />
                          
                          <div className="options-list" style={{ maxHeight: '160px', overflowY: 'auto' }}>
                            {expandedMarketItems
                              .filter(item => 
                                item.toLowerCase().includes((row.search || "").toLowerCase())
                              )
                              .map(item => {
                                const isAlreadySelected = foodList.some(
                                  (food, i) => food.item === item && i !== index
                                );

                                return (
                                  <div
                                    key={item}
                                    className={`select-option ${isAlreadySelected ? "disabled" : ""}`}
                                    onClick={() => {
                                      if (isAlreadySelected) return;
                                      const newList = [...foodList];
                                      newList[index].item = item;
                                      newList[index].open = false;
                                      newList[index].search = "";
                                      newList[index].customItem = ""; // Limpa se mudar de Outro para item da lista
                                      setFoodList(newList);
                                    }}
                                  >
                                    {item} {isAlreadySelected ? "(Já selecionado)" : ""}
                                  </div>
                                );
                              })}

                            <div
                              className="select-option outro"
                              style={{ color: '#3897f0', fontWeight: 'bold', borderTop: '1px solid #eee' }}
                              onClick={() => {
                                const newList = [...foodList];
                                newList[index].item = "Outro";
                                newList[index].open = false;
                                newList[index].search = "";
                                setFoodList(newList);
                              }}
                            >
                              + Outro (Personalizado)
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* QUANTIDADE */}
                    <input
                      type="number"
                      min="1"
                      value={row.quantity}
                      onChange={(e) => handleFoodChange(index, "quantity", e.target.value)}
                      style={{ ...inputStyle, width: "65px", textAlign: "center", padding: "10px 5px" }}
                    />

                    {/* UNIDADE */}
                    <select
                      value={row.unit}
                      onChange={(e) => handleFoodChange(index, "unit", e.target.value)}
                      style={{ ...inputStyle, width: "75px", padding: "10px 5px", backgroundColor: "white" }}
                    >
                      <option value="un">un</option>
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="L">L</option>
                    </select>

                    {/* REMOVER */}
                    <button 
                      type="button"
                      className="btn-remove-food-circle"
                      onClick={() => handleRemoveFoodRow(index)}
                    >
                      ✕
                    </button>
                  </div>

                  {/* CAMPO EXTRA PARA "OUTRO" COM LÓGICA DE ENTER */}
                  {row.item === "Outro" && (
                    <div style={{ position: 'relative', marginTop: '-5px', marginBottom: '10px' }}>
                      <input
                        type="text"
                        placeholder="Digite o nome e aperte Enter..."
                        value={row.customItem || ""}
                        onChange={(e) => {
                          const newList = [...foodList];
                          newList[index].customItem = e.target.value;
                          setFoodList(newList);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && row.customItem?.trim()) {
                            e.preventDefault();
                            const newList = [...foodList];
                            // Passa o valor do customItem para o item principal
                            newList[index].item = row.customItem.trim();
                            newList[index].customItem = ""; // Limpa o campo temporário
                            setFoodList(newList);
                          }
                        }}
                        autoFocus
                        style={{
                          width: "100%",
                          padding: "10px",
                          borderRadius: "8px",
                          border: "1px solid #3897f0",
                          backgroundColor: "#f0f7ff",
                          fontSize: "14px"
                        }}
                      />
                      <small style={{ color: '#3897f0', fontSize: '11px', marginLeft: '5px' }}>
                        Aperte Enter para confirmar o nome.
                      </small>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button 
              type="button" 
              onClick={handleAddFoodRow}
              className="btn-add-food"
            >
              + Adicionar outro item
            </button>
          </div>
        )}
      </div>

    </div>

    {/* BOTÃO SALVAR */}
    <div style={{ textAlign: "center", marginTop: "40px" }}>
      <button onClick={handleSave} style={buttonStyle}>
        Salvar Alterações
      </button>
    </div>

  </div>
)
  
      
}
/* 🎨 Styles */

const avatarStyle = {
  width: 90,
  height: 90,
  borderRadius: "50%",
  objectFit: "cover"
};

const editPhotoStyle = {
  color: "#3897f0",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "500"
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #e2e8f0",
  fontSize: "14px",
  outline: "none"
};

const switchContainer1 = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px",
  backgroundColor: "#f8fafc",
  borderRadius: "8px",
  fontSize: "14px",
  color: "#64748b",
};

const switchContainer2 = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px",
  backgroundColor: "#f8fafc",
  borderRadius: "8px",
  fontSize: "14px",
  color: "#64748b",
  marginBottom:"20px"
};

const buttonStyle = {
  width: "250px", // Ajustado para não ocupar a tela toda no centro
  padding: "14px",
  background: "#3897f0",
  color: "white",
  border: "none",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "16px"
};

export default EditProfile;