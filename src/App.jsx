import { useState, useEffect, useRef } from "react";
import weddingMusic from "./music/wedding.mp3";

const TARGET_DATE = new Date("2026-06-05T19:00:00");

function useCountdown(target) {
  const [timeLeft, setTimeLeft] = useState({});
  useEffect(() => {
    const calc = () => {
      const diff = target - Date.now();
      if (diff <= 0) return setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [target]);
  return timeLeft;
}

// Scroll-triggered reveal hook
function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

// Lightweight scroll-progress hook (0 → 1 across the whole page)
function useScrollY() {
  const [y, setY] = useState(0);
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return y;
}

// Reveal wrapper — now supports "rise" (default) and "bloom" (scale + rise) styles,
// so grids can cascade item-by-item instead of arriving as one flat block.
function RevealSection({ children, delay = 0, style = {}, variant = "rise" }) {
  const [ref, visible] = useReveal();
  const transforms = {
    rise: visible ? "translateY(0)" : "translateY(40px)",
    bloom: visible ? "translateY(0) scale(1)" : "translateY(26px) scale(0.94)",
  };
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: transforms[variant],
      transition: `opacity 0.9s cubic-bezier(.22,.61,.36,1) ${delay}s, transform 0.9s cubic-bezier(.22,.61,.36,1) ${delay}s`,
      ...style
    }}>
      {children}
    </div>
  );
}

// A divider that draws itself in (scaleX 0 → 1) once scrolled into view,
// echoing the same "unveiling" gesture as the envelope opening.
function AnimatedDivider({ delay = 0, symbol = "✦", style = {} }) {
  const [ref, visible] = useReveal();
  return (
    <div ref={ref} className="divider" style={style}>
      <div className="divider-line" style={{
        transform: visible ? "scaleX(1)" : "scaleX(0)",
        transformOrigin: "right center",
        transition: `transform 0.9s cubic-bezier(.22,.61,.36,1) ${delay}s`,
      }} />
      <span style={{
        color: "#c8a96b", fontSize: "1.1rem",
        opacity: visible ? 1 : 0,
        transform: visible ? "scale(1) rotate(0deg)" : "scale(0.3) rotate(-90deg)",
        transition: `all 0.6s cubic-bezier(.22,.61,.36,1) ${delay + 0.35}s`,
        display: "inline-block",
      }}>{symbol}</span>
      <div className="divider-line" style={{
        transform: visible ? "scaleX(1)" : "scaleX(0)",
        transformOrigin: "left center",
        transition: `transform 0.9s cubic-bezier(.22,.61,.36,1) ${delay}s`,
      }} />
    </div>
  );
}

