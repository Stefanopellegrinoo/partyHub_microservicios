import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Template THE VAULT - Underground Aesthetic
 */
export const getTicketEmailTemplate = (attendee, partyName) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ENTRADA CONFIRMADA - ${partyName}</title>
      <style>
        body { margin: 0; padding: 0; background-color: #020202; font-family: 'Helvetica', Arial, sans-serif; color: #ffffff; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #020202; padding-bottom: 40px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #080808; border: 1px solid #1a1a1a; }
        .header { background-color: #7c3aed; padding: 40px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase; font-style: italic; color: #ffffff; }
        .content { padding: 40px 30px; text-align: center; }
        .greeting { font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.5px; margin-bottom: 10px; }
        .party-name { color: #7c3aed; font-size: 16px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 30px; }
        .qr-box { background-color: #ffffff; padding: 20px; display: inline-block; margin: 30px 0; border: 10px solid #ffffff; }
        .qr-box img { display: block; width: 250px; height: 250px; }
        .label { font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; color: #52525b; display: block; margin-bottom: 4px; }
        .value { font-size: 14px; font-family: monospace; color: #d4d4d8; text-transform: uppercase; }
        .footer { padding: 20px; text-align: center; font-size: 10px; color: #27272a; text-transform: uppercase; letter-spacing: 2px; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="header"><h1>ACCESO CONCEDIDO</h1></div>
          <div class="content">
            <div class="greeting">HOLA, ${attendee?.full_name?.toUpperCase() || "ASISTENTE"}</div>
            <div class="party-name">${partyName?.toUpperCase() || "EVENTO"}</div>
            <p style="font-size: 13px; color: #71717a; line-height: 1.6;">
              Tu identidad ha sido validada. <br/> Presentá el código QR en puerta para ingresar.
            </p>
            <div class="qr-box"><img src="cid:qrimage" alt="QR ACCESS CODE" /></div>
            <div style="border-top: 1px solid #1a1a1a; margin-top: 40px; padding-top: 20px;">
               <div style="display: inline-block; width: 45%; text-align: left;">
                  <span class="label">DOCUMENTO</span>
                  <span class="value">${attendee?.document_id || "---"}</span>
               </div>
               <div style="display: inline-block; width: 45%; text-align: left;">
                  <span class="label">TANDA</span>
                  <span class="value">${attendee?.tanda_name || "GENERAL"}</span>
               </div>
            </div>
          </div>
          <div class="footer">© ${new Date().getFullYear()} PARTYHUB // SECURED ACCESS PROTOCOL</div>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Función principal de envío de mail (Usada por el Worker)
 */
export const sendMail = async ({ to, subject, html, attachments }) => {
  try {
    const info = await transporter.sendMail({
      from: `"PartyHub Access" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      attachments,
    });
    return info;
  } catch (error) {
    console.error("❌ [MailEngine Error]:", error.message);
    throw error;
  }
};
