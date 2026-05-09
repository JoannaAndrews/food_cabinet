import { useState } from "react";
import { loginStyles } from "../assets/dummyStyles.js"
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { useNavigate, Link } from "react-router";
import axios from "axios";

const Login = ({ onLogin, onGuestLogin, API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000" }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // to fetch profile
  const fetchProfile = async (token) => {
    if (!token) return null;
    const res = await axios.get(`${API_URL}/user/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return res.data;
  }

  const persistAuth = (profile, token) => {
    const storage = rememberMe ? localStorage : sessionStorage;
    try {
      if (token) storage.setItem("token", token);
      if (profile) storage.setItem("user", JSON.stringify(profile));
    } catch (err) {
      console.error("Storage Error: ", err);
    }
  }

  //to login
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const res = await axios.post(
        `${API_URL}/user/login`,
        { email, password },
        { headers: { "Content-Type": "application/json" } }
      )
      const data = res.data || {};
      const token = data.token || null;

      //to derive user profile 
      let profile = data.user ?? null;
      if (!profile) {
        const copy = { ...data };
        delete copy.token;
        delete copy.user;

        if (Object.keys(copy).length) {
          profile = copy;
        }

        if (!profile && token) {
          try {
            profile = await fetchProfile(token);
          } catch (fetchErr) {
            console.warn("Could not fetch profile after login token: ", fetchErr);
          }
        }
      }

      if (!profile) profile = { email };
      persistAuth(profile, token);

      if (typeof onLogin === "function") {
        try {
          onLogin(profile, rememberMe, token);
        } catch (callErr) {
          console.warn("onLogin threw: ", callErr);
          navigate("/");
        }
      } else {
        navigate("/");
      }
      setPassword("");
    } catch (err) {
      console.error("Login error:", err?.response || err);
      const serverMsg =
        err.response?.data?.message ||
        (err.response?.data ? JSON.stringify(err.response.data) : null) || err.message || "Login failed";
      setError(serverMsg);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={loginStyles.pageContainer}>
      <div className={loginStyles.cardContainer}>
        <div className={loginStyles.header}>
          <div className={loginStyles.avatar}>
            <User className="w-10 h-10 text-white"></User>
          </div>
          <h1 className={loginStyles.headerTitle}>Welcome back</h1>
          <p className={loginStyles.headerSubtitle}>
            Sign in
          </p>
        </div>

        <div className={loginStyles.formContainer}>
          {error && (
            <div className={loginStyles.errorContainer}>
              <span className={loginStyles.errorText}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className={loginStyles.label}>
                Email Address
              </label>

              <div className={loginStyles.inputContainer}>


                <input type="email" id="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@example.com"
                  className={loginStyles.input}
                  required>
                </input>

                <div className={loginStyles.inputIcon}>
                  <Mail className="w-5 h-5"></Mail>
                </div>

              </div>

            </div>

            <div>
              <label htmlFor="password" className={loginStyles.label}>
                Password
              </label>

              <div className={loginStyles.inputContainer}>


                <input
                  type={showPassword ? "text" : "password"}
                  id="password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={loginStyles.passwordInput}
                  placeholder="your password"
                  required>
                </input>

                <div className={loginStyles.inputIcon}>
                  <Lock className="w-5 h-5"></Lock>
                </div>


                <button type="button" onClick={() => setShowPassword(!showPassword)} className={loginStyles.passwordToggle}>
                  {showPassword ? (
                    <EyeOff className=" w-5 h-5"></EyeOff>
                  ) : (<Eye className=" w-5 h-5"></Eye>)}
                </button>

              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`${loginStyles.button} ${isLoading ? loginStyles.buttonDisabled : ""
                  }`}>
                {isLoading ? "Signing In..." : "Sign In"}
              </button>
            </div>
          </form>

          <div className={loginStyles.signUpContainer}>
            <p className={loginStyles.signUpText}>
              Don't Have an account?{" "}
            </p>
            <Link to='/signup' className={loginStyles.signUpLink}>
              Create One
            </Link>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={onGuestLogin}
              className={loginStyles.button}
            >
              Or... Continue as Guest
            </button>
          </div>

        </div>

      </div >
    </div >)
}

export default Login;