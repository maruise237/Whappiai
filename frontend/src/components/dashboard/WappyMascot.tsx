"use client"

import { useState, useEffect, useRef } from "react"

// ════════════════════════════════════════
// ÉTATS DE WAPPY
// ════════════════════════════════════════
export const WAPPY_STATES = {
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
  protected: {
    fr: "Protégé !", emoji: "🛡️", color: "#22c55e",
    msg: "Groupe sécurisé ! Aucun lien suspect détecté.", trackEyes: false,
    eye: { s: 1.08, dy: -1, closed: false },
    mouth: { t: "arc", d: "M 83,150 Q 100,165 117,150" },
    brow: ["M 53,30 Q 66,25 78,30", "M 122,30 Q 134,25 146,30"],
    blush: 0.2, anim: "bounce",
    extra: "shield"
  },
  banning: {
    fr: "Bannissement !", emoji: "🔨", color: "#ef4444",
    msg: "Membre banni du groupe !", trackEyes: false,
    eye: { s: 1.25, dy: 0, closed: false },
    mouth: { t: "arc", d: "M 84,151 Q 100,160 116,151" },
    brow: ["M 50,34 Q 66,26 81,42", "M 119,42 Q 134,26 150,34"],
    blush: 0, anim: "shake",
    extra: "hammer"
  },
  scheduled: {
    fr: "Programmé", emoji: "⏰", color: "#22c55e",
    msg: "Message programmé avec succès ! ⏰", trackEyes: false,
    eye: { s: 1, dy: 0, closed: false },
    mouth: { t: "arc", d: "M 85,150 Q 100,164 115,150" },
    brow: ["M 54,31 Q 66,27 78,31", "M 122,31 Q 134,27 146,31"],
    blush: 0.2, anim: "float",
    extra: "clock"
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
}

export default function WappyMascot({ state = "idle", size = 160, className = "", style = {} }) {
  const [pupils, setPupils] = useState({ lx:0, ly:0, rx:0, ry:0 })
  const [blink, setBlink] = useState(false)
  const [showMsg, setShowMsg] = useState(false)
  const [prevState, setPrevState] = useState(state)
  const ref = useRef(null)
  const s = WAPPY_STATES[state] || WAPPY_STATES.idle
  const eyeClosed = s.eye.closed || blink
  const eScale = eyeClosed ? 0 : s.eye.s
  const eDy = eyeClosed ? 0 : s.eye.dy

  // Show message when state changes
  useEffect(() => {
    if (state !== prevState) {
      setPrevState(state)
      if (s.msg) {
        setShowMsg(true)
        const t = setTimeout(() => setShowMsg(false), 4000)
        return () => clearTimeout(t)
      } else {
        setShowMsg(false)
      }
    }
  }, [state, prevState, s.msg])

  // Eye tracking
  useEffect(() => {
    if (!s.trackEyes) { setPupils({ lx:0,ly:0,rx:0,ry:0 }); return }
    const fn = (e) => {
      if (!ref.current) return
      const r = ref.current.getBoundingClientRect()
      const W = r.width, H = r.height
      const MAX = 5.5
      const get = (sx, sy) => {
        const dx = (e.clientX - (r.left + sx/W * W)) * (200/W)
        const dy = (e.clientY - (r.top  + sy/H * H)) * (225/H)
        const d = Math.sqrt(dx*dx+dy*dy)||1
        const t = Math.min(1, MAX/d)
        return { x: dx*t, y: dy*t }
      }
      const l = get(66,45), rv = get(134,45)
      setPupils({ lx:l.x, ly:l.y, rx:rv.x, ry:rv.y })
    }
    window.addEventListener("mousemove", fn)
    return () => window.removeEventListener("mousemove", fn)
  }, [state, s.trackEyes])

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
  }, [state, s.eye.closed])

  // Idle random glance
  useEffect(() => {
    if (state !== "idle") return
    const iv = setInterval(() => {
      if (Math.random() > 0.6) {
        const a = Math.random()*Math.PI*2, d = 4
        setPupils({ lx:Math.cos(a)*d, ly:Math.sin(a)*d, rx:Math.cos(a)*d, ry:Math.sin(a)*d })
        setTimeout(() => setPupils({ lx:0,ly:0,rx:0,ry:0 }), 750)
      }
    }, 3000)
    return () => clearInterval(iv)
  }, [state])

  return (
    <>
      <style>{`
        @keyframes wappy-float  { 0%,100%{transform:translateY(0)}     50%{transform:translateY(-14px)} }
        @keyframes wappy-bounce { 0%,100%{transform:translateY(0)scaleY(1)scaleX(1)} 30%{transform:translateY(-24px)scaleY(1.07)scaleX(0.94)} 60%{transform:translateY(-8px)scaleY(0.96)scaleX(1.03)} 80%{transform:translateY(-16px)} }
        @keyframes wappy-sway   { 0%,100%{transform:rotate(0)translateY(0)} 30%{transform:rotate(-5deg)translateY(-5px)} 70%{transform:rotate(5deg)translateY(-5px)} }
        @keyframes wappy-jump   { 0%{transform:translateY(0)scale(1)}  20%{transform:translateY(-30px)scale(.94,1.1)} 40%{transform:translateY(5px)scale(1.06,.93)} 58%{transform:translateY(-13px)scale(1)} 74%{transform:translateY(2px)} 86%{transform:translateY(-6px)} 100%{transform:translateY(0)scale(1)} }
        @keyframes wappy-wave   { 0%,100%{transform:rotate(0)translateY(0)} 20%{transform:rotate(-11deg)translateY(-7px)} 45%{transform:rotate(11deg)translateY(-11px)} 65%{transform:rotate(-8deg)translateY(-5px)} 85%{transform:rotate(7deg)translateY(-3px)} }
        @keyframes wappy-breathe{ 0%,100%{transform:scale(1)translateY(0)} 50%{transform:scale(1.04)translateY(-4px)} }
        @keyframes wappy-droop  { 0%,100%{transform:translateY(0)rotate(0)} 50%{transform:translateY(10px)rotate(-2deg)} }
        @keyframes wappy-shake  { 0%,100%{transform:translateX(0)rotate(0)} 15%{transform:translateX(-10px)rotate(-3deg)} 30%{transform:translateX(10px)rotate(3deg)} 48%{transform:translateX(-8px)rotate(-2deg)} 62%{transform:translateX(8px)rotate(2deg)} 76%{transform:translateX(-4px)} 90%{transform:translateX(4px)} }
        @keyframes wappy-bubble-in { 0%{opacity:0;transform:translateX(-50%)translateY(-85%)scale(.72)} 65%{transform:translateX(-50%)translateY(-103%)scale(1.04)} 100%{opacity:1;transform:translateX(-50%)translateY(-100%)scale(1)} }
        @keyframes wappy-tear-fall { 0%{transform:translateY(0);opacity:1} 100%{transform:translateY(18px);opacity:0} }
        @keyframes wappy-star-spin { 0%{transform:rotate(0)scale(1)} 50%{transform:rotate(180deg)scale(1.2)} 100%{transform:rotate(360deg)scale(1)} }
        @keyframes wappy-dot-pulse { 0%,100%{opacity:.4;transform:scale(.8)} 50%{opacity:1;transform:scale(1.1)} }
      `}</style>

      <div
        ref={ref}
        className={className}
        style={{
          width: size,
          height: size,
          animation: ANIMS[s.anim],
          position: "relative",
          pointerEvents: "auto",
          userSelect: "none",
          ...style
        }}
      >
        {/* Speech bubble */}
        {showMsg && s.msg && (
          <div style={{
            position:"absolute", top:0, left:"50%",
            transform:"translateX(-50%) translateY(-100%)",
            background:"#ffffff", color:"#0f1f0f",
            padding:"8px 14px", borderRadius:"16px",
            borderBottomLeftRadius:"5px",
            fontSize:"12px", fontWeight:600, lineHeight:1.4,
            maxWidth:"240px", textAlign:"center",
            boxShadow:"0 8px 30px rgba(0,0,0,.35)",
            animation:"wappy-bubble-in .4s cubic-bezier(.175,.885,.32,1.275) forwards",
            zIndex:30, whiteSpace:"normal",
            border:"1px solid #e0f2e9"
          }}>
            {s.msg}
            <div style={{
              position:"absolute", bottom:-7, left:"20px",
              width:0,height:0,
              borderLeft:"7px solid transparent",
              borderRight:"7px solid transparent",
              borderTop:"7px solid white"
            }}/>
          </div>
        )}

        <svg viewBox="0 0 200 225" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
          <defs>
            <linearGradient id="wG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor="#6ef08a"/>
              <stop offset="45%" stopColor="#22c55e"/>
              <stop offset="100%" stopColor="#14532d"/>
            </linearGradient>
            <radialGradient id="scl" cx="38%" cy="32%">
              <stop offset="0%" stopColor="#f8fff8"/>
              <stop offset="100%" stopColor="#e8f5ea"/>
            </radialGradient>
            <radialGradient id="iris" cx="32%" cy="28%">
              <stop offset="0%" stopColor="#4ade80"/>
              <stop offset="100%" stopColor="#166534"/>
            </radialGradient>
            <filter id="bShadow" x="-22%" y="-12%" width="144%" height="138%">
              <feDropShadow dx="0" dy="10" stdDeviation="14" floodColor="#166534" floodOpacity=".38"/>
            </filter>
            <filter id="eGlow" x="-55%" y="-55%" width="210%" height="210%">
              <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#22c55e" floodOpacity=".55"/>
            </filter>
            <filter id="redGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#ef4444" floodOpacity=".7"/>
            </filter>
          </defs>

          {/* W BODY */}
          <path d={`M 18,222 C 18,222 20,148 34,120 C 44,100 53,86 64,80 C 68,84 73,97 82,112 C 89,125 93,138 100,143 C 107,138 111,125 118,112 C 127,97 132,84 136,80 C 147,86 156,100 166,120 C 180,148 182,222 182,222 Z`}
            fill="url(#wG)" filter="url(#bShadow)"/>

          {/* BLUSH */}
          {s.blush > 0 && <>
            <ellipse cx="51" cy="105" rx="13" ry="9" fill="#f9a8c9" opacity={s.blush} style={{transition:"opacity .4s"}}/>
            <ellipse cx="149" cy="105" rx="13" ry="9" fill="#f9a8c9" opacity={s.blush} style={{transition:"opacity .4s"}}/>
          </>}

          {/* LEFT EYE */}
          <g filter="url(#eGlow)">
            <circle cx="66" cy="45" r="21" fill="url(#scl)"/>
            {!eyeClosed ? <>
              <circle cx={66+pupils.lx} cy={45+eDy+pupils.ly} r={14.5*eScale} fill="url(#iris)"/>
              <circle cx={66+pupils.lx} cy={45+eDy+pupils.ly} r={9*eScale} fill="#091409"/>
              <circle cx={71+pupils.lx*.35} cy={40+eDy+pupils.ly*.35} r="3.4" fill="white" opacity=".95"/>
              <circle cx={60+pupils.lx*.2}  cy={50+eDy+pupils.ly*.2}  r="1.6" fill="white" opacity=".45"/>
            </> : <path d="M 47,45 Q 66,55 85,45" stroke="#15803d" strokeWidth="3.8" fill="none" strokeLinecap="round"/>}
          </g>

          {/* RIGHT EYE */}
          <g filter="url(#eGlow)">
            <circle cx="134" cy="45" r="21" fill="url(#scl)"/>
            {!eyeClosed ? <>
              <circle cx={134+pupils.rx} cy={45+eDy+pupils.ry} r={14.5*eScale} fill="url(#iris)"/>
              <circle cx={134+pupils.rx} cy={45+eDy+pupils.ry} r={9*eScale} fill="#091409"/>
              <circle cx={139+pupils.rx*.35} cy={40+eDy+pupils.ry*.35} r="3.4" fill="white" opacity=".95"/>
              <circle cx={128+pupils.rx*.2}  cy={50+eDy+pupils.ry*.2}  r="1.6" fill="white" opacity=".45"/>
            </> : <path d="M 115,45 Q 134,55 153,45" stroke="#15803d" strokeWidth="3.8" fill="none" strokeLinecap="round"/>}
          </g>

          {/* BROWS */}
          <path d={s.brow[0]} stroke="#134e1b" strokeWidth="4" fill="none" strokeLinecap="round"/>
          <path d={s.brow[1]} stroke="#134e1b" strokeWidth="4" fill="none" strokeLinecap="round"/>

          {/* MOUTH */}
          {s.mouth.t === "arc"  && <path d={s.mouth.d} stroke="#134e1b" strokeWidth="4" fill="none" strokeLinecap="round"/>}
          {s.mouth.t === "oval" && <ellipse cx={s.mouth.cx} cy={s.mouth.cy} rx={s.mouth.rx} ry={s.mouth.ry} fill="#134e1b"/>}
          {s.mouth.t === "line" && <path d={s.mouth.d} stroke="#134e1b" strokeWidth="4" fill="none" strokeLinecap="round"/>}

          {/* ZZZ sleeping */}
          {state === "sleeping" && (
            <g fill="#9ca3af" fontFamily="Syne,system-ui" fontWeight="800">
              <text x="152" y="52" fontSize="14" opacity=".5">z</text>
              <text x="163" y="39" fontSize="18" opacity=".7">z</text>
              <text x="177" y="23" fontSize="24" opacity=".9">Z</text>
            </g>
          )}

          {/* ! alert / surprised */}
          {(state === "alert" || state === "surprised") && (
            <g filter={state==="alert"?"url(#redGlow)":undefined}>
              <circle cx="100" cy="22" r="13" fill={state==="alert"?"#ef4444":"#f59e0b"} opacity=".95"/>
              <text x="100" y="28" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold" fontFamily="system-ui">!</text>
            </g>
          )}

          {/* Thinking dots */}
          {state === "thinking" && [
            {x:153,y:52,r:5,delay:"0s"},
            {x:164,y:38,r:7,delay:".15s"},
            {x:178,y:22,r:9,delay:".3s"}
          ].map((d,i) => (
            <circle key={i} cx={d.x} cy={d.y} r={d.r}
              fill="#fbbf24" opacity=".85"
              style={{ animation:"wappy-dot-pulse 1.2s ease-in-out infinite", animationDelay:d.delay }}
            />
          ))}

          {/* Stars - happy */}
          {state === "happy" && <>
            <text x="22" y="48" fontSize="18" style={{ animation:"wappy-star-spin 3s linear infinite", transformOrigin:"30px 40px" }}>✦</text>
            <text x="160" y="46" fontSize="14" style={{ animation:"wappy-star-spin 2s linear infinite reverse", transformOrigin:"167px 39px" }}>✦</text>
          </>}

          {/* Tear - sad */}
          {state === "sad" && (
            <ellipse cx="78" cy="70" rx="4" ry="6" fill="#93c5fd" opacity=".8"
              style={{ animation:"wappy-tear-fall 1.8s ease-in infinite" }}/>
          )}
        </svg>
      </div>
    </>
  )
}
