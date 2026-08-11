"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  FORMATS,
  TARGET_GROUP_LABELS,
  TARGET_GROUP_VALUES,
  type FormatRule,
} from "@/lib/anket";
import { AIMAGS, SOUMS } from "@/lib/soum";
import { PRIORITY_PROFESSIONS, DEMANDED_PROFESSIONS } from "@/lib/professions";
import { Field, inputClass } from "@/components/ui";

/**
 * «ТЭТГЭЛЭГ ГОРИЛОГЧИЙН АНКЕТ»-ын талбарууд. Бүртгэлийн форм болон анкет
 * засах хуудсууд ижил markup ашиглана — хоёр газарт зөрүүтэй форм гарахгүй.
 */
export type AnketDefaults = {
  [key: string]: string | string[] | boolean | undefined;
};

function text(defaults: AnketDefaults, key: string): string {
  const value = defaults[key];
  return typeof value === "string" ? value : "";
}

function checked(defaults: AnketDefaults, key: string): boolean {
  const value = defaults[key];
  return value === true || value === "on" || value === "true";
}

function list(defaults: AnketDefaults, key: string): string[] {
  const value = defaults[key];
  if (Array.isArray(value)) return value;
  return typeof value === "string" && value ? [value] : [];
}

/**
 * React нь `<select>`-ийн `defaultValue`-г зөвхөн mount хийх үедээ хэрэглэдэг.
 * Алдаа гарч утга буцаж ирэхэд remount хийлгэхийн тулд түлхүүрт нь оруулна —
 * эс бөгөөс сонгосон сум, хүйс формын reset дээр хоосрох болно.
 */
function selectKey(name: string, value: string): string {
  return `${name}:${value}`;
}

