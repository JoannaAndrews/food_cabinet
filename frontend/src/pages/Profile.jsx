import { useCallback, useEffect } from "react";
import { profileStyles } from "../assets/dummyStyles";
import Modal from 'react-modal';
import { toast } from 'react-toastify';
import { memo } from 'react';
import { useNavigate } from "react-router";
import { useState } from "react";
import axios from "axios";
import { EyeOff, Eye, User, Lock } from "lucide-react";


const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

Modal.setAppElement('#root');
// Move PasswordInput component outside of ProfilePage to prevent recreation on every render
const PasswordInput = memo(({ name, label, value, error, showField, onToggle, onChange, disabled }) => (
  <div>
    <label className={profileStyles.passwordLabel}>
      {label}
    </label>
    <div className={profileStyles.passwordContainer}>
      <input
        type={showField ? "text" : "password"}
        name={name}
        value={value}
        onChange={onChange}
        className={`${profileStyles.inputWithError} ${error ? 'border-red-300' : 'border-gray-200'
          }`}
        placeholder={`Enter ${label.toLowerCase()}`}
        disabled={disabled}
        // Add key prop to help React identify the input
        key={`password-input-${name}`}
      />
      <button
        type="button"
        onClick={onToggle}
        className={profileStyles.passwordToggle}
        disabled={disabled}
      >
        {showField ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </button>
    </div>
    {error && (
      <p className={profileStyles.errorText}>{error}</p>
    )}
  </div>
));

PasswordInput.displayName = 'PasswordInput';


const Profile = ({ user: propUser, onUpdateProfile, onLogout }) => {

  const [subscriptions, setSubscriptions] = useState({
    fillSubscribed: propUser?.fillSubscribed ?? false,
    emptySubscribed: propUser?.emptySubscribed ?? false,
  });

  const navigate = useNavigate();
  const [user, setUser] = useState({
    name: '',
    email: '',
    joinDate: ''
  });
  const [editMode, setEditMode] = useState(false);
  const [tempUser, setTempUser] = useState({ ...user });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const getAuthToken = useCallback(() => {
    return localStorage.getItem("token") || sessionStorage.getItem("token");
  }, []);

  useEffect(() => {
    setTempUser(user);
  }, [user]);

  //API request
  const handleApiRequest = useCallback(async (method, endpoint, data = null) => {
    const token = getAuthToken();
    console.log("token:", token);
    if (!token) {
      navigate("/login");
      return null;
    }

    try {
      setLoading(true);
      const config = {
        method,
        url: `${BASE_URL}${endpoint}`,
        headers: { Authorization: `Bearer ${token}` }
      };
      if (data) config.data = data;
      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error(`${method} request error:`, error);
      if (error.response?.status === 401) {
        navigate("/login");
      }
      throw error;
    } finally {
      setLoading(false);
    }

  }, [getAuthToken, navigate],);

  //to fetch current user
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const data = await handleApiRequest("get", "/user/me");
        if (data) {
          const userData = data.user || data;
          setUser(userData);
          setTempUser(userData);
          setSubscriptions({
            fillSubscribed: userData.fillSubscribed ?? false,
            emptySubscribed: userData.emptySubscribed ?? false,
          });
        }
      } catch (error) {
        toast.error("Failed to load user data");
      }
    };
    fetchUserData();
  }, [handleApiRequest]);

  // Handle subscription changes
  const handleSubscriptionChange = useCallback(async (type, value) => {
    const endpoint = type === "fill" ? "/user/subscription/fill" : "/user/subscription/empty";

    try {
      await handleApiRequest("patch", endpoint, { subscriptionStatus: value });
      setSubscriptions(prev => ({
        ...prev,
        [type === "fill" ? "fillSubscribed" : "emptySubscribed"]: value
      }));
      toast.success(`${type === "fill" ? "Fill" : "Empty"} subscription updated!`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update subscription");
    }
  }, [handleApiRequest]);

  // Input change handlers
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setTempUser(prev => ({ ...prev, [name]: value }));
  }, []);

  const handlePasswordChange = useCallback((e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    setPasswordErrors(prev => ({ ...prev, [name]: '' }));
  }, []);

  // Password visibility toggle
  const togglePasswordVisibility = useCallback((field) => {
    setShowPassword(prev => ({ ...prev, [field]: !prev[field] }));
  }, []);

  // save profile
  const handleSaveProfile = async () => {
    try {
      const data = await handleApiRequest("put", "user/profile", tempUser);
      if (data) {
        const updatedUser = data.user || data;
        setUser(updatedUser);
        setTempUser(updatedUser);
        setEditMode(false);

        onUpdateProfile?.(updatedUser);
        toast.success("Profile updated successfully!");
      }

    } catch (error) {
      toast.error(error.response?.data?.message || "Failed tp update profile");
    }
  };

  const handleCancelEdit = useCallback(() => {
    setTempUser(user);
    setEditMode(false);
  }, [user]);

  // Password validation
  const validatePassword = useCallback(() => {
    const errors = {};
    if (!passwordData.current) errors.current = 'Current password is required';
    if (!passwordData.new) {
      errors.new = 'New password is required';
    } else if (passwordData.new.length < 8) {
      errors.new = 'Password must be at least 8 characters';
    }
    if (passwordData.new !== passwordData.confirm) {
      errors.confirm = 'Passwords do not match';
    }
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  }, [passwordData]);

  //to change password
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!validatePassword()) return;

    try {
      await handleApiRequest("put", "/password", {
        currentPassword: passwordData.current,
        newPassword: passwordData.new,
      });

      toast.success("Password changed successfully");
      setShowPasswordModal(false);
      setPasswordData({ current: "", new: "", confirm: "" });
      setPasswordErrors({});

      //reset password visibility
      setShowPassword({ current: false, new: false, confirm: false });
    } catch (error) {
      toast.error(error.response?.data.message || "Failed to update profile");
    }
  }

  const handleLogout = useCallback(() => {
    onLogout?.();
    navigate("/signup");
  }, [onLogout, navigate]);

  const closePasswordModal = useCallback(() => {
    if (!loading) {
      setShowPasswordModal(false);
      setPasswordData({ current: "", new: "", confirm: "" });
      setPasswordErrors({});
    }

    //reset password visibility
    setShowPassword({ current: false, new: false, confirm: false });

  }, [loading])

  return <div className={profileStyles.container}>
    <div className={profileStyles.mainContainer}>
      <div className={profileStyles.header}>
        <div className={profileStyles.avatar}>
          <User className="w-12 h-12 text-white"></User>
        </div>
        <h1 className={profileStyles.userName}>{user.name || "Loading..."}</h1>
        <p className={profileStyles.userEmail}>{user.email || "Loading..."}</p>
      </div>

      <div className={profileStyles.content}>
        <div className={profileStyles.grid}>
          <div className={profileStyles.card}>
            <div className=" flex justify-between items-center mb-6">
              <h2 className={profileStyles.cardTitle}>
                <User className={profileStyles.icon}></User>
                Personal Information
              </h2>
              {!editMode && (
                <button onClick={() => setEditMode(true)} className={profileStyles.editButton}
                  disabled={loading}
                >
                  {loading ? "Loading..." : "Edit"}
                </button>
              )}
            </div>

            {editMode ? (
              <div className="space-y-4">
                <div>
                  <label className={profileStyles.label}>Full Name</label>
                  <input type="text" name="name" value={tempUser.name}
                    onChange={handleInputChange} className={profileStyles.input}
                    disabled={loading}
                  ></input>
                </div>

                <div>
                  <label className={profileStyles.label}>Email Address</label>
                  <input type="email" name="email" value={tempUser.email}
                    onChange={handleInputChange} className={profileStyles.input}
                    disabled={loading}
                  ></input>
                </div>

                <div className="flex gap-3 pt-4">
                  <button onClick={handleSaveProfile} className={profileStyles.buttonPrimary} disabled={loading}>
                    {loading ? "Saving..." : "Save Changes"}
                  </button>

                  <button onClick={handleCancelEdit} className={profileStyles.buttonSecondary} disabled={loading}>
                    Cancel
                  </button>
                </div>

              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className={profileStyles.label}>Full Name</p>
                  <p className="font-medium text-gray-800">{user.name}</p>
                </div>

                <div>
                  <p className={profileStyles.label}>Email Address</p>
                  <p className="font-medium text-gray-800">{user.email}</p>
                </div>
              </div>
            )}
          </div>

          <div className={profileStyles.card}>
            <h2 className={profileStyles.cardTitle}>
              <Lock className={profileStyles.icon}>Account Security</Lock>
            </h2>

            <div className="space-y-4">
              <div className={profileStyles.securityItem}>
                <div>
                  <p className={profileStyles.securityText}>Password</p>
                </div>
                <button onClick={() => setShowPasswordModal(true)}
                  className={profileStyles.changeButton}
                  disabled={loading}
                >
                  Change
                </button>
              </div>
            </div>

            <button onClick={handleLogout} className={`${profileStyles.buttonPrimary} mt-6 w-full hover:opacity-90 transition-opacity`} disabled={loading}>
              {loading ? "Processing..." : "Logout"}
            </button>
          </div>

          <div className={profileStyles.card}>
            <h2 className={profileStyles.cardTitle}>
              Notification Subscriptions
            </h2>

            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={subscriptions.fillSubscribed}
                  onChange={(e) => handleSubscriptionChange("fill", e.target.checked)}
                  disabled={loading}
                  className="w-4 h-4 accent-teal-500"
                />
                <div>
                  <p className="font-medium text-gray-800">Fill Notifications</p>
                  <p className="text-sm text-gray-500">Get notified when someone has filled the cabinet</p>
                </div>
              </label>


              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={subscriptions.emptySubscribed}
                  onChange={(e) => handleSubscriptionChange("empty", e.target.checked)}
                  disabled={loading}
                  className="w-4 h-4 accent-teal-500"
                />
                <div>
                  <p className="font-medium text-gray-800">Empty Notifications</p>
                  <p className="text-sm text-gray-500">Get notified when the cabinet has gotten empty</p>
                </div>
              </label>

            </div>
          </div>

        </div>
      </div>

    </div>

    {/* Change Password Modal */}
    <Modal
      isOpen={showPasswordModal}
      onRequestClose={closePasswordModal}
      contentLabel="Change Password"
      shouldCloseOnOverlayClick={!loading}
      shouldCloseOnEsc={!loading}
      shouldFocusAfterRender={true}
      shouldReturnFocusAfterClose={true}
      style={{
        content: {
          top: '50%',
          left: '50%',
          right: 'auto',
          bottom: 'auto',
          marginRight: '-50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '0.5rem',
          width: '90%',
          maxWidth: '400px',
          zIndex: 1000,
        },
        overlay: {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 999,
        }
      }}
    >
      <div className={profileStyles.modalContent}>
        <div className={profileStyles.modalHeader}>
          <h3 className={profileStyles.modalTitle}>Change Password</h3>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4 lg:-mx-20">
          <PasswordInput
            name="current"
            label="Current Password"
            value={passwordData.current}
            error={passwordErrors.current}
            showField={showPassword.current}
            onToggle={() => togglePasswordVisibility('current')}
            onChange={handlePasswordChange}
            disabled={loading}
          />

          <PasswordInput
            name="new"
            label="New Password"
            value={passwordData.new}
            error={passwordErrors.new}
            showField={showPassword.new}
            onToggle={() => togglePasswordVisibility('new')}
            onChange={handlePasswordChange}
            disabled={loading}
          />

          <PasswordInput
            name="confirm"
            label="Confirm New Password"
            value={passwordData.confirm}
            error={passwordErrors.confirm}
            showField={showPassword.confirm}
            onToggle={() => togglePasswordVisibility('confirm')}
            onChange={handlePasswordChange}
            disabled={loading}
          />

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className={`${profileStyles.buttonPrimary} min-w-[150px] text-sm md:text-base whitespace-nowrap`}
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
            <button
              type="button"
              onClick={closePasswordModal}
              className={`${profileStyles.buttonSecondary} min-w-[110px] text-sm md:text-base whitespace-nowrap`}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </Modal>

  </div >;
}

export default Profile