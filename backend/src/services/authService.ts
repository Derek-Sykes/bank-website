import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { prisma } from "../lib/prisma.ts";
import { ApiError, ApiErrorCode, assertApi } from "../lib/apiError.ts";
import { recordActivity } from "./activityService.ts";

dotenv.config();

const MAIN_ACCOUNT_STARTING_BALANCE = 5000;

type JwtUser = {
  user_id: number;
  email: string;
  f_name?: string | null;
  l_name?: string | null;
};

function publicUser(user: {
  user_id: number;
  email: string;
  f_name: string | null;
  l_name: string | null;
}) {
  return {
    user_id: user.user_id,
    email: user.email,
    f_name: user.f_name,
    l_name: user.l_name,
  };
}

export function generateAccessToken(user: JwtUser) {
  return jwt.sign(user, process.env.ACCESS_TOKEN ?? "dev-access-token", {
    expiresIn: "15m",
  });
}

export function generateRefreshTokenPayload(user: JwtUser) {
  return jwt.sign(user, process.env.REFRESH_TOKEN ?? "dev-refresh-token", {
    expiresIn: "1d",
  });
}

async function issueTokens(user: JwtUser) {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshTokenPayload(user);
  await prisma.user.update({
    where: { user_id: user.user_id },
    data: { refresh_token: refreshToken },
  });
  return { accessToken, refreshToken };
}

export async function login(input: { email: string; password: string }) {
  assertApi(
    input?.email && input?.password,
    400,
    ApiErrorCode.INVALID_INPUT,
    "Email and password are required.",
  );
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  assertApi(
    user,
    401,
    ApiErrorCode.INVALID_CREDENTIALS,
    "Invalid email or password.",
  );

  const verified = await bcrypt.compare(input.password, user.password);
  assertApi(
    verified,
    401,
    ApiErrorCode.INVALID_CREDENTIALS,
    "Invalid email or password.",
  );

  const userDetails = publicUser(user);
  const tokens = await issueTokens(userDetails);
  await recordActivity({ user_id: user.user_id, type: "LOGIN" });
  return { ...tokens, userDetails };
}

export async function signup(input: {
  f_name?: string;
  l_name?: string;
  email: string;
  password: string;
}) {
  assertApi(
    input?.email && input?.password,
    400,
    ApiErrorCode.INVALID_INPUT,
    "Email and password are required.",
  );
  const hash = await bcrypt.hash(input.password, 10);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        f_name: input.f_name ?? null,
        l_name: input.l_name ?? null,
        email: input.email,
        password: hash,
      },
    });

    await tx.item.create({
      data: {
        name: "Main Account",
        description: "Main Account",
        cost: null,
        balance: MAIN_ACCOUNT_STARTING_BALANCE,
        allocation_percent: 0,
        category_id: null,
        user_id: created.user_id,
      },
    });

    await recordActivity(
      {
        user_id: created.user_id,
        type: "SIGNUP",
        amount: MAIN_ACCOUNT_STARTING_BALANCE,
      },
      tx,
    );
    return created;
  });

  const userDetails = publicUser(user);
  const tokens = await issueTokens(userDetails);
  return { ...tokens, userDetails };
}

export async function logout(refreshToken?: string) {
  if (!refreshToken) return;
  await prisma.user.updateMany({
    where: { refresh_token: refreshToken },
    data: { refresh_token: null },
  });
}

export async function getSession(refreshToken?: string) {
  assertApi(
    refreshToken,
    401,
    ApiErrorCode.UNAUTHENTICATED,
    "No active session.",
  );
  try {
    return jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN ?? "dev-refresh-token",
    );
  } catch {
    throw new ApiError(403, ApiErrorCode.FORBIDDEN, "Invalid session.");
  }
}

export async function updateUser(
  user_id: number,
  input: {
    f_name?: string;
    l_name?: string;
    email?: string;
    password?: string;
  },
) {
  const data: {
    f_name?: string | null;
    l_name?: string | null;
    email?: string;
    password?: string;
  } = {
    f_name: input.f_name ?? null,
    l_name: input.l_name ?? null,
    email: input.email,
  };
  if (input.password) data.password = await bcrypt.hash(input.password, 10);
  return publicUser(await prisma.user.update({ where: { user_id }, data }));
}

export async function deleteUser(user_id: number, requested_user_id?: number) {
  assertApi(
    Number(requested_user_id) === Number(user_id),
    403,
    ApiErrorCode.FORBIDDEN,
    "You cannot delete another user.",
  );
  await prisma.user.delete({ where: { user_id } });
}

export async function verifyRefreshToken(refreshToken?: string) {
  if (!refreshToken) return null;
  return prisma.user.findFirst({ where: { refresh_token: refreshToken } });
}
