import nodemailer from "nodemailer";
import { decryptSecret } from "@/lib/crypto";
import { money } from "@/lib/format";
import { readPaymentCredentials } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { trackingHref } from "@/lib/shipping-carriers";

export type OrderEmailEvent = "order_created" | "payment_proof_submitted" | "payment_paid" | "order_shipped" | "order_cancelled";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://www.japantoyshop.com";

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function absoluteUrl(pathOrUrl?: string | null, origin = siteUrl) {
  if (!pathOrUrl) return "";
  try {
    return new URL(pathOrUrl, origin).toString();
  } catch {
    return pathOrUrl;
  }
}

function eventCopy(event: OrderEmailEvent) {
  return {
    order_created: {
      customerSubject: "Order received",
      adminSubject: "New order received",
      title: "ได้รับคำสั่งซื้อแล้ว",
      intro: "ขอบคุณสำหรับคำสั่งซื้อ เราได้รับข้อมูลเรียบร้อยแล้ว",
      adminIntro: "มีคำสั่งซื้อใหม่เข้าระบบ",
    },
    payment_proof_submitted: {
      customerSubject: "Payment proof received",
      adminSubject: "Customer submitted payment proof",
      title: "ได้รับแจ้งชำระเงินแล้ว",
      intro: "เราได้รับสลิปชำระเงินแล้ว ร้านค้าจะตรวจสอบและอัปเดตสถานะให้เร็วที่สุด",
      adminIntro: "ลูกค้าแจ้งชำระเงินและอัปโหลดสลิปแล้ว",
    },
    payment_paid: {
      customerSubject: "Payment confirmed",
      adminSubject: "Order payment confirmed",
      title: "ยืนยันการชำระเงินแล้ว",
      intro: "การชำระเงินสำเร็จแล้ว ร้านค้าจะเตรียมจัดส่งสินค้าในขั้นตอนถัดไป",
      adminIntro: "คำสั่งซื้อนี้ถูกยืนยันการชำระเงินแล้ว",
    },
    order_shipped: {
      customerSubject: "Order shipped",
      adminSubject: "Order marked as shipped",
      title: "จัดส่งสินค้าแล้ว",
      intro: "สินค้าของคุณถูกจัดส่งแล้ว สามารถตรวจสอบเลขพัสดุได้จากรายละเอียดด้านล่าง",
      adminIntro: "คำสั่งซื้อนี้ถูกอัปเดตเป็นจัดส่งแล้ว",
    },
    order_cancelled: {
      customerSubject: "Order cancelled",
      adminSubject: "Order cancelled",
      title: "ยกเลิกคำสั่งซื้อแล้ว",
      intro: "คำสั่งซื้อของคุณถูกยกเลิกแล้ว",
      adminIntro: "ลูกค้ายกเลิกคำสั่งซื้อที่ยังไม่ชำระเงิน",
    },
  }[event];
}

function orderAddress(order: Awaited<ReturnType<typeof loadEmailOrder>>) {
  if (!order) return "";
  return [
    order.customerName,
    order.shippingAddress,
    order.shippingSubdistrict ? `ต.${order.shippingSubdistrict}` : null,
    order.shippingDistrict ? `อ.${order.shippingDistrict}` : null,
    order.shippingProvince || order.shippingCity,
    order.shippingPostalCode,
    order.customerPhone,
  ].filter(Boolean).join(" ");
}

async function loadEmailOrder(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      paymentMethod: true,
      shippingMethod: true,
    },
  });
}

function orderRows(order: NonNullable<Awaited<ReturnType<typeof loadEmailOrder>>>) {
  return order.items.map((item) => `
    <tr>
      <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${escapeHtml(item.name)}<br><span style="color:#64748b;font-size:12px;">${escapeHtml(item.sku)}</span></td>
      <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.quantity}</td>
      <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;">${escapeHtml(money(item.price))}</td>
      <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;">${escapeHtml(money(item.total))}</td>
    </tr>
  `).join("");
}

