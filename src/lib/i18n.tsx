import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { runTransition } from './motion';
import type { CategoryId, Locale, PickWindow } from './types';

const en = {
  brand: 'FRONTIER',
  tagline: 'News from the frontier of technology',
  skipToContent: 'Skip to news',
  nav_home: 'Top Signals',
  nav_picks: 'Picks',
  nav_daily: 'Daily',
  nav_weekly: 'Weekly',
  nav_monthly: 'Monthly',
  nav_explore: 'Explore',
  nav_categories: 'Categories',
  nav_archive: 'Archive',
  nav_saved: 'Saved',
  nav_about: 'Method',
  nav_sources: 'Sources',
  nav_search: 'Search',
  nav_menu: 'Menu',
  nav_more: 'More',
  menu_daily_d: "The day's top-ranked stories",
  menu_weekly_d: "The week's strongest signals",
  menu_monthly_d: 'The month in review',
  menu_archive_d: 'Every collected day, newest first',
  menu_sources_d: 'The feeds the collector reads',
  menu_about_d: 'How stories are ranked',
  theme_to_light: 'Switch to light theme',
  theme_to_dark: 'Switch to dark theme',
  card_read: 'Read',
  lang_switch: 'فارسی',
  lang_switch_label: 'Switch language to Persian',
  hero_title: 'THE WORLD IS CHANGING.',
  hero_sub: 'TRACK THE SIGNAL.',
  hero_body:
    'FRONTIER collects AI news from public RSS feeds and official sources about every hour, removes duplicates, and ranks stories with an open, deterministic formula.',
  hero_kicker: 'AI news intelligence',
  latest_news: 'Latest News',
  weekly_brief: 'Weekly Brief',
  weekly_brief_sub: "The week's highest-ranked stories, by signal score.",
  view_all: 'View all',
  filter_by_category: 'Filter stories by category',
  filter_empty: 'No stories in this category on this page.',
  also_ranking: 'Also ranking',
  signal_status: 'Signal status',
  feat_sources: 'Global public sources',
  feat_hourly: 'Hourly updates',
  feat_nopaid: 'No paid AI APIs',
  search_shortcut: 'Press / to search',
  intro_kicker: 'News from the frontier of technology',
  intro_body:
    'AI first, then data centers, chips and whatever comes next. One calm place to follow it in English and Persian, from public sources, ranked by an open formula.',
  intro_meta: 'Updated every hour · English & Persian · Free, no ads',
  intro_scroll: 'Scroll',
  follow_kicker: 'Your feed',
  follow_title: 'Choose what you follow',
  follow_sub: 'Pick any topics. Their stories come first on this page. Your choice stays on this device; sign in to keep it everywhere.',
  follow_clear: 'Clear choices',
  follow_skip: 'Skip to the news',
  hero_up_next: 'Up next',
  hero_label: 'Featured stories',
  hero_loading: 'Loading featured stories',
  hero_prev: 'Previous story',
  hero_next: 'Next story',
  hero_story: 'Story {n} of {total}',
  hero_read: 'Read full story',
  hero_slides_pause: 'Pause slideshow',
  hero_slides_play: 'Start slideshow',
  wall_title: 'Signal wall',
  wall_sub: 'The latest headlines drift past. Hover or focus to pause.',
  wall_label: 'Latest headlines',
  top_signals: 'Top Signals',
  picks_daily: 'Daily Picks',
  picks_weekly: 'Weekly Picks',
  picks_monthly: 'Monthly Picks',
  picks_note:
    'Algorithmically ranked editorial signals: source tier, independent coverage, recency, topic and novelty. Not a verdict on truth and not a popularity count.',
  picks_empty: 'No stories in this window yet.',
  picks_window: 'Window',
  today: 'Today',
  yesterday: 'Yesterday',
  day_empty: 'No stories stored for this day yet.',
  stories: 'stories',
  story: 'story',
  page: 'Page',
  of: 'of',
  newer: 'Newer',
  older: 'Older',
  pagination: 'Archive pages',
  page1_note: 'Page 1 shows today and yesterday. Older pages hold earlier archive days.',
  archive_title: 'Archive',
  archive_intro: 'Every stored day, grouped by UTC date. Open a day to see its stories, newest first.',
  archive_empty: 'The archive is empty. The collector has not stored any stories yet.',
  open_day: 'Open day',
  explore_title: 'Explore',
  search_placeholder: 'Search titles, sources, companies, models…',
  search_label: 'Search stories',
  filter_category: 'Category',
  filter_source: 'Source',
  filter_brand: 'Company',
  filter_from: 'From',
  filter_to: 'To',
  filter_all: 'All',
  filter_reset: 'Reset filters',
  results: 'results',
  no_results: 'No stories match these filters.',
  search_window: 'Search covers the last {n} days. Older stories stay in the archive.',
  saved_title: 'Saved stories',
  saved_note: 'Bookmarks are stored only in this browser on this device. They are not synced or sent anywhere.',
  saved_empty: 'You have not saved any stories yet.',
  save: 'Save story',
  unsave: 'Remove from saved',
  read_source: 'Read at source',
  published: 'Published',
  fetched: 'Collected',
  date_estimated: 'Source gave no date; collection time shown',
  source: 'Source',
  category: 'Category',
  language: 'Language',
  related: 'Also covered by',
  score: 'Signal score',
  score_explain: 'How this score is built',
  score_reliability: 'Source tier',
  score_corroboration: 'Independent coverage',
  score_recency: 'Recency',
  score_topic: 'Topic weight',
  score_novelty: 'Novelty',
  back: 'Back',
  story_missing: 'This story could not be found. It may have moved to another day or been removed.',
  last_update: 'Data last updated',
  never_updated: 'No data collected yet',
  times_local: 'Times in your local timezone · days grouped in UTC',
  loading: 'Loading…',
  load_failed: 'Could not load data. Check your connection and try again.',
  retry: 'Retry',
  no_data_title: 'Waiting for the first collection run',
  no_data_body: 'The news collector has not published data yet. It runs on GitHub Actions about every hour.',
  mock_banner: 'MOCK DATA — generated fixtures for development. These are not real news stories.',
  translation_machine: 'Machine translation (offline, may be imperfect)',
  translation_missing: 'Not translated yet — original English shown',
  original_title: 'Original title',
  brand_art_note: 'Unofficial editorial illustration',
  image_credit: 'Image',
  publisher_image: "Publisher's image",
  sources_title: 'Sources',
  sources_intro: 'Feeds the collector reads. A source is marked verified only after a real pipeline run fetched it successfully.',
  status_ok: 'Working',
  status_error: 'Failing',
  status_disabled: 'Disabled',
  status_unverified: 'Not verified',
  verified_on: 'Verified',
  tier: 'Tier',
  failed_sources: 'source(s) failed on the last run',
  about_title: 'Method',
  footer_note: 'Headlines, excerpts and images belong to their publishers and link back to the original. FRONTIER stores only short excerpts.',
  footer_cost: 'No paid APIs. Static site on GitHub Pages.',
  not_found: 'Page not found',
  go_home: 'Go to Top Signals',
  pick_rank: 'Rank',
  sources_count: 'sources',
} as const;

