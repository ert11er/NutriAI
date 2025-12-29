
import React from 'react';

interface HeaderProps {
  onReset: () => void;
  onToggleProgressTracker: () => void;
}

const Header: React.FC<HeaderProps> = ({ onReset, onToggleProgressTracker }) => {
  return (
    <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-green-100 shadow-sm no-print">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div 
          className="flex items-center gap-2 cursor-pointer"
          onClick={onReset}
          aria-label="Ana Sayfa ve Yeni Plan Oluştur"
        >
          <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center text-white">
            <i className="fas fa-leaf text-xl"></i>
          </div>
          <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-700 to-emerald-600">
            NutriAI
          </span>
        </div>
        
        <nav className="hidden md:flex items-center gap-8">
          <button onClick={onReset} className="text-green-800 font-medium hover:text-green-600 transition" aria-label="Yeni Plan Oluştur">Yeni Plan</button>
          <button onClick={onToggleProgressTracker} className="text-green-800 font-medium hover:text-green-600 transition" aria-label="İlerleme Takibi">İlerleme Takibi</button>
        </nav>

        <button className="md:hidden text-green-800" aria-label="Menüyü Aç">
          <i className="fas fa-bars text-xl"></i>
        </button>
      </div>
    </header>
  );
};

export default Header;