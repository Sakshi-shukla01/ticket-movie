import React, { useState } from "react";
import { dummyTrailers } from "../assets/assets";
import { PlayCircle, ExternalLink } from "lucide-react";

const TrailersSection = () => {
  const [currentTrailer, setCurrentTrailer] = useState(dummyTrailers[0]);

  const openTrailer = () => {
    window.open(currentTrailer.videoUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="px-6 md:px-16 lg:px-24 xl:px-44 py-20">
      <p className="text-gray-300 font-medium text-lg max-w-[960px] mx-auto">
        Trailers
      </p>

      {/* Big Poster */}
      <div className="relative mt-6 max-w-5xl mx-auto">
        <div
          className="relative w-full h-[540px] rounded-lg overflow-hidden bg-black cursor-pointer group"
          onClick={openTrailer}
        >
          <img
            src={currentTrailer.image}
            alt="Trailer"
            className="w-full h-full object-cover brightness-75 group-hover:brightness-90 transition"
          />

          <div className="absolute inset-0 flex items-center justify-center">
            <PlayCircle className="w-20 h-20 text-white opacity-90" />
          </div>

          <div className="absolute bottom-4 right-4 flex items-center gap-2 text-sm text-white/80">
            <ExternalLink className="w-4 h-4" />
            Watch on YouTube
          </div>
        </div>
      </div>

      {/* Thumbnails */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 mt-10 max-w-4xl mx-auto">
        {dummyTrailers.map((trailer) => (
          <div
            key={trailer.id}
            onClick={() => setCurrentTrailer(trailer)}
            className="relative group cursor-pointer transition-transform hover:scale-105"
          >
            <img
              src={trailer.image}
              alt="Trailer"
              className="rounded-lg w-full h-36 object-cover brightness-75"
            />
            <PlayCircle className="absolute top-1/2 left-1/2 w-10 h-10 text-white transform -translate-x-1/2 -translate-y-1/2 opacity-90" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrailersSection;
