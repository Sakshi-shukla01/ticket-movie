import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const Loading = () => {
  const { nextUrl } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (nextUrl) {
      setTimeout(() => {
        navigate(`/${nextUrl}`);
      }, 8000);
    }
  }, [nextUrl, navigate]);

  return (
    <div className="flex flex-col justify-center items-center h-[80vh] text-white">
      <div className="animate-spin rounded-full h-14 w-14 border-4 border-t-4 border-gray-300 border-t-red-600"></div>
      <p className="mt-4 text-sm">Redirecting, please wait...</p>
    </div>
  );
};

export default Loading;
