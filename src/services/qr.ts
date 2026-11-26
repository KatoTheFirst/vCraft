import QRCode from "qrcode";
// Every product in a batch shares this one URL, so the batch has one QR code.
// B.3 will append "/{signature}" here; the trace route already accepts it.
export function traceUrl(code: string) {
  const base = process.env.PUBLIC_APP_URL;
  const url = URL.canParse(base ?? "") ? new URL(base!) : null;
  if (!url || !["http:", "https:"].includes(url.protocol))
    throw new Error("PUBLIC_APP_URL");
  return (
    url.origin +
    url.pathname.replace(/\/+$/, "") +
    "/trace/" +
    encodeURIComponent(code)
  );
}
export const qrFormats = ["png", "svg"] as const;
export function qrImage(code: string, format: (typeof qrFormats)[number]) {
  const options = { errorCorrectionLevel: "M", margin: 2 } as const;
  return format === "svg"
    ? QRCode.toString(traceUrl(code), { ...options, type: "svg" })
    : QRCode.toBuffer(traceUrl(code), { ...options, type: "png", width: 1024 });
}
