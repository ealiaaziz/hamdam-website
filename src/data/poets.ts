import portraitHafez from '../assets/website-redesign/poet-hafez.png';
import portraitRumi from '../assets/website-redesign/poet-rumi.png';
import portraitSaadi from '../assets/website-redesign/poet-saadi.png';
import portraitKhayyam from '../assets/website-redesign/poet-khayyam.png';
import portraitParvin from '../assets/website-redesign/poet-parvin.png';

export const poets = [
  {
    persianName: 'حافظ',
    transliteration: 'Hafez',
    description: 'The tavern of the seeker. Where wine and mirror share the same table.',
    descriptionFa: 'میخانه‌ی جوینده. جایی که می و آینه بر یک سفره‌اند.',
    portrait: portraitHafez,
  },
  {
    persianName: 'رومی',
    transliteration: 'Rumi',
    description: "The reed's song. Longing as its own kind of arrival.",
    descriptionFa: 'نوای نی. اشتیاق، خود گونه‌ای از رسیدن است.',
    portrait: portraitRumi,
  },
  {
    persianName: 'سعدی',
    transliteration: 'Saadi',
    description: 'The garden and the road. Wisdom, gently offered.',
    descriptionFa: 'باغ و جاده. حکمتی که به‌آرامی هدیه می‌شود.',
    portrait: portraitSaadi,
  },
  {
    persianName: 'خیام',
    transliteration: 'Khayyam',
    description: 'The rose and the wine cup. What is here is what there is.',
    descriptionFa: 'گل و جام می. آنچه هست، همین است که هست.',
    portrait: portraitKhayyam,
  },
  {
    persianName: 'پروین',
    transliteration: 'Parvin',
    description: 'Small things speak. The needle, the ant, the mirror — all with lessons.',
    descriptionFa: 'چیزهای کوچک سخن می‌گویند. سوزن، مورچه، آینه — همه با درسی.',
    portrait: portraitParvin,
  },
] as const;
