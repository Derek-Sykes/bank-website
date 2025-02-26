import express from "express";
import {
  verifyLogin,
  postUser,
  removeRefreshTokenDB,
  updateUser,
  deleteUser,
} from "../db/userDB.js";
import { postItem } from "../db/itemDB.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../controllers/token.js";
import { authenticateToken } from "../middleware/authenticateToken.js";
import dotenv from "dotenv";
import jwt from "jsonwebtoken"; // ✅ Ensure jsonwebtoken is imported

dotenv.config();

const router = express.Router();

router.get("/test", (req, res) => {
  res.send("Hello, World!");
});

router.post("/login", async (req, res) => {
  let user = req.body.user;
  console.log(user);
  console.log(req.body);
  let userDetails = await verifyLogin(user);
  if (userDetails) {
    const accessToken = generateAccessToken({
      user_id: userDetails.user_id,
      email: userDetails.email,
      f_name: userDetails.f_name,
      l_name: userDetails.l_name,
    });
    const refreshToken = await generateRefreshToken({
      user_id: userDetails.user_id,
      email: userDetails.email,
      f_name: userDetails.f_name,
      l_name: userDetails.l_name,
    });
    console.log("Generated Refresh Token in login:", refreshToken);
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    }); // Secure the refresh token in a cookie
    res.status(200).json({ accessToken, userDetails });
  } else if (userDetails === null) {
    res.status(401).json({ message: "Invalid User" });
  } else {
    res.status(500).json({ message: "internal server failure" });
  }
});

router.post("/register", async (req, res) => {
  let user = req.body.user;
  if (user) {
    let error = await postUser(user);
    if (error) {
      res.status(400).send(error);
    } else {
      let userDetails = await verifyLogin(user);
      const mainAcct = {
        name: "Main Account",
        description: "Main Account",
        cost: null,
        balance: 5000,
        category_id: null,
        user_id: userDetails.user_id,
      };
      await postItem(mainAcct);
      const accessToken = generateAccessToken({
        user_id: userDetails.user_id,
        email: userDetails.email,
        f_name: userDetails.f_name,
        l_name: userDetails.l_name,
      });
      const refreshToken = await generateRefreshToken({
        user_id: userDetails.user_id,
        email: userDetails.email,
        f_name: userDetails.f_name,
        l_name: userDetails.l_name,
      });

      // TODO: just updated cookies make sure they arent the cause of an errors (the dave guy on youtube explains errors you might get related to cors if you try to access this backend through a fronted via http requests.)
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        // sameSite: "None",
        // secure: true,
        maxAge: 24 * 60 * 60 * 1000,
      }); // Secure the refresh token in a cookie
      res.status(201).json({ accessToken, userDetails });
    }
  }
  res.status(401); //401 unauthorized access
});

// Logout Route
router.post("/logout", async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  // remove refresh token from db
  await removeRefreshTokenDB(refreshToken);
  res.clearCookie("refreshToken", {
    httpOnly: true,
    sameSite: "None",
    secure: true,
  });
  res.status(204).json({ message: "Logged out successfully" });
});

router.get("/session", async (req, res) => {
  console.log("📡 Session check requested...");
  console.log("Cookies received:", req.cookies); // ✅ Debug log

  const token = req.cookies.refreshToken; // ✅ Read token from cookies
  if (!token) {
    console.log("❌ No session found!");
    return res.status(401).json({ error: "No active session" });
  }

  try {
    console.log("🔑 Verifying session token...");
    const user = jwt.verify(token, process.env.REFRESH_TOKEN);
    console.log("✅ User found:", user);
    res.json(user);
  } catch (error) {
    console.log("❌ Invalid session!", error.message);
    return res.status(403).json({ error: "Invalid session" });
  }
});

router
  .route("/user")
  .put(authenticateToken, async (req, res) => {
    let user = req.body;
    let user_id = req.user.user_id;
    let error = await updateUser(user, user_id);
    if (error) {
      res.status(400).send(error);
    } else {
      res.status(200).json({ message: "User updated successfully" });
    }
  })
  .delete(authenticateToken, async (req, res) => {
    let user = req.body;
    let user_id = req.user.user_id;
    let error = await deleteUser(user, user_id);
    if (error) {
      res.status(400).send(error);
    } else {
      res.status(200).json({ message: "User deleted successfully" });
    }
  });
export default router;

// refreshes access token with refresh token
// router.post("/token", async (req, res) => {
//   const refreshToken = req.cookies.refreshToken;
//   if (!refreshToken) return res.status(401).send("no refresh token in cookies");
//   let exists = await verifyRefreshToken(refreshToken);
//   if (!exists) return res.status(403).send("Invalid refresh token not in db");

//   try {
//     const user = jwt.verify(refreshToken, process.env.REFRESH_TOKEN);
//     const accessToken = generateAccessToken({
//       user_id: user.user_id,
//       email: user.email,
//     });
//     res.json({ accessToken });
//   } catch (err) {
//     res
//       .status(403)
//       .send(
//         "Invalid refresh token probably expired login again to get new refresh token",
//       );
//   }
// });
