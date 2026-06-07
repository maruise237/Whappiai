"use client"

import { useState, useEffect, useRef } from "react"

// ══════════════════════════════════════════════════
// ÉTATS DE WAPPY — basés sur les events Whappi réels
// ══════════════════════════════════════════════════
const STATES = {
  idle: {
    fr: "Tranquille", emoji: "😊", color: "#22c55e",
    msg: null, trackEyes: true,
    eye: { s: 1, dy: 0, closed: false },
    mouth: { t: "arc", d: "M 87,152 Q 100,162 113,152" },
    brow: ["M 55,33 Q 66,29 77,33", "M 123,33 Q 134,29 145,33"],
    blush: 0.15, anim: "float",
    extra: null
  },
  happy: {
    fr: "Super content", emoji: "🎉", color: "#22c55e",
    msg: "Tout fonctionne parfaitement ! 🎉", trackEyes: false,
    eye: { s: 1.12, dy: -2, closed: false },
    mouth: { t: "arc", d: "M 81,149 Q 100,167 119,149" },
    brow: ["M 53,30 Q 66,24 79,30", "M 121,30 Q 134,24 147,30"],
    blush: 0.45, anim: "bounce",
    extra: "stars"
  },
  thinking: {
    fr: "En réflexion", emoji: "🤔", color: "#f59e0b",
    msg: "Hmm, laisse-moi analyser ça...", trackEyes: true,
    eye: { s: 0.82, dy: -3, closed: false },
    mouth: { t: "arc", d: "M 92,153 Q 97,150 105,155" },
    brow: ["M 54,35 Q 66,30 77,26", "M 123,26 Q 134,30 145,35"],
    blush: 0, anim: "sway",
    extra: "dots"
  },
  surprised: {
    fr: "Surpris !", emoji: "😲", color: "#f59e0b",
    msg: "Waouh ! Je n'avais pas vu ça venir !", trackEyes: false,
    eye: { s: 1.45, dy: -3, closed: false },
    mouth: { t: "oval", cx: 100, cy: 155, rx: 9, ry: 12 },
    brow: ["M 51,27 Q 66,18 81,27", "M 119,27 Q 134,18 149,27"],
    blush: 0, anim: "jump",
    extra: "exclaim"
  },
  waving: {
    fr: "Il te salue", emoji: "👋", color: "#22c55e",
    msg: "Bienvenue sur Whappi ! 👋", trackEyes: false,
    eye: { s: 1, dy: 0, closed: false },
    mouth: { t: "arc", d: "M 84,150 Q 100,163 116,150" },
    brow: ["M 54,31 Q 66,27 78,31", "M 122,31 Q 134,27 146,31"],
    blush: 0.3, anim: "wave",
    extra: null
  },
  sleeping: {
    fr: "Endormi", emoji: "😴", color: "#6b7280",
    msg: null, trackEyes: false,
    eye: { s: 0, dy: 0, closed: true },
    mouth: { t: "line", d: "M 91,155 L 109,155" },
    brow: ["M 54,39 Q 66,43 77,39", "M 123,39 Q 134,43 145,39"],
    blush: 0, anim: "breathe",
    extra: "zzz"
  },
  sad: {
    fr: "Triste", emoji: "😢", color: "#3b82f6",
    msg: "Une connexion a été perdue...", trackEyes: false,
    eye: { s: 0.88, dy: 3, closed: false },
    mouth: { t: "arc", d: "M 87,159 Q 100,148 113,159" },
    brow: ["M 54,37 Q 66,42 77,37", "M 123,37 Q 134,42 145,37"],
    blush: 0, anim: "droop",
    extra: "tear"
  },
  alert: {
    fr: "Alerte !", emoji: "⚠️", color: "#ef4444",
    msg: "Lien suspect bloqué ! Groupe protégé.", trackEyes: false,
    eye: { s: 1.28, dy: 0, closed: false },
    mouth: { t: "line", d: "M 87,153 L 113,153" },
    brow: ["M 51,33 Q 66,24 82,38", "M 118,38 Q 134,24 149,33"],
    blush: 0, anim: "shake",
    extra: "exclaim"
  },
  working: {
    fr: "Au travail", emoji: "💼", color: "#22c55e",
    msg: "Je surveille vos groupes WhatsApp...", trackEyes: true,
    eye: { s: 0.88, dy: 0, closed: false },
    mouth: { t: "line", d: "M 89,153 L 111,153" },
    brow: ["M 54,32 Q 66,29 77,32", "M 123,32 Q 134,29 145,32"],
    blush: 0, anim: "float",
    extra: null
  },
  banning: {
    fr: "Modération", emoji: "🔨", color: "#ef4444",
    msg: "Spammer détecté et exclu ! 🔨", trackEyes: true,
    eye: { s: 1.1, dy: 2, closed: false },
    mouth: { t: "arc", d: "M 85,158 Q 100,150 115,158" },
    brow: ["M 51,25 Q 66,35 81,30", "M 119,30 Q 134,35 149,25"],
    blush: 0, anim: "pound",
    extra: "anger"
  },
  scheduled: {
    fr: "Programmé", emoji: "📅", color: "#8b5cf6",
    msg: "Message programmé envoyé avec succès !", trackEyes: false,
    eye: { s: 0.9, dy: 0, closed: false },
    mouth: { t: "arc", d: "M 88,152 Q 100,158 112,152" },
brow: ["M 54,32 Q 66,29 77,32", "M 123,32 Q 134,29 145,32"],
    blush: 0.2, anim: "ticktock",
    extra: "clocks"
  },
  protected: {
    fr: "Sécurisé", emoji: "🛡", color: "#06b6d4",
    msg: "Aucun lien suspect ne passera. Groupe protégé !", trackEyes: true,
    eye: { s: 1.05, dy: -1, closed: false },
    mouth: { t: "arc", d: "M 84,150 Q 100,165 116,150" },
    brow: ["M 54,28 Q 66,24 78,28", "M 122,28 Q 134,24 146,28"],
    blush: 0.1, anim: "float",
    extra: "shield"
  }
}

