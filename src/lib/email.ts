import { prisma } from "@/lib/prisma";
import { fund, org } from "@/lib/brand";

/**
 * И-мэйлийн давхарга. SMTP_URL тохируулсан бол жинхэнэ илгээнэ, үгүй бол
 * консольд хэвлээд EmailLog-д бичнэ — тохиргоо ирэхэд нэг env солиход хангалттай.
 */

type TemplateData = Record<string, string | number>;

type Template = {
  subject: string;
  body: (data: TemplateData) => string;
};

const templates = {
  "verify-email": {
    subject: "И-мэйл хаягаа баталгаажуулна уу",
    body: (d) =>
      `Сайн байна уу, ${d.name}.\n\n` +
      `${fund.name} системд бүртгүүлсэнд баярлалаа. Доорх холбоосоор орж и-мэйл хаягаа баталгаажуулна уу:\n\n` +
      `${d.link}\n\n` +
      `Холбоос 24 цагийн дараа хүчингүй болно.\n\n${org.name}`,
  },
  "application-received": {
    subject: "Таны өргөдлийг хүлээн авлаа",
    body: (d) =>
      `Сайн байна уу, ${d.name}.\n\n` +
      `Таны тэтгэлгийн өргөдлийг ${d.submittedAt}-нд хүлээн авлаа. Бүртгэлийн дугаар: ${d.code}.\n\n` +
      `Комиссын шийдвэрийг энэ хаягаар мэдэгдэнэ.\n\n${org.name}`,
  },
  "needs-fix": {
    subject: "Өргөдлийн материал дутуу байна",
    body: (d) =>
      `Сайн байна уу, ${d.name}.\n\n` +
      `Таны өргөдлийн материалд дараах засвар шаардлагатай байна:\n\n${d.note}\n\n` +
      `Системд нэвтэрч засвараа хийгээд дахин илгээнэ үү.\n\n${org.name}`,
  },
  "decision-approved": {
    subject: "Тэтгэлэгт тэнцлээ",
    body: (d) =>
      `Сайн байна уу, ${d.name}.\n\n` +
      `Баяр хүргэе. Та ${d.year} оны сургалтын төлбөрийн тэтгэлэгт тэнцлээ.\n\n${d.note}\n\n` +
      `Дараагийн алхмын талаар удахгүй мэдэгдэнэ.\n\n${org.name}`,
  },
  "decision-rejected": {
    subject: "Тэтгэлгийн шалгаруулалтын дүн",
    body: (d) =>
      `Сайн байна уу, ${d.name}.\n\n` +
      `Тэтгэлгийн шалгаруулалтад оролцсонд баярлалаа. Харамсалтай нь энэ удаад таны өргөдөл шалгарсангүй.\n\n${d.note}\n\n` +
      `Таны цаашдын сурлага, ажилд амжилт хүсье.\n\n${org.name}`,
  },
  "decision-waitlisted": {
    subject: "Таны өргөдөл нөөцөд бүртгэгдлээ",
    body: (d) =>
      `Сайн байна уу, ${d.name}.\n\n` +
      `Таны өргөдөл нөөцийн жагсаалтад бүртгэгдлээ. Сул орон гарвал холбогдоно.\n\n${d.note}\n\n${org.name}`,
  },
} satisfies Record<string, Template>;

export type EmailTemplate = keyof typeof templates;

type SendEmailInput = {
  to: string;
  template: EmailTemplate;
  data: TemplateData;
  applicationId?: string;
};

export async function sendEmail({
  to,
  template,
  data,
  applicationId,
}: SendEmailInput): Promise<void> {
  const { subject, body } = templates[template];
  const renderedSubject = subject;
  const renderedBody = body(data);

  let status = "LOGGED";
  let error: string | null = null;

  const smtpUrl = process.env.SMTP_URL;
  if (smtpUrl) {
    try {
      const nodemailer = await import("nodemailer");
      const transport = nodemailer.createTransport(smtpUrl);
      await transport.sendMail({
        from: process.env.SMTP_FROM ?? org.email,
        to,
        subject: renderedSubject,
        text: renderedBody,
      });
      status = "SENT";
    } catch (cause) {
      status = "FAILED";
      error = cause instanceof Error ? cause.message : String(cause);
      console.error(`И-мэйл илгээхэд алдаа гарлаа (${to}):`, error);
    }
  } else {
    console.info(
      `\n--- И-МЭЙЛ (SMTP тохируулаагүй тул илгээгээгүй) ---\n` +
        `Хэнд: ${to}\nГарчиг: ${renderedSubject}\n\n${renderedBody}\n` +
        `--- төгсгөл ---\n`,
    );
  }

  await prisma.emailLog.create({
    data: {
      applicationId,
      to,
      template,
      subject: renderedSubject,
      status,
      error,
    },
  });
}
