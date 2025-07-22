import React from 'react';
import { assets } from '../assets/assets';
import { ArrowRight, CalendarIcon, ClockIcon } from 'lucide-react';
import { useNavigate }  from 'react-router-dom'
const HeroSection = () => {
    const navigate=useNavigate()
  return (
    <div className='flex flex-col items-start justify-center gap-4
    px-6 md:px-16 lg:px-36 bg-[url("/backgroundImage.png")]
    bg-cover bg-center h-screen'>

      {/* Marvel Logo */}
      <img
        src={assets.marvelLogo}
        alt="Marvel Logo"
        className="h-11 mt-20"
      />

      {/* Movie Title */}
      <h1 className='text-5xl md:text-[70px] md:leading-[1.2] font-semibold max-w-[600px]'>
        Guardians <br /> of the Galaxy
      </h1>

      {/* Genre, Year, Duration */}
      <div className='flex flex-wrap items-center gap-4 text-gray-300'>
        <span>Action | Adventure | Sci-Fi</span>

        <div className='flex items-center gap-1'>
          <CalendarIcon className='w-4 h-4' /> 2018
        </div>

        <div className='flex items-center gap-1'>
          <ClockIcon className='w-4 h-4' /> 2h 8m
        </div>
      </div>
<p className='max-w-md text-gray-300'>In a post-apocalyptic world where cities ride on wheels and cosume each other to survive ,two people meet in London and try to stop a conspiracy.</p>
<button 
  onClick={() => navigate('/movies')}
  className="flex items-center gap-1 px-6 py-3 text-sm 
  bg-red-400 hover:bg-red-500 
  text-white transition rounded-full font-medium cursor-pointer"
>
  Explore Movies
  <ArrowRight className="w-5 h-5" />
</button>

    </div>
  );
};

export default HeroSection;
