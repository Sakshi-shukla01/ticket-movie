import React, { useState } from 'react';
import ReactPlayer from 'react-player';
import { dummyTrailers } from '../assets/assets';
import BlurCircle from './BlurCircle';
import { PlayCircle } from 'lucide-react';

const TrailersSection = () => {
  const [currentTrailer, setCurrentTrailer] = useState(dummyTrailers[0]);
const [playing, setPlaying] = useState(false);

  return (
    <div className='px-6 md:px-16 lg:px-24 xl:px-44 py-20 overflow-hidden'>
      {/* Section Title */}
      <p className='text-gray-300 font-medium text-lg max-w-[960px] mx-auto'>
        Trailers
      </p>

      {/* Main Player */}
      <div className='relative mt-6'>
        <BlurCircle top='-100px' right='-100px' />
        <ReactPlayer
  url={currentTrailer.videoUrl}
  playing={playing}
  onClickPreview={() => setPlaying(true)} // starts playing when preview clicked
  light={currentTrailer.image}
  controls
  width='100%'
  height='540px'
  className='mx-auto'
/>

      </div>

      {/* Trailer Thumbnails */}
      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 mt-10 max-w-4xl mx-auto'>
        {dummyTrailers.map((trailer, index) => (
          <div
            key={index}
            onClick={() => setCurrentTrailer(trailer)}
            className='relative group cursor-pointer transition-transform hover:scale-105'
          >
            <img
              src={trailer.image}
              alt={`Trailer ${index + 1}`}
              className='rounded-lg w-full h-36 object-cover brightness-75'
            />
            <PlayCircle
              className='absolute top-1/2 left-1/2 w-8 h-8 md:w-12 md:h-12 text-white transform -translate-x-1/2 -translate-y-1/2 opacity-90 group-hover:opacity-100 transition-opacity'
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrailersSection;