// Wave SVG divider — flips between sections, with a slow ambient sheen
function Wave({ fromColor, toColor, flip = false }) {
  return (
    <div style={{ position: "relative", height: "80px", overflow: "hidden", marginTop: "-2px", zIndex: 2 }}>
      <svg
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        style={{
          position: "absolute", width: "100%", height: "100%",
          transform: flip ? "scaleX(-1)" : "none",
        }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="1440" height="80" fill={fromColor} />
        <path
          className="wave-path"
          d="M0,40 C240,80 480,0 720,40 C960,80 1200,0 1440,40 L1440,80 L0,80 Z"
          fill={toColor}
        />
      </svg>
      <div className="wave-sheen" />
    </div>
  );
}

const petals = Array.from({ length: 9 }, (_, i) => ({
  id: i,
  left: `${i * 11.5 + Math.random() * 8}%`,
  delay: `${i * 1.1 + Math.random() * 3}s`,
  duration: `${10 + Math.random() * 8}s`,
  size: `${8 + Math.random() * 8}px`,
}));

// A single layered bloom — six rounded petals around a gilded center,
// a curved stem, two pointed leaves, and a smaller bud. Reused at each
// corner via position/rotation/mirroring so the whole frame reads as
// one consistent floral hand rather than scattered shapes.
function FlowerSprig({ x, y, rotate = 0, scale = 1, mirror = false }) {
  const transform = `translate(${x} ${y}) rotate(${rotate}) scale(${scale * (mirror ? -1 : 1)}, ${scale})`;
  return (
    <g transform={transform}>
      <path d="M0,0 Q-8,42 3,78 Q11,104 1,134" stroke="url(#stemGrad)" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M2,48 Q-22,41 -32,58 Q-13,70 3,57 Z" fill="url(#leafGrad)" />
      <path d="M-1,92 Q26,86 34,104 Q13,112 -1,98 Z" fill="url(#leafGrad)" />
      <g transform="translate(0,-8)">
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <path
            key={a}
            transform={`rotate(${a})`}
            d="M0,0 C7,-15 18,-17 20,-4 C22,9 11,18 0,15 C-11,18 -22,9 -20,-4 C-18,-17 -7,-15 0,0 Z"
            fill="url(#petalGrad)"
            opacity="0.95"
          />
        ))}
        {[30, 90, 150, 210, 270, 330].map((a) => (
          <path
            key={`i${a}`}
            transform={`rotate(${a}) scale(0.6)`}
            d="M0,0 C7,-15 18,-17 20,-4 C22,9 11,18 0,15 C-11,18 -22,9 -20,-4 C-18,-17 -7,-15 0,0 Z"
            fill="url(#petalInnerGrad)"
            opacity="0.9"
          />
        ))}
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <path
            key={`v${a}`}
            transform={`rotate(${a})`}
            d="M0,0 C4,-8 9,-11 10,-4"
            fill="none"
            stroke="rgba(240,216,122,0.5)"
            strokeWidth="0.6"
          />
        ))}
        <circle r="5.5" fill="url(#centerGrad)" />
      </g>
      <g transform="translate(16,112) rotate(18)">
        <ellipse rx="7.5" ry="10.5" fill="url(#petalGrad)" opacity="0.9" />
        <path d="M-7.5,0 Q0,-15 7.5,0" fill="none" stroke="#6b4e3d" strokeWidth="0.8" />
      </g>
    </g>
  );
}

function BotanicalFrame({ style = {} }) {
  const corners = [
    { x: 34, y: 26, rotate: 8, scale: 1 },
    { x: 566, y: 26, rotate: -8, scale: 1, mirror: true },
    { x: 30, y: 494, rotate: -175, scale: 0.72 },
    { x: 570, y: 494, rotate: 175, scale: 0.72, mirror: true },
  ];
  return (
    <svg viewBox="0 0 600 520" xmlns="http://www.w3.org/2000/svg"
      style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none", opacity:0.22, ...style }}>
      <defs>
        <linearGradient id="petalGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c98fa0" />
          <stop offset="55%" stopColor="#a96b7c" />
          <stop offset="100%" stopColor="#8b5c6b" />
        </linearGradient>
        <linearGradient id="leafGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8f7452" />
          <stop offset="100%" stopColor="#6b4e3d" />
        </linearGradient>
        <radialGradient id="centerGrad">
          <stop offset="0%" stopColor="#f0d87a" />
          <stop offset="100%" stopColor="#b8903f" />
        </radialGradient>
        <linearGradient id="petalInnerGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e2b6c2" />
          <stop offset="100%" stopColor="#c98fa0" />
        </linearGradient>
        <linearGradient id="stemGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8f7452" />
          <stop offset="100%" stopColor="#6b4e3d" />
        </linearGradient>
      </defs>
      {corners.map((c, i) => <FlowerSprig key={i} {...c} />)}
      <g transform="translate(300,18)">
        <path d="M -34,10 Q -14,-6 0,4 Q 14,-6 34,10" stroke="url(#stemGrad)" strokeWidth="1.3" fill="none" />
        <g transform="translate(-20,6) scale(0.55)"><FlowerSprig x={0} y={0} rotate={-15} scale={1} /></g>
        <g transform="translate(20,6) scale(0.55)"><FlowerSprig x={0} y={0} rotate={15} scale={1} mirror /></g>
      </g>
    </svg>
  );
}

