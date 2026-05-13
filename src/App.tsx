import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Copy, RefreshCw, Shuffle, Check } from 'lucide-react';
import { MOODS, QUOTES } from './quotes';

function useTypingEffect(text: string, speed = 25) {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    let i = 0;
    setDisplayedText('');
    const timer = setInterval(() => {
      setDisplayedText(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(timer);
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);
  
  return displayedText;
}

export default function App() {
  const [mood, setMood] = useState<string>(() => {
    return localStorage.getItem('moodQuote_lastMood') || MOODS[0].id;
  });
  
  const [quote, setQuote] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  
  const currentMoodData = useMemo(() => MOODS.find(m => m.id === mood) || MOODS[0], [mood]);
  const typedQuote = useTypingEffect(quote);

  const totalQuotesCount = useMemo(() => {
    return Object.values(QUOTES).reduce((acc, curr) => acc + curr.length, 0);
  }, []);

  const getRandomQuote = useCallback((selectedMood: string) => {
    const list = QUOTES[selectedMood];
    if (!list) return '';
    const randomIndex = Math.floor(Math.random() * list.length);
    return list[randomIndex];
  }, []);

  const handleGenerate = useCallback(() => {
    let newQuote = getRandomQuote(mood);
    // basic check to reduce repeating the same quote immediately
    if (newQuote === quote && QUOTES[mood]?.length > 1) {
      newQuote = getRandomQuote(mood);
    }
    setQuote(newQuote);
  }, [mood, quote, getRandomQuote]);

  const handleShuffle = () => {
    const randomMoodIndex = Math.floor(Math.random() * MOODS.length);
    const newMood = MOODS[randomMoodIndex].id;
    setMood(newMood);
    const newQuote = getRandomQuote(newMood);
    setQuote(newQuote);
  };

  const handleCopy = async () => {
    if (!quote) return;
    try {
      await navigator.clipboard.writeText(`"${quote}"\n\n— Kata kata Hari ini`);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleDownload = async () => {
    if (!quote || !currentMoodData) return;
    
    // Load custom fonts by awaiting document.fonts.ready for canvas rendering to be correct
    await document.fonts.ready;
    
    const canvas = document.createElement('canvas');
    const size = 1080;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Background (Solid Dark)
    ctx.fillStyle = '#0f172a'; // tailwind slate-900
    ctx.fillRect(0, 0, size, size);

    // 2. Add some "glow" blobs in the background representing the mood color
    ctx.filter = 'blur(100px)';
    ctx.fillStyle = currentMoodData.lightColor + '40';
    ctx.beginPath();
    ctx.arc(size / 4, size / 4, 300, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(size * 0.75, size * 0.75, 200, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.filter = 'none';

    // 3. Glassmorphism Card
    const padding = Math.floor(size * 0.1);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 50;
    ctx.shadowOffsetY = 20;
    
    // Semi-transparent rect
    ctx.fillStyle = currentMoodData.lightColor + '10'; // 10% opacity hex
    ctx.strokeStyle = currentMoodData.lightColor + '50';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.roundRect(padding, padding, size - padding * 2, size - padding * 2, 40);
    ctx.fill();
    ctx.stroke();
    
    ctx.shadowColor = 'transparent';

    // 4. Emoji
    ctx.font = '80px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(currentMoodData.emoji, size / 2, padding + 100);

    // 5. Quote Text Wrapper
    ctx.font = 'bold 52px "Outfit", sans-serif';
    ctx.fillStyle = '#ffffff';
    
    const maxWidth = size - padding * 4;
    const words = quote.split(' ');
    let line = '';
    const lines = [];
    
    for (const word of words) {
      const testLine = line + word + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line !== '') {
        lines.push(line.trim());
        line = word + ' ';
      } else {
        line = testLine;
      }
    }
    lines.push(line.trim());

    // Calculate Y to center text vertically
    const lineHeight = 75;
    const textHeight = lines.length * lineHeight;
    const startY = (size / 2) - (textHeight / 2) + 60;
    
    lines.forEach((l, i) => {
      ctx.fillText(l, size / 2, startY + (i * lineHeight));
    });

    // 6. Mood Label
    ctx.font = '600 32px "Inter", sans-serif';
    ctx.fillStyle = currentMoodData.lightColor;
    ctx.fillText(`— ${currentMoodData.label} —`, size / 2, size - padding - 80);

    // 7. Watermark
    ctx.font = '400 24px "Inter", sans-serif';
    ctx.fillStyle = '#64748b'; // slate-500
    ctx.fillText('Generated by Kata kata Hari ini', size / 2, size - 40);

    // 8. Download Triger
    const link = document.createElement('a');
    link.download = `mood-${currentMoodData.id}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  useEffect(() => {
    localStorage.setItem('moodQuote_lastMood', mood);
    // Only set initial quote if it's empty
    if (!quote) setQuote(getRandomQuote(mood));
  }, [mood, quote, getRandomQuote]);

  // Handle Mood change effect
  const handleMoodChange = (newMood: string) => {
    setMood(newMood);
    setQuote(getRandomQuote(newMood));
  };

  return (
    <div 
      className="min-h-screen max-w-screen overflow-x-hidden flex flex-col items-center p-4 sm:p-10 relative transition-colors duration-1000 justify-between font-sans text-white"
      style={{
        background: `radial-gradient(circle at 0% 0%, #1a1a2e 0%, transparent 50%), radial-gradient(circle at 100% 100%, #0f172a 0%, transparent 50%), #050508`
      }}
    >
      
      {/* Background Animated Gradient Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute -top-[100px] -right-[100px] sm:-top-[100px] sm:-right-[-100px] w-[400px] h-[400px] rounded-full blur-[80px] opacity-10 transition-colors duration-1000 ease-in-out"
          style={{ background: `radial-gradient(circle, ${currentMoodData.lightColor} 0%, transparent 70%)` }} 
        />
        <div 
          className="absolute -bottom-[100px] -left-[100px] sm:-bottom-[100px] sm:-left-[100px] w-[400px] h-[400px] rounded-full blur-[80px] opacity-10 transition-colors duration-1000 ease-in-out"
          style={{ background: `radial-gradient(circle, ${currentMoodData.lightColor} 0%, transparent 70%)` }} 
        />
      </div>

      <div className="flex-1 w-full max-w-[800px] flex flex-col items-center justify-center gap-8 z-10 mt-8 sm:mt-0">
        
        {/* Header section */}
        <div className="flex flex-col items-center text-center z-10 w-full mb-4 sm:mb-2 px-2">
          <motion.h1 
            className="text-4xl sm:text-[42px] font-sans font-extrabold tracking-[-1px] mb-3 sm:mb-2 leading-tight elegant-glow-text"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Kata kata Hari ini
          </motion.h1>
          <motion.p 
            className="text-[#94a3b8] font-sans text-sm sm:text-base tracking-wide max-w-[400px] mb-2"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          >
            Pilih mood kamu saat ini dan temukan quote yang paling relate untuk hari ini.
          </motion.p>
        </div>

        <div className="w-full flex flex-col items-center gap-6 sm:gap-8 z-10">
          {/* Quote Card (Glassmorphism) */}
          <AnimatePresence mode="popLayout">
            <motion.div
              key={quote} // Re-animate on quote change
              initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
              transition={{ duration: 0.4, type: 'spring', bounce: 0 }}
              className="w-full relative flex flex-col justify-center items-center text-center p-6 sm:p-[60px] min-h-[280px] sm:min-h-[320px] rounded-[32px] overflow-hidden"
              style={{ 
                background: `rgba(255, 255, 255, 0.03)`,
                backdropFilter: `blur(20px)`,
                WebkitBackdropFilter: `blur(20px)`,
                border: `1px solid rgba(255, 255, 255, 0.1)`,
                boxShadow: `0 25px 50px -12px rgba(0,0,0,0.5)`
              }}
            >
              <div 
                className="absolute top-2 left-6 sm:top-5 sm:left-10 text-[80px] sm:text-[120px] font-serif opacity-10 pointer-events-none leading-none select-none"
                style={{ color: currentMoodData.lightColor }}
              >
                “
              </div>

              <div 
                className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-[1px] mb-4 sm:mb-6 inline-flex z-10"
                style={{
                  background: `${currentMoodData.lightColor}1A`,
                  color: currentMoodData.lightColor,
                  border: `1px solid ${currentMoodData.lightColor}33`,
                }}
              >
                {currentMoodData.label} {currentMoodData.emoji}
              </div>

              <div className="min-h-[100px] sm:min-h-[80px] flex items-center justify-center z-10 w-full px-2">
                <p className="text-xl sm:text-[28px] font-medium leading-[1.5] sm:leading-[1.4] text-[#ffffff] max-w-2xl">
                  "{typedQuote}"
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Controls Container */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 z-10">
            <div className="relative w-full">
              <select
                value={mood}
                onChange={(e) => handleMoodChange(e.target.value)}
                className="w-full appearance-none rounded-2xl px-5 py-4 text-white text-base cursor-pointer outline-none transition-colors max-w-full"
                style={{
                  background: `rgba(255, 255, 255, 0.05)`,
                  border: `1px solid rgba(255, 255, 255, 0.1)`
                }}
              >
                {MOODS.map(m => (
                  <option key={m.id} value={m.id} className="bg-[#050508] text-base">
                    {m.emoji} {m.label}
                  </option>
                ))}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-[#94a3b8] text-xs">
                ▼
              </div>
            </div>

            <div className="flex gap-3 flex-col sm:flex-row">
              <button
                onClick={handleGenerate}
                className="flex-[1.5] flex items-center justify-center gap-2 py-4 px-6 rounded-2xl font-semibold text-[15px] transition-all hover:brightness-110 active:scale-95 text-[#050508] w-full"
                style={{
                  background: currentMoodData.lightColor,
                  boxShadow: `0 0 20px ${currentMoodData.lightColor}4D`
                }}
              >
                <RefreshCw className="w-4 h-4" />
                Generate Quote
              </button>
              <button
                onClick={handleShuffle}
                className="flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-2xl font-semibold text-[15px] transition-all hover:bg-white/5 active:scale-95 text-white w-full"
                style={{
                  background: `transparent`,
                  border: `1px solid rgba(255, 255, 255, 0.1)`
                }}
              >
                <Shuffle className="w-4 h-4" />
                Shuffle All
              </button>
            </div>
          </div>
          
          {/* Footer Actions */}
          <div className="flex gap-5 mt-1 sm:mt-2 z-10 items-center justify-center sm:justify-start w-full">
            <button
              onClick={handleCopy}
              className="w-12 h-12 flex items-center justify-center rounded-xl transition-all hover:bg-white/10 active:scale-95 text-[#94a3b8] hover:text-white"
              title="Copy Quote"
              style={{
                background: `rgba(255, 255, 255, 0.05)`,
                border: `1px solid rgba(255, 255, 255, 0.1)`
              }}
            >
              {isCopied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
            </button>
            <button
              onClick={handleDownload}
              className="w-12 h-12 flex items-center justify-center rounded-xl transition-all hover:bg-white/10 active:scale-95 text-[#94a3b8] hover:text-white"
              title="Download PNG"
              style={{
                background: `rgba(255, 255, 255, 0.05)`,
                border: `1px solid rgba(255, 255, 255, 0.1)`
              }}
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
        
      {/* App Footer */}
      <footer className="w-full max-w-[800px] flex flex-col sm:flex-row justify-between items-center text-[#94a3b8] text-xs pt-5 z-10 gap-4 mt-8 sm:mt-4"
              style={{ borderTop: `1px solid rgba(255, 255, 255, 0.1)` }}>
        <div className="flex flex-wrap justify-center sm:justify-start gap-4 sm:gap-6">
          <span>{totalQuotesCount}+ Quotes Available</span>
          <span className="hidden sm:inline">•</span>
          <span></span>
          <span className="hidden sm:inline">•</span>
          <span>Last Mood: {currentMoodData.label}</span>
        </div>
        <div className="opacity-50 italic text-center sm:text-right">
          Generated by <a href="https://akariu.blogspot.com/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors underline hover:no-underline">https://akariu.blogspot.com/</a>
        </div>
      </footer>
    </div>
  );
}
