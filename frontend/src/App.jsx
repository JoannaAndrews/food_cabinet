
import { useState, useEffect } from "react";
import { Route, Routes, useLocation, useNavigate, Navigate } from "react-router";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import SignUp from "./pages/SignUp.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Profile from "./pages/Profile.jsx";
import axios from "axios";

const API_URL = "http://localhost:5000";

//to get transaction from localstorage
const getTransactionsFromStorage = () => {
  const saved = localStorage.getItem("transactions");
  return saved ? JSON.parse(saved) : [];
}

//to protect the routes
const ProtectedRoute = ({ user, children }) => {
  const localToken = localStorage.getItem("token");
  const sessionToken = sessionStorage.getItem("token");
  const hasToken = localToken || sessionToken;

  if (!user || !hasToken) {
    return <Navigate to="/login" replace></Navigate>
  }
  return children;
}

//to scroll to top when page gets reload or new page is visited
const ScrollToTop = () => {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);

  return null;
}

const App = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // useEffect(() => {
  //   const savedUser =
  //     JSON.parse(localStorage.getItem("user")) ||
  //     JSON.parse(sessionStorage.getItem("user"));

  //   const savedToken =
  //     localStorage.getItem("token") ||
  //     sessionStorage.getItem("token");

  //   if (savedUser && savedToken) {
  //     setUser(savedUser);
  //     setToken(savedToken);
  //   } else {
  //     navigate("/login");
  //   }
  // }, []);

  //to save the token
  const persistAuth = (userObj, tokenStr, remember = false) => {
    try {
      if (remember) {
        if (userObj) localStorage.setItem("user", JSON.stringify(userObj));
        if (tokenStr) localStorage.setItem("token", tokenStr);
        sessionStorage.removeItem("user");
        sessionStorage.removeItem("token");
      } else {
        if (userObj) sessionStorage.setItem("user", JSON.stringify(userObj));
        if (tokenStr) sessionStorage.setItem("token", tokenStr);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
      setUser(userObj || null);
      setToken(tokenStr || null);
    } catch (err) {
      console.error("persistAuth error: ", err);
    }
  }

  const clearAuth = () => {
    try {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      sessionStorage.removeItem("user");
      sessionStorage.removeItem("token");

    } catch (error) {
      console.error("clearAuth error: ", error);
    }
    setUser(null);
    setToken(null);
  };

  //to update user data both in state and storage
  const updateUserData = (updatedUser) => {
    setUser(updatedUser);

    const localToken = localStorage.getItem("token");
    const sessionToken = sessionStorage.getItem("token");

    if (localToken) {
      localStorage.setItem("user", JSON.stringify(updatedUser));
    } else if (sessionToken) {
      sessionStorage.setItem("user", JSON.stringify(updatedUser));
    }
  }

  //try to load user with token when mounted
  useEffect(() => {
    (async () => {
      try {
        const localUserRaw = localStorage.getItem("user");
        const sessionUserRaw = sessionStorage.getItem("user");
        const storedUser = localUserRaw
          ? JSON.parse(localUserRaw)
          : sessionUserRaw
            ? JSON.parse(sessionUserRaw)
            : null;
        const localToken = localStorage.getItem("token");
        const sessionToken = sessionStorage.getItem("token");

        const storedToken = localToken || sessionToken || null;
        const tokenFromLocal = !!localToken;

        if (storedUser) {
          setUser(storedUser);
          setToken(storedToken);
          setIsLoading(false);
          return;
        }

        if (storedToken) {
          try {
            const res = await axios.get(`${API_URL}/api/user/me`, {
              headers: { Authorization: `Bearer ${storedToken}` }
            });
            const profile = res.data;
            persistAuth(profile, storedToken, tokenFromLocal);
          } catch (fetchErr) {
            console.warn("Could not fetch profile with the stored token:", fetchErr);
            clearAuth();
          }
        }

      } catch (err) {
        console.error("error bootstrapping auth:", err);
      } finally {
        setIsLoading(false);

        try {

          setTransactions(getTransactionsFromStorage());

        } catch (txError) {
          console.error("Error loading transactions:", txError);
        }
      }
    })();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("transactions", JSON.stringify(transactions));
    } catch (error) {
      console.error("error saving transactions: ", transactions);
    }
  }, [transactions])

  const handleLogin = (userData, remember = false, tokenFromApi = null) => {
    persistAuth(userData, tokenFromApi, remember);

    navigate("/");
  }

  const handleSignup = (userData, remember = false, tokenFromApi = null) => {
    persistAuth(userData, tokenFromApi, remember);
    navigate("/");
  }

  const handleLogout = () => {
    clearAuth();
    navigate("/login");
  }


  return (
    <>
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} API_URL="http://localhost:5000"></Login>}></Route>
        <Route path="/signup" element={<SignUp onSignup={handleSignup}></SignUp>}></Route>

        <Route element={
          <ProtectedRoute user={user}>
            <Layout user={user} onLogout={handleLogout}></Layout>
          </ProtectedRoute>
        }>
          <Route path="/" element={<Dashboard></Dashboard>}></Route>
          <Route path="/profile" element={<Profile user={user} onUpdateProfile={updateUserData} onLogout={handleLogout}></Profile>}></Route>

        </Route>
      </Routes>
    </>

  )
}

export default App;