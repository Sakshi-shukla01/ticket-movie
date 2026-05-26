import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ClockIcon, ArrowRightIcon } from 'lucide-react';
import Loading from '../components/Loading';
import isoTimeFormat from '../lib/isoTimeFormat';
import { assets } from '../assets/assets';
import BlurCircle from '../components/BlurCircle';
import { toast } from 'react-hot-toast';
import { useAppContext } from '../context/AppContext';
import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000');
const SeatLayout = () => {
  const groupRows = [["A", "B"], ["C", "D"], ["E", "F"], ["G", "H"], ["I", "J"]];
  const { id, date } = useParams();
  const navigate = useNavigate();
  const { axios, getToken, user } = useAppContext();

  const [selectedSeats, setSelectedSeats] = useState([]);
  const [selectedTime, setSelectedTime] = useState(null);
  const [show, setShow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [occupiedSeats, setOccupiedSeats] = useState([]);

  // ✅ FIXED: Fetch show details correctly with detailed debugging
  const getShow = async () => {
    try {
      console.log("🔍 Fetching show with movie ID:", id, "for date:", date);
      const { data } = await axios.get(`/api/show/${id}`);
      console.log("📦 Raw API Response:", JSON.stringify(data, null, 2));
      
      // ✅ FIXED: Handle your backend's response structure
      if (data && data.success && data.show) {
        console.log("✅ Show data found");
        setShow(data.show);
        
        // Debug: Log available dates and times
        if (data.show.dateTime) {
          console.log("📅 Available dates:", Object.keys(data.show.dateTime));
          console.log("🕐 Times for selected date:", data.show.dateTime[date]);
        } else {
          console.log("⚠️ No dateTime found in show data");
        }
      } else if (data && data.success && data.movie && data.dateTime) {
        // ✅ ALTERNATIVE: Handle the old response format
        console.log("✅ Using alternative format (movie + dateTime)");
        setShow({
          _id: id,
          movie: data.movie,
          dateTime: data.dateTime
        });
        console.log("📅 Available dates:", Object.keys(data.dateTime));
        console.log("🕐 Times for selected date:", data.dateTime[date]);
      } else {
        console.error("❌ Unexpected response structure:");
        console.error("- data:", data);
        console.error("- data.success:", data?.success);
        console.error("- data.show:", data?.show);
        console.error("- data.movie:", data?.movie);
        console.error("- data.dateTime:", data?.dateTime);
        toast.error("Show not found or unexpected response format");
        return;
      }
      
    } catch (error) {
      console.error("❌ Error fetching show:", error.message);
      console.error("❌ Full error:", error);
      toast.error("Failed to load show details");
    } finally {
      setLoading(false);
    }
  };

  const getOccupiedSeats = async () => {
    try {
      if (!selectedTime?.showId) {
        console.log("⚠️ No showId found, skipping occupied seats fetch");
        return;
      }
      
      console.log("🪑 Fetching occupied seats for showId:", selectedTime.showId);
      const { data } = await axios.get(`/api/booking/seats/${selectedTime.showId}`);
      
      if (data.success) {
        setOccupiedSeats(data.occupiedSeats || []);
        console.log("✅ Occupied seats:", data.occupiedSeats);
      } else {
        setOccupiedSeats([]);
        console.log("⚠️ No occupied seats data");
      }
    } catch (error) {
      console.error("❌ Error fetching seats:", error.message);
      setOccupiedSeats([]);
    }
  };

  const handleSeatClick = (seatId) => {
    if (!selectedTime) {
      toast.error("Please select a time first.");
      return;
    }
    
    if (occupiedSeats.includes(seatId)) {
      toast("Seat already booked.");
      return;
    }
    
    if (!selectedSeats.includes(seatId) && selectedSeats.length >= 5) {
      toast.error("Max 5 seats allowed.");
      return;
    }

    setSelectedSeats((prev) =>
      prev.includes(seatId)
        ? prev.filter((seat) => seat !== seatId)
        : [...prev, seatId]
    );
  };

  const bookTickets = async () => {
    try {
      if (!user) {
        toast.error("Please login to continue.");
        return;
      }
      
      if (!selectedTime || selectedSeats.length === 0) {
        toast.error("Please select time and seat(s).");
        return;
      }

      console.log("🎫 Creating booking with:", {
        showId: selectedTime.showId,
        bookedSeats: selectedSeats,
      });

      const token = await getToken();
      const { data } = await axios.post(
        "/api/booking/create",
        {
          showId: selectedTime.showId,
          bookedSeats: selectedSeats,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("📝 Booking response:", data);

      if (data.success) {
  window.location.href = data.url;
}
 else {
        toast.error(data.message || "Booking failed");
      }
    } catch (error) {
      console.error("❌ Booking failed:", error.message);
      toast.error("Booking failed. Please try again.");
    }
  };

  const renderSeats = (row, count = 9) => (
    <div key={row} className="flex gap-2 mt-2">
      {Array.from({ length: count }, (_, i) => {
        const seatId = `${row}${i + 1}`;
        const isSelected = selectedSeats.includes(seatId);
        const isOccupied = occupiedSeats.includes(seatId);

        return (
          <button
            key={seatId}
            onClick={() => handleSeatClick(seatId)}
            disabled={isOccupied}
            className={`h-8 w-8 rounded border text-xs transition font-semibold
              ${isSelected ? "bg-red-600 text-white" : "text-gray-200 border-gray-400 hover:bg-red-400"}
              ${isOccupied ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            {seatId}
          </button>
        );
      })}
    </div>
  );

  useEffect(() => {
    if (id) {
      console.log("🚀 Component mounted, fetching show for ID:", id, "and date:", date);
      getShow();
    } else {
      console.error("❌ No show ID provided in URL params");
    }
  }, [id]);

 useEffect(() => {
  if (selectedTime) {
    setSelectedSeats([]);
    getOccupiedSeats();
  }
}, [selectedTime]);

// ✅ WebSocket — real time seat updates
useEffect(() => {
  if (!selectedTime?.showId) return;

  socket.emit('join-show', selectedTime.showId);

  socket.on('seats-booked', ({ bookedSeats }) => {
    setOccupiedSeats(prev => [...new Set([...prev, ...bookedSeats])]);
    setSelectedSeats(prev => prev.filter(seat => !bookedSeats.includes(seat)));
  });

  return () => {
    socket.off('seats-booked');
  };
}, [selectedTime]);

  // Debug render
  if (loading) {
    return <Loading />;
  }

  if (!show) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white">
        <p>Show not found</p>
      </div>
    );
  }

  // Check if date exists in dateTime
  const availableTimes = show?.dateTime?.[date];
  console.log("🕐 Available times for render:", availableTimes);

  return (
    <div className="flex flex-col md:flex-row px-6 md:px-16 lg:px-32 py-12">
      {/* Left Panel: Timings */}
      <div className="w-full md:w-1/4 bg-white/5 border border-white/10 rounded-lg py-6 sticky top-24">
        <p className="text-lg font-semibold px-6 mb-2 text-white">Available Timings</p>
        
        {!availableTimes || availableTimes.length === 0 ? (
          <p className="px-6 text-gray-400 text-sm">No timings available for this date</p>
        ) : (
          availableTimes.map((item, index) => (
            <div
              key={`${item.time}-${index}`}
              onClick={() => {
                console.log("🕐 Time selected:", item);
                // ✅ FIXED: Use the correct showId from the time slot
                setSelectedTime({ 
                  ...item, 
                  showId: item.showId // This should be the individual show ID, not movie ID
                });
              }}
              className={`flex items-center gap-2 px-6 py-2 w-full cursor-pointer transition-colors
                ${selectedTime?.time === item.time ? "bg-red-600 text-white" : "hover:bg-white/10 text-gray-200"}
              `}
            >
              <ClockIcon className="w-4 h-4" />
              <p className="text-sm">{isoTimeFormat(item.time)}</p>
            </div>
          ))
        )}
      </div>

      {/* Right Panel: Seat layout */}
      <div className="relative flex-1 flex flex-col items-center mt-10 md:mt-0">
        <BlurCircle top="-100px" left="-100px" />
        <BlurCircle bottom="0" right="0" />
        <h1 className="text-2xl font-semibold mb-4 text-white">Select Your Seat</h1>

        {selectedTime && (
          <p className="text-green-400 text-sm mb-4">
            Selected Time: {isoTimeFormat(selectedTime.time)}
          </p>
        )}

        <img src={assets.screenImage} alt="screen" />
        <p className="text-gray-400 text-sm mb-6">SCREEN SIDE</p>

        <div className="flex flex-col items-center t-10 text-xs text-gray-300">
          <div className="grid grid-cols-2 md:grid-cols-1 gap-8 md:gap-2 mb-6">
            {groupRows[0].map((row) => renderSeats(row))}
          </div>
          <div className="grid grid-cols-2 gap-11">
            {groupRows.slice(1).map((group, idx) => (
              <div key={idx}>
                {group.map((row) => renderSeats(row))}
              </div>
            ))}
          </div>
        </div>

        {selectedSeats.length > 0 && (
          <p className="text-white text-sm mt-4">
            Selected Seats: {selectedSeats.join(', ')}
          </p>
        )}

        <button
          onClick={bookTickets}
          disabled={!selectedTime || selectedSeats.length === 0}
          className={`mt-10 flex items-center gap-2 px-8 py-3 text-white text-sm rounded-full transition-colors
            ${selectedTime && selectedSeats.length > 0 
              ? "bg-red-600 hover:bg-red-700 cursor-pointer" 
              : "bg-gray-600 cursor-not-allowed opacity-50"
            }`}
        >
          Proceed to checkout
          <ArrowRightIcon strokeWidth={2.5} className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default SeatLayout;