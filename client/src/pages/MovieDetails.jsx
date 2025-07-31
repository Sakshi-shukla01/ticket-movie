import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { StarIcon, Heart, PlayCircle as PlayCircleIcon } from 'lucide-react';
import BlurCircle from '../components/BlurCircle';
import DateSelect from '../components/DateSelect';
import MovieCard from '../components/MovieCard';
import timeFormat from '../lib/timeFormat';
import Loading from '../components/Loading';
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';

const MovieDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [show, setShow] = useState(null);

  const {
    shows,
    axios,
    getToken,
    user,
    fetchFavoriteMovies,
    favoriteMovies,
    image_base_url,
  } = useAppContext();

  // ✅ Fix: properly set the show data
  const getShow = async () => {
    try {
      const { data } = await axios.get(`/api/show/${id}`);
      if (data.success && data.show) {
        setShow(data.show); // ✅ Use only the show object
      } else {
        toast.error('Movie not found');
      }
    } catch (error) {
      console.log(error);
      toast.error('Error fetching movie');
    }
  };

  const handleFavorite = async () => {
    try {
      if (!user) return toast.error('Please login to proceed');
      const token = await getToken();
      const { data } = await axios.post(
        '/api/user/update-favorite',
        { movieId: show.movie._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        await fetchFavoriteMovies();
        toast.success(data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getShow();
  }, [id]);

  return show?.movie ? (
    <div className="px-6 md:px-16 lg:px-40 pt-30 md:pt-50">
      <div className="flex flex-col md:flex-row gap-8 max-w-6xl mx-auto">
        <img
          src={image_base_url + show.movie.poster_path}
          alt={show.movie.title}
          className="max-md:mx-auto rounded-xl h-104 max-w-70 object-cover"
        />

        <div className="relative flex flex-col gap-3">
          <BlurCircle top="-100px" left="-100px" />
          <p className="text-primary uppercase">{show.movie.original_language || 'Language'}</p>
          <h1 className="text-4xl font-semibold max-w-96 text-balance">
            {show.movie.title}
          </h1>

          <div className="flex items-center gap-2 text-gray-300">
            <StarIcon className="w-5 h-5 text-primary fill-primary" />
            {show.movie.vote_average?.toFixed(1)} User Rating
          </div>

          <p className="text-gray-400 mt-2 text-sm leading-tight max-w-xl">
            {show.movie.overview}
          </p>

          <p className="text-sm text-gray-400">
            {timeFormat(show.movie.runtime)} •{' '}
            {show.movie.genres.map((genre) => genre.name).join(', ')} •{' '}
            {show.movie.release_date.split('-')[0]}
          </p>

          <div className="flex items-center gap-4 mt-4">
            <button className="flex items-center gap-2 px-7 py-3 text-sm bg-gray-800 hover:bg-gray-900 transition rounded-md font-medium text-white cursor-pointer active:scale-95">
              <PlayCircleIcon className="w-5 h-5" />
              Watch Trailer
            </button>

            <a
              href="#dateSelect"
              className="px-10 py-3 text-sm bg-gradient-to-r from-red-500 via-orange-500 to-pink-500 hover:brightness-110 transition rounded-md font-medium text-white cursor-pointer active:scale-95"
            >
              Buy Tickets
            </a>

            <button
              onClick={handleFavorite}
              className="bg-gray-700 p-2.5 rounded-full transition cursor-pointer active:scale-95"
            >
              <Heart
                className={`w-5 h-5 transition ${
                  favoriteMovies.some(
                    (movie) => String(movie._id) === String(show.movie._id)
                  )
                    ? 'text-red-600 fill-red-600'
                    : 'text-white fill-none'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Cast Section */}
      {show.movie?.casts?.length > 0 && (
        <>
          <p className="text-lg font-medium mt-20">Your favorite Cast</p>
          <div className="overflow-x-auto no-scrollbar mt-8 pb-4">
            <div className="flex items-center gap-4 w-max px-4">
              {show.movie.casts.slice(0, 12).map((cast, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center text-center"
                >
                  <img
                    src={image_base_url + cast.profile_path}
                    alt={cast.name}
                    className="rounded-full h-20 md:h-20 aspect-square object-cover"
                  />
                  <p className="font-medium text-xs mt-3">{cast.name}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Date Selection */}
      <DateSelect dateTime={show.dateTime} id={id} />

      {/* Suggested Movies */}
      <p className="text-lg font-medium mt-20 mb-8">You may also like</p>
      <div className="flex flex-wrap max-sm:justify-center gap-8">
        {shows?.slice(0, 4).map((movie, index) => (
          <MovieCard key={index} movie={movie} />
        ))}
      </div>

      <div className="flex justify-center mt-20">
        <button
          onClick={() => {
            navigate('/movies');
            scrollTo(0, 0);
          }}
          className="px-10 py-3 text-sm bg-red-600 hover:bg-red-700 text-white transition rounded-md font-medium cursor-pointer"
        >
          Show more
        </button>
      </div>
    </div>
  ) : (
    <Loading />
  );
};

export default MovieDetails;
