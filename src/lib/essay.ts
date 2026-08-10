import "server-only";
import sanitizeHtml from "sanitize-html";

/**
 * Эсээ нь текст эдитэрээр бичигддэг тул HTML хэлбэрээр хадгалагдана.
 * Комиссын хуудсанд эргээд гаргадаг учир хадгалахын өмнө заавал цэвэрлэнэ.
 *
 * Зөвшөөрсөн шошгын жагсаалт бага, **атрибут огт зөвшөөрөхгүй** — ингэснээр
 * `onerror`, `href="javascript:"` мэтийн халдлагын гарц бүрмөсөн хаагдана.
 */
const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "blockquote",
];

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {},
  allowedSchemes: [],
  disallowedTagsMode: "discard",
  // Браузер бүр өөр шошго үүсгэдэг тул нэг хэлбэрт оруулна.
  transformTags: {
    b: "strong",
    i: "em",
    div: "p",
    h1: "strong",
    h2: "strong",
    h3: "strong",
    span: "p",
  },
};

/** Хэрэглэгчийн бичсэн HTML-ийг зөвшөөрсөн шошгын хүрээнд буулгана. */
export function sanitizeEssay(html: string): string {
  return sanitizeHtml(html, SANITIZE_OPTIONS).trim();
}

/** Бүх шошгыг хасаж, зөвхөн бичвэрийг үлдээнэ. */
function toPlainText(html: string): string {
  // Блокийн эхлэл, төгсгөл, мөр таслалтыг зайгаар солино — эс тэгвээс хоёр
  // догол мөрийн эцсийн, эхний үг нийлж нэг үг мэт тоологдоно.
  const spaced = html.replace(
    /<\/?(p|div|li|ul|ol|blockquote|h[1-6])\b[^>]*>|<br\s*\/?>/gi,
    " ",
  );

  return sanitizeHtml(spaced, { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&");
}

export function countEssayWords(html: string): number {
  return toPlainText(html).trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Хадгалсан утгыг харуулахад бэлтгэнэ. Эдитэр нэвтрэхээс өмнө бичигдсэн
 * эсээнүүд нь энгийн бичвэр тул тэдгээрийг мөр тус бүрээр нь догол мөр болгоно.
 */
export function essayToHtml(stored: string): string {
  const looksLikeHtml = /<\/?(p|br|ul|ol|li|strong|em|u|s|blockquote)\b/i.test(
    stored,
  );

  if (looksLikeHtml) {
    // Хадгалахдаа цэвэрлэсэн ч харуулахын өмнө дахин шүүнэ.
    return sanitizeEssay(stored);
  }

  const escaped = sanitizeHtml(stored, {
    allowedTags: [],
    allowedAttributes: {},
  });

  return escaped
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, "<br />")}</p>`)
    .join("");
}
