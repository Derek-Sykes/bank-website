import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import type { AuthenticatedUser } from "../types/auth.js";

export interface UserCredentials {
  email: string;
  password: string;
}

export interface UserInput extends UserCredentials {
  f_name: string;
  l_name: string;
}

export type UserUpdateInput = Partial<UserInput>;

function toAuthenticatedUser(user: {
  user_id: number;
  email: string;
  f_name: string;
  l_name: string;
}): AuthenticatedUser {
  return {
    user_id: user.user_id,
    email: user.email,
    f_name: user.f_name,
    l_name: user.l_name,
  };
}

export async function verifyLogin(
  credentials: UserCredentials,
): Promise<AuthenticatedUser | null> {
  const user = await prisma.user.findUnique({
    where: { email: credentials.email },
  });

  if (!user) {
    return null;
  }

  const verified = await bcrypt.compare(credentials.password, user.password);
  return verified ? toAuthenticatedUser(user) : null;
}

export async function createUser(user: UserInput): Promise<null | string> {
  const hash = await hashPassword(user.password);

  try {
    await prisma.user.create({
      data: {
        f_name: user.f_name,
        l_name: user.l_name,
        email: user.email,
        password: hash,
      },
    });
    return null;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return "Email already in use";
    }
    throw error;
  }
}

export async function updateUser(
  user: UserUpdateInput,
  user_id: number,
): Promise<void> {
  const data: Prisma.UserUpdateInput = {};

  if (user.f_name !== undefined) data.f_name = user.f_name;
  if (user.l_name !== undefined) data.l_name = user.l_name;
  if (user.email !== undefined) data.email = user.email;
  if (user.password) data.password = await hashPassword(user.password);

  await prisma.user.update({
    where: { user_id },
    data,
  });
}

export async function deleteUser(
  requestedUser: { user_id?: number },
  user_id: number,
): Promise<void> {
  if (requestedUser.user_id !== user_id) {
    throw new Error("ERROR cannot delete another user");
  }

  await prisma.user.delete({ where: { user_id } });
}

export async function updateRefreshToken(
  refreshToken: string,
  user_id: number,
): Promise<void> {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.user.update({
      where: { user_id },
      data: { refresh_token: refreshToken },
    }),
    prisma.session.upsert({
      where: { refresh_token: refreshToken },
      update: { user_id, expires_at: expiresAt },
      create: { refresh_token: refreshToken, user_id, expires_at: expiresAt },
    }),
  ]);
}

export async function verifyRefreshToken(
  refreshToken: string | undefined,
): Promise<AuthenticatedUser | null> {
  if (!refreshToken) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { refresh_token: refreshToken },
    include: { user: true },
  });

  if (session && session.expires_at > new Date()) {
    return toAuthenticatedUser(session.user);
  }

  const user = await prisma.user.findFirst({
    where: { refresh_token: refreshToken },
  });
  return user ? toAuthenticatedUser(user) : null;
}

export async function removeRefreshToken(
  refreshToken: string | undefined,
): Promise<void> {
  if (!refreshToken) {
    return;
  }

  await prisma.$transaction([
    prisma.user.updateMany({
      where: { refresh_token: refreshToken },
      data: { refresh_token: null },
    }),
    prisma.session.deleteMany({ where: { refresh_token: refreshToken } }),
  ]);
}

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}
