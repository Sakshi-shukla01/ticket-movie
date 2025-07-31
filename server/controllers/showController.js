import axios from "axios";
import Show from "../models/Show.js";
import Movie from "../models/Movie.js";

// ✅ 1. Get Now Playing Movies (from TMDB)
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

    const movies = data.results;
    res.json({ success: true, movies });
  } catch (error) {
    console.error("❌ Error fetching now playing movies:", error);
    res.json({ success: false, message: error.message });
  }
};

// ✅ 2. Add Show (used by admin to add new shows)
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

      const movieDetails = {
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
      };

      movie = await Movie.create(movieDetails);
    }

    const showsToCreate = showsInput.map((show) => {
      const { date, time } = show;
      const dateTimeString = `${date}T${time}`;
      return {
        movie: movieId,
        showDateTime: new Date(dateTimeString),
        showPrice,
        occupiedSeats: {},
      };
    });

    if (showsToCreate.length > 0) {
      await Show.insertMany(showsToCreate);
    }

    res.json({ success: true, message: "Show Added successfully." });
  } catch (error) {
    console.error("❌ Error adding show:", error);
    res.json({ success: false, message: error.message });
  }
};

// ✅ 3. Get All Shows for a Movie (used for SeatLayout)
export const getShow = async (req, res) => {
  try {
    const { movieId } = req.params;
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

    const showData = {
      _id: movieId,
      movie,
      dateTime,
    };

    res.json({ success: true, show: showData });
  } catch (error) {
    console.error("❌ Error in getShow:", error);
    res.json({ success: false, message: error.message });
  }
};

// ✅ 4. Get All Unique Shows (for Home/Explore page)
export const getShows = async (req, res) => {
  try {
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

    res.json({ success: true, shows: uniqueMovies });
  } catch (error) {
    console.error("❌ Error fetching shows:", error);
    res.json({ success: false, message: error.message });
  }
};

// ✅ 5. Admin Panel: Get All Shows
export const getAllShows = async (req, res) => {
  try {
    const shows = await Show.find({}).populate("movie").sort({ createdAt: -1 });
    res.json({ success: true, shows });
  } catch (err) {
    console.error("❌ Error fetching shows:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ 6. Admin Panel: Create Show
export const createShow = async (req, res) => {
  try {
    const showData = req.body;
    const show = await Show.create(showData);
    res.status(201).json({ success: true, show, message: "Show created successfully" });
  } catch (err) {
    console.error("❌ Error creating show:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ 7. Admin Panel: Update Show
export const updateShow = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const show = await Show.findByIdAndUpdate(id, updateData, { new: true }).populate("movie");

    if (!show) {
      return res.status(404).json({ success: false, message: "Show not found" });
    }

    res.json({ success: true, show, message: "Show updated successfully" });
  } catch (err) {
    console.error("❌ Error updating show:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ 8. Admin Panel: Delete Show
export const deleteShow = async (req, res) => {
  try {
    const { id } = req.params;
    const show = await Show.findByIdAndDelete(id);

    if (!show) {
      return res.status(404).json({ success: false, message: "Show not found" });
    }

    res.json({ success: true, message: "Show deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting show:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
