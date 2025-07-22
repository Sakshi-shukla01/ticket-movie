import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dummyDateTimeData, dummyShowsData } from '../assets/assets';
import { ClockIcon, ArrowRightIcon } from 'lucide-react';
import Loading from '../components/Loading';
import isoTimeFormat from '../lib/isoTimeFormat';
import { assets } from '../assets/assets';
import BlurCircle from '../components/BlurCircle';
import { toast } from 'react-hot-toast'; // ✅ Correct import

const SeatLayout = () => {

  const groupRows=[["A","B"],["C","D"],["E","F"],["G","H"],["I","J"]]
  const { id, date } = useParams();
  const navigate = useNavigate();

  const [selectedSeats, setSelectedSeats] = useState([]);
  const [selectedTime, setSelectedTime] = useState(null);
  const [show, setShow] = useState(null);

  const getShow = async () => {
    const showData = dummyShowsData.find(show => show._id === id);
    if (showData) {
      setShow({
        movie: showData,
        dateTime: dummyDateTimeData
      });
    }
  };
  const handleSeatClick=(seatId)=>{
    if(!selectedTime){
      return toast("please select time first")
    }
    if(!selectedSeats.includes(seatId) && selectedSeats.length>4){
      return toast("you can only select 5 seats")
    }
    setSelectedSeats(prev=>prev.includes(seatId)? prev.filter(seat=>seat!==seatId):[...prev,seatId])
  }
const renderSeats = (row, count = 9) => (
  <div key={row} className="flex gap-2 mt-2">
    <div className="flex flex-wrap items-center justify-center gap-2">
      {Array.from({ length: count }, (_, i) => {
        const seatId = `${row}${i + 1}`;
        return (
          <button
            key={seatId}
            onClick={() => handleSeatClick(seatId)}
            className={`h-8 w-8 rounded border border-red-600 cursor-pointer ${
              selectedSeats.includes(seatId) ? 'bg-red-600 text-white' : 'hover:bg-red-200 text-black'
            }`}
          >
            {seatId}
          </button>
        );
      })}
    </div>
  </div>
);


  useEffect(() => {
    getShow();
  }, [id]);

  return show ? (
    <div className='flex flex-col md:flex-row px-6 md:px-16 lg:px-40 py-30 md:pt-50'>
      <div className='w-60 bg-primary/10 border border-primary/20 rounded-lg py-10 h-max md:sticky md:top-30'>
        <p className='text-lg font-semibold px-6'>Available timings</p>

        {show.dateTime[date]?.map((item, index) => (
          <div
            key={item.time}
            onClick={() => setSelectedTime(item)}
            className={`flex items-center gap-2 px-6 py-2 w-max rounded-r-md cursor-pointer transition
              ${selectedTime?.time === item.time
                ? 'bg-red-600 text-white'
                : 'hover:bg-red-200 text-white-800'}`}
          >
            <ClockIcon className='w-4 h-4' />
            <p className='text-sm'>{isoTimeFormat(item.time)}</p>
          </div>
        ))}
      </div>
  
    {/*seat layout*/}
    <div className='relative flex-1 flex flex-col items-center max-md:mt-16'>
      <BlurCircle top="-100px" left="-100px"/>
      <BlurCircle bottom="0" right="0"/>
      <h1 className='text-2xl font-semibold mb-4'>Select your seat</h1>
      <img src={assets.screenImage} alt=""/>
      <p className='text-gray-400 text-sm mb-6'>SCREEN SIDE</p>
    <div className='flex flex-col items-center  t-10 text-xs text-gray-300'>
      <div className='grid grid-cols-2 md:grid-cols-1 gap-8 md:gap-2 mb-6'>
        {groupRows[0].map(row=>renderSeats(row))}
      </div>
       <div className='grid grid-cols-2 gap-11'>
      {groupRows.slice(1).map((group,idx)=>(
        <div key={idx}>
          {
            group.map(row=>renderSeats(row))
          }
          </div>
      ))}
    </div>
    </div>
    <button onClick={()=>navigate('/my-bookings')} className='flex items-center gap-1 mt-20 px-10 py-3 text-sm bg-primary
    hover:bg-primary-dull transition rounded-full font-medium cursor-pointer
    active:scale-95'>
      Proceed to checkout
      <ArrowRightIcon strokeWidth={3} className="w-4 h-4"/>
    </button>
   
    </div>

  </div>
  ) : (
    <Loading />
  );
};

export default SeatLayout;
