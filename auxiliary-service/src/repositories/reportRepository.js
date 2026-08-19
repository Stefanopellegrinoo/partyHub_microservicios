import prisma from "../config/prisma.js";

export const reportRepository = {


  async createReport(      
      eventId,
      tandaId,
      tandaName,
      tandaPrice,
      sellerId,
      sellerName,
      attendee){

    return await prisma.report_events.create({
        data: {
          event_id: eventId,
          tanda_id: tandaId,
          tanda_name: tandaName,
          tanda_price: tandaPrice,
          seller_id: sellerId,
          seller_name: sellerName,
          attendee_name: attendee.fullName,
          paid: attendee.paid,
          attendee_id: attendee.id
        },
      });
    
   },

  async updatePaidStatus(attendeeId) {
    return await prisma.report_events.updateMany({
      where: { attendee_id: attendeeId }, 
      data: { paid: true },
    });
  },


async  getSalesByEvent  (eventId) {
  
    return await prisma.report_events.findMany({ 
        where: { event_id: parseInt(eventId) } 
    });
},


  // Obtener resumen por tanda
  async getBatchesByEvent(eventId) {
    const batches = await prisma.report_events.groupBy({
      by: ['tanda_id', 'tanda_name', 'tanda_price'],
      where: { event_id: eventId },
      _count: { _all: true },
      _sum: { tanda_price: true },
    });

    return batches.map((b) => ({
      id: b.tanda_id,
      name: b.tanda_name,
      price: b.tanda_price,
      totalSales: b._count._all,
      revenue: b.tanda_price * b._count._all, 
    }));
  },
};
