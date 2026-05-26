import axios from "axios";
import Show from "../models/Show.js";
import Movie from "../models/Movie.js";
import redis from "../configs/redis.js";

// Cache TTLs
const TTL = {
  shows:    5 * 60,   // 5 min — show listings
  show:     2 * 60,   // 2 min — single show with seats
  movie:    60 * 60,  // 1 hour — movie details rarely change
  allShows: 60,       // 1 min — admin panel, needs fresh data
};

// Key conventions matching your models
const KEYS = {
  shows:       ()        => `shows:all`,
  showByMovie: (movieId) => `shows:movie:${movieId}`,
  movie:       (movieId) => `movie:${movieId}`,
  allShows:    ()        => `admin:shows:all`,
};

// Helper — bust multiple keys at once
const bust = async (...keys) => {
  if (keys.length) await redis.del(...keys);
};

// ✅ 1. Get Now Playing Movies (TMDB — no caching, always fresh)
export const getNowPlayingMovies = async (req, res) => {
  try {
    const { data } = await axios.get(
      "https://api.themoviedb.org/3/movie/now_playing",
      {
        headers: {
          Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
        },
      }
    );
    res.json({ success: true, movies: data.results });
  } catch (error) {
    console.error("❌ Error fetching now playing movies:", error);
    res.json({ success: false, message: error.message });
  }
};

// ✅ 2. Add Show — bust show caches after adding
export const addShow = async (req, res) => {
  try {
    const { movieId, showsInput, showPrice } = req.body;

    let movie = await Movie.findById(movieId);
    if (!movie) {
      const [movieDetailsResponse, movieCreditsResponse] = await Promise.all([
        axios.get(`https://api.themoviedb.org/3/movie/${movieId}`, {
          headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
        }),
        axios.get(`https://api.themoviedb.org/3/movie/${movieId}/credits`, {
          headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
        }),
      ]);

      const movieApiData = movieDetailsResponse.data;
      const movieCreditsData = movieCreditsResponse.data;

      movie = await Movie.create({
        _id: movieId,
        title: movieApiData.title,
        overview: movieApiData.overview,
        poster_path: movieApiData.poster_path,
        backdrop_path: movieApiData.backdrop_path,
        genres: movieApiData.genres,
        casts: movieCreditsData.cast,
        release_date: movieApiData.release_date,
        original_language: movieApiData.original_language,
        tagline: movieApiData.tagline || "",
        vote_average: movieApiData.vote_average,
        runtime: movieApiData.runtime,
      });
    }

    const showsToCreate = showsInput.map(({ date, time }) => ({
      movie: movieId,
      showDateTime: new Date(`${date}T${time}`),
      showPrice,
      occupiedSeats: {},
    }));

    if (showsToCreate.length > 0) {
      await Show.insertMany(showsToCreate);
    }

    // Bust all show-related caches after new show added
    await bust(
      KEYS.shows(),
      KEYS.showByMovie(movieId),
      KEYS.movie(movieId),
      KEYS.allShows()
    );

    res.json({ success: true, message: "Show Added successfully." });
  } catch (error) {
    console.error("❌ Error adding show:", error);
    res.json({ success: false, message: error.message });
  }
};

// ✅ 3. Get All Shows for a Movie — cached per movieId
export const getShow = async (req, res) => {
  try {
    const { movieId } = req.params;
    const cacheKey = KEYS.showByMovie(movieId);

    // Check Redis first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json({ success: true, show: JSON.parse(cached) });
    }

    const movie = await Movie.findById(movieId);
    if (!movie) {
      return res.json({ success: false, message: "Movie not found" });
    }

    const shows = await Show.find({
      movie: movieId,
      showDateTime: { $gte: new Date() },
    });

    const dateTime = {};
    shows.forEach((show) => {
      const date = show.showDateTime.toISOString().split("T")[0];
      if (!dateTime[date]) dateTime[date] = [];
      dateTime[date].push({
        time: show.showDateTime,
        showId: show._id,
        price: show.showPrice || 100,
      });
    });

    const showData = { _id: movieId, movie, dateTime };

    // Cache the result
    await redis.setex(cacheKey, TTL.show, JSON.stringify(showData));

    res.json({ success: true, show: showData });
  } catch (error) {
    console.error("❌ Error in getShow:", error);
    res.json({ success: false, message: error.message });
  }
};

// ✅ 4. Get All Unique Shows for Home/Explore — cached globally
export const getShows = async (req, res) => {
  try {
    const cacheKey = KEYS.shows();

    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json({ success: true, shows: JSON.parse(cached) });
    }

    const shows = await Show.find({ showDateTime: { $gte: new Date() } })
      .populate("movie")
      .sort({ showDateTime: 1 });

    const uniqueMovies = [];
    const movieSet = new Set();
    shows.forEach((show) => {
      if (!movieSet.has(show.movie._id.toString())) {
        movieSet.add(show.movie._id.toString());
        uniqueMovies.push(show.movie);
      }
    });

    await redis.setex(cacheKey, TTL.shows, JSON.stringify(uniqueMovies));

    res.json({ success: true, shows: uniqueMovies });
  } catch (error) {
    console.error("❌ Error fetching shows:", error);
    res.json({ success: false, message: error.message });
  }
};

// ✅ 5. Admin: Get All Shows — short TTL, admin needs fresh data
export const getAllShows = async (req, res) => {
  try {
    const cacheKey = KEYS.allShows();

    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json({ success: true, shows: JSON.parse(cached) });
    }

    const shows = await Show.find({}).populate("movie").sort({ createdAt: -1 });

    await redis.setex(cacheKey, TTL.allShows, JSON.stringify(shows));

    res.json({ success: true, shows });
  } catch (err) {
    console.error("❌ Error fetching shows:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ 6. Admin: Create Show — bust caches after create
export const createShow = async (req, res) => {
  try {
    const show = await Show.create(req.body);

    await bust(KEYS.shows(), KEYS.allShows(), KEYS.showByMovie(show.movie));

    res.status(201).json({ success: true, show, message: "Show created successfully" });
  } catch (err) {
    console.error("❌ Error creating show:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ 7. Admin: Update Show — bust caches after update
export const updateShow = async (req, res) => {
  try {
    const { id } = req.params;
    const show = await Show.findByIdAndUpdate(id, req.body, { new: true }).populate("movie");

    if (!show) {
      return res.status(404).json({ success: false, message: "Show not found" });
    }

    await bust(
      KEYS.shows(),
      KEYS.allShows(),
      KEYS.showByMovie(show.movie._id)
    );

    res.json({ success: true, show, message: "Show updated successfully" });
  } catch (err) {
    console.error("❌ Error updating show:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ 8. Admin: Delete Show — bust caches after delete
export const deleteShow = async (req, res) => {
  try {
    const { id } = req.params;
    const show = await Show.findByIdAndDelete(id);

    if (!show) {
      return res.status(404).json({ success: false, message: "Show not found" });
    }

    await bust(
      KEYS.shows(),
      KEYS.allShows(),
      KEYS.showByMovie(show.movie)
    );

    res.json({ success: true, message: "Show deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting show:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};