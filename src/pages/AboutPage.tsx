import { useI18n } from '../lib/i18n';
import { href } from '../lib/router';
import { PORTFOLIO_URL } from '../lib/site';
import { Icon } from '../components/Icon';

const EN = [
  ['What FRONTIER is', 'A free, static website that follows public AI news. About every hour a GitHub Actions job reads a maintained list of RSS/Atom feeds from AI labs, research groups and technology media, and publishes the result as JSON files that this site reads. Visiting the site never triggers collection, translation or any AI call.'],
  ['What is stored', 'For each story: original headline, source, canonical link, original publication time, the time we first saw it, and a short excerpt supplied by the feed (never the full article). Always read the full story at the source.'],
  ['Duplicates and events', 'Stories with the same canonical URL are merged. Near-identical titles from one source are treated as duplicates. Coverage of the same event by different outlets is grouped so it can be shown as corroboration — company names alone never merge stories.'],
  ['How ranking works', 'Each story gets a deterministic 0–100 signal score: source tier 30%, independent coverage 25%, recency 20%, topic weight 15%, novelty 10%. Daily, Weekly and Monthly Picks take one story per event and limit repeats from the same source, company or category. The score is an editorial signal — it does not prove a story is true and it is not a popularity count.'],
  ['Images', 'Stories whose main subject is Claude/Anthropic, OpenAI or Gemini use fixed, unofficial editorial character illustrations commissioned for this site; they are not company mascots and not news photos. Other stories show the image the publisher supplied in its feed or page metadata, credited and linked; otherwise an abstract category graphic.'],
  ['Persian translation', 'New headlines and excerpts may be machine-translated offline on the GitHub runner with an open-source Argos Translate model. Translations can be wrong; the original English title and the source link are always available. If translation is unavailable, the original text is shown.'],
  ['Time and archive', 'Times are shown in your local timezone. Archive days are grouped by UTC date. "Data last updated" is when the stored data last changed — not when a story was published.'],
  ['Limits', 'Coverage is limited to the configured sources; feeds can fail, arrive late or omit images. GitHub may delay scheduled runs. Without an account, bookmarks and language choice are stored only in your browser; an optional account syncs them (see Accounts & privacy).'],
] as const;

