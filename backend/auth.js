const jwt = require("jsonwebtoken");

const JWT_SECRET =
  process.env.SESSION_SECRET ||
  process.env.JWT_SECRET ||
  "quickfix-dev-secret";

/* ===========================
   TOKEN HELPERS
=========================== */
function generateToken(userId) {
  if (!userId) throw new Error("generateToken requires userId");

  return jwt.sign(
    { userId },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

/* ===========================
   AUTH MIDDLEWARE (REQUIRED)
=========================== */
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const token = header.split(" ")[1];
  const decoded = verifyToken(token);

  if (!decoded || !decoded.userId) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  req.userId = decoded.userId;
  next();
}

/* ===========================
   AUTH MIDDLEWARE (OPTIONAL)
=========================== */
function optionalAuth(req, res, next) {
  const header = req.headers.authorization;

  if (header && header.startsWith("Bearer ")) {
    const token = header.split(" ")[1];
    const decoded = verifyToken(token);
    if (decoded && decoded.userId) {
      req.userId = decoded.userId;
    }
  }

  next();
}

/* ===========================
   EXPORTS (EXPLICIT & SAFE)
=========================== */
module.exports = {
  generateToken,
  verifyToken,
  authMiddleware,
  optionalAuth
};
