/**
 * Site configuration for landing page, contact channels, and pricing tiers.
 * Easy to customize anytime.
 */

export const siteConfig = {
  name: 'BunaQR',
  tagline: {
    en: 'Your cafe menu, one scan away.',
    am: 'የካፌዎ ሜኑ፣ በአንድ ስካን ብቻ።',
  },
  subheading: {
    en: 'Customers scan, browse in their language, and order from their table. Your bartender gets every order instantly.',
    am: 'ደንበኞች ስካን ያደርጋሉ፣ በመረጡት ቋንቋ ይመለከታሉ፣ ከጠረጴዛቸው ያዛሉ። ባርቴንደርዎ እያንዳንዱን ትዕዛዝ ወዲያውኑ ይቀበላል።',
  },
  contact: {
    phone: '+251 91 123 4567',
    telegram: 'https://t.me/bunaqr_support',
    telegramHandle: '@bunaqr_support',
    email: 'contact@bunaqr.com',
    location: 'Addis Ababa, Ethiopia',
  },
  pricing: {
    badge: {
      en: 'Specialty Cafe Plans',
      am: 'ለካፌዎች የተዘጋጁ ዕቅዶች',
    },
    title: {
      en: 'Simple, transparent pricing',
      am: 'ቀላል እና ግልጽ ዋጋ',
    },
    teaserCard: {
      en: 'Contact us for a tailored setup or custom demo for your cafe.',
      am: 'ለካፌዎ የሚስማማውን ለማዘጋጀት ወይም የሙከራ ማሳያ ለማየት ያነጋግሩን።',
    },
    plans: [
      {
        id: 'starter',
        name: { en: 'Starter Cafe', am: 'ጀማሪ ካፌ' },
        price: '1,500 ETB',
        period: { en: '/ month', am: '/ በወር' },
        description: { en: 'Ideal for neighborhood coffee spots and specialty roasters.', am: 'ለአነስተኛ ቡና ቤቶችና ካፌዎች ተስማሚ።' },
        features: [
          { en: 'Up to 15 table QR codes', am: 'እስከ 15 የጠረጴዛ QR ኮዶች' },
          { en: 'English & Amharic menu', am: 'የእንግሊዝኛና አማርኛ ሜኑ' },
          { en: 'Live bartender order queue', am: 'የቀጥታ ትዕዛዝ መቀበያ' },
          { en: 'Audio order alert chime', am: 'የትዕዛዝ ድምፅ ማሳወቂያ' },
          { en: 'Digital menu updates anytime', am: 'በማንኛውም ሰዓት ዋጋ ማስተካከያ' },
        ],
        highlight: false,
      },
      {
        id: 'premium',
        name: { en: 'Specialty Pro', am: 'ስፔሻሊቲ ፕሮ' },
        price: '3,200 ETB',
        period: { en: '/ month', am: '/ በወር' },
        description: { en: 'For bustling cafes, restaurants, and multiple barista stations.', am: 'ለፈጣን ካፌዎች እና በርካታ ባሬስታ ላላቸው።' },
        features: [
          { en: 'Unlimited tables & QR codes', am: 'ያልተገደበ ጠረጴዛዎች እና QR' },
          { en: 'Multi-station routing (Bar & Kitchen)', am: 'የትዕዛዝ መለያየት (ባርና ማዕድ ቤት)' },
          { en: 'Custom branding & color themes', am: 'የራስዎ ብራንድና ቀለማት' },
          { en: 'Premium printable QR tent cards', am: 'የታተሙ ምርጥ የጠረጴዛ ካርዶች' },
          { en: 'Priority Telegram & phone support', am: 'ቀዳሚ የቴሌግራም ድጋፍ' },
        ],
        highlight: true,
      },
    ],
  },
  faq: [
    {
      q: {
        en: 'Do customers need to install an app?',
        am: 'ደንበኞች አፕሊኬሽን መጫን ያስፈልጋቸዋል?',
      },
      a: {
        en: 'No! Customers simply open their regular phone camera (iPhone or Android), scan the QR code on the table, and the menu opens instantly in their browser.',
        am: 'ፈጽሞ አያስፈልግም! ደንበኞች በስልካቸው ካሜራ የጠረጴዛውን QR ኮድ ስካን ሲያደርጉ ሜኑው ወዲያውኑ በስልካቸው ብሮውዘር ይከፈታል።',
      },
    },
    {
      q: {
        en: 'Can we change prices and items ourselves?',
        am: 'ዋጋዎችንና የምግብ ዝርዝሮችን እራሳችን መቀየር እንችላለን?',
      },
      a: {
        en: 'Yes. Your admin dashboard lets you change prices, hide sold-out items, or add new seasonal drinks in seconds from any phone or laptop.',
        am: 'አዎ። በአድሚን ገጽዎ አማካኝነት በሰከንዶች ውስጥ ዋጋ መቀየር፣ ያለቁ ነገሮችን ማጥፋት ወይም አዳዲስ መጠጦችን መጨመር ይችላሉ።',
      },
    },
    {
      q: {
        en: 'Does it work fully in Amharic?',
        am: 'በአማርኛ ቋንቋ ሙሉ በሙሉ ይሰራል?',
      },
      a: {
        en: 'Yes! Every screen has native typography support for Noto Sans Ethiopic with balanced line heights, allowing customers and staff to switch seamlessly between English and Amharic.',
        am: 'አዎ! እያንዳንዱ ገጽ አማርኛን በሚገባ በሚያሳይ ጽሑፍ የተቀረጸ ሲሆን ደንበኞችም ሆኑ ሰራተኞች በቀላሉ በፈለጉት ቋንቋ መጠቀም ይችላሉ።',
      },
    },
    {
      q: {
        en: 'How do payments work?',
        am: 'ክፍያ እንዴት ነው የሚፈጸመው?',
      },
      a: {
        en: 'Orders sent from tables are confirmed with table numbers. Waiters or bartenders collect payment via Telebirr, CBE Birr, or cash as usual upon delivery or at the counter.',
        am: 'ትዕዛዙ ከጠረጴዛው ቁጥር ጋር ለባርቴንደሩ ይደርሳል። ክፍያውን እንደተለመደው በቴሌብር፣ በሲቢኢ ብር ወይም በጥሬ ገንዘብ ማስተናገድ ይችላሉ።',
      },
    },
    {
      q: {
        en: 'What if the internet drops momentarily?',
        am: 'ኢንተርኔት ለጊዜው ቢቋረጥስ?',
      },
      a: {
        en: 'The system uses lightweight caching and automatic reconnection. As soon as the network restores, all pending states sync automatically.',
        am: 'ስርዓቱ ፈጣንና አነስተኛ ዳታ የሚጠቀም ሲሆን፣ ኢንተርኔት እንደተመለሰ ወዲያውኑ ያለ ምንም መቆራረጥ ስራውን ይቀጥላል።',
      },
    },
    {
      q: {
        en: 'Can we use our own cafe colors and logo?',
        am: 'የራሳችንን የካፌ ቀለሞችና ሎጎ መጠቀም እንችላለን?',
      },
      a: {
        en: 'Absolutely. Upload your logo, cover photo, choose your brand colors, and set your cafe schedule in the admin settings.',
        am: 'በእርግጥ። የራስዎን ሎጎ፣ ፎቶ እና የሚወዱትን የቀለም ገጽታ በቀላሉ ማስተካከል ይችላሉ።',
      },
    },
  ],
};
