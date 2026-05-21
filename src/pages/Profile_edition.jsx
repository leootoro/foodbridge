import { useEffect, useState, useRef } from "react"
import { supabase } from "../lib/supabase"
import { updateProfile} from "../services/profileService"
import {save_lat_and_long } from "../services/geocode";
import { upload_profile_photo, get_profile_photo_Url } from "../services/mediaService"
import { useNavigate } from "react-router-dom"; 
import Cropper from "react-easy-crop"
import { getCroppedImg } from "../lib/canvasUtils";
import BackButton from "../components/BackButton";
import "../css/profile_edition.css"
import { expandedMarketItems } from '../lib/itemCategories';

function EditProfile() {

  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [imageSrc, setImageSrc] = useState(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [foodList, setFoodList] = useState([{ item: "", customItem: "", quantity: 1, measureValue: "", unit: "kg" }]);
  const [foodSearch, setFoodSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const fileInputRef = useRef(null)
  const estadosBR = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", 
  "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", 
  "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

  // Adiciona uma nova linha em branco no formulário de alimentos disponíveis.
 const handleAddFoodRow = () => {
    setFoodList([...foodList, { item: "", customItem: "", quantity: 1, measureValue: "", unit: "kg" }]);
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
    physical_address: false
  })

  //Carregar dados do banco
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
      if (profile && profile.food_available && Array.isArray(profile.food_available) && profile.food_available.length > 0) {
        setFoodList(profile.food_available);
      } else {
        setFoodList([{ item: "", customItem: "", quantity: 1, measureValue: "", unit: "kg" }]);
      }
    }

    loadData()
  }, [])

  function handleCancelCrop() {
    setImageSrc(null)
    setCroppedAreaPixels(null)
    setCrop({ x: 0, y: 0 })
    setZoom(1) 

    if (fileInputRef.current) {
      fileInputRef.current.value = "" // 🔥 ISSO resolve o bug
    }
  }

  // Atualizar inputs
  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }
  
  function handleChange_sugestion(e) {
    const value = e.target.value;

    setForm(prev => ({ ...prev, food_restrictions: value }));

    // pega a última palavra digitada
    const lastWord = value.split(",").pop().trim().toLowerCase();

    if (lastWord.length > 0) {
      const filtered = expandedMarketItems.filter(item =>
        item.toLowerCase().includes(lastWord)
      );

      setSuggestions(filtered.slice(0, 5)); // limita sugestões
    } else {
      setSuggestions([]);
    }
  }
  const handleSuggestionClick = (suggestion) => {
    const parts = form.food_restrictions.split(",");

    parts[parts.length - 1] = " " + suggestion;

    const newValue = parts.join(",").replace(/^,/, "").trim();
    setForm(prev => ({
      ...prev,
      food_restrictions: newValue
    }));
    setSuggestions([]);
  };
  
  // Switch
  function handleSwitch(name) {
    setForm(prev => ({ ...prev, [name]: !prev[name] }))
  }

  async function handleCropAndUpload() {
    try {
      if (!imageSrc || !croppedAreaPixels || !user) return

      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels)

      const file = new File([croppedBlob], "profile.jpg", {
        type: "image/jpeg"
      })

      const filePath = await upload_profile_photo(file, user.id)

      await updateProfile(user.id, {
        photo_url: filePath
      })

      setForm(prev => ({
        ...prev,
        photo_url: filePath
      }))

      setImageSrc(null)

      alert("Foto atualizada!")

    } catch (err) {
      console.error(err)
    }
  }

  // Salvar
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
      if (!imageSrc || !croppedAreaPixels || !user) return

      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels)

      const file = new File([croppedBlob], "profile.jpg", {
        type: "image/jpeg"
      })

      const filePath = await upload_profile_photo(file, user.id)

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

      alert("Foto atualizada!")

    } catch (err) {
      console.error(err)
    }
  }
  return (
  <div className="perfil-form-container">
    <BackButton/>
    <div className="perfil-header">
      <h2 className="perfil-title">Editar perfil
        Editar perfil
      </h2>

       <div className="perfil-avatar-wrapper">
        <img
          src={
            form?.photo_url
              ? get_profile_photo_Url(form.photo_url) + `?t=${Date.now()}`
              : "/default_user.png"
          }
          alt="avatar"
          className="perfil-avatar"
        />
        {imageSrc && (
          <div className="crop-overlay">

            <div className="crop-modal">
              
              <div className="crop-container">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  cropShape="round"
                  showGrid={false}
                  aspect={1}
                  onCropChange={setCrop}
                  onCropComplete={(croppedArea, croppedPixels) => {
                    setCroppedAreaPixels(croppedPixels)
                  }}
                  onZoomChange={setZoom}
                />
              </div>

              <div className="crop-controls">
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  onChange={(e) => setZoom(Number(e.target.value))}
                />

                <div className="crop-buttons">
                  <button onClick={handleCropAndUpload}>
                    Salvar
                  </button>

                  <button onClick={handleCancelCrop}>
                    Cancelar
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        <label className="edit-photo-label">
          Editar foto
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg"
            onChange={async (e) => {
              const file = e.target.files[0]
              if (!file) return

              const allowedTypes = ["image/jpeg", "image/png"]

              if (!allowedTypes.includes(file.type)) {
                alert("Só JPG ou PNG")
                return
              }
              
              const url = URL.createObjectURL(file)
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
    >

      {/* ESQUERDA */}
      <div className="perfil-coluna">
        {/* 4. TROCADO O RÁDIO POR UM SWITCH COMPLETO */}
       <div className="switch-container">
          <span>Possui endereço físico?</span>
          <input
            type="checkbox"
            checked={!!form.physical_address}
            onChange={() => handleSwitch("physical_address")}
          />
        </div>
        
        <input name="name" value={form.name} onChange={handleChange} placeholder="Nome" className="input-style" />

        <textarea
          name="bio"
          value={form.bio}
          onChange={handleChange}
          placeholder="Bio"
          className="input-default textarea-bio"
        />

        <div className="row-flex">
          {/* Estado (Select) */}
          <select 
            name="state" 
            value={form.state} 
            onChange={handleChange} 
            className="input-default select-small"
          >
            <option value="" disabled>UF</option>
            {estadosBR.map((sigla) => (
              <option key={sigla} value={sigla}>
                {sigla}
              </option>
            ))}
          </select>
          <input name="city" value={form.city} onChange={handleChange} placeholder="Cidade" className="input-style" />
        </div>

        {form?.physical_address === true && (
          <>
            <input name="neighborhood" value={form.neighborhood} onChange={handleChange} placeholder="Bairro" className="input-style" />
            <input name="address" value={form.address} onChange={handleChange} placeholder="Logradouro" className="input-style" />

            <div className="row-flex">
              <input name="address_number" value={form.address_number} onChange={handleChange} placeholder="Nº" className="input-style" />
              <input name="address_complement" value={form.address_complement} onChange={handleChange} placeholder="Complemento" className="input-style"/>
            </div>
          </>
        )}

        {/* DOADOR */}
        {form?.is_donor === true && (
          <>
            <div className="switch-container">
              <span>Retirada no local</span>
              <input
                type="checkbox"
                checked={form.local_pickup}
                onChange={() => handleSwitch("local_pickup")}
              />
            </div>

            <div className="switch-container switch-container-spaced">
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

      <div className="perfil-coluna">

        <div className="column-flex">
          {/* RECEBEDOR */}
          {form?.is_donor == false  && (
            <>
              <div className="switch-container">
                <span>Aceitando doação</span>
                <input
                  type="checkbox"
                  checked={form.accept_donation}
                  onChange={() => handleSwitch("accept_donation")}
                />
              </div>

              <div className="switch-container switch-container-spaced">
                <span>Aceita alimento para pet</span>
                <input
                  type="checkbox"
                  checked={form.pet_donation}
                  onChange={() => handleSwitch("pet_donation")}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                <label className="label-default">
                  Restrições de certos alimentos
                </label>

                <textarea
                  name="food_restrictions"
                  value={form.food_restrictions}
                  onChange={handleChange_sugestion}
                  placeholder="Ex: congelados, carne, bebidas"
                  className="input-default"
                />
                {suggestions.length > 0 && (
                  <ul className="suggestions-list">
                    {suggestions.map((s, index) => (
                      <li
                        key={index}
                        onMouseDown={(e) => {
                          e.preventDefault(); // 🔥 impede perder o foco
                          handleSuggestionClick(s);
                        }}
                        className="suggestion-item"
                      >
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>

        {form?.is_donor === true && (
          <div style={{ width: "100%", height: "100%"}}>
            <label  className="food-title">
              Alimentos Disponíveis
            </label>

            {/* CABEÇALHO DAS COLUNAS */}
            <div className="food-header">
              <span className="header-label-item">Item</span>
              <span className="header-label-tamanho">Tamanho / Medida</span>
              <span className="header-label-qty">Quantidade</span>
            </div>

            <div className="food-container">
              {foodList.map((row, index) => (
                <div key={index} className = "row-flex">
                  <div className="food-row">
                    
                    {/* 1. SELETOR DO ITEM */}
                    <div className="custom-select-wrapper" style={{ flex: 1, minWidth: "150px" }}>
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
                          
                          <div className="options-list">
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
                                      newList[index].customItem = "";
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

                    {/* 2. TAMANHO/MEDIDA (Ex: 2 Litros) */}
                    <div className="measure-group">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="Ex: 2"
                        value={row.measureValue ?? ""}
                        
                        // DIGITAÇÃO LIVRE
                        onChange={(e) => {
                          handleFoodChange(index, "measureValue", e.target.value);
                        }}

                        // VALIDAÇÃO DEPOIS
                        onBlur={(e) => {
                          let value = Number(e.target.value);

                          if (!value || value < 1) value = 1;

                          handleFoodChange(index, "measureValue", value);
                        }}

                        className="input-default-food"
                      />

                      <select
                        value={row.unit}
                        onChange={(e) => handleFoodChange(index, "unit", e.target.value)}
                        className="input-style-food"
                      >
                        <option value="un">un</option>
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                        <option value="L">L</option>
                        <option value="ml">ml</option>
                      </select>
                    </div>

                    {/* 3. QUANTIDADE FINAL (Ex: 5 unidades) */}
                    {row.unit !== 'un' ? (
                      <div className="quantity-group">
                        <input
                          type="number"
                          min="1"
                          value={row.quantity}

                          // DIGITAÇÃO LIVRE
                          onChange={(e) => {
                            handleFoodChange(index, "quantity", e.target.value);
                          }}

                          // VALIDAÇÃO NO FINAL
                          onBlur={(e) => {
                            let value = Number(e.target.value);

                            if (!value || value < 1) value = 1;

                            handleFoodChange(index, "quantity", value);
                          }}

                          className="input-style-quantity"
                        />

                        <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "bold" }}>
                          un
                        </span>
                      </div>
                    ) : (
                      <div style={{ width: "100%" }}></div>
                    )}

                    {/* REMOVER */}
                    <button 
                      type="button"
                      onClick={() => handleRemoveFoodRow(index)}
                      className="btn-remove-food-circle spaced"
                    >
                      ✕
                    </button>
                  </div>

                  {/* CAMPO EXTRA PARA "OUTRO" */}
                  {row.item === "Outro" && (
                    <div className="custom-input-wrapper">
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
                            newList[index].item = row.customItem.trim();
                            newList[index].customItem = "";
                            setFoodList(newList);
                          }
                        }}
                        autoFocus
                        className="custom-input"
                      />
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
    <div className="footer-actions">
      <button onClick={handleSave} className="btn-primary-prof_edition">
        Salvar Alterações
      </button>
      <button onClick={() => navigate(-1)} className="btn-secondary-prof_edition">
        Sair
      </button>
    </div>

  </div>
  )
  
}

export default EditProfile;