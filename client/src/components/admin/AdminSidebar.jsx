import React from 'react';
import {
  LayoutDashboard,
  ListCollapse,
  List,
  PlusSquare
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { assets } from '../../assets/assets'

const AdminSidebar = () => {
  const user = {
    firstName: 'Admin',
    lastName: 'User',
    imageUrl: assets.profile,
  };

  const adminNavlinks = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Add Shows', path: '/admin/add-shows', icon: PlusSquare },
    { name: 'List Shows', path: '/admin/list-shows', icon: List },
    { name: 'List Bookings', path: '/admin/list-bookings', icon: ListCollapse },
  ];

  return (
    <div className='h-[calc(100vh-64px)] md:flex flex-col items-center pt-8 max-w-13 md:max-w-60 w-full border-r border-gray-300/20 text-sm'>
      <img
        className='h-9 md:h-14 w-9 md:w-14 rounded-full mx-auto'
        src={user.imageUrl}
        alt='sidebar'
      />
      <p className='mt-2 text-base max-md:hidden'>{user.firstName} {user.lastName}</p>
      <div className='w-full'>
        {adminNavlinks.map((link, index) => (
         <NavLink
  key={index}
  to={link.path} end
  className={({ isActive }) =>
    `relative flex items-center max-md:justify-center gap-2 w-full py-2.5 min-md:pl-10 first:mt-6
     ${isActive ? 'bg-red-600/20 text-red-500 rounded-md' : 'text-gray-400 hover:bg-gray-800/30'}`
  }
>
  {({ isActive }) => (
    <>
      <link.icon className='w-5 h-5' />
      <p className='max-md:hidden'>{link.name}</p>
      <span
        className={`w-1.5 h-10 rounded-l absolute right-0 ${
          isActive ? 'bg-red-500' : ''
        }`}
      />
    </>
  )}
</NavLink>

        ))}
      </div>
    </div>
  );
};

export default AdminSidebar;