export type MessageKey = keyof typeof en;

const fa: Record<MessageKey, string> = {
  brand: 'فرانتیر',
  tagline: 'خبر از مرز فناوری',
  skipToContent: 'رفتن به اخبار',
  nav_home: 'سیگنال‌های برتر',
  nav_picks: 'منتخب‌ها',
  nav_daily: 'روزانه',
  nav_weekly: 'هفتگی',
  nav_monthly: 'ماهانه',
  nav_explore: 'کاوش',
  nav_categories: 'دسته‌ها',
  nav_archive: 'آرشیو',
  nav_saved: 'ذخیره‌ها',
  nav_about: 'روش',
  nav_sources: 'منابع',
  nav_search: 'جستجو',
  nav_menu: 'منو',
  nav_more: 'بیشتر',
  menu_daily_d: 'برترین خبرهای امروز',
  menu_weekly_d: 'قوی‌ترین سیگنال‌های هفته',
  menu_monthly_d: 'مروری بر ماه',
  menu_archive_d: 'همهٔ روزهای جمع‌آوری‌شده، تازه‌ترین اول',
  menu_sources_d: 'فیدهایی که گردآورنده می‌خواند',
  menu_about_d: 'شیوهٔ رتبه‌بندی خبرها',
  theme_to_light: 'تغییر به تم روشن',
  theme_to_dark: 'تغییر به تم تیره',
  card_read: 'خواندن',
  lang_switch: 'English',
  lang_switch_label: 'تغییر زبان به انگلیسی',
  hero_title: 'THE WORLD IS CHANGING.',
  hero_sub: 'TRACK THE SIGNAL.',
  hero_body:
    'فرانتیر تقریباً هر ساعت اخبار هوش مصنوعی را از فیدهای عمومی RSS و منابع رسمی جمع می‌کند، موارد تکراری را حذف می‌کند و با فرمولی باز و قطعی رتبه‌بندی می‌کند.',
  hero_kicker: 'رصد هوشمند اخبار هوش مصنوعی',
  latest_news: 'تازه‌ترین اخبار',
  weekly_brief: 'خلاصهٔ هفته',
  weekly_brief_sub: 'پررتبه‌ترین خبرهای هفته بر اساس امتیاز سیگنال.',
  view_all: 'مشاهدهٔ همه',
  filter_by_category: 'فیلتر اخبار بر اساس دسته',
  filter_empty: 'در این صفحه خبری از این دسته نیست.',
  also_ranking: 'رتبه‌های بعدی',
  signal_status: 'وضعیت سیگنال',
  feat_sources: 'منابع عمومی جهانی',
  feat_hourly: 'به‌روزرسانی ساعتی',
  feat_nopaid: 'بدون API پولی هوش مصنوعی',
  search_shortcut: 'برای جستجو / را بزنید',
  intro_kicker: 'خبر از مرز فناوری',
  intro_body:
    'اول هوش مصنوعی، بعد دیتا سنتر، تراشه و هر چه بعدتر می‌آید. یک جای آرام برای دنبال کردنشان به فارسی و انگلیسی، از منابع عمومی و با رتبه‌بندی بر پایهٔ فرمولی باز.',
  intro_meta: 'به‌روزرسانی هر ساعت · فارسی و انگلیسی · رایگان و بدون تبلیغ',
  intro_scroll: 'پایین بروید',
  follow_kicker: 'فید شما',
  follow_title: 'انتخاب کنید چه چیزی را دنبال کنید',
  follow_sub:
    'هر تعداد موضوع که می‌خواهید انتخاب کنید؛ خبرهای آن‌ها در این صفحه اول می‌آید. انتخاب شما روی همین دستگاه می‌ماند؛ با ورود به حساب همه‌جا همراهتان است.',
  follow_clear: 'پاک کردن انتخاب‌ها',
  follow_skip: 'رفتن به خبرها',
  hero_up_next: 'خبر بعدی',
  hero_label: 'خبرهای ویژه',
  hero_loading: 'در حال بارگذاری خبرهای ویژه',
  hero_prev: 'خبر قبلی',
  hero_next: 'خبر بعدی',
  hero_story: 'خبر {n} از {total}',
  hero_read: 'خواندن کامل خبر',
  hero_slides_pause: 'توقف نمایش خودکار',
  hero_slides_play: 'شروع نمایش خودکار',
  wall_title: 'دیوار سیگنال',
  wall_sub: 'تازه‌ترین تیترها در جریان‌اند. با نگه داشتن نشانگر یا فوکوس متوقف می‌شوند.',
  wall_label: 'تازه‌ترین تیترها',
  top_signals: 'سیگنال‌های برتر',
  picks_daily: 'منتخب روز',
  picks_weekly: 'منتخب هفته',
  picks_monthly: 'منتخب ماه',
  picks_note:
    'سیگنال‌هایی که با الگوریتم رتبه‌بندی شده‌اند: اعتبار منبع، پوشش مستقل، تازگی، اهمیت موضوع و نوآوری. این رتبه نه حکمی دربارهٔ درستی خبر است و نه شمارش محبوبیت.',
  picks_empty: 'هنوز خبری در این بازه نیست.',
  picks_window: 'بازه',
  today: 'امروز',
  yesterday: 'دیروز',
  day_empty: 'هنوز خبری برای این روز ذخیره نشده است.',
  stories: 'خبر',
  story: 'خبر',
  page: 'صفحه',
  of: 'از',
  newer: 'جدیدتر',
  older: 'قدیمی‌تر',
  pagination: 'صفحات آرشیو',
  page1_note: 'صفحهٔ ۱ اخبار امروز و دیروز را نشان می‌دهد. صفحات بعدی روزهای قدیمی‌تر آرشیو هستند.',
  archive_title: 'آرشیو',
  archive_intro: 'همهٔ روزهای ذخیره‌شده، بر اساس تاریخ UTC. هر روز را باز کنید تا اخبارش را از جدید به قدیم ببینید.',
  archive_empty: 'آرشیو خالی است. گردآورنده هنوز خبری ذخیره نکرده است.',
  open_day: 'باز کردن روز',
  explore_title: 'کاوش',
  search_placeholder: 'جستجو در عنوان، منبع، شرکت، مدل…',
  search_label: 'جستجوی اخبار',
  filter_category: 'دسته',
  filter_source: 'منبع',
  filter_brand: 'شرکت',
  filter_from: 'از',
  filter_to: 'تا',
  filter_all: 'همه',
  filter_reset: 'پاک کردن فیلترها',
  results: 'نتیجه',
  no_results: 'خبری با این فیلترها پیدا نشد.',
  search_window: 'جستجو {n} روز اخیر را پوشش می‌دهد. اخبار قدیمی‌تر در آرشیو می‌مانند.',
  saved_title: 'اخبار ذخیره‌شده',
  saved_note: 'نشانک‌ها فقط در همین مرورگر و همین دستگاه ذخیره می‌شوند و جایی ارسال یا همگام نمی‌شوند.',
  saved_empty: 'هنوز خبری ذخیره نکرده‌اید.',
  save: 'ذخیرهٔ خبر',
  unsave: 'حذف از ذخیره‌ها',
  read_source: 'خواندن در منبع',
  published: 'انتشار',
  fetched: 'دریافت',
  date_estimated: 'منبع تاریخی نداد؛ زمان دریافت نمایش داده شده است',
  source: 'منبع',
  category: 'دسته',
  language: 'زبان',
  related: 'پوشش در منابع دیگر',
  score: 'امتیاز سیگنال',
  score_explain: 'این امتیاز چگونه ساخته می‌شود',
  score_reliability: 'ردهٔ منبع',
  score_corroboration: 'پوشش مستقل',
  score_recency: 'تازگی',
  score_topic: 'وزن موضوع',
  score_novelty: 'نوآوری',
  back: 'بازگشت',
  story_missing: 'این خبر پیدا نشد. ممکن است به روز دیگری منتقل یا حذف شده باشد.',
  last_update: 'آخرین به‌روزرسانی داده',
  never_updated: 'هنوز داده‌ای جمع نشده است',
  times_local: 'زمان‌ها به وقت محلی شما · روزها بر اساس UTC',
  loading: 'در حال بارگذاری…',
  load_failed: 'بارگذاری داده ممکن نشد. اتصال را بررسی کنید و دوباره تلاش کنید.',
  retry: 'تلاش دوباره',
  no_data_title: 'در انتظار نخستین اجرای گردآوری',
  no_data_body: 'گردآورندهٔ اخبار هنوز داده‌ای منتشر نکرده است. این فرایند تقریباً هر ساعت در GitHub Actions اجرا می‌شود.',
  mock_banner: 'دادهٔ آزمایشی — نمونه‌های ساختگی برای توسعه. این‌ها خبر واقعی نیستند.',
  translation_machine: 'ترجمهٔ ماشینی آفلاین؛ ممکن است دقیق نباشد',
  translation_missing: 'هنوز ترجمه نشده؛ متن اصلی انگلیسی نمایش داده می‌شود',
  original_title: 'عنوان اصلی',
  brand_art_note: 'تصویرسازی ادیتوریال غیررسمی',
  image_credit: 'تصویر',
  publisher_image: 'تصویر ناشر',
  sources_title: 'منابع',
  sources_intro: 'فیدهایی که گردآورنده می‌خواند. منبع فقط پس از دریافت موفق در یک اجرای واقعی «تأییدشده» علامت می‌خورد.',
  status_ok: 'فعال',
  status_error: 'خطا',
  status_disabled: 'غیرفعال',
  status_unverified: 'تأییدنشده',
  verified_on: 'تأیید',
  tier: 'رده',
  failed_sources: 'منبع در آخرین اجرا خطا داشت',
  about_title: 'روش کار',
  footer_note: 'عنوان‌ها، خلاصه‌ها و تصاویر متعلق به ناشران اصلی‌اند و به منبع پیوند دارند. فرانتیر فقط خلاصه‌های کوتاه نگه می‌دارد.',
  footer_cost: 'بدون API پولی. سایت ایستا روی GitHub Pages.',
  not_found: 'صفحه پیدا نشد',
  go_home: 'رفتن به سیگنال‌های برتر',
  pick_rank: 'رتبه',
  sources_count: 'منبع',
};

