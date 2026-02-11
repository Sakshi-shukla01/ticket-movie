import React from 'react';
import { useNavigate } from 'react-router-dom';
import { StarIcon, Heart } from 'lucide-react';
import timeFormat from '../lib/timeFormat';
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';

const MovieCard = ({ movie }) => {
  const navigate = useNavigate();
  const { image_base_url, favoriteMovies, updateFavoriteMovies } = useAppContext();

  if (!movie) return null;

  // ✅ FIX: works whether `movie` is a Show (movie.movie._id) or Movie (movie._id / movie.id)
  const movieId = movie?.movie?._id || movie?._id || movie?.id;
  if (!movieId) return null;

  // ✅ FIX: support show.movie fields too
  const actualMovie = movie.movie ? movie.movie : movie;

  const imageUrl =
    image_base_url + (actualMovie.backdrop_path || actualMovie.poster_path || '');

 const isFavorite = favoriteMovies.some(
  (fav) => String(fav._id) === String(movieId)
);

  const toggleFavorite = async (e) => {
    e.stopPropagation();
    try {
      await updateFavoriteMovies(movieId);
    } catch (error) {
      console.error('❌ Favorite toggle failed', error);
      toast.error('Failed to update favorites');
    }
  };

  return (
    <div className="relative flex flex-col justify-between p-3 bg-gray-800 rounded-2xl hover:-translate-y-1 transition duration-300 w-66">
      <Heart
        onClick={toggleFavorite}
        className={`absolute top-3 right-3 w-5 h-5 cursor-pointer z-10 transition duration-200 ${
          isFavorite ? 'text-red-500 fill-red-500' : 'text-white'
        }`}
      />

      <img
        onClick={() => {
          navigate(`/movies/${movieId}`);
          scrollTo(0, 0);
        }}
        src={imageUrl}
        alt={actualMovie.title || 'Movie Poster'}
        className="rounded-lg h-52 w-full object-cover object-right-bottom cursor-pointer"
      />

      <p className="font-semibold mt-2 truncate">{actualMovie.title}</p>

      <p className="text-sm text-gray-400 mt-2">
        {actualMovie.release_date
          ? new Date(actualMovie.release_date).getFullYear()
          : 'N/A'}{' '}
        ●{' '}
        {actualMovie.genres?.slice(0, 2).map((genre) => genre.name).join(' | ') ||
          'N/A'}{' '}
        ● {actualMovie.runtime ? timeFormat(actualMovie.runtime) : 'N/A'}
      </p>

      <div className="flex items-center justify-between mt-4 pb-3">
        <button
          onClick={() => {
            navigate(`/movies/${movieId}`);
            scrollTo(0, 0);
          }}
          className="px-4 py-2 text-xs bg-red-600 hover:bg-red-700 transition rounded-full font-medium cursor-pointer"
        >
          Buy Tickets
        </button>

        <p className="flex items-center gap-1">
          <StarIcon className="w-4 h-4 text-red-600 fill-red-600" />
          {actualMovie.vote_average?.toFixed(1) || 'N/A'}
        </p>
      </div>
    </div>
  );
};

export default MovieCard;
