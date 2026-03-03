const passport = require("passport");
const JwtStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;
const User = require("../models/User");

// JWT strategy options
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
  passReqToCallback: true,
};

// JWT strategy for authentication
passport.use(
  new JwtStrategy(jwtOptions, async (req, jwtPayload, done) => {
    try {
      // Find user by ID from JWT payload
      const user = await User.findById(jwtPayload.userId);

      if (user) {
        // Check if user is verified
        if (!user.isVerified) {
          return done(null, false, { message: "Email not verified" });
        }

        // Update last login time
        user.lastLogin = new Date();
        await user.save();

        return done(null, user);
      } else {
        return done(null, false, { message: "User not found" });
      }
    } catch (error) {
      console.error("Passport JWT strategy error:", error);
      return done(error, false);
    }
  }),
);

// Serialize user for session (if using sessions)
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session (if using sessions)
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Middleware to initialize passport
const initializePassport = () => {
  return passport.initialize();
};

// Middleware for JWT authentication
const authenticateJWT = passport.authenticate("jwt", {
  session: false,
  failWithError: true,
});

// Custom middleware to handle JWT authentication errors
const handleJWTErrors = (err, req, res, next) => {
  if (err) {
    return res.status(401).json({
      success: false,
      message: "Authentication failed",
      error: err.message,
    });
  }
  next();
};

// Optional JWT authentication (doesn't fail if no token)
const optionalJWT = (req, res, next) => {
  passport.authenticate("jwt", { session: false }, (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (user) {
      req.user = user;
    }
    next();
  })(req, res, next);
};

// Admin role verification middleware
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  // In a real application, you might have an admin role in your User model
  // For now, we'll check if the user has admin privileges based on email or other criteria
  // You can modify this based on your User model structure

  const isAdmin = req.user.email === process.env.ADMIN_EMAIL; // Example check

  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
    });
  }

  next();
};

// Export middleware and configuration
module.exports = {
  passport,
  initializePassport,
  authenticateJWT: [authenticateJWT, handleJWTErrors],
  optionalJWT,
  requireAdmin,
  jwtOptions,
};