const ANIMS = {
  float:   "wappy-float 3.2s ease-in-out infinite",
  bounce:  "wappy-bounce 0.5s ease-in-out infinite",
  sway:    "wappy-sway 2.4s ease-in-out infinite",
  jump:    "wappy-jump 0.75s cubic-bezier(0.36,0.07,0.19,0.97)",
  wave:    "wappy-wave 0.45s ease-in-out infinite",
  breathe: "wappy-breathe 4.5s ease-in-out infinite",
  droop:   "wappy-droop 3s ease-in-out infinite",
  shake:   "wappy-shake 0.38s ease-in-out 4",
  pound:   "wappy-pound 0.6s ease-in-out infinite",
  ticktock:"wappy-ticktock 2s cubic-bezier(0.4, 0, 0.2, 1) infinite",
}

export default function WappyMascot({ state = "idle", size = 180, className = "", style = {} }) {
  const [key, setKey] = useState(state)
  const [pupils, setPupils] = useState({ lx: 0, ly: 0, rx: 0, ry: 0 })
  const [blink, setBlink] = useState(false)
  const [showMsg, setShowMsg] = useState(false)
  const [animKey, setAnimKey] = useState(0)
  const ref = useRef(null)
  const s = STATES[key]
  const eyeClosed = s.eye.closed || blink
  const eScale = eyeClosed ? 0 : s.eye.s
  const eDy = eyeClosed ? 0 : s.eye.dy

  // Sync prop state
  useEffect(() => {
    if (STATES[state]) {
      setKey(state)
      setAnimKey(n => n + 1)
      if (STATES[state].msg) { 
        setShowMsg(true)
        const t = setTimeout(() => setShowMsg(false), 4000)
        return () => clearTimeout(t)
      } else {
        setShowMsg(false)
      }
    }
  }, [state])

  // Eye tracking
  useEffect(() => {
    if (!s.trackEyes) { setPupils({ lx:0,ly:0,rx:0,ry:0 }); return }
    const fn = (e) => {
      if (!ref.current) return
      const r = ref.current.getBoundingClientRect()
      const MAX = 5.5, W = 200, H = 225
      const get = (sx, sy) => {
        const scl = W / r.width
        const dx = (e.clientX - (r.left + sx/W * r.width)) * scl
        const dy = (e.clientY - (r.top  + sy/H * r.height)) * scl
        const d = Math.sqrt(dx*dx+dy*dy)||1
        const t = Math.min(1, MAX/d)
        return { x: dx*t, y: dy*t }
      }
      const l = get(66,45), rv = get(134,45)
      setPupils({ lx:l.x, ly:l.y, rx:rv.x, ry:rv.y })
    }
    window.addEventListener("mousemove", fn)
    return () => window.removeEventListener("mousemove", fn)
  }, [key, s.trackEyes])

  // Auto-blink
  useEffect(() => {
    if (s.eye.closed) return
    let t
    const loop = () => {
      t = setTimeout(() => {
        setBlink(true)
        setTimeout(() => { setBlink(false); loop() }, 140)
      }, 2600 + Math.random()*2200)
    }
    loop()
    return () => clearTimeout(t)
  }, [key])

  // Idle random glance
  useEffect(() => {
    if (key !== "idle") return
    const iv = setInterval(() => {
      if (Math.random() > 0.6) {
        const a = Math.random()*Math.PI*2, d = 4
        setPupils({ lx:Math.cos(a)*d, ly:Math.sin(a)*d, rx:Math.cos(a)*d, ry:Math.sin(a)*d })
        setTimeout(() => setPupils({ lx:0,ly:0,rx:0,ry:0 }), 750)
      }
    }, 3000)
    return () => clearInterval(iv)
  }, [key])

  return (
    <>
      <style>{`
        @keyframes wappy-float  { 0%,100%{transform:translateY(0)}     50%{transform:translateY(-14px)} }
        @keyframes wappy-bounce { 0%,100%{transform:translateY(0) scaleY(1) scaleX(1)} 30%{transform:translateY(-24px) scaleY(1.07) scaleX(0.94)} 60%{transform:translateY(-8px) scaleY(0.96) scaleX(1.03)} 80%{transform:translateY(-16px)} }
        @keyframes wappy-sway   { 0%,100%{transform:rotate(0)translateY(0)} 30%{transform:rotate(-5deg)translateY(-5px)} 70%{transform:rotate(5deg)translateY(-5px)} }
        @keyframes wappy-jump   { 0%{transform:translateY(0)scale(1)}  20%{transform:translateY(-30px)scale(.94,1.1)} 40%{transform:translateY(5px)scale(1.06,.93)} 58%{transform:translateY(-13px)scale(1)} 74%{transform:translateY(2px)} 86%{transform:translateY(-6px)} 100%{transform:translateY(0)scale(1)} }
        @keyframes wappy-wave   { 0%,100%{transform:rotate(0)translateY(0)} 20%{transform:rotate(-11deg)translateY(-7px)} 45%{transform:rotate(11deg)translateY(-11px)} 65%{transform:rotate(-8deg)translateY(-5px)} 85%{transform:rotate(7deg)translateY(-3px)} }
        @keyframes wappy-breathe{ 0%,100%{transform:scale(1)translateY(0)} 50%{transform:scale(1.04)translateY(-4px)} }
        @keyframes wappy-droop  { 0%,100%{transform:translateY(0)rotate(0)} 50%{transform:translateY(10px)rotate(-2deg)} }
        @keyframes wappy-shake  { 0%,100%{transform:translateX(0)rotate(0)} 15%{transform:translateX(-10px)rotate(-3deg)} 30%{transform:translateX(10px)rotate(3deg)} 48%{transform:translateX(-8px)rotate(-2deg)} 62%{transform:translateX(8px)rotate(2deg)} 76%{transform:translateX(-4px)} 90%{transform:translateX(4px)} }
        @keyframes wappy-pound  { 0%,100%{transform:translateY(0) scaleY(1)} 20%{transform:translateY(-15px) scaleY(1.05)} 50%{transform:translateY(10px) scaleY(0.9)} 70%{transform:translateY(-5px) scaleY(1.02)} }
        @keyframes wappy-ticktock { 0%,100%{transform:rotate(0)} 25%{transform:rotate(10deg)} 75%{transform:rotate(-10deg)} }
        @keyframes bubble-in    { 0%{opacity:0;transform:translateX(-50%)translateY(-85%)scale(.72)} 65%{transform:translateX(-50%)translateY(-103%)scale(1.04)} 100%{opacity:1;transform:translateX(-50%)translateY(-100%)scale(1)} }
        @keyframes tear-fall    { 0%{transform:translateY(0);opacity:1} 100%{transform:translateY(18px);opacity:0} }
        @keyframes star-spin    { 0%{transform:rotate(0)scale(1)} 50%{transform:rotate(180deg)scale(1.2)} 100%{transform:rotate(360deg)scale(1)} }
        @keyframes dot-pulse    { 0%,100%{opacity:.4;transform:scale(.8)} 50%{opacity:1;transform:scale(1.1)} }
        @keyframes glow-pulse   { 0%,100%{opacity:.25} 50%{opacity:.45} }
        @keyframes clock-spin   { 0%{transform:rotate(0)} 100%{transform:rotate(360deg)} }
        @keyframes shield-pulse { 0%,100%{opacity:0.25; transform:scale(1)} 50%{opacity:0.55; transform:scale(1.04)} }
      `}</style>

      <div className={className} style={{
        position:"relative", display:"flex", flexDirection:"column", alignItems:"center",
        fontFamily:"'DM Sans',system-ui,sans-serif",
        width: size, ...style
      }}>
        {/* Ambient glow */}
        <div style={{
          position:"absolute", bottom:"20px", left:"50%",
          transform:"translateX(-50%)",
          width: "200px", height:"60px",
          background:`radial-gradient(ellipse, ${s.color}30, transparent 70%)`,
          filter:"blur(18px)",
          transition:"background .6s ease",
          animation:"glow-pulse 3s ease-in-out infinite",
          pointerEvents:"none"
        }}/>

        {/* Speech bubble */}
        {showMsg && s.msg && (
          <div style={{
            position:"absolute", top:0, left:"50%",
            transform:"translateX(-50%) translateY(-100%)",
            background:"#ffffff", color:"#0f1f0f",
            padding:"11px 18px", borderRadius:"18px",
            borderBottomLeftRadius:"5px",
            fontSize:"13px", fontWeight:600, lineHeight:1.45,
            maxWidth:"270px", textAlign:"center",
            boxShadow:"0 10px 40px rgba(0,0,0,.5)",
            animation:"bubble-in .4s cubic-bezier(.175,.885,.32,1.275) forwards",
            zIndex:20, whiteSpace:"normal",
            border:"1px solid #e0f2e9"
          }}>
            {s.msg}
            <div style={{
              position:"absolute", bottom:-7, left:"20px",
              width:0,height:0,
              borderLeft:"8px solid transparent",
              borderRight:"8px solid transparent",
              borderTop:"8px solid white"
            }}/>
          </div>
        )}

        {/* SVG CHARACTER */}
        <div
          ref={ref}
          key={animKey}
          style={{
            width:"100%",
            height:"auto",
            aspectRatio: "200/225",
            animation: ANIMS[s.anim],
            position:"relative", zIndex:10,
            userSelect:"none"
          }}
        >
          <svg viewBox="0 0 200 225" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
            <defs>
              {/* W body gradient */}
              <linearGradient id="wG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"  stopColor="#6ef08a"/>
                <stop offset="45%" stopColor="#22c55e"/>
                <stop offset="100%" stopColor="#14532d"/>
              </linearGradient>
              {/* Eye sclera */}
              <radialGradient id="scl" cx="38%" cy="32%">
                <stop offset="0%" stopColor="#f8fff8"/>
                <stop offset="100%" stopColor="#e8f5ea"/>
              </radialGradient>
              {/* Iris */}
              <radialGradient id="iris" cx="32%" cy="28%">
                <stop offset="0%" stopColor="#4ade80"/>
                <stop offset="100%" stopColor="#166534"/>
              </radialGradient>
              {/* Body shadow */}
              <filter id="bShadow" x="-22%" y="-12%" width="144%" height="138%">
                <feDropShadow dx="0" dy="10" stdDeviation="14" floodColor="#166534" floodOpacity=".38"/>
              </filter>
              {/* Eye glow */}
              <filter id="eGlow" x="-55%" y="-55%" width="210%" height="210%">
                <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#22c55e" floodOpacity=".55"/>
              </filter>
              {/* Alert glow */}
              <filter id="redGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#ef4444" floodOpacity=".7"/>
              </filter>
            </defs>

            {/* ── W BODY (stroke) ── */}
            <path
              d="M 24,75 C 24,180 42,205 66,205 C 86,205 100,150 100,125 C 100,150 114,205 134,205 C 158,205 176,180 176,75"
              stroke="url(#wG)"
              strokeWidth="38"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              filter="url(#bShadow)"
            />

            {/* ── BLUSH ── */}
            {s.blush > 0 && <>
              <ellipse cx="66" cy="80" rx="13" ry="9"
                fill="#f9a8c9" opacity={s.blush}
                style={{ transition:"opacity .4s" }}/>
              <ellipse cx="134" cy="80" rx="13" ry="9"
                fill="#f9a8c9" opacity={s.blush}
                style={{ transition:"opacity .4s" }}/>
            </>}

            {/* ── LEFT EYE ── */}
            <g filter="url(#eGlow)">
              <circle cx="66" cy="45" r="21" fill="url(#scl)"/>
              {!eyeClosed ? <>
                <circle
                  cx={66 + pupils.lx} cy={45 + eDy + pupils.ly}
                  r={14.5 * eScale} fill="url(#iris)"
                  style={{ transition:"r .12s" }}
                />
                <circle
                  cx={66 + pupils.lx} cy={45 + eDy + pupils.ly}
                  r={9 * eScale} fill="#091409"
                  style={{ transition:"r .12s" }}
                />
                <circle cx={71 + pupils.lx*.35} cy={40 + eDy + pupils.ly*.35} r="3.4" fill="white" opacity=".95"/>
                <circle cx={60 + pupils.lx*.2}  cy={50 + eDy + pupils.ly*.2}  r="1.6" fill="white" opacity=".45"/>
              </> :
                <path d="M 47,45 Q 66,55 85,45" stroke="#15803d" strokeWidth="3.8" fill="none" strokeLinecap="round"/>
              }
            </g>

            {/* ── RIGHT EYE ── */}
            <g filter="url(#eGlow)">
              <circle cx="134" cy="45" r="21" fill="url(#scl)"/>
              {!eyeClosed ? <>
                <circle
                  cx={134 + pupils.rx} cy={45 + eDy + pupils.ry}
                  r={14.5 * eScale} fill="url(#iris)"
                  style={{ transition:"r .12s" }}
                />
                <circle
                  cx={134 + pupils.rx} cy={45 + eDy + pupils.ry}
                  r={9 * eScale} fill="#091409"
                  style={{ transition:"r .12s" }}
                />
                <circle cx={139 + pupils.rx*.35} cy={40 + eDy + pupils.ry*.35} r="3.4" fill="white" opacity=".95"/>
                <circle cx={128 + pupils.rx*.2}  cy={50 + eDy + pupils.ry*.2}  r="1.6" fill="white" opacity=".45"/>
              </> :
                <path d="M 115,45 Q 134,55 153,45" stroke="#15803d" strokeWidth="3.8" fill="none" strokeLinecap="round"/>
              }
            </g>

            {/* ── BROWS ── */}
            <path d={s.brow[0]} stroke="#134e1b" strokeWidth="4" fill="none" strokeLinecap="round"/>
            <path d={s.brow[1]} stroke="#134e1b" strokeWidth="4" fill="none" strokeLinecap="round"/>

            {/* ── MOUTH ── */}
            {s.mouth.t === "arc"  && <path d={s.mouth.d} stroke="#134e1b" strokeWidth="4" fill="none" strokeLinecap="round"/>}
            {s.mouth.t === "oval" && <ellipse cx={s.mouth.cx} cy={s.mouth.cy} rx={s.mouth.rx} ry={s.mouth.ry} fill="#134e1b"/>}
            {s.mouth.t === "line" && <path d={s.mouth.d} stroke="#134e1b" strokeWidth="4" fill="none" strokeLinecap="round"/>}

            {/* ── EXTRAS ── */}

            {/* ZZZ - sleeping */}
            {key === "sleeping" && (
              <g fill="#9ca3af" fontFamily="Syne,system-ui" fontWeight="800">
                <text x="152" y="52" fontSize="14" opacity=".5">z</text>
                <text x="163" y="39" fontSize="18" opacity=".7">z</text>
                <text x="177" y="23" fontSize="24" opacity=".9">Z</text>
              </g>
            )}

            {/* ! - alert / surprised */}
            {(key === "alert" || key === "surprised") && (
              <g filter={key==="alert"?"url(#redGlow)":undefined}>
                <circle cx="100" cy="22" r="13" fill={key==="alert"?"#ef4444":"#f59e0b"} opacity=".95"/>
                <text x="100" y="28" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold" fontFamily="system-ui">!</text>
              </g>
            )}

            {/* Thinking dots */}
            {key === "thinking" && [
              {x:153,y:52,r:5,delay:"0s"},
              {x:164,y:38,r:7,delay:".15s"},
              {x:178,y:22,r:9,delay:".3s"}
            ].map((d,i) => (
              <circle key={i} cx={d.x} cy={d.y} r={d.r}
                fill="#fbbf24" opacity=".85"
                style={{ animation:`dot-pulse 1.2s ease-in-out infinite`, animationDelay:d.delay }}
              />
            ))}

            {/* Stars - happy */}
            {key === "happy" && <>
              <text x="22" y="48" fontSize="18"
                style={{ animation:"star-spin 3s linear infinite", transformOrigin:"30px 40px" }}>
                ✦
              </text>
              <text x="160" y="46" fontSize="14"
                style={{ animation:"star-spin 2s linear infinite reverse", transformOrigin:"167px 39px" }}>
                ✦
              </text>
            </>}

            {/* Tear - sad */}
            {key === "sad" && (
              <ellipse cx="78" cy="70" rx="4" ry="6"
                fill="#93c5fd" opacity=".8"
                style={{ animation:"tear-fall 1.8s ease-in infinite" }}
              />
            )}

            {/* Shield - protected */}
            {key === "protected" && (
              <g style={{ animation:"shield-pulse 2.5s ease-in-out infinite", transformOrigin:"100px 115px" }}>
                <path d="M 100,5 L 180,35 L 180,105 C 180,165 100,215 100,215 C 100,215 20,165 20,105 L 20,35 Z" 
                  fill="none" stroke="#06b6d4" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
                <path d="M 100,18 L 165,42 L 165,100 C 165,150 100,195 100,195 C 100,195 35,150 35,100 L 35,42 Z" 
                  fill="none" stroke="#22d3ee" strokeWidth="3" strokeDasharray="8 8" opacity="0.5" />
              </g>
            )}

            {/* Clocks - scheduled */}
            {key === "scheduled" && <>
              <g style={{ animation:"clock-spin 3s linear infinite", transformOrigin:"165px 35px" }}>
                <circle cx="165" cy="35" r="14" fill="#8b5cf6" opacity="0.9" />
                <circle cx="165" cy="35" r="11" fill="#fff" />
                <path d="M 165,35 L 165,27 M 165,35 L 170,38" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" />
              </g>
              <g style={{ animation:"clock-spin 4s linear infinite", transformOrigin:"35px 55px" }}>
                <circle cx="35" cy="55" r="10" fill="#a78bfa" opacity="0.9" />
                <circle cx="35" cy="55" r="7.5" fill="#fff" />
                <path d="M 35,55 L 35,50 M 35,55 L 38,57" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" />
              </g>
            </>}

            {/* Anger marks - banning */}
            {key === "banning" && (
              <g>
                <path d="M 135,15 L 150,25 M 150,15 L 135,25" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
                <path d="M 50,15 L 65,25 M 65,15 L 50,25" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
              </g>
            )}

            {/* WhatsApp Notification Badge (on alert and banning) */}
            {(key === "alert" || key === "banning") && (
              <g style={{ animation:"wappy-bounce 1s infinite", transformOrigin:"175px 25px" }}>
                <circle cx="175" cy="25" r="14" fill="#ef4444" stroke="#070c07" strokeWidth="3" />
                <text x="175" y="30" fill="#fff" fontSize="13" fontWeight="900" textAnchor="middle" fontFamily="system-ui">1</text>
              </g>
            )}
          </svg>
        </div>

        {/* Name + state badge */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"6px", marginTop:"2px" }}>
          <span style={{
            fontFamily:"'Syne',sans-serif", fontWeight:700,
            fontSize:"10px", color:"#2d4a2d", letterSpacing:"3.5px",
            textTransform:"uppercase"
          }}>WAPPY</span>
          <div style={{
            background:`${s.color}16`,
            border:`1px solid ${s.color}3a`,
            color: s.color, padding:"5px 16px",
            borderRadius:"20px", fontSize:"12px", fontWeight:700,
            transition:"all .35s ease", letterSpacing:".3px"
          }}>
            {s.emoji} {s.fr}
          </div>
        </div>
      </div>
    </>
  )
}
