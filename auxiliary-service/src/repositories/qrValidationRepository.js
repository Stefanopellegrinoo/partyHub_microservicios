import prisma from "../config/prisma.js"


export const qrValidationRepository = {
  //  INCLUDE A TABLA USERS, events y tandas(las 3 se pueden sacar, ver cambios en el front) -> MAL
  async findByTicketCode(ticketCode) {
    return prisma.attendees.findFirst({
      where: { ticket_code: ticketCode },
      select: {
    id: true,
    full_name: true,
    document_id: true,
    email: true,
    phone: true,
    paid: true, 
    created_at: true,
    validated_at: true,
    tanda_id: true,
    tanda_price: true,
    tanda_name: true,
  },
    })
  },

  async markAsValidated(id) {
    return prisma.attendees.update({
      where: { id },
      data: {
        validated_at: new Date(),
      },
    })
  },
}
