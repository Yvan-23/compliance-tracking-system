import { useTranslation } from '../contexts/LanguageContext';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher({ className = '' }) {
  const { lang, switchLang } = useTranslation();

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Globe className="w-4 h-4 text-gray-400" />
      <button
        onClick={() => switchLang('en')}
        className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
          lang === 'en'
            ? 'bg-[#005387] text-white'
            : 'text-[#005387] hover:bg-[#005387]/10'
        }`}
      >
        EN
      </button>
      <span className="text-gray-300 text-xs">|</span>
      <button
        onClick={() => switchLang('rw')}
        className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
          lang === 'rw'
            ? 'bg-[#005387] text-white'
            : 'text-[#005387] hover:bg-[#005387]/10'
        }`}
      >
        RW
      </button>
    </div>
  );
}
