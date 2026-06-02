import React, { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { VscArrowLeft } from "react-icons/vsc";
import { IoHome, IoSettingsOutline, IoSettings } from "react-icons/io5";
import { SiFoodpanda } from "react-icons/si";
import { SlPeople } from "react-icons/sl";
import { SiUikit } from "react-icons/si";
import { GoGraph } from "react-icons/go";
import { GiCook } from "react-icons/gi";
import { FaRegTrashCan } from "react-icons/fa6";
import { RiDashboard3Fill } from "react-icons/ri";
import { FaBriefcase, FaCartShopping, FaCaretDown } from "react-icons/fa6";
import { IoIosPeople } from "react-icons/io";
import { FaFirstOrder, FaLock, FaTags } from "react-icons/fa";
import { FaTrophy } from "react-icons/fa";
import { MdInventory } from "react-icons/md";
import { MdSettings, MdDashboard, MdSubscriptions, MdQuestionAnswer } from 'react-icons/md';
import { FaBoxOpen, FaBuilding } from 'react-icons/fa';
const Navbar = () => {
  const [open, setOpen] = useState(true);
  const [openSubmenuIndex, setOpenSubmenuIndex] = useState(null);
  const location = useLocation();

  const Menus = [
    {
      title: "Dashboard",
      link: "/",
      icon: <MdDashboard />,
    },
    {
      title: "CMS Setting",
      submenu: true,
      icon: <	MdSettings />,
      submenuItems: [
        { title: " Home Banner Setting", link: "/home-setting" },
        { title: " Home Features Settings", link: "/homefeatures-setting" },
        { title: " Features ", link: "/fetures-setting" },
        { title: "General Setting", link: "/general-setting" },
        { title: "Privacy Policy", link: "/privacy-policy-setting" },
      ],
    },
    {
      title: " Packages ",
      submenu: true,
      icon: <FaBoxOpen />,
      submenuItems: [
        { title: "Add Packages", link: "/addpackages" },
        { title: "All Packages", link: "/allPackages" },
       
      ],
    },
    {
      title: "Companies",
      icon: <	FaBuilding />,
      submenu: true,
      submenuItems: [
        { title: "Add Company ", link: "/addcompany" },
        { title: "List of companies ", link: "/companylist" },
       
      ],
    },
    {
      title: "Companies Subscription ",
      icon: <	MdSubscriptions/>,
      submenu: true,
      submenuItems: [
      
        { title: "Company’s subscription list ", link: "/companysubscriptionlist" },
      ],
    },
    {
      title: "Setting",
      icon: <	MdSettings />,
      submenu: true,
      submenuItems: [
        { title: "Super Admin Setting", link: "/companysetting" },
      
      ],
    },
    {
      title: "Enquiry",
      icon: <MdQuestionAnswer />,
      submenu: true,
      submenuItems: [
        { title: "Show All Enquiries list ", link: "/enquiry" },
      
      ],
    },
   

  ];

  useEffect(() => {
    Menus.forEach((menu, index) => {
      if (menu.submenu) {
        menu.submenuItems.forEach((subItem) => {
          if (location.pathname === subItem.link) {
            setOpenSubmenuIndex(index);
          }
        });
      }
    });
  }, [location.pathname]);

  const toggleSubmenu = (index) => {
    setOpenSubmenuIndex(openSubmenuIndex === index ? null : index);
  };

  return (
    <nav 
    className={`bg-[#1C1D3E] text-zinc-100 min-h-screen p-5 pt-8 ${
      open ? "w-auto" : "w-20"
    } relative duration-500`}
    aria-label="Main navigation"
  >
    <button
      className={`bg-black text-3xl rounded-full absolute -right-3 top-9 border border-black cursor-pointer ${
        !open && "rotate-180"
      }`}
      onClick={() => setOpen(!open)}
      aria-label={open ? "Collapse menu" : "Expand menu"}
    >
      <VscArrowLeft />
    </button>
    
    <div className="flex items-center gap-3 mt-5 py-3">
      {/* <button onClick={() => setOpen(!open)} aria-label="Toggle menu">
        <img 
        
          alt="Logo" 
          className="float-start cursor-pointer mr-2" 
          width={70} 
        />
      </button> */}
      <h1
        className={`text-2xl cursor-pointer font-bold origin-left ${
          !open && "hidden"
        }`}
      >
        { "POS Super-Admin"}
      </h1>
    </div>
    
    <ul className="space-y-2">
      {Menus.map((items, index) => {
        const filteredSubmenuItems = items.submenuItems
          ? items.submenuItems.filter((subItem) => subItem.title)
          : [];
          
        if (items.submenu && filteredSubmenuItems.length === 0) return null;

        return (
          <li key={index}>
            <div
              className={`text-lg flex items-center gap-x-2 cursor-pointer p-2 hover:bg-[#4cddA1] hover:scale-95 duration-150 rounded-md mt-2 ${
                location.pathname === items.link
                  ? "bg-[#4cddA1] text-zinc-900"
                  : ""
              }`}
              onClick={() => items.submenu && toggleSubmenu(index)}
              aria-expanded={openSubmenuIndex === index}
              role="button"
            >
              <span className="text-2xl">{items.icon}</span>
              <span className={`flex-1 ${!open && "hidden"}`}>
                <NavLink
                  to={items.link}
                  className={({ isActive }) =>
                    isActive ? "text-[#ffffff]" : "text-zinc-100"
                  }
                  end
                >
                  {items.title}
                </NavLink>
              </span>
              {items.submenu && open && (
                <FaCaretDown
                  className={`${
                    openSubmenuIndex === index ? "rotate-180" : ""
                  } duration-500`}
                />
              )}
            </div>

            {items.submenu && openSubmenuIndex === index && open && (
              <ul className="ml-8 rounded-sm" role="menu">
                {filteredSubmenuItems.map((subItem, subIndex) => (
                  <li
                    key={subIndex}
                    className={`duration-500 text-sm flex items-center gap-x-2 cursor-pointer p-2 rounded-md mt-2 ${
                      location.pathname === subItem.link
                        ? "bg-[#464747] text-zinc-900"
                        : "hover:bg-[#464747]"
                    }`}
                    role="menuitem"
                  >
                    <NavLink
                      to={subItem.link}
                      className={({ isActive }) =>
                        isActive ? "text-[#4cddA1]" : "text-zinc-100"
                      }
                    >
                      {subItem.title}
                    </NavLink>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
   
  </nav>
  );
};

export default Navbar;
