export default function WhappiLoader({ size = 100, color = "#22c55e", className = "" }) {
  return (
    <div className={className} style={{ width: size, height: "auto", aspectRatio: "200/225", display: "inline-block" }}>
      <style>{`
        @keyframes loader-dot-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(28px); }
        }
        @keyframes loader-w-pulse {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.02); }
        }
      `}</style>
      <svg viewBox="0 0 200 225" width="100%" height="100%" style={{ overflow: "visible" }}>
        {/* Le W principal qui pulse légèrement */}
        <path
          d="M 24,75 C 24,180 42,205 66,205 C 86,205 100,150 100,125 C 100,150 114,205 134,205 C 158,205 176,180 176,75"
          stroke={color} 
          strokeWidth="38" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          fill="none"
          style={{ 
            animation: "loader-w-pulse 2s ease-in-out infinite",
            transformOrigin: "center bottom"
          }}
        />
        
        {/* Point gauche (descend en premier) */}
        <circle 
          cx="66" cy="30" r="19" fill={color} 
          style={{ 
            animation: "loader-dot-bounce 1s cubic-bezier(0.4, 0, 0.2, 1) infinite" 
          }}
        />
        
        {/* Point droit (descend avec un décalage asynchrone) */}
        <circle 
          cx="134" cy="30" r="19" fill={color} 
          style={{ 
            animation: "loader-dot-bounce 1s cubic-bezier(0.4, 0, 0.2, 1) 0.5s infinite" 
          }}
        />
      </svg>
    </div>
  )
}
