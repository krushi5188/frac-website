interface FracIconProps {
  size?: number
  className?: string
}

export default function FracIcon({ size = 120, className = '' }: FracIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Geometric fractional pieces - minimal white */}
      <path
        d="M30 30 L60 30 L45 60 Z"
        fill="#ffffff"
        opacity="0.9"
      />
      <path
        d="M60 30 L90 30 L90 60 L60 60 Z"
        fill="#ffffff"
        opacity="0.7"
      />
      <path
        d="M30 60 L60 60 L30 90 Z"
        fill="#ffffff"
        opacity="0.8"
      />
      <path
        d="M60 60 L90 60 L75 90 Z"
        fill="#ffffff"
        opacity="0.85"
      />
    </svg>
  )
}
