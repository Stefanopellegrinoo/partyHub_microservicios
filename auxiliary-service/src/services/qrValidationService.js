import { qrValidationRepository } from "../repositories/qrValidationRepository.js"



export const qrValidationService = {
  async validateTicketCode(ticket_code) {
    const attendee = await qrValidationRepository.findByTicketCode(ticket_code)

    if (!attendee) {
      throw new Error("Attendee not found")
    }

    if (attendee.validated_at) {
      return {
        status: false,
        full_name: attendee.full_name,
        event_name: attendee.events?.name,
         document_id: attendee.document_id,
      }
    }
    
    await qrValidationRepository.markAsValidated(attendee.id)

    return {
      status: true,
      full_name: attendee.full_name,
      document_id: attendee.document_id,
      event_name: attendee.events?.name,
      tanda_name: attendee.tandas?.name,
      seller_name: attendee.users?.name,
    }
  },
}
