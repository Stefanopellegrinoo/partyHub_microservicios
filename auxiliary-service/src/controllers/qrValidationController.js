import { qrValidationService } from "../services/qrValidationService.js"

export const qrValidationController = {
  async validate(req, res) {
    const { ticket_code } = req.body

    if (!ticket_code) {
      return res.status(400).json({ error: "Missing ticket_code" })
    }

    try {
      const result = await qrValidationService.validateTicketCode(ticket_code)
      
      if (!result) {
        return res.status(404).json({ error: "Ticket no encontrado" })
      }

      if(result.status){
        return res.status(200).json({ message: "Ticket válido", ...result })
      }else{
        return res.status(200).json({ message: "Ticket ya validado", ...result })
      }

      // switch (result.status) {
      //   case "not_found":
      //     return res.status(404).json({ error: "Ticket no encontrado" })
      //   case "already_used":
      //     return res.status(409).json({ message: "Ticket ya validado", ...result })
      //   case "valid":
      //     return res.status(200).json({ message: "Ticket válido", ...result })
      //   default:
      //     return res.status(500).json({ error: "Error desconocido" })
      // }
    } catch (err) {
      console.error("Error en validateTicketCode:", err)
      return res.status(500).json({ error: "Error del servidor" })
    }
  },
}
