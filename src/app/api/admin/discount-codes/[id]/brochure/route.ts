import { join } from "path";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { getSession } from "@/lib/auth";
import { money } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { absoluteUrl, siteUrl } from "@/lib/seo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sarabunRegular = join(process.cwd(), "public", "fonts", "sarabun-thai-400-normal.woff");
const sarabunBold = join(process.cwd(), "public", "fonts", "sarabun-thai-700-normal.woff");
const sarabunExtraBold = join(process.cwd(), "public", "fonts", "sarabun-thai-800-normal.woff");

function formatDate(value: Date | null) {
  if (!value) return "ไม่มีวันหมดอายุ";
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function wrapText(value: string, maxLength: number, maxLines = 4) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const words = normalized.includes(" ") ? normalized.split(" ") : normalized.match(new RegExp(`.{1,${maxLength}}`, "g")) || [];
  const lines: string[] = [];
  let consumed = 0;

  for (const word of words) {
    if (!lines.length) {
      lines.push(word);
      consumed += 1;
      if (lines.length === maxLines) break;
      continue;
    }

    const current = lines[lines.length - 1] || "";
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxLength) {
      lines[lines.length - 1] = candidate;
    } else {
      lines.push(word);
    }
    consumed += 1;
    if (lines.length === maxLines) break;
  }

  if (consumed < words.length && lines.length) {
    lines[lines.length - 1] = `${lines[lines.length - 1].replace(/\.+$/, "")}...`;
  }

  return lines;
}

function filenamePart(value: string) {
  return value.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "discount";
}

function collectPdf(doc: PDFKit.PDFDocument) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

async function fetchSupportedImage(url: string) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    const type = response.headers.get("content-type") || "";
    if (!/(image\/png|image\/jpe?g)/i.test(type)) return null;
    return Buffer.from(await response.arrayBuffer());
  } catch {
    return null;
  }
}

