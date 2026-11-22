export interface Surah {
  /** One-based canonical surah number. */
  readonly number: number;
  /** Common English transliteration. */
  readonly name: string;
  /** Name as written in Arabic. */
  readonly arabicName: string;
  /** Canonical Hafs/Kufan ayah count. */
  readonly ayahCount: number;
  /** Additional normalized spellings accepted by reference search. */
  readonly aliases: readonly string[];
  /** Zero-based position in canonical order. */
  readonly ordinal: number;
}

export type SurahNumber = number;

type SurahDefinition = Omit<Surah, 'number' | 'ordinal'>;

/**
 * The Quran's 114 surahs in canonical order, using the standard 6,236-ayah Hafs/Kufan count.
 * The basmalah is ayah 1 of Al-Fatihah and is not numbered separately in the other surahs.
 */
const DEFINITIONS: readonly SurahDefinition[] = [
  ['Al-Fatihah', 'الفاتحة', 7, ['fatiha', 'theopening']],
  ['Al-Baqarah', 'البقرة', 286, ['baqarah', 'thecow']],
  ['Ali Imran', 'آل عمران', 200, ['alimran', 'imran', 'familyofimran']],
  ['An-Nisa', 'النساء', 176, ['nisa', 'women']],
  ['Al-Maidah', 'المائدة', 120, ['maidah', 'thetable']],
  ['Al-Anam', 'الأنعام', 165, ['anam', 'cattle']],
  ['Al-Araf', 'الأعراف', 206, ['araf', 'theheights']],
  ['Al-Anfal', 'الأنفال', 75, ['anfal', 'spoilsofwar']],
  ['At-Tawbah', 'التوبة', 129, ['tawbah', 'baraah', 'repentance']],
  ['Yunus', 'يونس', 109, ['jonah']],
  ['Hud', 'هود', 123, []],
  ['Yusuf', 'يوسف', 111, ['joseph']],
  ['Ar-Rad', 'الرعد', 43, ['rad', 'thunder']],
  ['Ibrahim', 'إبراهيم', 52, ['abraham']],
  ['Al-Hijr', 'الحجر', 99, ['hijr']],
  ['An-Nahl', 'النحل', 128, ['nahl', 'bee']],
  ['Al-Isra', 'الإسراء', 111, ['isra', 'banisrail', 'nightjourney']],
  ['Al-Kahf', 'الكهف', 110, ['kahf', 'cave']],
  ['Maryam', 'مريم', 98, ['mary']],
  ['Ta-Ha', 'طه', 135, ['taha']],
  ['Al-Anbiya', 'الأنبياء', 112, ['anbiya', 'prophets']],
  ['Al-Hajj', 'الحج', 78, ['hajj', 'pilgrimage']],
  ['Al-Muminun', 'المؤمنون', 118, ['muminun', 'believers']],
  ['An-Nur', 'النور', 64, ['nur', 'light']],
  ['Al-Furqan', 'الفرقان', 77, ['furqan', 'criterion']],
  ['Ash-Shuara', 'الشعراء', 227, ['shuara', 'poets']],
  ['An-Naml', 'النمل', 93, ['naml', 'ant']],
  ['Al-Qasas', 'القصص', 88, ['qasas', 'stories']],
  ['Al-Ankabut', 'العنكبوت', 69, ['ankabut', 'spider']],
  ['Ar-Rum', 'الروم', 60, ['rum', 'romans']],
  ['Luqman', 'لقمان', 34, []],
  ['As-Sajdah', 'السجدة', 30, ['sajdah', 'prostration']],
  ['Al-Ahzab', 'الأحزاب', 73, ['ahzab', 'confederates']],
  ['Saba', 'سبأ', 54, ['sheba']],
  ['Fatir', 'فاطر', 45, ['originator']],
  ['Ya-Sin', 'يس', 83, ['yasin']],
  ['As-Saffat', 'الصافات', 182, ['saffat', 'rangedinrows']],
  ['Sad', 'ص', 88, []],
  ['Az-Zumar', 'الزمر', 75, ['zumar', 'groups']],
  ['Ghafir', 'غافر', 85, ['mumin', 'forgiver']],
  ['Fussilat', 'فصلت', 54, ['hamimsajdah', 'explainedindetail']],
  ['Ash-Shura', 'الشورى', 53, ['shura', 'consultation']],
  ['Az-Zukhruf', 'الزخرف', 89, ['zukhruf', 'ornaments']],
  ['Ad-Dukhan', 'الدخان', 59, ['dukhan', 'smoke']],
  ['Al-Jathiyah', 'الجاثية', 37, ['jathiyah', 'kneeling']],
  ['Al-Ahqaf', 'الأحقاف', 35, ['ahqaf', 'sanddunes']],
  ['Muhammad', 'محمد', 38, []],
  ['Al-Fath', 'الفتح', 29, ['fath', 'victory']],
  ['Al-Hujurat', 'الحجرات', 18, ['hujurat', 'rooms']],
  ['Qaf', 'ق', 45, []],
  ['Adh-Dhariyat', 'الذاريات', 60, ['dhariyat', 'winnowingwinds']],
  ['At-Tur', 'الطور', 49, ['tur', 'mount']],
  ['An-Najm', 'النجم', 62, ['najm', 'star']],
  ['Al-Qamar', 'القمر', 55, ['qamar', 'moon']],
  ['Ar-Rahman', 'الرحمن', 78, ['rahman', 'beneficent']],
  ['Al-Waqiah', 'الواقعة', 96, ['waqiah', 'inevitable']],
  ['Al-Hadid', 'الحديد', 29, ['hadid', 'iron']],
  ['Al-Mujadilah', 'المجادلة', 22, ['mujadilah', 'pleadingwoman']],
  ['Al-Hashr', 'الحشر', 24, ['hashr', 'exile']],
  ['Al-Mumtahanah', 'الممتحنة', 13, ['mumtahanah', 'examinedwoman']],
  ['As-Saff', 'الصف', 14, ['saff', 'ranks']],
  ['Al-Jumuah', 'الجمعة', 11, ['jumuah', 'friday']],
  ['Al-Munafiqun', 'المنافقون', 11, ['munafiqun', 'hypocrites']],
  ['At-Taghabun', 'التغابن', 18, ['taghabun', 'mutualdisillusion']],
  ['At-Talaq', 'الطلاق', 12, ['talaq', 'divorce']],
  ['At-Tahrim', 'التحريم', 12, ['tahrim', 'prohibition']],
  ['Al-Mulk', 'الملك', 30, ['mulk', 'sovereignty']],
  ['Al-Qalam', 'القلم', 52, ['qalam', 'pen']],
  ['Al-Haqqah', 'الحاقة', 52, ['haqqah', 'reality']],
  ['Al-Maarij', 'المعارج', 44, ['maarij', 'ascendingstairways']],
  ['Nuh', 'نوح', 28, ['noah']],
  ['Al-Jinn', 'الجن', 28, ['jinn']],
  ['Al-Muzzammil', 'المزمل', 20, ['muzzammil', 'enshrouded']],
  ['Al-Muddaththir', 'المدثر', 56, ['muddaththir', 'cloaked']],
  ['Al-Qiyamah', 'القيامة', 40, ['qiyamah', 'resurrection']],
  ['Al-Insan', 'الإنسان', 31, ['insan', 'dahr', 'man']],
  ['Al-Mursalat', 'المرسلات', 50, ['mursalat', 'emissaries']],
  ['An-Naba', 'النبأ', 40, ['naba', 'tidings']],
  ['An-Naziat', 'النازعات', 46, ['naziat', 'thosewhodragforth']],
  ['Abasa', 'عبس', 42, ['hefrowned']],
  ['At-Takwir', 'التكوير', 29, ['takwir', 'overthrowing']],
  ['Al-Infitar', 'الإنفطار', 19, ['infitar', 'cleaving']],
  ['Al-Mutaffifin', 'المطففين', 36, ['mutaffifin', 'defrauding']],
  ['Al-Inshiqaq', 'الإنشقاق', 25, ['inshiqaq', 'sundering']],
  ['Al-Buruj', 'البروج', 22, ['buruj', 'mansionsofthestars']],
  ['At-Tariq', 'الطارق', 17, ['tariq', 'morningstar']],
  ['Al-Ala', 'الأعلى', 19, ['ala', 'mosthigh']],
  ['Al-Ghashiyah', 'الغاشية', 26, ['ghashiyah', 'overwhelming']],
  ['Al-Fajr', 'الفجر', 30, ['fajr', 'dawn']],
  ['Al-Balad', 'البلد', 20, ['balad', 'city']],
  ['Ash-Shams', 'الشمس', 15, ['shams', 'sun']],
  ['Al-Layl', 'الليل', 21, ['layl', 'night']],
  ['Ad-Duha', 'الضحى', 11, ['duha', 'morninghours']],
  ['Ash-Sharh', 'الشرح', 8, ['sharh', 'inshirah', 'solace']],
  ['At-Tin', 'التين', 8, ['tin', 'fig']],
  ['Al-Alaq', 'العلق', 19, ['alaq', 'clot']],
  ['Al-Qadr', 'القدر', 5, ['qadr', 'power']],
  ['Al-Bayyinah', 'البينة', 8, ['bayyinah', 'clearevidence']],
  ['Az-Zalzalah', 'الزلزلة', 8, ['zalzalah', 'earthquake']],
  ['Al-Adiyat', 'العاديات', 11, ['adiyat', 'chargers']],
  ['Al-Qariah', 'القارعة', 11, ['qariah', 'calamity']],
  ['At-Takathur', 'التكاثر', 8, ['takathur', 'rivalry']],
  ['Al-Asr', 'العصر', 3, ['asr', 'decliningday']],
  ['Al-Humazah', 'الهمزة', 9, ['humazah', 'traducer']],
  ['Al-Fil', 'الفيل', 5, ['fil', 'elephant']],
  ['Quraysh', 'قريش', 4, ['quraish']],
  ['Al-Maun', 'الماعون', 7, ['maun', 'smallkindnesses']],
  ['Al-Kawthar', 'الكوثر', 3, ['kawthar', 'abundance']],
  ['Al-Kafirun', 'الكافرون', 6, ['kafirun', 'disbelievers']],
  ['An-Nasr', 'النصر', 3, ['nasr', 'divinehelp']],
  ['Al-Masad', 'المسد', 5, ['masad', 'lahab', 'palmfibre']],
  ['Al-Ikhlas', 'الإخلاص', 4, ['ikhlas', 'sincerity']],
  ['Al-Falaq', 'الفلق', 5, ['falaq', 'daybreak']],
  ['An-Nas', 'الناس', 6, ['nas', 'mankind']],
].map(([name, arabicName, ayahCount, aliases]) => ({ name, arabicName, ayahCount, aliases }));

export const SURAHS: readonly Surah[] = DEFINITIONS.map((definition, ordinal) => ({
  ...definition,
  number: ordinal + 1,
  ordinal,
}));

export function isSurahNumber(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= SURAHS.length;
}

export function getSurah(number: number): Surah {
  const surah = SURAHS[number - 1];
  if (!surah) throw new RangeError(`Unknown surah: ${String(number)}`);
  return surah;
}
