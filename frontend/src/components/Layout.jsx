import SideBar from "./SideBar.jsx";
import NavBar from "./NavBar.jsx";
import { Outlet, useLocation } from "react-router";
import { styles } from "../assets/dummyStyles.js";
import { useState, useRef, useLayoutEffect } from "react";
import { ToastContainer, Slide } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Layout = ({ onLogout, user }) => {

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const mainRef = useRef(null);
  const location = useLocation();

  useLayoutEffect(() => {
    const nav = document.getElementById("app-chrome-navbar");
    const main = mainRef.current;

    const syncToastStackY = () => {
      if (!nav || !main) return;
      const gap = 10;
      // Just under the navbar — not main-padding-top — so the toast clears the
      // “Live Food Cabinet Data” heading and the lbs / food-available row.
      const y = nav.getBoundingClientRect().bottom + gap;
      document.documentElement.style.setProperty("--toast-stack-y", `${y}px`);
    };

    syncToastStackY();

    const ro = new ResizeObserver(() => syncToastStackY());
    ro.observe(nav);
    ro.observe(main);
    window.addEventListener("resize", syncToastStackY);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", syncToastStackY);
      document.documentElement.style.removeProperty("--toast-stack-y");
    };
  }, [location.pathname, sidebarCollapsed]);

  return (
    <div className={styles.layout.root}>
      <ToastContainer
        className="app-toast-host"
        style={{
          "--toast-center-shift": sidebarCollapsed ? "2.5rem" : "8rem",
          "--toast-sidebar-width": sidebarCollapsed ? "5rem" : "16rem",
        }}
        position="top-center"
        autoClose={3800}
        hideProgressBar
        newestOnTop
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
        limit={4}
        toastClassName="app-toast"
        transition={Slide}
        stacked
      />
      <NavBar user={user} onLogout={onLogout}></NavBar>
      <SideBar user={user} isCollapsed={sidebarCollapsed} setIsCollapsed={setSidebarCollapsed}>
      </SideBar>
      <main ref={mainRef} className={styles.layout.mainContainer(sidebarCollapsed)}><Outlet></Outlet></main>


    </div>
  );
};

export default Layout;