// A symmetric engraved botanical branch — a central stem with tapering
// leaflet pairs and a terminal leaflet at the tip. Rendered three times
// inside WaxSeal (shadow / highlight / base, each offset by a pixel or
// two) to fake a pressed-wax engraving without needing a real image.
function LeafSprig() {
  const leaflets = [
    { y: 34, s: 1.15, r: 52 },
    { y: 18, s: 1.02, r: 46 },
    { y: 2, s: 0.9, r: 40 },
    { y: -14, s: 0.76, r: 34 },
    { y: -28, s: 0.6, r: 28 },
  ];
  return (
    <g strokeWidth="1.4" strokeLinecap="round">
      <path d="M0,44 Q3,10 0,-10 Q-2,-32 0,-48" fill="none" strokeWidth="2.4" />
      {leaflets.map((l, i) => (
        <g key={i}>
          <path transform={`translate(3 ${l.y}) rotate(${l.r}) scale(${l.s})`} d="M0,0 Q6,-12 0,-26 Q-6,-12 0,0 Z" />
          <path transform={`translate(-3 ${l.y}) rotate(${-l.r}) scale(${l.s})`} d="M0,0 Q6,-12 0,-26 Q-6,-12 0,0 Z" />
        </g>
      ))}
      <path transform="translate(0,-48) scale(0.55)" d="M0,0 Q6,-12 0,-26 Q-6,-12 0,0 Z" />
    </g>
  );
}

// A raised wax-seal medallion: an irregular turbulence-displaced disc,
// concentric tooled rings, an engraved branch (via offset layers), and
// a soft specular highlight — built entirely from SVG so it reads as
// pressed wax rather than a flat gold sticker.
function WaxSeal({ onClick, cracked }) {
  return (
    <button
      type="button"
      className={`wax-seal-big${cracked ? " crack" : ""}`}
      onClick={onClick}
      aria-label="Open the invitation"
    >
      <svg viewBox="0 0 200 200" width="100%" height="100%">
        <defs>
          <filter id="waxEdge" x="-30%" y="-30%" width="160%" height="160%">
            <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="4" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="7" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <radialGradient id="waxBase" cx="35%" cy="26%" r="80%">
            <stop offset="0%" stopColor="#f6e0a0" />
            <stop offset="32%" stopColor="#d9ac3f" />
            <stop offset="65%" stopColor="#a97a24" />
            <stop offset="100%" stopColor="#5f420f" />
          </radialGradient>
          <radialGradient id="waxRing" cx="50%" cy="42%" r="60%">
            <stop offset="0%" stopColor="#f8e6a8" />
            <stop offset="100%" stopColor="#87601f" />
          </radialGradient>
        </defs>

        <circle cx="100" cy="100" r="90" fill="url(#waxBase)" filter="url(#waxEdge)" />
        <circle cx="100" cy="100" r="90" fill="none" stroke="#4a3410" strokeWidth="1.2" opacity="0.35" filter="url(#waxEdge)" />
        <circle cx="100" cy="100" r="76" fill="none" stroke="url(#waxRing)" strokeWidth="3" opacity="0.65" filter="url(#waxEdge)" />
        <circle cx="100" cy="100" r="66" fill="none" stroke="#5f420f" strokeWidth="1.3" opacity="0.4" filter="url(#waxEdge)" />

        <g transform="translate(100,104)">
          <g transform="translate(2,3)" opacity="0.5" fill="#3d2a0c" stroke="#3d2a0c"><LeafSprig /></g>
          <g transform="translate(-1.4,-1.8)" opacity="0.55" fill="#fbe8ae" stroke="#fbe8ae"><LeafSprig /></g>
          <g fill="#7c561d" stroke="#7c561d"><LeafSprig /></g>
        </g>

        <ellipse cx="68" cy="52" rx="36" ry="20" fill="rgba(255,255,255,0.22)" filter="url(#waxEdge)" />
      </svg>
      <span className="wax-seal-shine-big" />
    </button>
  );
}


const C = {
  hero:      "#fdf8f2",
  details:   "#f3ebe2",
  countdown: "#fffaf5",
  gallery:   "#f3ebe2",
  map:       "#fffaf5",
  qr:        "#f3ebe2",
  footer:    "#e8ddd0",
};

