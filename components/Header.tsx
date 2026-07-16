
import React, { useState, useEffect } from 'react';
import { translations } from '../src/translations';

interface HeaderProps {
  onReset: () => void;
  onToggleProgressTracker: () => void;
  onImportPlan: () => void;
}

const Header: React.FC<HeaderProps> = ({ onReset, onToggleProgressTracker, onImportPlan }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [lang, setLang] = useState<'tr' | 'en'>(() => (localStorage.getItem('lang') as 'tr' | 'en') || 'tr');

  const t = (key: any) => {
    const section = translations[lang];
    return (section as any)[key] || key;
  };

  useEffect(() => {
    const handleLanguageChange = () => {
      setLang((localStorage.getItem('lang') as 'tr' | 'en') || 'tr');
    };
    window.addEventListener('languageChange', handleLanguageChange);
    return () => window.removeEventListener('languageChange', handleLanguageChange);
  }, []);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(prev => !prev);
  };

  const handleMenuItemClick = (action: () => void) => {
    action();
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  return (
    <header className="bg-white sticky top-0 z-[100] border-b border-green-100 shadow-sm no-print">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div 
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => handleMenuItemClick(onReset)}
        >
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-white shadow-sm">
            <i className="fas fa-leaf text-sm"></i>
          </div>
          <span className="text-xl font-bold text-green-800 tracking-tight">NutriAI</span>
        </div>
        
        {/* Masaüstü Navigasyon */}
        <nav className="hidden md:flex items-center gap-6">
          <button onClick={() => handleMenuItemClick(onReset)} className="text-green-800 font-semibold hover:text-green-600 transition text-sm">{t('newPlan')}</button>
          <button onClick={() => handleMenuItemClick(onToggleProgressTracker)} className="text-green-800 font-semibold hover:text-green-600 transition text-sm">{t('progressTracker')}</button>
          <button onClick={() => handleMenuItemClick(onImportPlan)} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition text-sm shadow-md">
            <i className="fas fa-upload mr-2"></i> {t('importPlanBtn')}
          </button>
        </nav>

        {/* Mobil Menü Butonu */}
        <div className="flex gap-2 md:hidden">
          <button 
            onClick={() => {
              const newLang = lang === 'tr' ? 'en' : 'tr';
              setLang(newLang);
              localStorage.setItem('lang', newLang);
              // Dispatch event to notify other components
              window.dispatchEvent(new CustomEvent('languageChange'));
            }}
            className="w-10 h-10 flex items-center justify-center text-green-800 bg-green-50 rounded-xl font-bold text-xs"
            aria-label="Dili Değiştir"
          >
            {lang === 'tr' ? 'EN' : 'TR'}
          </button>
          <button 
            onClick={toggleMobileMenu} 
            className="w-10 h-10 flex items-center justify-center text-green-800 bg-green-50 rounded-xl"
            aria-label="Menü Aç"
          >
            <i className="fas fa-bars text-xl"></i>
          </button>
        </div>
      </div>

      {/* Mobil Menü Katmanı */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[99999] no-print">
          {/* Karartılmış Arka Plan */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={toggleMobileMenu}
          ></div>
          
          {/* Menü Paneli */}
          <div className="absolute top-0 right-0 w-[300px] h-full flex flex-col shadow-2xl mobile-panel-open safe-white-bg">
            {/* Başlık Bölümü */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 safe-white-bg">
              <span className="text-xl font-bold text-green-800 flex items-center gap-2">
                <i className="fas fa-leaf text-green-600"></i> {t('menuTitle')}
              </span>
              <button 
                onClick={toggleMobileMenu} 
                className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors"
                aria-label="Kapat"
              >
                <i className="fas fa-times text-2xl"></i>
              </button>
            </div>
            
            {/* Linkler Listesi */}
            <nav className="flex-grow p-4 space-y-3 safe-white-bg overflow-y-auto">
              <button 
                onClick={() => handleMenuItemClick(onToggleProgressTracker)} 
                className="w-full flex items-center gap-4 text-gray-900 text-lg font-bold p-5 rounded-2xl bg-blue-50/80 hover:bg-blue-100 text-blue-800 transition-all border border-blue-100/50 text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shrink-0">
                  <i className="fas fa-chart-line"></i>
                </div>
                <span>{t('progressTracker')}</span>
              </button>

              <button 
                onClick={() => handleMenuItemClick(onReset)} 
                className="w-full flex items-center gap-4 text-gray-900 text-lg font-bold p-5 rounded-2xl bg-green-50/80 hover:bg-green-100 text-green-800 transition-all border border-green-100/50 text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center text-white shadow-sm shrink-0">
                  <i className="fas fa-plus-circle"></i>
                </div>
                <span>{t('newDietPlanMenu')}</span>
              </button>
              
              <button 
                onClick={() => handleMenuItemClick(onImportPlan)} 
                className="w-full flex items-center gap-4 text-gray-900 text-lg font-bold p-5 rounded-2xl bg-purple-50/80 hover:bg-purple-100 text-purple-800 transition-all border border-purple-100/50 text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-sm shrink-0">
                  <i className="fas fa-upload"></i>
                </div>
                <span>{t('importPlanMenu')}</span>
              </button>
            </nav>

            {/* Alt Bilgi */}
            <div className="p-6 border-t border-gray-100 bg-green-50 mt-auto">
              <div className="flex items-center gap-3 text-green-700">
                <i className="fas fa-heartbeat text-xl"></i>
                <div>
                  <p className="font-bold text-sm">{t('stayHealthy')}</p>
                  <p className="text-xs opacity-80">{t('preparedBest')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
