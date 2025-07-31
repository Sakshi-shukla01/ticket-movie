// ✅ Navbar.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  SearchIcon,
  XIcon,
  MenuIcon,
  TicketPlus,
  UserCog,
  LogOut,
  UserPlus,
} from 'lucide-react';
import logo from '../assets/logo.svg';
import { useClerk, useUser } from '@clerk/clerk-react';
import { useAppContext } from '../context/AppContext';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user } = useUser();
  const { openSignIn, signOut, openUserProfile } = useClerk();
  const navigate = useNavigate();
  const { favoriteMovies } = useAppContext();
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const baseLinks = [
    { path: '/', label: 'Home' },
    { path: '/movies', label: 'Movies' },
    { path: '/theaters', label: 'Theaters' },
    { path: '/releases', label: 'Releases' },
  ];

  if (favoriteMovies.length > 0) {
    baseLinks.push({
      path: '/favorite',
      label: (
        <span className="relative">
          Favorites
          <span className="absolute -top-2 -right-3 text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full">
            {favoriteMovies.length}
          </span>
        </span>
      ),
    });
  }

  return (
    <div className="fixed top-0 left-0 w-full z-50 px-6 md:px-16 lg:px-36 py-5 bg-black text-white flex items-center justify-between">
      <Link to="/" className="flex items-center">
        <img src={logo} alt="QuickShow Logo" className="w-8 h-8" />
        <span className="ml-2 text-xl font-semibold text-white">
          Quick<span className="text-primary">Show</span>
        </span>
      </Link>

      <div
        className={`items-center gap-6 text-sm font-medium transition-all duration-300 ${
          isOpen
            ? 'flex flex-col absolute top-0 left-0 w-full h-screen bg-black pt-20 pl-10 z-40 md:relative md:flex-row md:h-auto md:w-auto md:bg-transparent'
            : 'hidden md:flex'
        }`}
      >
        <XIcon
          className="absolute top-6 right-6 w-6 h-6 cursor-pointer md:hidden"
          onClick={() => setIsOpen(false)}
        />
        {baseLinks.map(({ path, label }, index) => (
          <Link
            key={`${typeof label === 'string' ? label : 'link'}-${index}`}
            to={path}
            onClick={() => {
              window.scrollTo(0, 0);
              setIsOpen(false);
            }}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-4 relative" ref={dropdownRef}>
        <SearchIcon className="w-5 h-5 cursor-pointer max-md:hidden" />

        {!user ? (
          <button
            onClick={openSignIn}
            className="bg-red-400 hover:bg-red-500 text-white px-4 py-1.5 rounded-full text-sm font-medium transition"
          >
            Login
          </button>
        ) : (
          <>
            <img
              src={user.imageUrl}
              alt="User Avatar"
              className="w-8 h-8 rounded-full cursor-pointer border"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            />

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white text-black rounded-lg shadow-lg z-50 text-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 bg-white">
                  <div className="text-sm font-semibold truncate max-w-[220px]">
                    {user.fullName || 'Great Stack'}
                  </div>
                  <div className="text-xs text-gray-600 truncate max-w-[220px]">
                    {user.primaryEmailAddress?.emailAddress}
                  </div>
                </div>

                <div
                  onClick={() => {
                    openUserProfile();
                    setDropdownOpen(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 cursor-pointer"
                >
                  <UserCog className="w-4 h-4" />
                  Manage account
                </div>

                <div
                  onClick={() => {
                    navigate('/my-bookings');
                    setDropdownOpen(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 cursor-pointer"
                >
                  <TicketPlus className="w-4 h-4" />
                  My Bookings
                </div>

                <div
                  onClick={() => {
                    openSignIn({ strategy: 'switch' });
                    setDropdownOpen(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  Add Account
                </div>

                <div
                  onClick={() => {
                    signOut();
                    setDropdownOpen(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 cursor-pointer border-t"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </div>
              </div>
            )}
          </>
        )}

        <MenuIcon
          className="md:hidden w-8 h-8 cursor-pointer"
          onClick={() => setIsOpen(true)}
        />
      </div>
    </div>
  );
};

export default Navbar;
