/** Airport catalogue used by the flight request search card (Arabic-first). */
export interface Airport {
  code: string;
  city: string;
  cityEn: string;
  country: string;
  name: string;
}

export const AIRPORTS: Airport[] = [
  // Tunisia
  { code: "TUN", city: "تونس", cityEn: "Tunis", country: "تونس", name: "مطار تونس قرطاج الدولي" },
  { code: "MIR", city: "المنستير", cityEn: "Monastir", country: "تونس", name: "مطار المنستير الحبيب بورقيبة" },
  { code: "NBE", city: "النفيضة", cityEn: "Enfidha", country: "تونس", name: "مطار النفيضة الحمامات" },
  { code: "SFA", city: "صفاقس", cityEn: "Sfax", country: "تونس", name: "مطار صفاقس طينة" },
  { code: "DJE", city: "جربة", cityEn: "Djerba", country: "تونس", name: "مطار جربة جرجيس" },
  { code: "TOE", city: "توزر", cityEn: "Tozeur", country: "تونس", name: "مطار توزر نفطة" },
  { code: "GAF", city: "قفصة", cityEn: "Gafsa", country: "تونس", name: "مطار قفصة القصر" },
  // Maghreb & Libya
  { code: "ALG", city: "الجزائر", cityEn: "Algiers", country: "الجزائر", name: "مطار هواري بومدين" },
  { code: "ORN", city: "وهران", cityEn: "Oran", country: "الجزائر", name: "مطار أحمد بن بلة" },
  { code: "CZL", city: "قسنطينة", cityEn: "Constantine", country: "الجزائر", name: "مطار محمد بوضياف" },
  { code: "TIP", city: "طرابلس", cityEn: "Tripoli", country: "ليبيا", name: "مطار طرابلس العالمي" },
  { code: "MJI", city: "مصراتة", cityEn: "Misrata", country: "ليبيا", name: "مطار مصراتة الدولي" },
  { code: "BEN", city: "بنغازي", cityEn: "Benghazi", country: "ليبيا", name: "مطار بنينا الدولي" },
  { code: "CMN", city: "الدار البيضاء", cityEn: "Casablanca", country: "المغرب", name: "مطار محمد الخامس" },
  { code: "RAK", city: "مراكش", cityEn: "Marrakech", country: "المغرب", name: "مطار مراكش المنارة" },
  // Gulf & Saudi Arabia
  { code: "JED", city: "جدة", cityEn: "Jeddah", country: "السعودية", name: "مطار الملك عبد العزيز الدولي" },
  { code: "MED", city: "المدينة المنورة", cityEn: "Medina", country: "السعودية", name: "مطار الأمير محمد بن عبد العزيز" },
  { code: "RUH", city: "الرياض", cityEn: "Riyadh", country: "السعودية", name: "مطار الملك خالد الدولي" },
  { code: "DMM", city: "الدمام", cityEn: "Dammam", country: "السعودية", name: "مطار الملك فهد الدولي" },
  { code: "DXB", city: "دبي", cityEn: "Dubai", country: "الإمارات", name: "مطار دبي الدولي" },
  { code: "AUH", city: "أبو ظبي", cityEn: "Abu Dhabi", country: "الإمارات", name: "مطار زايد الدولي" },
  { code: "SHJ", city: "الشارقة", cityEn: "Sharjah", country: "الإمارات", name: "مطار الشارقة الدولي" },
  { code: "DOH", city: "الدوحة", cityEn: "Doha", country: "قطر", name: "مطار حمد الدولي" },
  { code: "KWI", city: "الكويت", cityEn: "Kuwait", country: "الكويت", name: "مطار الكويت الدولي" },
  { code: "BAH", city: "المنامة", cityEn: "Manama", country: "البحرين", name: "مطار البحرين الدولي" },
  { code: "MCT", city: "مسقط", cityEn: "Muscat", country: "عمان", name: "مطار مسقط الدولي" },
  // Middle East & Africa
  { code: "CAI", city: "القاهرة", cityEn: "Cairo", country: "مصر", name: "مطار القاهرة الدولي" },
  { code: "HRG", city: "الغردقة", cityEn: "Hurghada", country: "مصر", name: "مطار الغردقة الدولي" },
  { code: "AMM", city: "عمّان", cityEn: "Amman", country: "الأردن", name: "مطار الملكة علياء الدولي" },
  { code: "BEY", city: "بيروت", cityEn: "Beirut", country: "لبنان", name: "مطار رفيق الحريري الدولي" },
  { code: "KRT", city: "الخرطوم", cityEn: "Khartoum", country: "السودان", name: "مطار الخرطوم الدولي" },
  { code: "DKR", city: "داكار", cityEn: "Dakar", country: "السنغال", name: "مطار بليز ديان الدولي" },
  { code: "NKC", city: "نواكشوط", cityEn: "Nouakchott", country: "موريتانيا", name: "مطار نواكشوط الدولي" },
  // Türkiye & Europe
  { code: "IST", city: "اسطنبول", cityEn: "Istanbul", country: "تركيا", name: "مطار اسطنبول" },
  { code: "SAW", city: "اسطنبول صبيحة", cityEn: "Istanbul Sabiha", country: "تركيا", name: "مطار صبيحة كوكجن" },
  { code: "AYT", city: "أنطاليا", cityEn: "Antalya", country: "تركيا", name: "مطار أنطاليا" },
  { code: "CDG", city: "باريس", cityEn: "Paris", country: "فرنسا", name: "مطار شارل ديغول" },
  { code: "ORY", city: "باريس أورلي", cityEn: "Paris Orly", country: "فرنسا", name: "مطار أورلي" },
  { code: "MRS", city: "مرسيليا", cityEn: "Marseille", country: "فرنسا", name: "مطار مرسيليا بروفانس" },
  { code: "LYS", city: "ليون", cityEn: "Lyon", country: "فرنسا", name: "مطار ليون سان إكزوبيري" },
  { code: "NCE", city: "نيس", cityEn: "Nice", country: "فرنسا", name: "مطار نيس كوت دازور" },
  { code: "TLS", city: "تولوز", cityEn: "Toulouse", country: "فرنسا", name: "مطار تولوز بلانياك" },
  { code: "LHR", city: "لندن", cityEn: "London", country: "بريطانيا", name: "مطار هيثرو" },
  { code: "MAN", city: "مانشستر", cityEn: "Manchester", country: "بريطانيا", name: "مطار مانشستر" },
  { code: "BRU", city: "بروكسل", cityEn: "Brussels", country: "بلجيكا", name: "مطار بروكسل" },
  { code: "AMS", city: "أمستردام", cityEn: "Amsterdam", country: "هولندا", name: "مطار شيفول" },
  { code: "FRA", city: "فرانكفورت", cityEn: "Frankfurt", country: "ألمانيا", name: "مطار فرانكفورت" },
  { code: "MUC", city: "ميونخ", cityEn: "Munich", country: "ألمانيا", name: "مطار ميونخ" },
  { code: "FCO", city: "روما", cityEn: "Rome", country: "إيطاليا", name: "مطار فيوميتشينو" },
  { code: "MXP", city: "ميلانو", cityEn: "Milan", country: "إيطاليا", name: "مطار مالبينسا" },
  { code: "MAD", city: "مدريد", cityEn: "Madrid", country: "إسبانيا", name: "مطار باراخاس" },
  { code: "BCN", city: "برشلونة", cityEn: "Barcelona", country: "إسبانيا", name: "مطار البرات" },
  { code: "GVA", city: "جنيف", cityEn: "Geneva", country: "سويسرا", name: "مطار جنيف" },
  { code: "VIE", city: "فيينا", cityEn: "Vienna", country: "النمسا", name: "مطار فيينا" },
  // Asia & Americas
  { code: "KUL", city: "كوالالمبور", cityEn: "Kuala Lumpur", country: "ماليزيا", name: "مطار كوالالمبور الدولي" },
  { code: "SIN", city: "سنغافورة", cityEn: "Singapore", country: "سنغافورة", name: "مطار شانغي" },
  { code: "BKK", city: "بانكوك", cityEn: "Bangkok", country: "تايلاند", name: "مطار سوفارنابومي" },
  { code: "DEL", city: "نيودلهي", cityEn: "New Delhi", country: "الهند", name: "مطار إنديرا غاندي" },
  { code: "JFK", city: "نيويورك", cityEn: "New York", country: "أمريكا", name: "مطار جون كينيدي" },
  { code: "YUL", city: "مونتريال", cityEn: "Montreal", country: "كندا", name: "مطار ترودو الدولي" },
];

const norm = (v: string) =>
  v
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/[ىي]/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[\u064B-\u0652]/g, "")
    .trim();

export function searchAirports(query: string, limit = 40): Airport[] {
  const q = norm(query);
  if (!q) return AIRPORTS.slice(0, limit);
  const scored = AIRPORTS.map((a) => {
    const haystack = norm(`${a.city} ${a.cityEn} ${a.country} ${a.name} ${a.code}`);
    if (!haystack.includes(q)) return null;
    const starts = norm(a.city).startsWith(q) || norm(a.cityEn).startsWith(q) || norm(a.code).startsWith(q);
    return { a, score: starts ? 0 : 1 };
  }).filter((v): v is { a: Airport; score: number } => v !== null);
  scored.sort((x, y) => x.score - y.score);
  return scored.slice(0, limit).map((s) => s.a);
}

export function formatAirport(a: Airport): string {
  return `${a.city} (${a.code}) — ${a.country}`;
}

export function findAirport(value: string): Airport | undefined {
  return AIRPORTS.find((a) => a.code === value);
}