function bankTransferBlock(order: NonNullable<Awaited<ReturnType<typeof loadEmailOrder>>>, origin: string) {
  if (order.paymentMethod?.provider !== "BANK_TRANSFER") return "";
  const credentials = readPaymentCredentials(order.paymentMethod.credentialsCiphertext);
  if (!credentials.bankName && !credentials.accountNumber && !credentials.qrCodeUrl) return "";
  return `
    <div style="margin-top:18px;padding:14px;border:1px solid #e5e7eb;border-radius:8px;background:#f8fafc;">
      <p style="margin:0 0 8px;font-weight:700;">รายละเอียดโอนเงิน</p>
      <p style="margin:4px 0;">ธนาคาร: ${escapeHtml(credentials.bankName || "-")}</p>
      <p style="margin:4px 0;">ชื่อบัญชี: ${escapeHtml(credentials.accountName || "-")}</p>
      <p style="margin:4px 0;">เลขบัญชี: ${escapeHtml(credentials.accountNumber || "-")}</p>
      ${credentials.qrCodeUrl ? `<p style="margin:8px 0 0;"><a href="${escapeHtml(absoluteUrl(credentials.qrCodeUrl, origin))}">เปิด QR Code สำหรับชำระเงิน</a></p>` : ""}
    </div>
  `;
}

function trackingBlock(order: NonNullable<Awaited<ReturnType<typeof loadEmailOrder>>>) {
  if (!order.trackingCarrierCode || !order.trackingNumber) return "";
  const trackingUrl = trackingHref(order.trackingCarrierCode, order.trackingNumber);
  return `
    <div style="margin-top:18px;padding:14px;border:1px solid #ccfbf1;border-radius:8px;background:#f0fdfa;">
      <p style="margin:0 0 8px;font-weight:700;">ข้อมูลจัดส่ง</p>
      <p style="margin:4px 0;">ขนส่ง: ${escapeHtml(order.trackingCarrierName || order.trackingCarrierCode)}</p>
      <p style="margin:4px 0;">Tracking: ${trackingUrl ? `<a href="${escapeHtml(trackingUrl)}">${escapeHtml(order.trackingNumber)}</a>` : escapeHtml(order.trackingNumber)}</p>
    </div>
  `;
}

function proofBlock(order: NonNullable<Awaited<ReturnType<typeof loadEmailOrder>>>, origin: string) {
  if (!order.paymentSlipUrl) return "";
  return `
    <div style="margin-top:18px;padding:14px;border:1px solid #fde68a;border-radius:8px;background:#fffbeb;">
      <p style="margin:0 0 8px;font-weight:700;">ข้อมูลแจ้งชำระเงิน</p>
      <p style="margin:4px 0;">ชื่อผู้โอน: ${escapeHtml(order.paymentSlipName || "-")}</p>
      <p style="margin:4px 0;">ธนาคารผู้โอน: ${escapeHtml(order.paymentSlipBank || "-")}</p>
      <p style="margin:4px 0;">ยอดที่แจ้ง: ${order.paymentSlipAmount ? escapeHtml(money(order.paymentSlipAmount)) : "-"}</p>
      <p style="margin:4px 0;"><a href="${escapeHtml(absoluteUrl(order.paymentSlipUrl, origin))}">เปิดรูปสลิป</a></p>
    </div>
  `;
}

function buildHtml(params: {
  event: OrderEmailEvent;
  order: NonNullable<Awaited<ReturnType<typeof loadEmailOrder>>>;
  shopName: string;
  intro: string;
  origin: string;
  admin: boolean;
}) {
  const { event, order, shopName, intro, origin, admin } = params;
  const accountUrl = admin ? absoluteUrl("/admin/orders", origin) : absoluteUrl("/account", origin);
  return `
    <div style="font-family:Arial,'Tahoma',sans-serif;line-height:1.55;color:#17201c;background:#f8fafc;padding:24px;">
      <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
        <div style="padding:22px 24px;background:#17201c;color:#ffffff;">
          <p style="margin:0;font-size:13px;letter-spacing:.08em;text-transform:uppercase;">${escapeHtml(shopName)}</p>
          <h1 style="margin:8px 0 0;font-size:24px;">${escapeHtml(eventCopy(event).title)}</h1>
        </div>
        <div style="padding:24px;">
          <p style="margin:0 0 16px;">${escapeHtml(intro)}</p>
          <p style="margin:0 0 18px;"><strong>Order:</strong> ${escapeHtml(order.orderNumber)}<br><strong>Status:</strong> ${escapeHtml(order.status)}${order.paymentStatus ? `<br><strong>Payment:</strong> ${escapeHtml(order.paymentStatus)}` : ""}</p>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <thead>
              <tr style="background:#f1f5f9;">
                <th style="padding:10px;text-align:left;">สินค้า</th>
                <th style="padding:10px;text-align:center;">จำนวน</th>
                <th style="padding:10px;text-align:right;">ราคา</th>
                <th style="padding:10px;text-align:right;">รวม</th>
              </tr>
            </thead>
            <tbody>${orderRows(order)}</tbody>
          </table>
          <div style="margin-top:16px;text-align:right;">
            <p style="margin:4px 0;">สินค้า: <strong>${escapeHtml(money(order.subtotal))}</strong></p>
            <p style="margin:4px 0;">ค่าส่ง: <strong>${escapeHtml(money(order.shippingCost))}</strong></p>
            ${Number(order.remoteAreaFee) > 0 ? `<p style="margin:4px 0;">พื้นที่พิเศษ: <strong>${escapeHtml(money(order.remoteAreaFee))}</strong></p>` : ""}
            ${Number(order.paymentFee) > 0 ? `<p style="margin:4px 0;">ค่าธรรมเนียมชำระเงิน: <strong>${escapeHtml(money(order.paymentFee))}</strong></p>` : ""}
            <p style="margin:8px 0 0;font-size:18px;">ยอดรวม: <strong>${escapeHtml(money(order.total))}</strong></p>
          </div>
          <div style="margin-top:18px;padding:14px;border:1px solid #e5e7eb;border-radius:8px;">
            <p style="margin:0 0 8px;font-weight:700;">ที่อยู่จัดส่ง</p>
            <p style="margin:0;">${escapeHtml(orderAddress(order))}</p>
          </div>
          ${bankTransferBlock(order, origin)}
          ${proofBlock(order, origin)}
          ${trackingBlock(order)}
          <p style="margin:22px 0 0;"><a href="${escapeHtml(accountUrl)}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:6px;font-weight:700;">ดูรายละเอียดคำสั่งซื้อ</a></p>
        </div>
      </div>
    </div>
  `;
}

