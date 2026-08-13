export type ShopDescriptionFaq = {
  question: string;
  answer: string;
};

export const defaultShopDescription = {
  eyebrow: "Japan Toy Shop",
  title: "ร้านของเล่นญี่ปุ่น POP MART และอาร์ตทอยสำหรับนักสะสมในไทย",
  body: "เลือกซื้อของเล่นญี่ปุ่น ฟิกเกอร์สะสม กล่องสุ่ม POP MART, Labubu, The Monsters และ Space Molly จากรายการสินค้าที่คัดมาให้ดูง่าย พร้อมรายละเอียด รูปภาพ และราคาชัดเจน เหมาะทั้งสำหรับสะสมเองและเลือกเป็นของขวัญ",
  faqs: [
    {
      question: "Japan Toy Shop ขายสินค้าอะไร?",
      answer: "Japan Toy Shop รวมของเล่นญี่ปุ่น อาร์ตทอย POP MART, Labubu, Space Molly, กล่องสุ่ม และฟิกเกอร์สะสมสำหรับแฟนคอลเลกชันในไทย",
    },
    {
      question: "สินค้ามีทั้งของใหม่และมือสองไหม?",
      answer: "ร้านมีทั้งสินค้าใหม่และสินค้าคัดสภาพตามรายการสินค้าแต่ละชิ้น ลูกค้าควรอ่านรายละเอียด รูปภาพ และเงื่อนไขก่อนสั่งซื้อ",
    },
    {
      question: "จัดส่งสินค้าไปต่างจังหวัดได้ไหม?",
      answer: "ร้านรองรับการจัดส่งทั่วประเทศไทย โดยค่าจัดส่งและโปรโมชันจะคำนวณตามเงื่อนไขที่ร้านเปิดใช้งานในขั้นตอน checkout",
    },
    {
      question: "ค้นหาสินค้า POP MART หรือ Labubu ได้จากที่ไหน?",
      answer: "ลูกค้าสามารถกดดูสินค้าทั้งหมดหรือเลือกหมวดหมู่ เช่น POP MART, Japanese Toys, Collectibles และค้นหาชื่อรุ่นที่ต้องการในหน้า shop",
    },
  ] satisfies ShopDescriptionFaq[],
};

export function parseShopDescriptionFaqs(value?: string | null): ShopDescriptionFaq[] {
  if (!value) return defaultShopDescription.faqs;

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return defaultShopDescription.faqs;

    const faqs = parsed
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .map((item) => ({
        question: typeof item.question === "string" ? item.question.trim() : "",
        answer: typeof item.answer === "string" ? item.answer.trim() : "",
      }))
      .filter((item) => item.question && item.answer)
      .slice(0, 12);

    return faqs.length ? faqs : defaultShopDescription.faqs;
  } catch {
    return defaultShopDescription.faqs;
  }
}

export function serializeShopDescriptionFaqs(faqs: ShopDescriptionFaq[]) {
  return JSON.stringify(
    faqs
      .map((item) => ({ question: item.question.trim(), answer: item.answer.trim() }))
      .filter((item) => item.question && item.answer)
      .slice(0, 12),
  );
}

