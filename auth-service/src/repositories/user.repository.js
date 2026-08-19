import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const findByEmail = async (email) => {
  const user = await prisma.users.findUnique({ where: { email } }); 
  return user;
};

const findByUsername = async (username) => {
  const user = await prisma.users.findUnique({ where: { username } }); 
  return user;
};

const findById = async (id) => {
  return await prisma.users.findUnique({ where: { id: parseInt(id) } });
};

const createUser = async (name, username, email, hashedPassword) => {
  return await prisma.users.create({
    data: { name, username, email, password: hashedPassword },
  });
};

const getUserById = async (id) => {
  return await prisma.users.findUnique({
    where: { id: parseInt(id) },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      role: true,
      preferences: true,
    },
  });
};

const updateRefreshToken = async (id, refreshToken) => {
  return await prisma.users.update({
    where: { id },
    data: { refreshToken },
  });
};

const updateUser = async (id, data) => {
  return await prisma.users.update({
    where: { id },
    data,
  });
};

export default {
  findByEmail,
  findByUsername,
  findById,
  createUser,
  getUserById,
  updateRefreshToken,
  updateUser
};
