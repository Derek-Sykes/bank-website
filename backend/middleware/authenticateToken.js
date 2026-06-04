import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import {
  generateAccessToken,
  verifyRefreshToken,
} from "../src/services/authService.ts";
import { ApiErrorCode } from "../src/lib/apiError.ts";

dotenv.config();

export function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({
        error: {
          code: ApiErrorCode.UNAUTHENTICATED,
          message: "Access token is required.",
        },
      });
  }

  jwt.verify(
    token,
    process.env.ACCESS_TOKEN ?? "dev-access-token",
    async (err, user) => {
      if (err?.name === "TokenExpiredError") {
        const refreshToken = req.cookies.refreshToken;
        const exists = await verifyRefreshToken(refreshToken);
        if (!refreshToken || !exists) {
          return res
            .status(401)
            .json({
              error: {
                code: ApiErrorCode.UNAUTHENTICATED,
                message: "Refresh token is missing. Please log in.",
              },
            });
        }

        return jwt.verify(
          refreshToken,
          process.env.REFRESH_TOKEN ?? "dev-refresh-token",
          (refreshErr, refreshUser) => {
            if (refreshErr?.name === "TokenExpiredError") {
              return res
                .status(403)
                .json({
                  error: {
                    code: ApiErrorCode.FORBIDDEN,
                    message: "Refresh token expired. Please log in.",
                  },
                });
            }
            if (refreshErr) {
              return res
                .status(403)
                .json({
                  error: {
                    code: ApiErrorCode.FORBIDDEN,
                    message: "Invalid refresh token.",
                  },
                });
            }

            const newAccessToken = generateAccessToken({
              user_id: refreshUser.user_id,
              email: refreshUser.email,
              f_name: refreshUser.f_name,
              l_name: refreshUser.l_name,
            });
            return res.json({
              accessToken: newAccessToken,
              message: "retry request",
            });
          },
        );
      }

      if (err) {
        return res
          .status(403)
          .json({
            error: {
              code: ApiErrorCode.FORBIDDEN,
              message: "Invalid access token.",
            },
          });
      }

      req.user = user;
      return next();
    },
  );
}
