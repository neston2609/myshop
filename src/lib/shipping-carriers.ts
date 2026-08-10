export type ShippingCarrier = {
  code: string;
  name: string;
  trackingUrl: string;
};

export const shippingCarriers: ShippingCarrier[] = [
  { code: "THAILAND_POST", name: "ไปรษณีย์ไทย (Thailand Post)", trackingUrl: "https://track.thailandpost.co.th/" },
  { code: "FLASH", name: "Flash Express", trackingUrl: "https://www.flashexpress.com/fle/tracking" },
  { code: "KEX", name: "KEX Express / Kerry Express", trackingUrl: "https://th.kex-express.com/th/track/" },
  { code: "JT", name: "J&T Express", trackingUrl: "https://www.jtexpress.co.th/service/track" },
  { code: "SCG", name: "SCG Express", trackingUrl: "https://www.scgexpress.co.th/tracking/" },
  { code: "BEST", name: "BEST Express", trackingUrl: "https://www.best-inc.co.th/track" },
  { code: "NINJA_VAN", name: "Ninja Van Thailand", trackingUrl: "https://www.ninjavan.co/en-th/tracking" },
  { code: "SPX", name: "SPX Express / Shopee Xpress", trackingUrl: "https://spx.co.th/track" },
  { code: "LAZADA_LEX", name: "Lazada Logistics / LEX", trackingUrl: "https://tracker.lel.asia/" },
  { code: "DHL_EXPRESS", name: "DHL Express", trackingUrl: "https://www.dhl.com/th-en/home/tracking.html" },
  { code: "DHL_ECOMMERCE", name: "DHL eCommerce", trackingUrl: "https://ecommerceportal.dhl.com/track?locale=th_TH" },
  { code: "FEDEX", name: "FedEx", trackingUrl: "https://www.fedex.com/fedextrack/?trknbr={trackingNumber}" },
  { code: "UPS", name: "UPS", trackingUrl: "https://www.ups.com/track?tracknum={trackingNumber}" },
  { code: "INTER_EXPRESS", name: "Inter Express Logistics", trackingUrl: "https://iel.co.th/tracking/" },
  { code: "NIM_EXPRESS", name: "Nim Express", trackingUrl: "https://www.nimexpress.com/web/p/tracking" },
  { code: "TP_LOGISTICS", name: "TP Logistics / Thai Parcels", trackingUrl: "https://www.tptrack.info/" },
  { code: "ALPHA_FAST", name: "Alpha Fast", trackingUrl: "https://alltrack.org/alpha-fast-courier-tracking/" },
  { code: "ARAMEX", name: "Aramex", trackingUrl: "https://www.aramex.com/th/en/track/shipments" },
  { code: "GRAB_EXPRESS", name: "GrabExpress", trackingUrl: "https://help.grab.com/passenger/th-th/360001267867" },
  { code: "LALAMOVE", name: "Lalamove", trackingUrl: "https://www.lalamove.com/th-th/" },
];

export function findShippingCarrier(code?: string | null) {
  if (!code) return null;
  return shippingCarriers.find((carrier) => carrier.code === code) || null;
}

export function trackingHref(code?: string | null, trackingNumber?: string | null) {
  const carrier = findShippingCarrier(code);
  if (!carrier || !trackingNumber?.trim()) return null;
  return carrier.trackingUrl.replace("{trackingNumber}", encodeURIComponent(trackingNumber.trim()));
}
