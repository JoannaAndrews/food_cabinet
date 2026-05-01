import User from '../models/userModel.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'jwt_secret';

export default async function authMiddleware(req, res, next) {
  // grab the token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Not authorized or token missing"
    });
  }
  //split the token using a space for the 1st index
  const token = authHeader.split(" ")[1];

  //to verify the token 
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.id).select("-password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found"
      });
    }
    req.user = user;
    next(); //user is found over here
  }
  catch (error) {
    console.error("JWT verification failed: ", error);
    return res.status(401).json({
      success: false,
      message: "Token invalid or expired"
    });
  }
} 