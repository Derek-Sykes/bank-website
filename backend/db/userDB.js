import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma.js";

function splitDisplayName(displayName) {
  const [fName = "", ...rest] = (displayName ?? "").split(" ");
  return { f_name: fName, l_name: rest.join(" ") };
}

function toLegacyUser(user) {
  if (!user) return null;
  const { f_name, l_name } = splitDisplayName(user.displayName);

  return {
    user_id: user.id,
    id: user.id,
    f_name,
    l_name,
    displayName: user.displayName,
    email: user.email,
    softDeleted: user.softDeleted,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function buildDisplayName({ displayName, f_name, l_name }) {
  return displayName ?? [f_name, l_name].filter(Boolean).join(" ").trim();
}

// takes in user containing username and password and returns its details if login success otherwise it returns null.
export async function verifyLogin(user) {
  const { email, password } = user;
  const usersdb = await prisma.user.findFirst({
    where: { email, softDeleted: false },
  });

  if (usersdb) {
    const verified = await verifyPassword(password, usersdb.passwordHash);
    if (verified) {
      return toLegacyUser(usersdb);
    }
  }

  return null;
}

export async function postUser(user) {
  const { email, password } = user;
  const displayName = buildDisplayName(user);
  const hash = await hashPassword(password);

  try {
    await prisma.user.create({
      data: {
        email,
        passwordHash: hash,
        displayName,
        account: {
          create: {
            balance: user.initialBalance ?? 5000,
          },
        },
      },
    });
    console.log("CREATED!!");
    return null;
  } catch (error) {
    if (error.code === "P2002") {
      console.log("Email already in use");
      return "Email already in use";
    }
    console.log("Error creating user: ", error);
    return error;
  }
}

export async function updateUser(user, user_id) {
  const { email, password = null } = user;
  const displayName = buildDisplayName(user);
  const data = { email, displayName };

  if (password) {
    data.passwordHash = await hashPassword(password);
  }

  try {
    await prisma.user.update({
      where: { id: Number(user_id) },
      data,
    });
    return null;
  } catch (error) {
    console.log(error);
    return error;
  }
}

export async function deleteUser(user, user_id) {
  if (Number(user.user_id) === Number(user_id)) {
    try {
      await prisma.user.update({
        where: { id: Number(user_id) },
        data: { softDeleted: true, refreshToken: null },
      });
      return null;
    } catch (error) {
      console.log(error);
      return error;
    }
  }

  console.log("You can't delete another user");
  return "ERROR cannot delete another user";
}

export async function updateRefreshToken(refreshToken, user_id) {
  try {
    await prisma.user.update({
      where: { id: Number(user_id) },
      data: { refreshToken },
    });
    return null;
  } catch (error) {
    return error;
  }
}

export async function verifyRefreshToken(refreshToken) {
  try {
    if (!refreshToken) return null;
    const user = await prisma.user.findFirst({
      where: { refreshToken, softDeleted: false },
    });
    return user ? [toLegacyUser(user)] : null;
  } catch (error) {
    console.log(error);
    return null;
  }
}

export async function removeRefreshTokenDB(refreshToken) {
  try {
    await prisma.user.updateMany({
      where: { refreshToken },
      data: { refreshToken: null },
    });
    return null;
  } catch (error) {
    return error;
  }
}

async function verifyPassword(inputPassword, storedHashedPassword) {
  try {
    const isMatch = await bcrypt.compare(inputPassword, storedHashedPassword);
    return isMatch;
  } catch (err) {
    console.error("Error verifying password:", err);
  }
}

async function hashPassword(password) {
  const saltRounds = 10;
  try {
    const hash = await bcrypt.hash(password, saltRounds);
    return hash;
  } catch (err) {
    console.error("Error hashing password:", err);
  }
}
