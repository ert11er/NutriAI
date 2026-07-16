import React, { useState, useEffect } from 'react';

interface HeaderProps {
  onReset: () => void;
}

const Header: React.FC<HeaderProps> = ({ onReset }) => {
  const [lang, setLang] = useState<'tr' | 'en'>(() => (localStorage.getItem('lang') as 'tr' | 'en') || 'tr');

  useEffect(() => {
    const handleLanguageChange = () => {
      setLang((localStorage.getItem('lang') as 'tr' | 'en') || 'tr');
    };
    window.addEventListener('languageChange', handleLanguageChange);
    return () => window.removeEventListener('languageChange', handleLanguageChange);
  }, []);

  return (
    <header className="bg-white sticky top-0 z-[100] border-b border-green-100 shadow-sm no-print">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div 
          className="flex items-center gap-2 cursor-pointer select-none active:scale-95 transition-transform"
          onClick={onReset}
        >
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white shadow-sm">
            <i className="fas fa-leaf text-sm"></i>
          </div>
          <span className="text-xl font-bold text-green-800 tracking-tight">NutriAI</span>
        </div>
        
        {/* Language Toggle Button */}
        <div>
          <button 
            onClick={() => {
              const newLang = lang === 'tr' ? 'en' : 'tr';
              setLang(newLang);
              localStorage.setItem('lang', newLang);
              window.dispatchEvent(new CustomEvent('languageChange'));
            }}
            className="w-10 h-10 flex items-center justify-center text-green-800 bg-green-50 hover:bg-green-100 transition rounded-xl font-bold text-xs"
            aria-label="Change Language"
          >
            {lang === 'tr' ? 'EN' : 'TR'}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
