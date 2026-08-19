import { reportRepository } from "../repositories/reportRepository.js";

/**
 * Registra múltiples entradas en el reporte histórico.
 */
export const createReport = async ( 
  eventId,
  tandaId,
  tandaName,
  tandaPrice,
  sellerId,
  sellerName,
  attendees
) => {
  try {
    for (const attendee of attendees) {
      await reportRepository.createReport(
        eventId,
        tandaId,
        tandaName,
        tandaPrice,
        sellerId,
        sellerName,
        attendee
      );
    }
  } catch (err) {
    console.error("❌ [ReportService - createReport Error]:", err.message);
    throw err;
  }
};

/**
 * Actualiza el estado de pago de un asistente en el reporte.
 */
export const updatePaidStatus = async (attendeeId) => {
  try {
    return await reportRepository.updatePaidStatus(attendeeId);
  } catch (err) {
    console.error("❌ [ReportService - updatePaidStatus Error]:", err.message);
    throw err;
  }
};

/**
 * Genera un reporte consolidado de ventas de un evento.
 */
export const getEventReport = async (eventId) => {
  try {
    const attendees = await reportRepository.getSalesByEvent(eventId);

    let totalRevenue = 0;
    let totalTicketsSold = 0;
    let totalUnpaidTickets = 0;

    const salesByBatchMap = new Map();
    const salesBySellerMap = new Map();

    for (const attendee of attendees) {
      const {
        tanda_name,
        tanda_price,
        paid,
        seller_name
      } = attendee;

      // --------- Ventas por tanda ---------
      if (!salesByBatchMap.has(tanda_name)) {
        salesByBatchMap.set(tanda_name, {
          batchName: tanda_name,
          totalSales: 0,
          revenue: 0,
          unpaidSales: 0,
        });
      }

      const batchEntry = salesByBatchMap.get(tanda_name);
      batchEntry.totalSales += 1;

      if (paid) {
        const price = Number(tanda_price);
        batchEntry.revenue += price;
        totalRevenue += price;
        totalTicketsSold += 1;
      } else {
        batchEntry.unpaidSales += 1;
        totalUnpaidTickets += 1;
      }

      // --------- Ventas por vendedor ---------
      if (!salesBySellerMap.has(seller_name)) {
        salesBySellerMap.set(seller_name, {
          sellerName: seller_name,
          totalSales: 0,
          revenue: 0,
        });
      }

      const sellerEntry = salesBySellerMap.get(seller_name);
      sellerEntry.totalSales += 1;

      if (paid) {
        sellerEntry.revenue += Number(tanda_price);
      }
    }

    return {
      totalRevenue,
      totalTicketsSold,
      totalUnpaidTickets,
      salesByBatch: Array.from(salesByBatchMap.values()),
      salesBySeller: Array.from(salesBySellerMap.values()),
    };
  } catch (err) {
    console.error("❌ [ReportService - getEventReport Error]:", err.message);
    throw err;
  }
};
