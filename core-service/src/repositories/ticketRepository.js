import prisma  from "../config/prisma.js";

const insertSale = async (tx, tandaId, sellerId, quantity) => {
  // Usamos la transacción si existe, sino el cliente normal
  const client = tx || prisma;

  return await client.ticket_sales.create({
    data: {
      tanda_id: parseInt(tandaId),
      seller_id: parseInt(sellerId),
      quantity: parseInt(quantity),
    },
    select: { id: true },
  });
};


export default {
  insertSale,
};