import React, { useEffect, useState } from 'react';
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

  // ✅ Get bookings from correct endpoint
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

  // ✅ Fix: use POST /api/booking/pay/:bookingId
  const handlePayment = async (bookingId) => {
    try {
      const token = await getToken();
      const { data } = await axios.post(`/api/booking/pay/${bookingId}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        alert('✅ Payment successful!');
        getMyBookings(); // Refresh list
      } else {
        alert(data.message || '❌ Payment failed');
      }
    } catch (error) {
      console.error('❌ Error while paying:', error.message);
      alert('Something went wrong.');
    }
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
            <div className='flex flex-col justify-between items-start md:items-end mt-4 md:mt-0 text-white'>
              <div>
                <p className='text-xl font-bold mb-2'>{currency}{item.amount}</p>
                {!item.isPaid && (
                  <button
                    onClick={() => handlePayment(item._id)}
                    className='bg-red-600 hover:bg-red-700 text-sm px-4 py-2 rounded-full mb-2 font-medium'>
                    Pay Now
                  </button>
                )}
              </div>
              <div className='text-sm text-gray-300'>
                <p><span className='text-gray-400'>Total Tickets:</span> {item.bookedSeats.length}</p>
                <p><span className='text-gray-400'>Seat Numbers:</span> {item.bookedSeats.join(', ')}</p>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default MyBookings;