function drawRoundBox(doc: PDFKit.PDFDocument, x: number, y: number, width: number, height: number, radius: number, fill: string, stroke?: string) {
  doc.save();
  doc.roundedRect(x, y, width, height, radius).fill(fill);
  if (stroke) doc.roundedRect(x, y, width, height, radius).stroke(stroke);
  doc.restore();
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (session?.role !== "ADMIN") {
    return new Response("Forbidden", { status: 403 });
  }

  const { id } = await context.params;
  const [discount, settings] = await Promise.all([
    prisma.discountCode.findUnique({ where: { id } }),
    prisma.siteSettings.findFirst({
      select: {
        shopName: true,
        logoUrl: true,
        supportEmail: true,
        orderNotificationEmail: true,
        lineOaId: true,
      },
    }),
  ]);

  if (!discount) {
    return new Response("Discount code not found", { status: 404 });
  }

  const shopName = settings?.shopName?.trim() || "Japan Toy Shop";
  const contactEmail = settings?.orderNotificationEmail || settings?.supportEmail || "admin@japantoyshop.com";
  const lineOaId = settings?.lineOaId || "@retroconsole1981";
  const shopLink = siteUrl;
  const logoUrl = settings?.logoUrl ? absoluteUrl(settings.logoUrl) : "";
  const [qrBuffer, logoBuffer] = await Promise.all([
    QRCode.toBuffer(shopLink, {
      errorCorrectionLevel: "H",
      margin: 1,
      width: 560,
      color: {
        dark: "#15211b",
        light: "#ffffff",
      },
    }),
    logoUrl ? fetchSupportedImage(logoUrl) : Promise.resolve(null),
  ]);

  const valueText = discount.type === "PERCENT"
    ? `รับส่วนลด ${Number(discount.value).toLocaleString("th-TH")}%`
    : `รับส่วนลด ${money(discount.value)}`;
  const minimumText = discount.minimumSubtotal ? `เมื่อซื้อครบ ${money(discount.minimumSubtotal)}` : "ไม่มีขั้นต่ำการสั่งซื้อ";
  const maximumText = discount.maximumDiscount ? `ส่วนลดสูงสุด ${money(discount.maximumDiscount)}` : "ไม่จำกัดส่วนลดสูงสุด";
  const expiryText = `ใช้ได้ถึง ${formatDate(discount.expiresAt)}`;
  const descriptionLines = wrapText(discount.description || "สแกน QR เพื่อเลือกซื้อสินค้า แล้วใช้โค้ดส่วนลดนี้ตอนชำระเงิน", 38, 4);
  const issuedAt = new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium" }).format(new Date());

  const doc = new PDFDocument({
    size: "A5",
    margin: 0,
    info: {
      Title: `${discount.code} brochure`,
      Author: shopName,
      Subject: "Discount code brochure",
      Keywords: "discount, brochure, coupon",
    },
  });
  const pdf = collectPdf(doc);

  doc.registerFont("Sarabun", sarabunRegular);
  doc.registerFont("SarabunBold", sarabunBold);
  doc.registerFont("SarabunExtraBold", sarabunExtraBold);

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const margin = 18;
  const cardX = 24;
  const cardY = 24;
  const cardW = pageWidth - 48;
  const cardH = pageHeight - 48;

  doc.rect(0, 0, pageWidth, pageHeight).fill("#f5f7f3");
  drawRoundBox(doc, cardX, cardY, cardW, cardH, 12, "#ffffff", "#d7ddd4");
  drawRoundBox(doc, cardX + 8, cardY + 8, cardW - 16, cardH - 16, 10, "#f8faf6");
  drawRoundBox(doc, cardX + 8, cardY + 8, cardW - 16, 164, 10, "#17251e");

  doc.circle(pageWidth - 70, cardY + 52, 38).fill("#fff4aa");
  doc.circle(cardX + 42, cardY + 162, 48).fillOpacity(0.18).fill("#e8f5ee").fillOpacity(1);

  doc
    .font("SarabunBold")
    .fontSize(15)
    .fillColor("#fff4aa")
    .text(shopName.toUpperCase(), cardX + 24, cardY + 42, { width: cardW - 48, align: "center", characterSpacing: 2 });
  doc
    .font("SarabunExtraBold")
    .fontSize(43)
    .fillColor("#ffffff")
    .text("SPECIAL OFFER", cardX + 24, cardY + 73, { width: cardW - 48, align: "center" });
  doc
    .font("SarabunBold")
    .fontSize(27)
    .fillColor("#fff4aa")
    .text(valueText, cardX + 24, cardY + 123, { width: cardW - 48, align: "center" });
  doc
    .font("Sarabun")
    .fontSize(17)
    .fillColor("#e4eee8")
    .text(minimumText, cardX + 24, cardY + 151, { width: cardW - 48, align: "center" });
  doc
    .font("Sarabun")
    .fontSize(15)
    .fillColor("#e4eee8")
    .text(maximumText, cardX + 24, cardY + 171, { width: cardW - 48, align: "center" });

  const logoX = cardX + margin;
  const logoY = cardY + 205;
  const logoSize = 146;
  if (logoBuffer) {
    try {
      doc.image(logoBuffer, logoX, logoY, { fit: [logoSize, logoSize], align: "center", valign: "center" });
    } catch {
      drawRoundBox(doc, logoX, logoY, logoSize, logoSize, 10, "#17251e");
      doc.font("SarabunBold").fontSize(24).fillColor("#fff4aa").text(shopName, logoX + 12, logoY + 58, { width: logoSize - 24, align: "center" });
    }
  } else {
    drawRoundBox(doc, logoX, logoY, logoSize, logoSize, 10, "#17251e");
    doc.font("SarabunBold").fontSize(24).fillColor("#fff4aa").text(shopName, logoX + 12, logoY + 58, { width: logoSize - 24, align: "center" });
  }

  const detailX = logoX + logoSize + 18;
  const detailW = cardX + cardW - margin - detailX;
  drawRoundBox(doc, detailX, logoY, detailW, 96, 10, "#ffffff", "#d7ddd4");
  doc.font("SarabunBold").fontSize(14).fillColor("#526158").text("Discount code", detailX + 16, logoY + 18);
  doc.font("SarabunExtraBold").fontSize(34).fillColor("#15211b").text(discount.code, detailX + 16, logoY + 39, { width: detailW - 32, align: "center" });
  doc.font("Sarabun").fontSize(13).fillColor("#69776e").text(expiryText, detailX + 16, logoY + 77, { width: detailW - 32, align: "center" });

  drawRoundBox(doc, detailX, logoY + 112, detailW, 82, 10, "#fff8c9", "#e8d76e");
  doc.font("SarabunBold").fontSize(16).fillColor("#15211b").text("รายละเอียดโปรโมชัน", detailX + 16, logoY + 126);
  doc.font("Sarabun").fontSize(13).fillColor("#253d32");
  descriptionLines.forEach((line, index) => {
    doc.text(line, detailX + 16, logoY + 150 + index * 15, { width: detailW - 32 });
  });

  const qrX = cardX + 58;
  const qrY = cardY + 382;
  drawRoundBox(doc, qrX - 12, qrY - 12, 150, 150, 10, "#ffffff", "#d7ddd4");
  doc.image(qrBuffer, qrX, qrY, { width: 126, height: 126 });
  doc.font("SarabunBold").fontSize(16).fillColor("#15211b").text("Scan to shop", qrX - 12, qrY + 151, { width: 150, align: "center" });
  doc.font("Sarabun").fontSize(11).fillColor("#69776e").text(shopLink.replace(/^https?:\/\//, ""), qrX - 22, qrY + 172, { width: 170, align: "center" });

  const stepsX = detailX;
  const stepsY = cardY + 382;
  drawRoundBox(doc, stepsX, stepsY, detailW, 120, 10, "#ffffff", "#d7ddd4");
  doc.font("SarabunBold").fontSize(17).fillColor("#15211b").text("วิธีใช้งาน", stepsX + 16, stepsY + 18);
  doc.font("Sarabun").fontSize(14).fillColor("#253d32");
  doc.text("1. สแกน QR เพื่อเข้าร้านค้า", stepsX + 16, stepsY + 48, { width: detailW - 32 });
  doc.text("2. เลือกสินค้าที่ต้องการ", stepsX + 16, stepsY + 68, { width: detailW - 32 });
  doc.text(`3. ใส่โค้ด ${discount.code} ตอนชำระเงิน`, stepsX + 16, stepsY + 88, { width: detailW - 32 });

  const footerY = pageHeight - 54;
  doc.moveTo(cardX + margin, footerY - 10).lineTo(cardX + cardW - margin, footerY - 10).lineWidth(1).strokeColor("#d7ddd4").stroke();
  doc.font("Sarabun").fontSize(11).fillColor("#69776e").text(`ติดต่อร้าน: ${contactEmail} | LINE OA: ${lineOaId}`, cardX + margin, footerY, { width: cardW - 2 * margin - 88 });
  doc.font("Sarabun").fontSize(10).fillColor("#9aa59f").text(`Generated ${issuedAt}`, cardX + cardW - margin - 88, footerY, { width: 88, align: "right" });

  doc.end();
  const pdfBuffer = await pdf;

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${filenamePart(discount.code)}-brochure-a5.pdf"`,
    },
  });
}
