import React from 'react';

const BlurCircle = ({ top = "auto", left = "auto", right = "auto", bottom = "auto" }) => {
  return (
    <div
      className="absolute -z-10 w-72 h-72 bg-red-400 opacity-30 rounded-full blur-3xl"
      style={{ top, left, right, bottom }}
    ></div>
  );
};

export default BlurCircle;
