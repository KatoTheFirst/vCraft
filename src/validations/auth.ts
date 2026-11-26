import bcrypt from "bcryptjs";
import { z } from "zod";
// Trim and lowercase before the email check, otherwise padded input is rejected.
const email = z.string().trim().toLowerCase().pipe(z.email().max(254));
export const credentials = z
  .object({ email, password: z.string().min(1).max(128) })
  .strict();
export const registration = credentials
  .extend({
    name: z.string().trim().min(2).max(100),
    phone: z
      .string()
      .regex(/^(?:0|\+84)[1-9]\d{8}$/, "Số điện thoại Việt Nam không hợp lệ."),
    role: z.enum(["ARTISAN", "BUYER"]),
    password: z
      .string()
      .min(10, "Mật khẩu cần ít nhất 10 ký tự.")
      .regex(/\p{L}/u, "Mật khẩu cần có chữ.")
      .regex(/\d/, "Mật khẩu cần có số.")
      .refine((v) => !bcrypt.truncates(v), "Mật khẩu vượt 72 byte."),
  })
  .strict();
