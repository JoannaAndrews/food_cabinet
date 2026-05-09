import { useNavigate } from "react-router";
import { navbarStyles } from "../assets/dummyStyles.js";
import imgl from '../assets/logo.png'
import { useState, useRef, useEffect } from "react";
import { ChevronDown, User, LogOut } from 'lucide-react';
import axios from 'axios';

// const BASE_URL = 'http://localhost:5000';
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const NavBar = ({ user: propUser, onLogout }) => {
  const navigate = useNavigate();
  const menuRef = useRef();
  const [menuOpen, setMenuOpen] = useState(false);
  const [fetchedUser, setUser] = useState(null);
  const user = propUser || fetchedUser || {
    name: "",
  } // if prop user is not found, we will pass in initial params for name, email 

  // to fetch the user data from server
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          return;
        }
        const response = await axios.get(`${BASE_URL}/user/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const userData = response.data.user || response.data;
        setUser(userData);
      } catch (error) {
        console.error("Failed to load profile: ", error);
      }
    };

    if (!propUser) {
      fetchUserData();
    }
  }, [propUser]);

  const toggleMenu = () => setMenuOpen((prev) => !prev);

  const handleLogout = () => {
    setMenuOpen(false);
    localStorage.removeItem("token");
    onLogout?.();
    navigate("/login");
  }

  //close the toggle menu if click outside the box
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [])

  return (
    <header className={navbarStyles.header}>
      <div className={navbarStyles.container}>
        <div className={navbarStyles.logoContainer}>
          <div className={navbarStyles.logoImage}>
            <img src={imgl} alt="logo"></img>
          </div>
          <span className={navbarStyles.logoText}>Cabinet Weight Tracker</span>
        </div>
        {
          user && (<div className={navbarStyles.userContainer} ref={menuRef}>
            <button onClick={toggleMenu} className={navbarStyles.userButton}>
              <div className="relative">
                <div className={navbarStyles.userAvatar}>
                  {user?.name?.[0]?.toUpperCase() || "U"}
                </div>
                <div className={navbarStyles.statusIndicator}></div>
              </div>
              <div className={navbarStyles.userTextContainer}>
                <p className={navbarStyles.userName}>{user?.name || "User"}</p>
                <p className={navbarStyles.userEmail}>{user?.email || "user@gmail.com"}</p>
              </div>
              <ChevronDown className={navbarStyles.chevronIcon(menuOpen)}></ChevronDown>
            </button>

            {/* dropdown menu */}
            {menuOpen && (
              <div className={`${navbarStyles.dropdownMenu} min-w-[220px]`}>
                <div className={navbarStyles.dropdownHeader}>
                  <div className="flex flex-col gap-2">
                    {!user?.isGuest && (
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          navigate("/profile");
                        }}
                        className={navbarStyles.menuItem}
                      >
                        <User className=" w-4 h-4"></User>
                        <span>My Profile</span>
                      </button>
                    )}
                    <button
                      onClick={handleLogout}
                      className={`${navbarStyles.menuItem} text-red-600 hover:bg-red-50`}
                    >
                      <LogOut className=" w-4 h-4"></LogOut>
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>

              </div>
            )}
          </div>)
        }

      </div>
    </header >
  )
}

export default NavBar;