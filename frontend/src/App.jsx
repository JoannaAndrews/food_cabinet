import { useState, useEffect } from "react";
import { Route, Routes, useLocation, useNavigate, Navigate } from "react-router";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import SignUp from "./pages/SignUp.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Profile from "./pages/Profile.jsx";
import axios from "axios";

const API_URL = "http://localhost:5000";

const getTransactionsFromStorage = () => {
  const saved = localStorage.getItem("transactions");
  return saved ? JSON.parse(saved) : [];
};

const ProtectedRoute = ({ user, children }) => {
  const localToken = localStorage.getItem("token");
  const sessionToken = sessionStorage.getItem("token");
  const hasToken = localToken || sessionToken;

  // allow through if they have a token OR are a guest
  if (!user || (!hasToken && !user?.isGuest)) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const GuestRoute = ({ user, children }) => {
  if (user?.isGuest) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const ScrollToTop = () => {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);
  return null;
};

const App = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

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
  };

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

  const updateUserData = (updatedUser) => {
    setUser(updatedUser);
    const localToken = localStorage.getItem("token");
    const sessionToken = sessionStorage.getItem("token");

    if (localToken) {
      localStorage.setItem("user", JSON.stringify(updatedUser));
    } else if (sessionToken) {
      sessionStorage.setItem("user", JSON.stringify(updatedUser));
    }
  };

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
            console.warn("Could not fetch profile with stored token:", fetchErr);
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
  }, [transactions]);

  // Guest user code
  const handleGuestLogin = () => {
    const guestUser = { name: "Guest", email: "", isGuest: true };
    sessionStorage.setItem("user", JSON.stringify(guestUser));
    setUser(guestUser);
    // setToken(null);
    navigate("/");
  };

  const handleLogin = (userData, remember = false, tokenFromApi = null) => {
    persistAuth(userData, tokenFromApi, remember);
    navigate("/");
  };

  const handleSignup = (userData, remember = false, tokenFromApi = null) => {
    persistAuth(userData, tokenFromApi, remember);
    navigate("/");
  };

  const handleLogout = () => {
    clearAuth();
    navigate("/login");
  };

  if (isLoading) {
    return null;
  }

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} onGuestLogin={handleGuestLogin} API_URL={API_URL} />} />
        <Route path="/signup" element={<SignUp onSignup={handleSignup} />} />
        <Route
          element={(
            <ProtectedRoute user={user}>
              <Layout user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          )}
        >
          <Route path="/" element={<Dashboard />} />
          <Route
            path="/profile"
            element={
              <GuestRoute user={user}>
                <Profile user={user} onUpdateProfile={updateUserData} onLogout={handleLogout} />
              </GuestRoute>
            }
          />
        </Route>
      </Routes>
    </>
  );
};

export default App;

