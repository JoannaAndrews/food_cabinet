import SideBar from "./SideBar.jsx";
import NavBar from "./NavBar.jsx";
import { Outlet } from "react-router";
import { styles } from "../assets/dummyStyles.js";
import { useState } from "react";

const Layout = ({ onLogout, user }) => {

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className={styles.layout.root}>
      <NavBar user={user} onLogout={onLogout}></NavBar>
      <SideBar user={user} isCollapsed={sidebarCollapsed} setIsCollapsed={setSidebarCollapsed}>
      </SideBar>
      <main className={styles.layout.mainContainer(sidebarCollapsed)}><Outlet></Outlet></main>


    </div>
  );
};

export default Layout;

