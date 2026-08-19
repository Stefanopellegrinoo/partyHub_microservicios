import crypto from "crypto";


export const generateInviteCode = () =>
  crypto.randomBytes(3).toString("hex").toUpperCase();