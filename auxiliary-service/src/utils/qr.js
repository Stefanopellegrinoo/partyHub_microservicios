import QRCode from "qrcode";

export async function generateQRBase64(ticketCode) {
  return await QRCode.toDataURL(ticketCode); // base64 string
}