const CATEGORY_LABELS: Record<Locale, Record<CategoryId, string>> = {
  en: {
    models: 'Models',
    research: 'Research',
    products: 'Products',
    business: 'Business',
    policy: 'Policy',
    'open-source': 'Open Source',
    hardware: 'Hardware',
    safety: 'Safety',
  },
  fa: {
    models: 'مدل‌ها',
    research: 'پژوهش',
    products: 'محصولات',
    business: 'کسب‌وکار',
    policy: 'سیاست‌گذاری',
    'open-source': 'متن‌باز',
    hardware: 'سخت‌افزار',
    safety: 'ایمنی',
  },
};

export const MESSAGES: Record<Locale, Record<MessageKey, string>> = { en, fa };

export function translate(locale: Locale, key: MessageKey, vars?: Record<string, string | number>): string {
  let s = MESSAGES[locale][key] ?? MESSAGES.en[key];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}

export function categoryLabel(locale: Locale, id: CategoryId): string {
  return CATEGORY_LABELS[locale][id] ?? id;
}

const CATEGORY_DESCRIPTIONS: Record<Locale, Record<CategoryId, string>> = {
  en: {
    models: 'Model releases and updates',
    research: 'Papers, benchmarks and labs',
    products: 'Apps, tools and launches',
    business: 'Funding, deals and strategy',
    policy: 'Regulation and government',
    'open-source': 'Open weights and community code',
    hardware: 'Chips, compute and data centres',
    safety: 'Alignment, security and risk',
  },
  fa: {
    models: 'عرضه و به‌روزرسانی مدل‌ها',
    research: 'مقاله‌ها، بنچمارک‌ها و آزمایشگاه‌ها',
    products: 'اپ‌ها، ابزارها و عرضه‌ها',
    business: 'سرمایه‌گذاری، قراردادها و راهبرد',
    policy: 'قانون‌گذاری و دولت‌ها',
    'open-source': 'وزن‌های باز و کد جامعه',
    hardware: 'تراشه، توان محاسباتی و مراکز داده',
    safety: 'همسویی، امنیت و ریسک',
  },
};

