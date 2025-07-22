import React, { useEffect, useState } from 'react';
import { dummyBookingData } from '../assets/assets';
import BlurCircle from '../components/BlurCircle';
import Loading from '../components/Loading'; // Ensure you have this or replace with <p>Loading...</p>
import { dateFormat } from '../lib/dateFormat';
import timeFormat from '../lib/timeFormat';

const MyBookings = () => {
  const currency = import.meta.env.VITE_CURRENCY || '₹';
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const getMyBookings = async () => {
    // Simulate fetching data (you can later connect to backend)
    setBookings(dummyBookingData);
    setIsLoading(false);
  };

  useEffect(() => {
    getMyBookings();
  }, []);

  return isLoading ? (
    <Loading />
  ) : (
    <div className='relative px-6 md:px-16 lg:px-40 pt-30 md:pt-40 min-h-[80vh]'>
      <BlurCircle top="100px" left="100px" />
      <BlurCircle bottom="0px" left="600px" />

      <h1 className='text-lg font-semibold mb-4 text-white'>My Bookings</h1>

      {bookings.map((item, index) => (
  <div
    key={index}
    className="flex flex-col md:flex-row justify-between bg-#d63854-900 border border-#d63854-600 rounded-lg mt-6 p-4 max-w-3xl shadow-md"
  >
          <div className='flex flex-col md:flex-row gap-4'>
            <img
              src={item.show.movie.poster_path}
              alt={item.show.movie.title}
              className='md:max-w-45 w-full md:w-40 aspect-video object-cover object-bottom rounded'
            />

            <div className='flex flex-col justify-between'>
              <p className='text-lg font-semibold text-white'>{item.show.movie.title}</p>
              <p className='text-gray-400 text-sm'>{timeFormat(item.show.movie.runtime)} mins</p>
              <p className='text-gray-400 text-sm'>{dateFormat(item.show.showDateTime)}</p>
       
            </div>
          </div>
          <div className='flex flex-col md:items-end md;text-right justify-between p-4'>
        <div>
          <p className='text-2xl font-semibold mb-3'>{currency}{item.amount}</p>
          {!item.isPaid && <button className='bg-primary px-4 py-1.5 mb-3
          text-sm rounded-full font-medium cursor-pointer'>Pay Now</button>}
          </div>
          <div className='text-sm'>
            
            <p className='text-gray-400'><span>Total Tickets:</span>{item.bookedSeats.length}</p>
            <p className='text-gray-400'><span>Seat Number:</span>{item.bookedSeats.join(", ")}</p>

        </div>
        </div>
        </div>
      ))}
    </div>
  );
};

export default MyBookings;
