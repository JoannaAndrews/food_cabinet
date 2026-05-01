import { useState } from "react";
import { signupStyles } from "../assets/dummyStyles.js";
import { useNavigate, Link } from "react-router";
import axios from "axios";
import { ArrowLeft, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
const SignUp = ({ API_URL = "http://localhost:5000", onSignUp }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({});
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

  const persistAuth = () => {
    const storage = rememberMe ? localStorage : sessionStorage;
    try {
      if (token) storage.setItem("token", token);
      if (profile) storage.setItem("user", JSON.stringify(profile));
    } catch (err) {
      console.error("Storage Error: ", err);
    }
  }

  //to check if all fields are entered by user
  const validateForm = () => {
    const newErrors = {};
    if (!name.trim()) {
      newErrors.name = "Name is required";
    }
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Email is invalid"
    }
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  //to signup
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    if (!validateForm()) return;
    setIsLoading(true);

    try {
      const res = await axios.post(
        `${API_URL}/user/register`,
        { name, email, password },
        { headers: { "Content-Type": "application/json" } }
      );

      const { token } = res.data; // extract token from response
      const profile = await fetchProfile(token); // fetch user profile

      // persist based on rememberMe
      const storage = rememberMe ? localStorage : sessionStorage;
      if (token) storage.setItem("token", token);
      if (profile) storage.setItem("user", JSON.stringify(profile));

      if (onSignUp) onSignUp(profile); // notify parent if needed
      navigate("/"); // redirect after signup

    } catch (err) {
      console.error("Signup error: ", err?.response || err);
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else if (err.response?.data?.message) {
        setErrors({ api: err.response.data.message });
      } else {
        setErrors({ api: err.message || "An unexpected error occurred" });
      }
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className={signupStyles.pageContainer}>
      <div className={signupStyles.cardContainer}>
        <div className={signupStyles.header}>
          <button onClick={() => navigate(-1)} className={signupStyles.backButton}>
            <ArrowLeft className="w-5 h-5"></ArrowLeft>
          </button>

          <div className={signupStyles.avatar}>
            <User className="w-10 h-10 text-white"></User>
          </div>

          <h1 className={signupStyles.headerTitle}>Create Account</h1>
          {/* <p className={signupStyles.headerSubtitle}>Join ExpenseTracker to manage your finances</p> */}

        </div>

        <div className={signupStyles.formContainer}>
          {errors.api && <p className={signupStyles.apiError}>{errors.api}</p>}

          <form onSubmit={handleSubmit} noValidate>
            <div className=" mb-6">
              <label htmlFor="name" className={signupStyles.label}>
                Full Name
              </label>

              <div className={signupStyles.inputContainer}>
                <div className={signupStyles.inputIcon}>
                  <User className="w-5 h-5"></User>
                </div>
                <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)}
                  className={`${signupStyles.input} ${errors.name ? "border-red-300" : "border-gray-200"
                    }`}
                  placeholder="John Doe"
                ></input>
              </div>

              {errors.name && (
                <p className={signupStyles.fieldError}>{errors.name}</p>
              )}
            </div>


            <div className=" mb-6">
              <label htmlFor="email" className={signupStyles.label}>
                Email
              </label>

              <div className={signupStyles.inputContainer}>
                <div className={signupStyles.inputIcon}>
                  <Mail className="w-5 h-5"></Mail>
                </div>
                <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className={`${signupStyles.input} ${errors.name ? "border-red-300" : "border-gray-200"
                    }`}
                  placeholder="example@email.com"
                ></input>
              </div>

              {errors.name && (
                <p className={signupStyles.fieldError}>{errors.name}</p>
              )}

              <div className=" mb-6">
                <label htmlFor="password" className={signupStyles.label}>
                  Password
                </label>

                <div className={signupStyles.inputContainer}>
                  <div className={signupStyles.inputIcon}>
                    <Lock className="w-5 h-5"></Lock>
                  </div>
                  <input type={showPassword ? "text" : "password"} id="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    className={`${signupStyles.input} ${errors.name ? "border-red-300" : "border-gray-200"
                      }`}
                    placeholder="Your password here"
                  ></input>

                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className={signupStyles.passwordToggle}
                  >
                    {showPassword ? (<EyeOff className="w-5 h-5"></EyeOff>) : (<Eye className="w-5 h-5"></Eye>)
                    }
                  </button>
                </div>

                {errors.name && (
                  <p className={signupStyles.fieldError}>{errors.name}</p>
                )}
              </div>
            </div>

            <button type="submit"

              className={`${signupStyles.button} ${isLoading ? signupStyles.buttonDisabled : ""
                }`} disabled={isLoading}
            >
              {isLoading ? (
                <> Creating Account...  </>
              ) : ("Create Account")}
            </button>

          </form>

          <div className={signupStyles.signInContainer}>
            <p className={signupStyles.signInText}>
              Already have an account?{" "}
              <Link to="/login" className={signupStyles.signInLink}>
                Sign In
              </Link>
            </p>
          </div>
        </div>

      </div>
    </div >);
}

export default SignUp;