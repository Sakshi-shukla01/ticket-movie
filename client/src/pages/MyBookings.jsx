import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import BlurCircle from '../components/BlurCircle';
import Loading from '../components/Loading';
import { dateFormat } from '../lib/dateFormat';
import timeFormat from '../lib/timeFormat';
import { useAppContext } from '../context/AppContext';

const MyBookings = () => {
  const currency = import.meta.env.VITE_CURRENCY || '₹';
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const {
    axios,
    getToken,
    user,
    image_base_url,
  } = useAppContext();

  const getMyBookings = async () => {
    try {
      const token = await getToken();
      const { data } = await axios.get('/api/booking/my', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        setBookings(data.bookings);
      }
    } catch (error) {
      console.error('❌ Error fetching bookings:', error.message);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (user) {
      getMyBookings();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  return isLoading ? (
    <Loading />
  ) : (
    <div className='relative px-6 md:px-16 lg:px-40 pt-30 md:pt-40 min-h-[80vh]'>
      <BlurCircle top="100px" left="100px" />
      <BlurCircle bottom="0px" left="600px" />

      <h1 className='text-lg font-semibold mb-4 text-white'>My Bookings</h1>

      {bookings.length === 0 ? (
        <p className='text-gray-400'>You haven’t booked any movies yet.</p>
      ) : (
        bookings.map((item, index) => (
          <div
            key={index}
            className="flex flex-col md:flex-row justify-between border border-gray-700 bg-black/40 rounded-xl mt-6 p-4 max-w-3xl shadow-lg"
          >
            {/* Movie Poster + Info */}
            <div className='flex flex-col md:flex-row gap-4'>
              <img
                src={image_base_url + item.show.movie.poster_path}
                alt={item.show.movie.title}
                className='md:w-40 w-full aspect-video object-cover object-bottom rounded-md'
              />
              <div className='flex flex-col justify-between text-white'>
                <p className='text-xl font-semibold'>{item.show.movie.title}</p>
                <p className='text-sm text-gray-400'>{timeFormat(item.show.movie.runtime)} mins</p>
                <p className='text-sm text-gray-400'>{dateFormat(item.show.showDateTime)}</p>
              </div>
            </div>

            {/* Booking Info */}
            <div className='flex flex-col md:items-end md:text-right justify-between p-4 text-white'>
              <div className='flex items-center gap-4'>
                <p className='text-2xl font-semibold mb-3'>{currency}{item.amount}</p>
                {!item.isPaid && item.paymentLink && (
                  <Link
                    to={item.paymentLink}
                    className='bg-primary px-4 py-1.5 mb-3 text-sm rounded-full font-medium cursor-pointer'
                  >
                    Pay Now
                  </Link>
                )}
              </div>
              <div className='text-sm'>
                <p><span className='text-gray-400'>Total Tickets:</span> {item.bookedSeats.length}</p>
                <p><span className='text-gray-400'>Seat Number:</span> {item.bookedSeats.join(", ")}</p>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default MyBookings;
