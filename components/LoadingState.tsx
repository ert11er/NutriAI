
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const LoadingState: React.FC = () => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [showLongWaitMessage, setShowLongWaitMessage] = useState(false); // New state for long wait message
  const messages = [
    "Vücut kitle indeksiniz hesaplanıyor...",
    "Günlük kalori ihtiyacınız analiz ediliyor...",
    "Size özel besin dağılımı yapılıyor...",
    "En uygun öğünler seçiliyor...",
    "Metabolizma hızınıza göre optimize ediliyor...",
    "Diyet planınız tamamlanmak üzere..."
  ];

  useEffect(() => {
    const messageTimer = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % messages.length);
    }, 2500);

    const longWaitTimer = setTimeout(() => {
      setShowLongWaitMessage(true);
    }, 30000); // Show additional message after 30 seconds

    return () => {
      clearInterval(messageTimer);
      clearTimeout(longWaitTimer);
    };
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-20"
    >
      <motion.div 
        animate={{ 
          scale: [1, 1.1, 1],
          rotate: [0, 5, -5, 0]
        }}
        transition={{ 
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="relative w-24 h-24 mb-8"
      >
        <div className="absolute inset-0 border-4 border-green-100 rounded-full"></div>
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 border-4 border-green-600 rounded-full border-t-transparent"
        ></motion.div>
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.i 
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="fas fa-apple-whole text-green-600 text-3xl"
          ></motion.i>
        </div>
      </motion.div>
      
      <h3 className="text-2xl font-bold text-green-900 mb-2">Planınız Hazırlanıyor</h3>
      
      <div className="h-6 overflow-hidden relative w-full flex justify-center">
        <AnimatePresence mode="wait">
          <motion.p 
            key={messageIndex}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="text-green-600 font-medium absolute"
          >
            {messages[messageIndex]}
          </motion.p>
        </AnimatePresence>
      </div>
      
      {showLongWaitMessage && (
        <motion.p 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-8 text-orange-600 font-medium text-center"
        >
          Bu işlem beklenenden uzun sürebilir. Lütfen sabırla bekleyiniz.
        </motion.p>
      )}

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-12 max-w-sm w-full bg-white p-6 rounded-2xl shadow-sm border border-green-50"
      >
        <div className="flex items-center gap-4">
          <motion.div 
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600"
          >
            <i className="fas fa-info-circle"></i>
          </motion.div>
          <p className="text-sm text-green-800 leading-tight">
            <strong>Biliyor muydunuz?</strong> Su içmek metabolizmanızı %30'a kadar hızlandırabilir.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default LoadingState;