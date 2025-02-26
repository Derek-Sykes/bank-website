import jwt from "jsonwebtoken";
import { generateAccessToken } from "../controllers/token.js";
import { verifyRefreshToken } from "../db/userDB.js";
import dotenv from "dotenv";
dotenv.config();

export function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"]; // Get the Authorization header
  let token = authHeader && authHeader.split(" ")[1]; // Extract the token (e.g., "Bearer <token>")
  console.log("AUTHHEADER: ", authHeader, "TOKEN: ", token);
  if (!token) {
    token =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoyLCJlbWFpbCI6ImRlcmVrc3lrZXNAZ21haWwuY29tIiwiaWF0IjoxNzMyMjk4Mjk1LCJleHAiOjE3MzIyOTkxOTV9.LAzZVAiwYB7o9ESExgUkwTlPKNyvEzLSZkCFHFxRwXk";
  }

  jwt.verify(token, process.env.ACCESS_TOKEN, async (err, user) => {
    if (err && err.name === "TokenExpiredError") {
      console.log("token expired, trying to refresh");
      // If the access token is expired, try to refresh the token
      const refreshToken = req.cookies.refreshToken; // Get refresh token from cookie
      console.log("Refresh Token:", refreshToken);
      let exists = await verifyRefreshToken(refreshToken);
      // check if refresh token even exists in session
      if (!refreshToken || Object.keys(refreshToken).length === 0 || !exists) {
        return res
          .status(401)
          .json({ message: "Refresh token is missing! Login!" });
      }

      // Verify the refresh token
      jwt.verify(refreshToken, process.env.REFRESH_TOKEN, (err, user) => {
        if (user) {
          req.user = user;
        } else {
          req.user = null;
        }
        // if refresh token is expiered tell them to login again
        if (err && err.name === "TokenExpiredError") {
          console.log("\n\nERROR:\n", "Login again, refresh token has expired");
          return res
            .status(403)
            .json({ message: "Refresh token expired, Login again." });
          // otherwise give the default error
        } else if (err) {
          console.log("\n\nERROR:\n", err, "\n\n");
          return res.status(403).json({ message: "Invalid refresh token." });
        }

        // Generate new access token if the refresh token is valid
        // const newAccessToken = jwt.sign(
        //   { user_id: user.user_id, email: user.email },
        //   process.env.ACCESS_TOKEN,
        //   { expiresIn: "15m" },
        // );
        const newAccessToken = generateAccessToken({
          user_id: user.user_id,
          email: user.email,
          f_name: user.f_name,
          l_name: user.l_name,
        });

        // Send the new access token to the client and tell them to retry the request (frontend should naturally do this)
        res.json({ accessToken: newAccessToken, message: "retry request" });

        // Optionally, store the new access token in response headers or cookies for the client to use on subsequent requests
      });
    } else if (err && err.name === "invalid token") {
      console.log(err);
      return res.status(403).json({ message: "Invalid access token." });
    } else if (err) {
      console.log(err);
      return res
        .status(403)
        .json({ message: "Something went wrong :( ... see console" });
    }

    if (user) {
      req.user = user;
      next(); // Proceed to the next middleware or route handler
    }
  });
}
