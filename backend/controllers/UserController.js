import User from '../models/userModel.js';
import validator from 'validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'jwt_secret';
const TOKEN_EXPIRES = '24h';

const createToken = (userId) =>
  jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRES });

//Register a User
export async function registerUser(req, res) {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json(
      {
        success: false,
        message: "All fields are required."
      }
    )
  }
  if (!validator.isEmail(email)) {
    return res.status(400).json(
      {
        success: false,
        message: "Invalid email"
      }
    );
  }
  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters"
    })
  }

  try {
    if (await User.findOne({ email })) {
      return res.status(409).json(
        {
          success: false,
          message: "User already present"
        }
      )
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });
    const token = createToken(user._id);
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id, name: user.name, email: user.email,
        volunteerStatus: user.volunteerStatus,   // will be false
        fillSubscribed: user.fillSubscribed,     // will be false
        emptySubscribed: user.emptySubscribed    // will be false
      }
    });
  }
  catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error"
    })
  }

}

// To Login a User
export async function loginUser(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Both fields are required."
    })
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      })
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const token = createToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        volunteerStatus: user.volunteerStatus,
        fillSubscribed: user.fillSubscribed,
        emptySubscribed: user.emptySubscribed
      }
    })

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error"
    });
  }

}

// to get login user details
export async function getCurrentUser(req, res) {
  try {
    //const user = await User.findById(req.user.id).select("name email");
    const user = await User.findById(req.user.id).select("name email volunteerStatus fillSubscribed emptySubscribed");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    res.json({ success: true, user });
  }

  catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error"
    });
  }
}

//to update a user profile
export async function updateProfile(req, res) {

  const { name, email } = req.body;
  if (!name || !email || !validator.isEmail(email)) {
    return res.status(400).json(
      { success: false, message: "Valid email and name are required" }
    );
  }
  try {
    const exists = await User.findOne({ email, _id: { $ne: req.user.id } });
    if (exists) {
      return res.status(409).json({
        success: false,
        message: "Email already in use."
      });
    }
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, email },
      { new: true, runValidators: true, select: "name email volunteerStatus fillSubscribed emptySubscribed" }
    );
    res.json({
      success: true,
      user
    })
  }
  catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error"
    });
  }
}

// to change user password
export async function updatePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password invalid or too short."
    });
  } try {
    const user = await User.findById(req.user.id).select("password");
    if (!user) {
      return res.status(409).json({
        success: false,
        message: "User not found."
      })
    }

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Current Password is incorrect."
      });
    }
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({
      success: true,
      message: "Password changed"
    });
  }
  catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error"
    });
  }
}


// to change volunteerStatus
export async function switchVolunteerStatus(req, res) {

  const { volunteerStatus } = req.body;

  try {
    const user = await User.findById(req.user.id).select("volunteerStatus");
    if (!user) {
      return res.status(409).json({
        success: false,
        message: "User not found."
      })
    }

    user.volunteerStatus = volunteerStatus;
    await user.save();
    res.json({
      success: true,
      message: "Volunteer Status changed"
    });
  }
  catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error when changing volunteer status"
    });
  }
}

// to change fillSubscribed (available to all users)
export async function switchFillSub(req, res) {
  //will be sent on change from front end
  const { subscriptionStatus } = req.body;
  try {
    const user = await User.findById(req.user.id).select("fillSubscribed");
    if (!user) {
      return res.status(409).json({
        success: false,
        message: "User not found."
      })
    }

    user.fillSubscribed = subscriptionStatus;
    await user.save();
    res.json({
      success: true,
      message: "Fill Subscription Status changed"
    });
  }
  catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error when changing fill subscription status"
    });
  }
}


// to change emptySubscribed (available only to volunteers)
export async function switchEmptySub(req, res) {
  //will be sent on change from front end
  const { subscriptionStatus } = req.body;
  try {
    const user = await User.findById(req.user.id).select("emptySubscribed");
    if (!user) {
      return res.status(409).json({
        success: false,
        message: "User not found."
      })
    }

    user.emptySubscribed = subscriptionStatus;
    await user.save();
    res.json({
      success: true,
      message: "Empty Subscription Status changed"
    });
  }
  catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error when changing empty subscription status"
    });
  }
}