export default function WeddingInvitation() {
  const [opened, setOpened] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);
  const countdown = useCountdown(TARGET_DATE);
  const scrollY = useScrollY();

  const handleOpen = () => {
    setOpened(true);

    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
      setPlaying(true);
    }

    setTimeout(() => setRevealed(true), 900);
  };

  const toggleAudio = () => {
    if (!audioRef.current) return;
    playing ? audioRef.current.pause() : audioRef.current.play().catch(() => {});
    setPlaying(!playing);
  };

  return (
    <div style={{ minHeight:"100vh", background:"#faf6f1", color:"#4a3728", fontFamily:"'Cormorant Garamond', Georgia, serif", overflowX:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400;1,600&family=Great+Vibes&family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,500;1,6..96,400&family=Lato:wght@300;400&display=swap');

        @keyframes fall {
          0%   { transform: translateY(-30px) rotate(0deg); opacity: 0; }
          10%  { opacity: 0.3; }
          90%  { opacity: 0.15; }
          100% { transform: translateY(105vh) rotate(280deg) translateX(20px); opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.07); }
        }
        @keyframes digitPop {
          0%   { transform: translateY(-10px) scale(0.85); opacity: 0.4; }
          60%  { transform: translateY(2px) scale(1.04); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes sheenSlide {
          0%   { transform: translateX(-60%); opacity: 0; }
          20%  { opacity: 0.5; }
          50%  { opacity: 0.5; }
          100% { transform: translateX(160%); opacity: 0; }
        }
        @keyframes envelopeFloat {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-8px); }
        }
        @keyframes sealShineBig {
          0%   { transform: translateX(-80%) rotate(18deg); opacity: 0; }
          15%  { opacity: 0.5; }
          45%  { opacity: 0.5; }
          70%  { transform: translateX(180%) rotate(18deg); opacity: 0; }
          100% { transform: translateX(180%) rotate(18deg); opacity: 0; }
        }
        @keyframes crackSeal {
          0%   { transform: scale(1) rotate(0deg); }
          35%  { transform: scale(0.9) rotate(-4deg); }
          100% { transform: scale(0.55) rotate(6deg); opacity: 0; }
        }
        @keyframes contentReveal {
          from { opacity: 0; transform: translateY(18px) scale(0.99); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .main-content { animation: contentReveal 1.1s cubic-bezier(.22,.61,.36,1); }

        .envelope-scene {
          min-height: 100vh; position: relative; overflow: hidden;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 2.75rem;
          background: linear-gradient(165deg, #ecdcd9 0%, #e3cdc9 45%, #d9bfba 100%);
          transition: opacity 0.7s ease, transform 0.7s ease;
        }
        .envelope-scene.dismiss { opacity: 0; transform: scale(1.03); }
        .fold-crease {
          position: absolute; top: -6%; width: 62%; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent);
          transform-origin: top center;
        }
        .fold-left  { left: -8%;  transform: rotate(30deg); }
        .fold-right { right: -8%; transform: rotate(-30deg); }
        .fold-shadow {
          position: absolute; top: 0; left: 50%; width: 70%; height: 46%;
          transform: translateX(-50%);
          background: radial-gradient(ellipse at top, rgba(120,80,70,0.10), transparent 70%);
          pointer-events: none;
        }

        .wax-seal-big {
          position: relative; width: clamp(140px, 30vw, 190px); height: clamp(140px, 30vw, 190px);
          border: none; background: none; padding: 0; cursor: pointer;
          animation: envelopeFloat 5s ease-in-out infinite;
          filter: drop-shadow(0 18px 26px rgba(90,55,30,0.35)) drop-shadow(0 4px 8px rgba(90,55,30,0.2));
          transition: transform 0.5s cubic-bezier(.36,.07,.19,.97), opacity 0.5s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .wax-seal-big:hover { transform: scale(1.04); }
        .wax-seal-big.crack { animation: crackSeal 0.6s ease forwards; }
        .wax-seal-shine-big {
          position: absolute; top: -30%; bottom: -30%; width: 30%; left: 10%;
          background: linear-gradient(100deg, transparent, rgba(255,255,255,0.65), transparent);
          animation: sealShineBig 4.5s ease-in-out infinite;
          pointer-events: none;
        }

        .seal-caption {
          font-family: 'Lato', sans-serif; font-size: 0.7rem;
          letter-spacing: 5px; text-transform: uppercase; color: #8a6653;
          transition: opacity 0.4s ease;
        }
        .seal-caption.hidden { opacity: 0; }

        .petal {
          position: absolute; top: -30px; pointer-events: none;
          animation: fall ease-in infinite; opacity: 0;
          font-size: 10px; filter: saturate(0.5);
        }

        .hero-name   { font-family: 'Great Vibes', cursive; line-height: 1.1; }

        .section-heading {
          font-family: 'Bodoni Moda', 'Cormorant Garamond', serif;
          font-size: 1.9rem; font-weight: 400;
          letter-spacing: 4px; text-transform: uppercase; color: #4a3728;
        }

        .detail-card {
          background: #fff; border: 1px solid #e5d8c8; border-radius: 20px;
          padding: 2rem 1.5rem; text-align: center;
          transition: transform 0.4s cubic-bezier(.22,.61,.36,1), box-shadow 0.4s ease, border-color 0.4s ease;
        }
        .detail-card:hover { transform: translateY(-8px) scale(1.015); box-shadow: 0 20px 48px rgba(120,80,50,0.16); border-color: #c8a96b; }

        .countdown-strip {
          display: flex; align-items: stretch; justify-content: center;
          border: 1px solid #ddd0be; border-radius: 16px; overflow: hidden;
          max-width: 580px; margin: 0 auto; background: #fff;
        }
        .countdown-unit {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 2rem 0.5rem; position: relative;
        }
        .countdown-unit + .countdown-unit::before {
          content: ''; position: absolute; left: 0; top: 20%; bottom: 20%;
          width: 1px; background: linear-gradient(180deg, transparent, #c8a96b, transparent);
        }
        .countdown-num {
          font-family: 'Bodoni Moda', serif;
          font-size: clamp(2.8rem, 6vw, 4rem); font-weight: 400; line-height: 1;
          display: inline-block;
          animation: digitPop 0.5s cubic-bezier(.22,.61,.36,1);
        }
        .countdown-label {
          font-family: 'Lato', sans-serif; font-size: 0.6rem;
          letter-spacing: 4px; text-transform: uppercase; margin-top: 8px; color: #a07c5e;
        }

        .audio-btn {
          position: fixed; bottom: 24px; right: 24px; z-index: 100;
          width: 48px; height: 48px; border-radius: 50%;
          background: #8b6b4f; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 20px rgba(139,107,79,0.4);
          transition: transform 0.2s ease;
          animation: pulse 3s ease infinite;
        }
        .audio-btn:hover { transform: scale(1.1); }

        .divider { display: flex; align-items: center; gap: 16px; margin: 1.75rem auto; max-width: 300px; }
        .divider-line { flex: 1; height: 1px; background: linear-gradient(90deg, transparent, #c8a96b, transparent); }

        .gallery-img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.7s cubic-bezier(.22,.61,.36,1), filter 0.5s ease; }
        .gallery-img:hover { transform: scale(1.06); filter: brightness(1.04); }

        .map-btn {
          display: inline-block; padding: 1rem 2.5rem; border-radius: 999px;
          background: #8b6b4f; color: #fff; font-family: 'Lato', sans-serif;
          font-size: 0.85rem; letter-spacing: 3px; text-transform: uppercase;
          text-decoration: none; transition: all 0.3s ease;
          box-shadow: 0 4px 20px rgba(139,107,79,0.3);
        }
        .map-btn:hover { background: #6e5440; transform: translateY(-3px); box-shadow: 0 10px 34px rgba(139,107,79,0.45); }

        .qr-frame {
          display: inline-flex; flex-direction: column; align-items: center;
          background: #fff; border: 1px solid #d6c2ab; border-radius: 24px;
          padding: 2rem 2rem 1.5rem;
          transition: box-shadow 0.4s ease, transform 0.4s cubic-bezier(.22,.61,.36,1);
        }
        .qr-frame:hover { transform: translateY(-4px); box-shadow: 0 18px 44px rgba(120,80,50,0.14); }
        .qr-initials { font-family: 'Great Vibes', cursive; font-size: 1.6rem; color: #8b6b4f; margin-bottom: 1rem; letter-spacing: 2px; }
        .qr-gold-border { border: 2px solid #c8a96b; border-radius: 12px; padding: 10px; background: #fffaf5; }
        .qr-caption { font-family: 'Lato', sans-serif; font-size: 0.6rem; letter-spacing: 4px; text-transform: uppercase; color: #a07c5e; margin-top: 1rem; }

        .wave-sheen {
          position: absolute; top: 0; left: 0; bottom: 0; width: 40%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
          animation: sheenSlide 7s ease-in-out infinite;
          pointer-events: none;
        }

        @media (prefers-reduced-motion: reduce) {
          .petal, .audio-btn, .countdown-num, .wave-sheen { animation: none !important; }
          * { transition-duration: 0.01ms !important; }
        }

        @media (max-width: 640px) {
          .countdown-strip { flex-direction: column; max-width: 220px; }
          .countdown-unit + .countdown-unit::before { top: 0; bottom: auto; left: 20%; right: 20%; width: auto; height: 1px; }
          .gallery-grid { grid-template-columns: 1fr !important; }
          .details-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <audio ref={audioRef} loop>
      <source src={weddingMusic} type="audio/mpeg" />
      </audio>

      {/* Petals */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:1, overflow:"hidden" }}>
        {petals.map(p => (
          <div key={p.id} className="petal" style={{ left:p.left, animationDelay:p.delay, animationDuration:p.duration, fontSize:p.size }}>🌸</div>
        ))}
      </div>

      <button className="audio-btn" onClick={toggleAudio} aria-label={playing ? "Pause music" : "Play music"}>
        <span style={{ fontSize:"20px" }}>{playing ? "⏸" : "♪"}</span>
      </button>

      {/* ── ENVELOPE ── */}
      {!revealed && (
        <section className={`envelope-scene${opened ? " dismiss" : ""}`}>
          <div className="fold-crease fold-left" />
          <div className="fold-crease fold-right" />
          <div className="fold-shadow" />

          <WaxSeal onClick={handleOpen} cracked={opened} />

          <p className={`seal-caption${opened ? " hidden" : ""}`}>Click the seal to open</p>
        </section>
      )}

      {/* ── MAIN CONTENT ── */}
      {revealed && (
        <div className="main-content">

          {/* HERO */}
          <section style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:"5rem 1.5rem", background:C.hero, position:"relative", overflow:"hidden" }}>
            <BotanicalFrame style={{ transform: `translateY(${scrollY * 0.12}px)` }} />
            <RevealSection delay={0.1} variant="bloom" style={{
              textAlign:"center", maxWidth:"680px", position:"relative", zIndex:1,
              transform: `translateY(${scrollY * -0.06}px)`,
            }}>
              <p style={{ fontFamily:"'Lato', sans-serif", letterSpacing:"6px", textTransform:"uppercase", fontSize:"0.65rem", color:"#a07c5e", marginBottom:"1.5rem" }}>
                Together with their families
              </p>
              <AnimatedDivider delay={0.15} />
              <h1 className="hero-name" style={{ fontSize:"clamp(4rem,11vw,7.5rem)", color:"#4a3728", marginBottom:"0.25rem" }}>Abdelrahman</h1>
              <div style={{ fontFamily:"'Lato', sans-serif", fontSize:"0.95rem", letterSpacing:"10px", color:"#c8a96b", margin:"0.5rem 0" }}>AND</div>
              <h1 className="hero-name" style={{ fontSize:"clamp(4rem,11vw,7.5rem)", color:"#8b5c6b" }}>Dalia</h1>
              <AnimatedDivider delay={0.15} />
              <p style={{ fontFamily:"'Cormorant Garamond', serif", fontSize:"1.35rem", fontStyle:"italic", color:"#7a5b46", lineHeight:1.9, fontWeight:300, marginTop:"1.25rem" }}>
                It was always you.<br/>It will always be you.
              </p>
              <p style={{ marginTop:"2rem", fontFamily:"'Lato', sans-serif", letterSpacing:"4px", fontSize:"0.7rem", textTransform:"uppercase", color:"#b89070" }}>
                Friday · The Fifth of June · 2026
              </p>
            </RevealSection>
          </section>

          {/* wave: hero → details */}
          <Wave fromColor={C.hero} toColor={C.details} />

          {/* DETAILS */}
          <section style={{ padding:"4rem 1.5rem 5rem", background:C.details }}>
            <div style={{ maxWidth:"900px", margin:"0 auto" }}>
              <RevealSection delay={0}>
                <h2 className="section-heading" style={{ textAlign:"center", marginBottom:"3rem" }}>Wedding Details</h2>
              </RevealSection>
              <div className="details-grid" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"1.5rem" }}>
                {[
                  { icon:"📅", title:"Date",  main:"5 June 2026",  sub:"Friday",        accent:"#4a3728" },
                  { icon:"⏰", title:"Time",  main:"7:00 PM",      sub:"Doors open at", accent:"#c8a96b" },
                  { icon:"📍", title:"Venue", main:"Romanica Hall", sub:"Cairo, Egypt",  accent:"#8b5c6b" },
                ].map((item, i) => (
                  <RevealSection key={i} delay={i * 0.15} variant="bloom">
                    <div className="detail-card" style={{ borderTop:`3px solid ${item.accent}` }}>
                      <div style={{ fontSize:"2.2rem", marginBottom:"0.75rem" }}>{item.icon}</div>
                      <h3 style={{ fontFamily:"'Lato', sans-serif", textTransform:"uppercase", letterSpacing:"3px", fontSize:"0.65rem", color:"#a07c5e", marginBottom:"0.6rem" }}>{item.title}</h3>
                      <p style={{ fontSize:"0.9rem", color:"#8a6b54", lineHeight:1.6, fontWeight:300 }}>{item.sub}</p>
                      <p style={{ fontSize:"1.35rem", color:item.accent, fontWeight:500, fontFamily:"'Bodoni Moda', serif", marginTop:"4px" }}>{item.main}</p>
                    </div>
                  </RevealSection>
                ))}
              </div>
            </div>
          </section>

          {/* wave: details → countdown */}
          <Wave fromColor={C.details} toColor={C.countdown} flip />

          {/* COUNTDOWN */}
          <section style={{ padding:"4rem 1.5rem 5rem", background:C.countdown, textAlign:"center" }}>
            <RevealSection delay={0.1}>
              <h2 className="section-heading" style={{ marginBottom:"0.5rem" }}>Counting Down</h2>
              <p style={{ fontFamily:"'Lato', sans-serif", color:"#a07c5e", letterSpacing:"3px", fontSize:"0.65rem", textTransform:"uppercase", marginBottom:"2.5rem" }}>
                Until Our Forever Begins
              </p>
              <div className="countdown-strip">
                {[
                  { label:"Days",    value:countdown.days,    color:"#4a3728" },
                  { label:"Hours",   value:countdown.hours,   color:"#8b5c6b" },
                  { label:"Minutes", value:countdown.minutes, color:"#4a3728" },
                  { label:"Seconds", value:countdown.seconds, color:"#c8a96b" },
                ].map((item, i) => (
                  <div key={i} className="countdown-unit">
                    <span key={item.value} className="countdown-num" style={{ color:item.color }}>{String(item.value ?? 0).padStart(2,"0")}</span>
                    <span className="countdown-label">{item.label}</span>
                  </div>
                ))}
              </div>
            </RevealSection>
          </section>

          {/* wave: countdown → gallery */}
          <Wave fromColor={C.countdown} toColor={C.gallery} />

          {/* GALLERY */}
          <section style={{ padding:"4rem 1.5rem 5rem", background:C.gallery }}>
            <div style={{ maxWidth:"1100px", margin:"0 auto" }}>
              <RevealSection delay={0}>
                <h2 className="section-heading" style={{ textAlign:"center", marginBottom:"3rem" }}>The Venue</h2>
              </RevealSection>
              <div className="gallery-grid" style={{ display:"grid", gridTemplateColumns:"1.3fr 0.7fr 1fr", gap:"1rem", alignItems:"start" }}>
                {[
                  { src:"https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop", h:"460px" },
                  { src:"https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=1200&auto=format&fit=crop", h:"320px" },
                  { src:"https://images.unsplash.com/photo-1520854221256-17451cc331bf?q=80&w=1200&auto=format&fit=crop", h:"400px" },
                ].map((img, i) => (
                  <RevealSection key={i} delay={i * 0.18} variant="bloom" style={{ overflow:"hidden", borderRadius:"20px", height:img.h }}>
                    <img src={img.src} alt="" className="gallery-img"/>
                  </RevealSection>
                ))}
              </div>
            </div>
          </section>

          {/* wave: gallery → map */}
          <Wave fromColor={C.gallery} toColor={C.map} flip />

          {/* MAP */}
          <section style={{ padding:"4rem 1.5rem 5rem", background:C.map, textAlign:"center" }}>
            <RevealSection delay={0.1}>
              <h2 className="section-heading" style={{ marginBottom:"0.75rem" }}>Find Us Here</h2>
              <p style={{ fontFamily:"'Lato', sans-serif", fontSize:"0.85rem", letterSpacing:"2px", color:"#a07c5e", marginBottom:"2.5rem", textTransform:"uppercase" }}>
                Romanica Hall · Cairo, Egypt
              </p>
              <a href="https://maps.app.goo.gl/paoN34KQKAgNMDsK9" target="_blank" rel="noopener noreferrer" className="map-btn">
                Open in Google Maps
              </a>
            </RevealSection>
          </section>

          {/* wave: map → qr */}
          <Wave fromColor={C.map} toColor={C.qr} />

          {/* QR */}
          <section style={{ padding:"4rem 1.5rem 5rem", background:C.qr, textAlign:"center" }}>
            <RevealSection delay={0.1} variant="bloom">
              <h2 className="section-heading" style={{ marginBottom:"0.5rem" }}>Share the Invitation</h2>
              <p style={{ fontFamily:"'Lato', sans-serif", color:"#a07c5e", fontSize:"0.65rem", letterSpacing:"3px", textTransform:"uppercase", marginBottom:"2.5rem" }}>
                Scan to open on your device
              </p>
              <div className="qr-frame">
                <div className="qr-initials">
                  <span style={{color:"#4a3728"}}>A</span>
                  <span style={{color:"#c8a96b",margin:"0 6px"}}>✦</span>
                  <span style={{color:"#8b5c6b"}}>D</span>
                </div>
                <div className="qr-gold-border">
                  <img
                    src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://wedding-invitation-amber-sigma.vercel.app&color=4a3728&bgcolor=fffaf5&margin=4"                    alt="QR code for wedding invitation"
                    style={{ width:180, height:180, display:"block", borderRadius:"4px" }}
                  />
                </div>
                <p className="qr-caption">5 · 6 · 2026 · Cairo</p>
              </div>
            </RevealSection>
          </section>

          {/* wave: qr → footer */}
          <Wave fromColor={C.qr} toColor={C.footer} flip />

          {/* FOOTER */}
          <footer style={{ padding:"4rem 1.5rem", background:C.footer, textAlign:"center" }}>
            <RevealSection delay={0.1}>
              <p style={{ fontFamily:"'Great Vibes', cursive", fontSize:"2.5rem", marginBottom:"0.5rem" }}>
                <span style={{color:"#4a3728"}}>حضوركم</span>
                <span style={{color:"#8b5c6b"}}> يكمل </span>
                <span style={{color:"#4a3728"}}>فرحتنا</span>
              </p>
              <AnimatedDivider delay={0.1} symbol="❤" style={{ margin:"1rem auto" }} />
              <p style={{ fontFamily:"'Lato', sans-serif", letterSpacing:"6px", fontSize:"0.65rem", textTransform:"uppercase", color:"#9a7c62" }}>
                Abdelrahman & Dalia · 2026
              </p>
            </RevealSection>
          </footer>

        </div>
      )}
    </div>
  );
}