const FA = [
  ['فرانتیر چیست', 'وب‌سایتی رایگان و ایستا برای دنبال کردن اخبار عمومی هوش مصنوعی. تقریباً هر ساعت یک کار در GitHub Actions فهرستی نگهداری‌شده از فیدهای RSS/Atom آزمایشگاه‌های هوش مصنوعی، گروه‌های پژوهشی و رسانه‌های فناوری را می‌خواند و نتیجه را به‌صورت فایل‌های JSON منتشر می‌کند. بازدید از سایت هیچ‌گاه باعث جمع‌آوری، ترجمه یا فراخوانی هوش مصنوعی نمی‌شود.'],
  ['چه چیزی ذخیره می‌شود', 'برای هر خبر: عنوان اصلی، منبع، پیوند اصلی، زمان انتشار اصلی، زمانی که ما نخستین بار آن را دیدیم، و خلاصه‌ای کوتاه که خود فید داده است (هرگز متن کامل مقاله). متن کامل را همیشه در منبع بخوانید.'],
  ['تکراری‌ها و رویدادها', 'خبرهایی با پیوند اصلی یکسان یکی می‌شوند. عنوان‌های تقریباً یکسان از یک منبع تکراری به شمار می‌آیند. پوشش یک رویداد در رسانه‌های مختلف گروه‌بندی می‌شود تا به‌عنوان پوشش مستقل نشان داده شود؛ نام شرکت به‌تنهایی هرگز خبرها را یکی نمی‌کند.'],
  ['رتبه‌بندی چگونه است', 'هر خبر امتیاز سیگنالی قطعی از ۰ تا ۱۰۰ می‌گیرد: ردهٔ منبع ۳۰٪، پوشش مستقل ۲۵٪، تازگی ۲۰٪، وزن موضوع ۱۵٪، نوآوری ۱۰٪. منتخب‌های روزانه، هفتگی و ماهانه از هر رویداد یک خبر برمی‌دارند و تکرار یک منبع، شرکت یا دسته را محدود می‌کنند. این امتیاز یک سیگنال ویراستارانه است؛ نه درستی خبر را ثابت می‌کند و نه شمارش محبوبیت است.'],
  ['تصاویر', 'خبرهایی که موضوع اصلی‌شان Claude/Anthropic، OpenAI یا Gemini است، از تصویرسازی‌های ثابت و غیررسمی این سایت استفاده می‌کنند؛ این‌ها نشان رسمی شرکت‌ها یا عکس خبری نیستند. سایر خبرها تصویری را نشان می‌دهند که ناشر در فید یا متادیتای صفحه داده است، همراه با اعتبار و پیوند؛ در غیر این صورت یک گرافیک انتزاعی دسته‌ای.'],
  ['ترجمهٔ فارسی', 'عنوان‌ها و خلاصه‌های جدید ممکن است به‌صورت آفلاین روی اجراکنندهٔ GitHub با مدل متن‌باز Argos Translate ترجمهٔ ماشینی شوند. ترجمه ممکن است اشتباه باشد؛ عنوان اصلی انگلیسی و پیوند منبع همیشه در دسترس است. اگر ترجمه در دسترس نباشد، متن اصلی نمایش داده می‌شود.'],
  ['زمان و آرشیو', 'زمان‌ها به وقت محلی شما نمایش داده می‌شوند. روزهای آرشیو بر اساس تاریخ UTC گروه‌بندی می‌شوند. «آخرین به‌روزرسانی داده» زمانی است که داده‌های ذخیره‌شده آخرین بار تغییر کرده‌اند، نه زمان انتشار خبر.'],
  ['محدودیت‌ها', 'پوشش محدود به منابع تنظیم‌شده است؛ فیدها ممکن است از کار بیفتند، دیر برسند یا تصویر نداشته باشند. GitHub ممکن است اجراهای زمان‌بندی‌شده را با تأخیر انجام دهد. بدون حساب، نشانک‌ها و انتخاب زبان فقط در مرورگر شما ذخیره می‌شوند؛ حساب اختیاری آن‌ها را همگام می‌کند (بخش حساب کاربری و حریم خصوصی).'],
] as const;

export function AboutPage() {
  const { t, locale } = useI18n();
  const sections = locale === 'fa' ? FA : EN;
  const creator =
    locale === 'fa'
      ? {
          kicker: 'سازنده / پرتفولیو',
          title: 'طراحی و ساخته‌شده توسط محمدامین صادقی',
          body: 'طراح معماری و دیتاسنتر با تمرکز بر زیرساخت، فناوری و تجربه‌های دیجیتال. برای دیدن پروژه‌های منتخب، روند طراحی و راه‌های ارتباطی، پرتفولیوی سازنده را ببینید.',
          action: 'مشاهدهٔ پرتفولیوی سازنده',
        }
      : {
          kicker: 'Creator / Portfolio',
          title: 'Designed and built by MohammadAmin Sadeghi',
          body: 'An architectural and data center designer working across infrastructure, technology and digital experiences. Visit the creator portfolio for selected projects, design process and contact details.',
          action: 'View creator portfolio',
        };
  return (
    <div className="page container-narrow prose-page">
      <header className="page-head">
        <p className="eyebrow">FRONTIER / METHOD</p>
        <h1 className="page-title">{t('about_title')}</h1>
      </header>
      {sections.map(([h, body]) => (
        <section key={h} className="prose-section">
          <h2>{h}</h2>
          <p>{body}</p>
        </section>
      ))}
      <section className="creator-card" aria-labelledby="creator-title">
        <div className="creator-identity">
          <span className="creator-monogram" aria-hidden="true">
            MS
          </span>
          <p className="creator-kicker">{creator.kicker}</p>
        </div>
        <h2 id="creator-title">{creator.title}</h2>
        <p>{creator.body}</p>
        <a className="creator-link" href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer">
          {creator.action}
          <Icon name="external" size={16} />
        </a>
      </section>
      <p>
        <a className="btn" href={href('/sources')}>
          {t('nav_sources')}
        </a>
      </p>
    </div>
  );
}