function buildText(params: {
  event: OrderEmailEvent;
  order: NonNullable<Awaited<ReturnType<typeof loadEmailOrder>>>;
  shopName: string;
  intro: string;
}) {
  const { event, order, shopName, intro } = params;
  const lines = [
    shopName,
    eventCopy(event).title,
    "",
    intro,
    "",
    `Order: ${order.orderNumber}`,
    `Status: ${order.status}`,
    order.paymentStatus ? `Payment: ${order.paymentStatus}` : "",
    "",
    ...order.items.map((item) => `- ${item.name} x ${item.quantity}: ${money(item.total)}`),
    "",
    `Subtotal: ${money(order.subtotal)}`,
    `Shipping: ${money(order.shippingCost)}`,
    Number(order.remoteAreaFee) > 0 ? `Remote area: ${money(order.remoteAreaFee)}` : "",
    Number(order.paymentFee) > 0 ? `Payment fee: ${money(order.paymentFee)}` : "",
    `Total: ${money(order.total)}`,
    "",
    `Ship to: ${orderAddress(order)}`,
  ];
  if (order.trackingNumber) lines.push("", `Carrier: ${order.trackingCarrierName || order.trackingCarrierCode}`, `Tracking: ${order.trackingNumber}`);
  if (order.paymentSlipUrl) lines.push("", `Payment proof: ${absoluteUrl(order.paymentSlipUrl)}`);
  return lines.filter(Boolean).join("\n");
}

export async function sendOrderEmail(event: OrderEmailEvent, orderId: string, options: { origin?: string } = {}) {
  try {
    const [smtp, site, order] = await Promise.all([
      prisma.smtpSettings.findFirst(),
      prisma.siteSettings.findFirst(),
      loadEmailOrder(orderId),
    ]);

    if (!smtp?.enabled || !order) return;

    const shopName = site?.shopName || smtp.senderName || "MyShop";
    const adminEmail = site?.orderNotificationEmail || site?.supportEmail || smtp.senderEmail;
    const origin = options.origin || siteUrl;
    const copy = eventCopy(event);
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: {
        user: smtp.username,
        pass: decryptSecret(smtp.passwordCiphertext),
      },
    });
    const from = `"${smtp.senderName}" <${smtp.senderEmail}>`;
    const recipients = [
      {
        to: order.customerEmail,
        subject: `${copy.customerSubject} - ${order.orderNumber}`,
        intro: copy.intro,
        admin: false,
      },
      {
        to: adminEmail,
        subject: `${copy.adminSubject} - ${order.orderNumber}`,
        intro: copy.adminIntro,
        admin: true,
      },
    ].filter((recipient, index, list) => recipient.to && list.findIndex((item) => item.to === recipient.to) === index);

    await Promise.all(recipients.map((recipient) => transporter.sendMail({
      from,
      to: recipient.to,
      subject: recipient.subject,
      text: buildText({ event, order, shopName, intro: recipient.intro }),
      html: buildHtml({ event, order, shopName, intro: recipient.intro, origin, admin: recipient.admin }),
    })));
  } catch (error) {
    console.warn("Order email failed", error);
  }
}
