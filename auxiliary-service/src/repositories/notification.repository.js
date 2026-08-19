import prisma from "../config/prisma.js";

const createNotification = async ({ userId, title, body, type }) => {
    return await prisma.notification.create({
    data: { userId, title, body, type },
  });
}

const getByUser = (userId) => {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
};

const markAsRead = (id) => {
  return prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
};

const deleteNotification = (id) =>{
  return prisma.notification.delete({
    where: { id },
  });
}

export default {
  createNotification,
  getByUser,
  markAsRead,
  deleteNotification
};
