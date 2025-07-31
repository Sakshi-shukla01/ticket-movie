import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

// ✅ Set Axios base URL globally
axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [shows, setShows] = useState([]);
  const [favoriteMovies, setFavoriteMovies] = useState([]);
  const image_base_url = import.meta.env.VITE_TMDB_IMAGE_BASE_URL;

  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // ✅ Admin Check
  const fetchIsAdmin = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const res = await axios.get("/api/admin/is-admin", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setIsAdmin(res.data?.isAdmin || false);

      if (!res.data?.isAdmin && location.pathname.startsWith("/admin")) {
        toast.error("You are not authorized to access the admin dashboard");
        navigate("/");
      }
    } catch (error) {
      console.error("❌ Admin check failed", error);
    }
  };

  // ✅ Fetch all shows
  const fetchShows = async () => {
    try {
      const { data } = await axios.get("/api/show/all");
      if (data.success) {
        setShows(data.shows);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("❌ Failed to fetch shows", error);
    }
  };

  // ✅ Fetch user's favorites
  const fetchFavoriteMovies = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const { data } = await axios.get("/api/user/favorites", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        setFavoriteMovies(data.movies);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("❌ Failed to fetch favorite movies", error);
    }
  };

  // ✅ Toggle favorite movie
  const updateFavoriteMovies = async (movieId) => {
    try {
      const token = await getToken();
      if (!token) {
        toast.error("Please login to proceed");
        return;
      }

      const { data } = await axios.post(
        "/api/user/update-favorite",
        { movieId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        await fetchFavoriteMovies(); // update state
        toast.success("Favorite movies updated");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("❌ Error updating favorite", error);
    }
  };

  // ✅ Load shows once
  useEffect(() => {
    fetchShows();
  }, []);

  // ✅ Load Clerk-based data
  useEffect(() => {
    if (isLoaded && user) {
      fetchIsAdmin();
      fetchFavoriteMovies();
    }
  }, [isLoaded, user]);

  const value = {
    user,
    getToken,
    navigate,
    isAdmin,
    shows,
    favoriteMovies,
    fetchFavoriteMovies,
    updateFavoriteMovies,
    fetchIsAdmin,
    image_base_url,
    axios,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// ✅ Custom hook
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};