export function AnketSection({
  number,
  title,
  description,
  children,
}: {
  number: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-neutral-200 pt-5 first:border-0 first:pt-0">
      <h2 className="text-sm font-medium text-neutral-900">
        <span className="text-neutral-500">{number}</span> {title}
      </h2>
      {description ? (
        <p className="mt-0.5 text-xs text-neutral-500">{description}</p>
      ) : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/**
 * Форматтай талбар. Буруу **тэмдэгт** бичих үед тэр дороо, дутуу урттай
 * байвал талбараас гарах үед анхааруулна. Талбар нь uncontrolled хэвээр тул
 * сервер алдаа буцаахад бөглөсөн утга хадгалагдана.
 */
function PatternField({
  label,
  name,
  rule,
  defaults,
  hint,
  placeholder,
  fallback = "",
  required = true,
  uppercase = false,
  className = "",
}: {
  label: string;
  name: string;
  rule: FormatRule;
  defaults: AnketDefaults;
  hint?: string;
  placeholder?: string;
  /** Хадгалсан утга байхгүй үед урьдчилж дүүргэх утга. */
  fallback?: string;
  required?: boolean;
  uppercase?: boolean;
  className?: string;
}) {
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (raw: string, final: boolean): string | null => {
    const value = uppercase ? raw.trim().toUpperCase() : raw.trim();
    if (value === "") return null;
    if (!rule.chars.test(value)) return rule.charMessage;
    return final && !rule.full.test(value) ? rule.message : null;
  };

  return (
    <Field
      label={label}
      htmlFor={name}
      required={required}
      hint={hint}
      error={error ?? undefined}
      className={className}
    >
      <input
        id={name}
        name={name}
        required={required}
        maxLength={rule.maxLength}
        inputMode={rule.inputMode}
        defaultValue={text(defaults, name) || fallback}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        onChange={(event) => setError(validate(event.target.value, touched))}
        onBlur={(event) => {
          setTouched(true);
          setError(validate(event.target.value, true));
        }}
        className={`${inputClass} ${
          error ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""
        }`}
      />
    </Field>
  );
}

export function CheckField({
  name,
  label,
  value,
  defaultChecked = false,
}: {
  name: string;
  label: string;
  value?: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-neutral-800">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="size-4 rounded border-neutral-300 text-brand-blue focus:ring-brand-blue/30"
      />
      {label}
    </label>
  );
}

/** Анкетын 1 дүгээр хэсэг. И-мэйлийн талбарыг дуудагч тал өгнө. */
export function PersonalAnketFields({
  defaults,
  emailSlot,
}: {
  defaults: AnketDefaults;
  emailSlot: ReactNode;
}) {
  const [isTargetGroup, setIsTargetGroup] = useState(
    text(defaults, "isTargetGroup") === "yes",
  );
  const selectedGroups = list(defaults, "targetGroupTypes");

  return (
    <>
      <AnketSection
        number="1."
        title="Үндсэн мэдээлэл"
        description="Иргэний үнэмлэх дээрх мэдээлэлтэй тохирч байх ёстой. Сургууль, мэргэжлийн нэр, и-мэйлээс бусад талбарыг кирилл үсгээр бөглөнө."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <PatternField
            label="Регистрийн дугаар"
            name="registerNo"
            rule={FORMATS.registerNo}
            defaults={defaults}
            uppercase
            hint="2 кирилл үсэг, 8 цифр. Жишээ: АБ12345678"
            placeholder="АБ12345678"
          />

          <PatternField
            label="Иргэний бүртгэлийн дугаар"
            name="civilRegistrationNo"
            rule={FORMATS.civilRegistrationNo}
            defaults={defaults}
            hint="Зөвхөн 12 цифр"
            placeholder="470281016065"
          />

          <PatternField
            label="1.1. Иргэний харьяалал"
            name="citizenship"
            rule={FORMATS.cyrillicName}
            defaults={defaults}
            fallback="Монгол Улс"
          />

          <PatternField
            label="1.2. Ургийн овог"
            name="clanName"
            rule={FORMATS.cyrillicName}
            defaults={defaults}
            placeholder="Боржигон"
          />

          <PatternField
            label="1.3. Эцэг (эх)-ийн нэр"
            name="lastName"
            rule={FORMATS.cyrillicName}
            defaults={defaults}
            placeholder="Бат-Эрдэнэ"
          />

          <PatternField
            label="1.4. Өөрийн нэр"
            name="firstName"
            rule={FORMATS.cyrillicName}
            defaults={defaults}
            placeholder="Сувд"
          />

          <Field label="1.5. Хүйс" htmlFor="gender" required>
            <select
              key={selectKey("gender", text(defaults, "gender"))}
              id="gender"
              name="gender"
              required
              defaultValue={text(defaults, "gender")}
              className={inputClass}
            >
              <option value="" disabled>
                Сонгоно уу
              </option>
              <option value="FEMALE">Эмэгтэй</option>
              <option value="MALE">Эрэгтэй</option>
            </select>
          </Field>

          <Field label="1.6. Төрсөн огноо" htmlFor="birthDate" required>
            <input
              id="birthDate"
              name="birthDate"
              type="date"
              required
              defaultValue={text(defaults, "birthDate")}
              className={inputClass}
            />
          </Field>

          <PatternField
            label="1.7. Үндэс, угсаа"
            name="ethnicity"
            rule={FORMATS.cyrillicName}
            defaults={defaults}
            fallback="Халх"
          />

          <Field
            label="1.8. Төрсөн аймаг, хот"
            htmlFor="birthAimag"
            required
          >
            <select
              key={selectKey("birthAimag", text(defaults, "birthAimag"))}
              id="birthAimag"
              name="birthAimag"
              required
              defaultValue={text(defaults, "birthAimag")}
              className={inputClass}
            >
              <option value="" disabled>
                Сонгоно уу
              </option>
              {AIMAGS.map((aimag) => (
                <option key={aimag} value={aimag}>
                  {aimag}
                </option>
              ))}
            </select>
          </Field>

          <PatternField
            label="Төрсөн сум, дүүрэг"
            name="birthSoum"
            rule={FORMATS.cyrillicName}
            defaults={defaults}
            placeholder="Сайншанд"
            className="sm:col-span-2"
          />
        </div>
      </AnketSection>

      <AnketSection number="1.9." title="Байнгын оршин суугаа хаяг">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Аймаг, хот" htmlFor="aimag" required>
            <select
              key={selectKey("aimag", text(defaults, "aimag") || "Дорноговь")}
              id="aimag"
              name="aimag"
              required
              defaultValue={text(defaults, "aimag") || "Дорноговь"}
              className={inputClass}
            >
              {AIMAGS.map((aimag) => (
                <option key={aimag} value={aimag}>
                  {aimag}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Сум, дүүрэг" htmlFor="soum" required>
            <select
              key={selectKey("soum", text(defaults, "soum"))}
              id="soum"
              name="soum"
              required
              defaultValue={text(defaults, "soum")}
              className={inputClass}
            >
              <option value="" disabled>
                Сонгоно уу
              </option>
              {SOUMS.map((soum) => (
                <option key={soum} value={soum}>
                  {soum}
                </option>
              ))}
            </select>
          </Field>

          <PatternField
            label="Баг, хороо"
            name="bag"
            rule={FORMATS.cyrillicText}
            defaults={defaults}
            placeholder="1 дүгээр баг"
          />

          <PatternField
            label="Хороолол, хотхон"
            name="khoroolol"
            rule={FORMATS.cyrillicText}
            defaults={defaults}
            required={false}
            hint="Сонголтоор"
          />

          <PatternField
            label="Байр, гудамж"
            name="street"
            rule={FORMATS.cyrillicText}
            defaults={defaults}
            placeholder="5 дугаар байр"
          />

          <PatternField
            label="Тоот"
            name="unit"
            rule={FORMATS.cyrillicText}
            defaults={defaults}
            placeholder="24"
          />
        </div>
      </AnketSection>

      <AnketSection number="1.10." title="Холбоо барих">
        <div className="grid gap-4 sm:grid-cols-2">
          <PatternField
            label="Утасны дугаар 1"
            name="phone"
            rule={FORMATS.phone}
            defaults={defaults}
            hint="8 оронтой дугаар"
            placeholder="99001122"
          />

          <PatternField
            label="Утасны дугаар 2"
            name="phone2"
            rule={FORMATS.phone}
            defaults={defaults}
            required={false}
            hint="Сонголтоор"
          />

          <div className="sm:col-span-2">{emailSlot}</div>
        </div>
      </AnketSection>

      <AnketSection
        number="1.11."
        title="Зайлшгүй шаардлага гарсан үед харилцах хүн"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <PatternField
            label="Таны хэн болох"
            name="contactRelation"
            rule={FORMATS.cyrillicName}
            defaults={defaults}
            placeholder="Ээж"
          />

          <PatternField
            label="Эцэг (эх)-ийн нэр, нэр"
            name="contactName"
            rule={FORMATS.cyrillicName}
            defaults={defaults}
            placeholder="Дорж Оюун"
          />

          <PatternField
            label="Утасны дугаар"
            name="contactPhone"
            rule={FORMATS.phone}
            defaults={defaults}
            hint="8 оронтой дугаар"
          />
        </div>
      </AnketSection>

      <AnketSection
        number="1.12."
        title="Зорилтот бүлгийнх эсэх"
        description="Зорилтот бүлэгт хамаарах нь комиссын үнэлгээнд тусгагдана."
      >
        <div className="flex gap-5">
          {[
            { value: "yes", label: "Тийм" },
            { value: "no", label: "Үгүй" },
          ].map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-2 text-sm text-neutral-800"
            >
              <input
                type="radio"
                name="isTargetGroup"
                value={option.value}
                required
                defaultChecked={
                  text(defaults, "isTargetGroup") === option.value
                }
                onChange={() => setIsTargetGroup(option.value === "yes")}
                className="size-4 border-neutral-300 text-brand-blue focus:ring-brand-blue/30"
              />
              {option.label}
            </label>
          ))}
        </div>

        {isTargetGroup ? (
          <div className="mt-4 space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-xs text-neutral-600">
              Зорилтот бүлгийн хэлбэр — хамаарах бүхнийг тэмдэглэнэ үү.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {TARGET_GROUP_VALUES.map((type) => (
                <CheckField
                  key={type}
                  name="targetGroupTypes"
                  value={type}
                  label={TARGET_GROUP_LABELS[type]}
                  defaultChecked={selectedGroups.includes(type)}
                />
              ))}
            </div>
            <PatternField
              label="Тайлбар"
              name="targetGroupNote"
              rule={FORMATS.cyrillicText}
              defaults={defaults}
              required={false}
              placeholder="«Бусад» сонгосон бол тодруулна уу"
            />
          </div>
        ) : null}
      </AnketSection>

      <AnketSection
        number="1.13."
        title="Батлан даагч"
        description="Журмын 2.1-д заасны дагуу батлан даагчтай байх шаардлагатай. Батлан даагч нь гэрээний хэрэгжилтэд хамтран хариуцлага хүлээнэ."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <PatternField
            label="Эцэг (эх)-ийн нэр, нэр"
            name="guarantorName"
            rule={FORMATS.cyrillicName}
            defaults={defaults}
            placeholder="Дорж Батбаяр"
          />

          <PatternField
            label="Регистрийн дугаар"
            name="guarantorRegisterNo"
            rule={FORMATS.registerNo}
            defaults={defaults}
            uppercase
            hint="2 кирилл үсэг, 8 цифр"
            placeholder="АБ12345678"
          />

          <PatternField
            label="Таны хэн болох"
            name="guarantorRelation"
            rule={FORMATS.cyrillicName}
            defaults={defaults}
            placeholder="Аав"
          />

          <PatternField
            label="Утасны дугаар"
            name="guarantorPhone"
            rule={FORMATS.phone}
            defaults={defaults}
            hint="8 оронтой дугаар"
          />

          <PatternField
            label="Оршин суугаа хаяг"
            name="guarantorAddress"
            rule={FORMATS.cyrillicText}
            defaults={defaults}
            className="sm:col-span-2"
            placeholder="Дорноговь, Сайншанд сум, 1 дүгээр баг, 5 дугаар байр, 24 тоот"
          />

          <PatternField
            label="Ажлын газар, албан тушаал"
            name="guarantorWorkplace"
            rule={FORMATS.cyrillicText}
            defaults={defaults}
            required={false}
            hint="Сонголтоор"
            className="sm:col-span-2"
          />
        </div>
      </AnketSection>
    </>
  );
}

/** Анкетын 2, 3 дугаар хэсэг — сургууль, хөтөлбөр, мэргэжил. */
export function ProgramAnketFields({ defaults }: { defaults: AnketDefaults }) {
  const defaultClaimed = text(defaults, "claimedProfession");
  const isPredefined =
    PRIORITY_PROFESSIONS.some((g) => g.professions.includes(defaultClaimed)) ||
    DEMANDED_PROFESSIONS.some((g) => g.professions.includes(defaultClaimed));

  const initialSelectValue = defaultClaimed
    ? isPredefined
      ? defaultClaimed
      : "Бусад"
    : "";
  const [selectValue, setSelectValue] = useState(initialSelectValue);
  const selectRef = useRef<HTMLSelectElement>(null);

  // Сервер алдаа буцаахад React формыг цэвэрлэдэг. Удирдлагатай `<select>`-ийн
  // React дэх утга өөрчлөгддөггүй тул DOM-той зөрж, сонголт хоосон харагдана.
  // Render бүрийн дараа зөрүүг нь буцаан тааруулна.
  useEffect(() => {
    const element = selectRef.current;
    if (element && element.value !== selectValue) {
      element.value = selectValue;
    }
  });

  return (
    <>
      <AnketSection
        number="2."
        title="Их, дээд сургууль, хөтөлбөрийн мэдээлэл"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Сургуулийн нэр" htmlFor="university" required>
            <input
              id="university"
              name="university"
              required
              defaultValue={text(defaults, "university")}
              className={inputClass}
              placeholder="Монгол Улсын Их Сургууль"
            />
          </Field>

          <Field label="Хөтөлбөрийн нэр" htmlFor="major" required>
            <input
              id="major"
              name="major"
              required
              defaultValue={text(defaults, "major")}
              className={inputClass}
              placeholder="Багш, математикийн боловсрол"
            />
          </Field>

          <fieldset className="sm:col-span-2">
            <legend className="text-sm font-medium text-neutral-800">
              Магадлан итгэмжлэгдсэн эсэх
              <span className="text-brand-orange"> *</span>
            </legend>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
              <CheckField
                name="isSchoolAccredited"
                label="Сургууль"
                defaultChecked={checked(defaults, "isSchoolAccredited")}
              />
              <CheckField
                name="isProgramAccredited"
                label="Хөтөлбөр"
                defaultChecked={checked(defaults, "isProgramAccredited")}
              />
            </div>
          </fieldset>
        </div>
      </AnketSection>

      <AnketSection
        number="3."
        title="Мэргэжил"
        description="Сонгосон мэргэжил нь сумын хүний нөөцийн хэрэгцээнд нийцэж байгаа эсэхийг комисс үнэлнэ."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Тэргүүлэх болон эрэлттэй мэргэжил" htmlFor="claimedProfessionSelect" required>
            <select
              ref={selectRef}
              id="claimedProfessionSelect"
              name={selectValue === "Бусад" ? "_ignored" : "claimedProfession"}
              required
              value={selectValue}
              onChange={(e) => setSelectValue(e.target.value)}
              className={inputClass}
            >
              <option value="" disabled>Сонгоно уу</option>
              {PRIORITY_PROFESSIONS.map((group) => (
                <optgroup key={`p-${group.category}`} label={`Тэргүүлэх чиглэл: ${group.category}`}>
                  {group.professions.map((prof) => (
                    <option key={prof} value={prof}>{prof}</option>
                  ))}
                </optgroup>
              ))}
              {DEMANDED_PROFESSIONS.map((group) => (
                <optgroup key={`d-${group.category}`} label={`Эрэлттэй мэргэжил: ${group.category}`}>
                  {group.professions.map((prof) => (
                    <option key={prof} value={prof}>{prof}</option>
                  ))}
                </optgroup>
              ))}
              <option value="Бусад">Бусад</option>
            </select>
          </Field>

          {selectValue === "Бусад" && (
            <PatternField
              label="Бусад мэргэжил"
              name="claimedProfession"
              rule={FORMATS.cyrillicText}
              defaults={defaults}
              placeholder="Мэргэжлээ бичнэ үү"
            />
          )}
        </div>
      </AnketSection>
    </>
  );
}