export function categoryDescription(locale: Locale, id: CategoryId): string {
  return CATEGORY_DESCRIPTIONS[locale][id] ?? '';
}

export function pickWindowLabel(locale: Locale, w: PickWindow): string {
  const key = ({ daily: 'picks_daily', weekly: 'picks_weekly', monthly: 'picks_monthly' } as const)[w];
  return translate(locale, key);
}

export const dirFor = (locale: Locale): 'rtl' | 'ltr' => (locale === 'fa' ? 'rtl' : 'ltr');

const STORAGE_KEY = 'signal-ai:locale';

export function readStoredLocale(): Locale | null {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === 'fa' || v === 'en' ? v : null;
  } catch {
    return null;
  }
}

export function initialLocale(): Locale {
  const stored = readStoredLocale();
  if (stored) return stored;
  const nav = typeof navigator !== 'undefined' ? navigator.language : 'en';
  return nav.toLowerCase().startsWith('fa') ? 'fa' : 'en';
}

interface I18nValue {
  locale: Locale;
  dir: 'rtl' | 'ltr';
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  setLocale: (l: Locale) => void;
  toggle: () => void;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children, initial }: { children: ReactNode; initial?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(() => initial ?? initialLocale());

  // Layout effect: inside a language view transition the new direction must be on <html> before the new snapshot.
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = dirFor(locale);
    try {
      window.localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* storage may be unavailable (private mode); language still works for this visit */
    }
  }, [locale]);

  // A short cross-fade between the two layouts (RTL ↔ LTR) instead of a jump; instant without view transitions.
  const setLocale = useCallback((l: Locale) => runTransition(() => setLocaleState(l), 'lang'), []);
  const toggle = useCallback(() => runTransition(() => setLocaleState((l) => (l === 'en' ? 'fa' : 'en')), 'lang'), []);
  const value = useMemo<I18nValue>(
    () => ({ locale, dir: dirFor(locale), t: (k, v) => translate(locale, k, v), setLocale, toggle }),
    [locale, setLocale, toggle],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
