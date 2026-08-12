/**
 * Байгууллагын мэдээлэл. Хуудсуудад hex өнгө, хаяг давтахгүйн тулд энд төвлөрүүлэв.
 * Өнгөний токенууд app/globals.css доторх @theme блокт байна.
 *
 * org        — тэтгэлгийг олгож буй байгууллага (Засаг даргын Тамгын газар)
 * department — шалгаруулалтыг зохион байгуулж буй нэгж (Боловсролын газар)
 */
export const org = {
  name: "Дорноговь аймгийн Засаг даргын Тамгын газар",
  shortName: "Засаг даргын Тамгын газар",
  siteName: "Тэтгэлгийн бүртгэл",
  domain: "dornogovi.gov.mn",
  address: "Сайншанд хот, Дорноговь аймаг",
  phone: "7052-0000",
  email: "info@dornogovi.gov.mn",
  logo: "/dornogovi-logo.png",
} as const;

/** Тэтгэлгийн сангийн нэр — хуудсуудын гол гарчиг. */
export const fund = {
  name: "Говийн ирээдүй сан",
  tagline: "Сургалтын төлбөрийн тэтгэлгийн бүртгэл",
} as const;

export const department = {
  name: "Дорноговь аймгийн Боловсролын газар",
  shortName: "Боловсролын газар",
  address: "Сайншанд хот, Дорноговь аймаг",
  phone: "7052-0000",
  email: "bolovsrol@dornogovi.gov.mn",
  logo: "/edu-logo.jpg",
} as const;
