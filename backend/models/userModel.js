import mongoose from "mongoose";

const userSchema = new mongoose.Schema({

  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  volunteerStatus: {
    type: Boolean,
    required: true,
    default: true
  },
  fillSubscribed: {
    type: Boolean,
    required: true,
    default: false
  },
  emptySubscribed: {
    type: Boolean,
    required: true,
    default: false
  }
});

const userModel = mongoose.models.user || mongoose.model("user", userSchema);
export default userModel;