import React, { useEffect, useRef, useState } from 'react';
import { CheckIcon, TrashIcon, StarIcon, CalendarIcon } from 'lucide-react';
import Loading from '../../components/Loading';
import Title from '../../components/admin/Title';
import { kConverter } from '../../lib/kConverter';
import { useAppContext } from '../../context/AppContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const AddShows = () => {
  const { getToken, user, image_base_url } = useAppContext();
  const currency = import.meta.env.VITE_CURRENCY;

  const [nowPlayingMovies, setNowPlayingMovies] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [dateTimeSelection, setDateTimeSelection] = useState({});
  const [showPrice, setShowPrice] = useState('');
  const [dateTimeInput, setDateTimeInput] = useState('');
  const [addingShow, setAddingShow] = useState(false);

  const inputRef = useRef(null);

  const fetchNowPlayingMovies = async () => {
    try {
      const token = await getToken();
      const { data } = await axios.get('/api/show/now-playing', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        setNowPlayingMovies(data.movies);
      }
    } catch (error) {
      console.error('Error fetching movies:', error);
    }
  };

  const handleDateTimeAdd = () => {
    if (!dateTimeInput) return;
    const [date, time] = dateTimeInput.split('T');
    if (!date || !time) return;

    setDateTimeSelection((prev) => {
      const times = prev[date] || [];
      if (!times.includes(time)) {
        return { ...prev, [date]: [...times, time] };
      }
      toast.error('This time is already added');
      return prev;
    });
    setDateTimeInput('');
  };

  const handleRemoveTime = (date, time) => {
    setDateTimeSelection((prev) => {
      const filtered = prev[date].filter((t) => t !== time);
      if (filtered.length === 0) {
        const { [date]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [date]: filtered };
    });
  };

  const handleSubmit = async () => {
    try {
      setAddingShow(true);

      if (!selectedMovie || Object.keys(dateTimeSelection).length === 0 || !showPrice) {
        toast.error('Missing required fields');
        setAddingShow(false);
        return;
      }

      const showsInput = Object.entries(dateTimeSelection)
        .flatMap(([date, times]) =>
          (Array.isArray(times) ? times : [times]).map((time) => ({ date, time }))
        );

      const payload = {
        movieId: selectedMovie,
        showsInput,
        showPrice: Number(showPrice),
      };

      const token = await getToken();
      const { data } = await axios.post('/api/show/add', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        toast.success(data.message);
        setSelectedMovie(null);
        setDateTimeSelection({});
        setShowPrice('');
        setDateTimeInput('');
      } else {
        toast.error(data.message || 'Failed to add show');
      }
    } catch (error) {
      console.error(error);
      toast.error('An error occurred, please try again.');
    } finally {
      setAddingShow(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNowPlayingMovies();
    }
  }, [user]);

  return nowPlayingMovies.length > 0 ? (
    <>
      <Title text1="Add" text2="Shows" />
      <p className="mt-10 text-lg font-medium">Now Playing Movies</p>

      <div className="overflow-x-auto pb-4">
        <div className="group flex flex-wrap gap-4 mt-4 w-max">
          {nowPlayingMovies.map((movie) => (
            <div
              key={movie.id}
              className={`relative max-w-40 cursor-pointer group-hover:not-hover:opacity-40 hover:-translate-y-1 transition duration-300`}
              onClick={() => setSelectedMovie(movie.id)}
            >
              <div className="relative rounded-lg overflow-hidden">
                <img
                  src={`${image_base_url}${movie.poster_path}`}
                  alt={movie.title}
                  className="w-full object-cover brightness-90"
                />
                <div className="text-sm flex items-center justify-between p-2 bg-black/70 w-full absolute bottom-0 left-0">
                  <p className="flex items-center gap-1 text-gray-400">
                    <StarIcon className="w-4 h-4 text-primary fill-primary" />
                    {movie.vote_average.toFixed(1)}
                  </p>
                  <p className="text-gray-300">{kConverter(movie.vote_count)} Votes</p>
                </div>
              </div>
              {selectedMovie === movie.id && (
                <div className="absolute top-2 right-2 flex items-center justify-center bg-primary h-6 w-6 rounded">
                  <CheckIcon className="w-4 h-4 text-white" strokeWidth={2.5} />
                </div>
              )}
              <p className="font-medium truncate">{movie.title}</p>
              <p className="text-gray-400 text-sm">{movie.release_date}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <label className="inline-flex items-center gap-2 border border-gray-600 px-3 py-2 rounded-md">
          <p className="text-gray-400 text-sm">{currency}</p>
          <input
            type="number"
            value={showPrice}
            onChange={(e) => setShowPrice(e.target.value)}
            placeholder="Enter show price"
            className="outline-none bg-transparent text-white"
          />
        </label>
      </div>

      <div className="mt-6">
        <label className="block text-sm font-medium mb-2">Select Date and Time</label>
        <div className="relative inline-flex items-center gap-2 border border-gray-600 rounded-lg px-3 py-2">
          <CalendarIcon
            className="w-4 h-4 text-gray-400 cursor-pointer"
            onClick={() => inputRef.current?.showPicker()}
          />
          <input
            ref={inputRef}
            type="datetime-local"
            value={dateTimeInput}
            onChange={(e) => setDateTimeInput(e.target.value)}
            className="bg-transparent outline-none text-white"
          />
          <button
            onClick={handleDateTimeAdd}
            className="ml-4 bg-red-500 text-white px-3 py-2 text-sm rounded-lg hover:bg-red-600 cursor-pointer"
          >
            Add Time
          </button>
        </div>
      </div>

      {Object.keys(dateTimeSelection).length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 font-semibold text-lg">Selected Date & Time</h2>
          <ul className="space-y-3">
            {Object.entries(dateTimeSelection).map(([date, times]) => (
              <li key={date}>
                <div className="font-medium">{date}</div>
                <div className="flex flex-wrap gap-2 mt-1 text-sm">
                  {(Array.isArray(times) ? times : [times]).map((time) => (
                    <div
                      key={time}
                      className="border border-primary px-2 py-1 flex items-center rounded"
                    >
                      <span>{time}</span>
                      <TrashIcon
                        onClick={() => handleRemoveTime(date, time)}
                        width={15}
                        className="ml-2 text-red-500 hover:text-red-700 cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={!addingShow ? handleSubmit : null}
        disabled={addingShow}
        className={`ml-4 px-8 py-2 mt-6 rounded transition-all 
          ${addingShow ? 'bg-gray-500 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600 cursor-pointer'} 
          text-white`}
      >
        {addingShow ? 'Adding...' : 'Add Show'}
      </button>
    </>
  ) : (
    <Loading />
  );
};

export default AddShows;





