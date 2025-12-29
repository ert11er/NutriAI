
import React, { useState, useEffect } from 'react';

const LoadingState: React.FC = () => {
  const [messageIndex, setMessageIndex] = useState(0);
  const messages = [
    "Vücut kitle indeksiniz hesaplanıyor...",
    "Günlük kalori ihtiyacınız analiz ediliyor...",
    "Size özel besin dağılımı yapılıyor...",
    "En uygun öğünler seçiliyor...",
    "Metabolizma hızınıza göre optimize ediliyor...",
    "Diyet planınız tamamlanmak üzere..."
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % messages.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
      <div className="relative w-24 h-24 mb-8">
        <div className="absolute inset-0 border-4 border-green-100 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-green-600 rounded-full border-t-transparent animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <i className="fas fa-apple-whole text-green-600 text-3xl animate-pulse"></i>
        </div>
      </div>
      <h3 className="text-2xl font-bold text-green-900 mb-2">Planınız Hazırlanıyor</h3>
      <p className="text-green-600 font-medium animate-pulse">{messages[messageIndex]}</p>
      
      <div className="mt-12 max-w-sm w-full bg-white p-6 rounded-2xl shadow-sm border border-green-50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
            <i className="fas fa-info-circle"></i>
          </div>
          <p className="text-sm text-green-800 leading-tight">
            <strong>Biliyor muydunuz?</strong> Su içmek metabolizmanızı %30'a kadar hızlandırabilir.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoadingState;