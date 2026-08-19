import { randomUUID } from "crypto";
import prisma from "../config/prisma.js";


export const attendeeRepository = {
  async createMany(attendees, eventId, tandaId, sellerId, tandaName, tandaPrice) {
    const enriched = attendees.map((att) => ({
   id: att.id,
    full_name: att.fullName,
    document_id: att.documentId,
    email: att.email,
    phone: att.phone,
    paid: att.paid,
    event_id: eventId,
    tanda_id: tandaId,
    seller_id: sellerId,
    tanda_name: tandaName,
    tanda_price: tandaPrice,
    ticket_code: randomUUID(),
    }));

    const created = await prisma.attendees.createMany({
      data: enriched,
      skipDuplicates: true,
    });

  
    const codes = enriched.map((a) => a.ticket_code);
    return await prisma.attendees.findMany({
      where: { ticket_code: { in: codes } },
    });
  },

// Accede a la tabla tandas -> MAL
  async findByEventId(eventId) {
    return await prisma.attendees.findMany({
  where: { event_id: eventId },
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
    ticket_code: true,
  },
  orderBy: {
    created_at: "desc"
  }
})

  },

  async findByTandaId(tandaId) {
    return await prisma.attendees.findMany({
      where: { tandaId: tandaId },
      orderBy: { created_at: "desc" },
    });
  },


  async markAsUsed(ticketCode) {
    await prisma.attendees.update({
      where: { ticket_code: ticketCode },
      data: { used_at: new Date() },
    });
  },

  async findById(attendeeId) {
    return await prisma.attendees.findUnique({
      where: { id: attendeeId },
    });
  },

  async updatePaidStatus(attendeeId) {
    const result = await prisma.attendees.updateMany({
      where: { id: attendeeId, paid: false },
      data: { paid: true },
    });
    if (result.count === 0) return null;
    
    return await prisma.attendees.findUnique({
      where: { id: attendeeId },
    });
  },

  async deleteAttendee(attendeeId) {
    return await prisma.$transaction(async (tx) => {
      // 1. Borrar de report_events
      await tx.report_events.deleteMany({
        where: { attendee_id: attendeeId },
      });

      // 2. Borrar de attendees
      return await tx.attendees.delete({
        where: { id: attendeeId },
      });
    });
  },

};
