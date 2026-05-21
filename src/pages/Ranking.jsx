import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; 
import { getDonorRanking } from "../services/rankingService";
import { get_profile_photo_Url } from "../services/mediaService";
import { getCurrentUser } from "../services/authService";
import BackButton from "../components/BackButton"
import "../css/ranking.css";

function Ranking() {
    const [donors, setDonors] = useState([]);
    const [search, setSearch] = useState("");
    const [profile, setProfile] = useState(null);
    const [user, setUser] = useState(null);
    const navigate = useNavigate()

    useEffect(() => {
        loadRanking();
    }, []);

    async function loadRanking() {
        const data = await getDonorRanking();
        setDonors(data);
    }

    const filtered = donors.filter(d =>
        d.name?.toLowerCase().includes(search.toLowerCase())
    );

    return (

        <div className="ranking-wrapper">

            {/* HEADER FULL WIDTH */}
            <div className="ranking-header">
                <BackButton />
                <h2>🏆 Ranking de Doadores</h2>
            </div>
            <div className="ranking-page">            
                {/* Busca */}
                <input
                    type="text"
                    placeholder="Buscar por nome..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="search-input"
                />

                {/* Lista */}
                <div className="ranking-list">
                    {filtered.map((donor, index) => (
                    <div key={donor.id} className="ranking-card" onClick={() => navigate( `/profile/${donor.id}`)}>

                        {/* POSIÇÃO */}
                        <div className="ranking-position">
                        #{index + 1}
                        </div>

                        {/* 👤 FOTO */}
                        <img
                        src={
                            donor.photo_url
                            ? get_profile_photo_Url(donor.photo_url)
                            : "/default_user.png"
                        }
                        alt="profile"
                        className="ranking-photo"
                        />

                        {/* 📛 INFO */}
                        <div className="ranking-info">
                        <span className="name">{donor.name}</span>
                        <span className="points">🏆 {donor.points || 0} pts</span>
                        </div>

                    </div>
                    ))}
                </div>

            </div>
        </div>
    );
}

export default Ranking;