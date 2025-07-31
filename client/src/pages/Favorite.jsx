import React from 'react';
import MovieCard from '../components/MovieCard';
import BlurCircle from '../components/BlurCircle';
import { useAppContext } from '../context/AppContext';

const Favorite = () => {
  const { favoriteMovies } = useAppContext();

  return favoriteMovies.length > 0 ? (
    <div className="relative my-40 mb-60 px-6 md:px-16 lg:px-40 xl:px-44 overflow-hidden min-h-[80vh]">
      <BlurCircle top="150px" left="0px" />
      <BlurCircle bottom="50px" right="50px" />
      <h1 className="text-2xl font-bold text-white mb-6">Your Favorite Movies</h1>

      <div className="flex flex-wrap gap-8 justify-center">
        {favoriteMovies.map((movie) => (
          <MovieCard key={movie._id || movie.id} movie={movie} />
        ))}
      </div>
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center h-screen text-white text-center">
      <h1 className="text-3xl font-bold">No favorite movies found.</h1>
      <p className="text-sm text-gray-400 mt-2">Start exploring and add some favorites!</p>
    </div>
  );
};

export default Favorite;
