// src/context/AppContext.jsx
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

// ✅ Set Axios base URL globally
axios.defaults.baseURL = import.meta.env.VITE_BASE_URL;

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true); // ✅ NEW
  const [shows, setShows] = useState([]);
  const [favoriteMovies, setFavoriteMovies] = useState([]);

  const image_base_url = import.meta.env.VITE_TMDB_IMAGE_BASE_URL;

  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // ✅ Fetch all shows
  const fetchShows = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/show/all");
      if (data?.success) setShows(data?.shows || []);
      else toast.error(data?.message || "Failed to fetch shows");
    } catch (error) {
      console.error("❌ Failed to fetch shows", error);
    }
  }, []);

  // ✅ Admin Check (NEW: adminLoading + no redirect until check completes)
  const fetchIsAdmin = useCallback(async () => {
    setAdminLoading(true); // ✅ NEW
    try {
      const token = await getToken();
      if (!token) {
        setIsAdmin(false);
        return;
      }

      const res = await axios.get("/api/admin/is-admin", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const ok = Boolean(res.data?.isAdmin);
      setIsAdmin(ok);

      // ✅ redirect only after check finished + not admin
      if (!ok && location.pathname.startsWith("/admin")) {
        toast.error("You are not authorized to access the admin dashboard");
        navigate("/");
      }
    } catch (error) {
      const status = error?.response?.status;

      // ✅ non-admin or unauthorized is normal
      if (status === 401 || status === 403) {
        setIsAdmin(false);
        if (location.pathname.startsWith("/admin")) navigate("/");
        return;
      }

      console.error("❌ Admin check failed", error);
      setIsAdmin(false);
    } finally {
      setAdminLoading(false); // ✅ NEW
    }
  }, [getToken, location.pathname, navigate]);

  // ✅ Fetch favorites
  const fetchFavoriteMovies = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        setFavoriteMovies([]);
        return;
      }

      const { data } = await axios.get("/api/user/favorites", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const raw = data?.movies || data?.favorites || [];
      const normalized = Array.isArray(raw) ? raw.map((x) => x?.movie ?? x) : [];
      setFavoriteMovies(normalized);
    } catch (error) {
      console.error("❌ Failed to fetch favorite movies", error);
      setFavoriteMovies([]);
    }
  }, [getToken]);

  // ✅ Toggle favorite movie
  const updateFavoriteMovies = useCallback(
    async (movieId) => {
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

        if (data?.success) {
          await fetchFavoriteMovies();
          toast.success(data?.message || "Favorites updated");
        } else {
          toast.error(data?.message || "Failed to update favorites");
        }
      } catch (error) {
        console.error("❌ Error updating favorite", error);
        toast.error("Failed to update favorites");
      }
    },
    [getToken, fetchFavoriteMovies]
  );

  // ✅ Load shows once
  useEffect(() => {
    fetchShows();
  }, [fetchShows]);

  // ✅ Load user-based data
  useEffect(() => {
    if (!isLoaded) return;

    if (user) {
      fetchIsAdmin();
      fetchFavoriteMovies();
    } else {
      // logout → reset
      setIsAdmin(false);
      setAdminLoading(false); // ✅ NEW
      setFavoriteMovies([]);
    }
  }, [isLoaded, user, fetchIsAdmin, fetchFavoriteMovies]);

  const value = useMemo(
    () => ({
      user,
      isLoaded, // ✅ expose isLoaded too (helps in App.jsx)
      getToken,
      navigate,
      isAdmin,
      adminLoading, // ✅ NEW
      shows,
      favoriteMovies,
      fetchFavoriteMovies,
      updateFavoriteMovies,
      fetchIsAdmin,
      image_base_url,
      axios,
    }),
    [
      user,
      isLoaded,
      getToken,
      navigate,
      isAdmin,
      adminLoading,
      shows,
      favoriteMovies,
      fetchFavoriteMovies,
      updateFavoriteMovies,
      fetchIsAdmin,
      image_base_url,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
};
