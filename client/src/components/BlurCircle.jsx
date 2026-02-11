import React from "react";

const BlurCircle = ({ top, left, right, bottom }) => {
  return (
    <div
      className="pointer-events-none absolute -z-10 rounded-full blur-3xl opacity-30"
      style={{
        width: "260px",
        height: "260px",
        top,
        left,
        right,
        bottom,
        background: "rgba(255,255,255,0.18)",
      }}
    />
  );
};

export default BlurCircle;
