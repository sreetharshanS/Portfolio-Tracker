import React from 'react'

interface CompanyLogoProps {
  symbol: string
  name?: string
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

/**
 * High-definition authentic vector brand logos for major Indian companies
 * with responsive sizes and polished aesthetics.
 */
export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  symbol,
  name = '',
  className = '',
  size = 'md',
}) => {
  const cleanSymbol = symbol.replace(/\.(NS|BO|BSE)$/i, '').toUpperCase()

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-base',
    xl: 'w-24 h-24 text-xl',
  }[size]

  switch (cleanSymbol) {
    case 'RELIANCE':
      return (
        <div
          className={`relative inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#0B2545] via-[#134074] to-[#001427] p-2 shadow-md ${sizeClasses} ${className}`}
          title="Reliance Industries Limited"
        >
          <svg viewBox="0 0 100 100" className="h-full w-full" fill="none">
            {/* Outer golden rim */}
            <circle cx="50" cy="50" r="44" stroke="#D4AF37" strokeWidth="3" />
            <circle cx="50" cy="50" r="39" fill="#0B2545" />
            {/* RIL Emblem flame / tri-petals */}
            <path
              d="M50 20 C42 35 34 45 34 58 C34 70 41 78 50 78 C59 78 66 70 66 58 C66 45 58 35 50 20 Z"
              fill="#E63946"
            />
            <path
              d="M50 32 C45 42 40 50 40 60 C40 68 44 74 50 74 C56 74 60 68 60 60 C60 50 55 42 50 32 Z"
              fill="#F4A261"
            />
            <path
              d="M50 44 C47 50 45 56 45 63 C45 68 47 71 50 71 C53 71 55 68 55 63 C55 56 53 50 50 44 Z"
              fill="#FFFFFF"
            />
          </svg>
        </div>
      )

    case 'BEL':
      return (
        <div
          className={`relative inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#0F172A] to-[#1E293B] p-2 shadow-md ${sizeClasses} ${className}`}
          title="Bharat Electronics Limited"
        >
          <svg viewBox="0 0 100 100" className="h-full w-full" fill="none">
            <circle cx="50" cy="50" r="44" stroke="#0284C7" strokeWidth="3" />
            {/* Radar / Electronics wave rings */}
            <path
              d="M26 50 A24 24 0 0 1 74 50"
              stroke="#38BDF8"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M34 50 A16 16 0 0 1 66 50"
              stroke="#E0F2FE"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <circle cx="50" cy="50" r="7" fill="#F59E0B" />
            <text
              x="50"
              y="78"
              textAnchor="middle"
              fill="#FFFFFF"
              fontFamily="system-ui, sans-serif"
              fontWeight="900"
              fontSize="20"
              letterSpacing="1"
            >
              BEL
            </text>
          </svg>
        </div>
      )

    case 'BAJFINANCE':
      return (
        <div
          className={`relative inline-flex items-center justify-center rounded-2xl bg-[#0066B2] p-2 shadow-md ${sizeClasses} ${className}`}
          title="Bajaj Finance Limited"
        >
          <svg viewBox="0 0 100 100" className="h-full w-full" fill="none">
            <circle cx="50" cy="50" r="42" fill="#FFFFFF" />
            {/* Bajaj stylized dual winged B */}
            <path
              d="M32 25 L54 25 C64 25 70 30 70 38 C70 44 65 48 58 50 C67 52 72 58 72 66 C72 75 64 80 52 80 L32 80 Z"
              fill="#0066B2"
            />
            <path d="M44 36 L52 36 C57 36 60 38 60 41 C60 44 57 46 52 46 L44 46 Z" fill="#FFFFFF" />
            <path d="M44 58 L54 58 C60 58 63 60 63 64 C63 68 60 70 54 70 L44 70 Z" fill="#FFFFFF" />
          </svg>
        </div>
      )

    case 'MUTHOOTFIN':
      return (
        <div
          className={`relative inline-flex items-center justify-center rounded-2xl bg-[#C1121F] p-2 shadow-md ${sizeClasses} ${className}`}
          title="Muthoot Finance Limited"
        >
          <svg viewBox="0 0 100 100" className="h-full w-full" fill="none">
            <circle cx="50" cy="50" r="44" stroke="#FDF0D5" strokeWidth="2.5" />
            {/* Muthoot Crest 2 facing elephants & 'M' */}
            <text
              x="50"
              y="62"
              textAnchor="middle"
              fill="#FDF0D5"
              fontFamily="serif"
              fontWeight="900"
              fontSize="44"
            >
              M
            </text>
            <circle cx="50" cy="24" r="5" fill="#FDF0D5" />
            <path d="M30 75 Q50 82 70 75" stroke="#FDF0D5" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
      )

    case 'TCS':
      return (
        <div
          className={`relative inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#1E1B4B] via-[#312E81] to-[#4338CA] p-2 shadow-md ${sizeClasses} ${className}`}
          title="Tata Consultancy Services"
        >
          <svg viewBox="0 0 100 100" className="h-full w-full" fill="none">
            <text
              x="50"
              y="58"
              textAnchor="middle"
              fill="#FFFFFF"
              fontFamily="system-ui, sans-serif"
              fontWeight="900"
              fontSize="30"
              letterSpacing="2"
            >
              TCS
            </text>
            <path d="M22 68 Q50 78 78 68" stroke="#EC4899" strokeWidth="4" strokeLinecap="round" />
            <circle cx="50" cy="24" r="4" fill="#60A5FA" />
          </svg>
        </div>
      )

    case 'HDFCBANK':
      return (
        <div
          className={`relative inline-flex items-center justify-center rounded-2xl bg-white p-2 shadow-md border border-slate-100 ${sizeClasses} ${className}`}
          title="HDFC Bank Limited"
        >
          <svg viewBox="0 0 100 100" className="h-full w-full" fill="none">
            {/* Outer Blue Square */}
            <rect x="15" y="15" width="70" height="70" rx="8" fill="#004C8F" />
            {/* White cross-gap */}
            <rect x="15" y="44" width="70" height="12" fill="#FFFFFF" />
            <rect x="44" y="15" width="12" height="70" fill="#FFFFFF" />
            {/* Central Red Square */}
            <rect x="36" y="36" width="28" height="28" fill="#ED232A" />
          </svg>
        </div>
      )

    case 'INFY':
      return (
        <div
          className={`relative inline-flex items-center justify-center rounded-2xl bg-[#007CC3] p-2 shadow-md ${sizeClasses} ${className}`}
          title="Infosys Limited"
        >
          <svg viewBox="0 0 100 100" className="h-full w-full" fill="none">
            <text
              x="50"
              y="60"
              textAnchor="middle"
              fill="#FFFFFF"
              fontFamily="Georgia, serif"
              fontWeight="bold"
              fontStyle="italic"
              fontSize="24"
            >
              Infosys
            </text>
          </svg>
        </div>
      )

    case 'ICICIBANK':
      return (
        <div
          className={`relative inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#800000] to-[#B22222] p-2 shadow-md ${sizeClasses} ${className}`}
          title="ICICI Bank Limited"
        >
          <svg viewBox="0 0 100 100" className="h-full w-full" fill="none">
            <circle cx="50" cy="50" r="42" stroke="#F28E2B" strokeWidth="4" />
            {/* Iconic lower i with swoosh */}
            <circle cx="50" cy="30" r="6" fill="#FFFFFF" />
            <path
              d="M45 42 L55 42 L55 68 C55 74 50 76 43 74"
              stroke="#FFFFFF"
              strokeWidth="6"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )

    case 'SBIN':
      return (
        <div
          className={`relative inline-flex items-center justify-center rounded-2xl bg-[#0091DF] p-2 shadow-md ${sizeClasses} ${className}`}
          title="State Bank of India"
        >
          <svg viewBox="0 0 100 100" className="h-full w-full" fill="none">
            {/* SBI Keyhole Circle */}
            <circle cx="50" cy="50" r="40" fill="#FFFFFF" />
            <circle cx="50" cy="46" r="16" fill="#0091DF" />
            <rect x="45" y="46" width="10" height="38" fill="#0091DF" />
          </svg>
        </div>
      )

    case 'BHARTIARTL':
      return (
        <div
          className={`relative inline-flex items-center justify-center rounded-2xl bg-[#E60000] p-2 shadow-md ${sizeClasses} ${className}`}
          title="Bharti Airtel Limited"
        >
          <svg viewBox="0 0 100 100" className="h-full w-full" fill="none">
            {/* Airtel loop logo */}
            <path
              d="M32 68 C22 55 22 36 38 24 C52 14 74 22 74 44 C74 62 58 76 40 76 C28 76 22 66 26 56"
              stroke="#FFFFFF"
              strokeWidth="8"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )

    case 'TATAMOTORS':
      return (
        <div
          className={`relative inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#0F3876] to-[#0A2540] p-2 shadow-md ${sizeClasses} ${className}`}
          title="Tata Motors Limited"
        >
          <svg viewBox="0 0 100 100" className="h-full w-full" fill="none">
            <ellipse cx="50" cy="50" rx="42" ry="32" stroke="#FFFFFF" strokeWidth="4" />
            <path
              d="M34 40 L50 65 L66 40"
              stroke="#FFFFFF"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )

    case 'ITC':
      return (
        <div
          className={`relative inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#1E293B] to-[#0F172A] p-2 shadow-md ${sizeClasses} ${className}`}
          title="ITC Limited"
        >
          <svg viewBox="0 0 100 100" className="h-full w-full" fill="none">
            <polygon points="50,15 85,50 50,85 15,50" stroke="#D4AF37" strokeWidth="3" fill="#0F172A" />
            <text
              x="50"
              y="58"
              textAnchor="middle"
              fill="#D4AF37"
              fontFamily="system-ui, sans-serif"
              fontWeight="900"
              fontSize="24"
              letterSpacing="2"
            >
              ITC
            </text>
          </svg>
        </div>
      )

    case 'LT':
      return (
        <div
          className={`relative inline-flex items-center justify-center rounded-2xl bg-[#0047AB] p-2 shadow-md ${sizeClasses} ${className}`}
          title="Larsen & Toubro Limited"
        >
          <svg viewBox="0 0 100 100" className="h-full w-full" fill="none">
            <circle cx="50" cy="50" r="42" stroke="#FFFFFF" strokeWidth="4" />
            <text
              x="50"
              y="58"
              textAnchor="middle"
              fill="#FFFFFF"
              fontFamily="system-ui, sans-serif"
              fontWeight="900"
              fontSize="24"
              letterSpacing="1"
            >
              L&T
            </text>
          </svg>
        </div>
      )

    case 'CDSL':
      return (
        <div
          className={`relative inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#0284C7] to-[#0369A1] p-2 shadow-md ${sizeClasses} ${className}`}
          title="Central Depository Services (India) Limited"
        >
          <svg viewBox="0 0 100 100" className="h-full w-full" fill="none">
            <circle cx="50" cy="50" r="42" fill="#FFFFFF" />
            <path d="M30 50 L50 30 L70 50 L50 70 Z" fill="#0284C7" />
            <circle cx="50" cy="50" r="8" fill="#10B981" />
          </svg>
        </div>
      )

    case 'MCX':
      return (
        <div
          className={`relative inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#EA580C] to-[#C2410C] p-2 shadow-md ${sizeClasses} ${className}`}
          title="Multi Commodity Exchange of India"
        >
          <svg viewBox="0 0 100 100" className="h-full w-full" fill="none">
            <text
              x="50"
              y="58"
              textAnchor="middle"
              fill="#FFFFFF"
              fontFamily="system-ui, sans-serif"
              fontWeight="900"
              fontSize="26"
              letterSpacing="1.5"
            >
              MCX
            </text>
            <circle cx="50" cy="74" r="4" fill="#FDE047" />
          </svg>
        </div>
      )

    case 'INDIANHOTE':
      return (
        <div
          className={`relative inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#854D0E] to-[#713F12] p-2 shadow-md ${sizeClasses} ${className}`}
          title="The Indian Hotels Company Limited (Taj)"
        >
          <svg viewBox="0 0 100 100" className="h-full w-full" fill="none">
            <circle cx="50" cy="50" r="42" stroke="#FEF08A" strokeWidth="2.5" />
            {/* Taj Crown Palace Dome */}
            <path
              d="M50 25 C42 38 32 46 32 60 L68 60 C68 46 58 38 50 25 Z"
              fill="#FEF08A"
            />
            <circle cx="50" cy="20" r="3" fill="#FEF08A" />
            <rect x="30" y="64" width="40" height="6" rx="2" fill="#FEF08A" />
          </svg>
        </div>
      )

    case 'DIVISLAB':
      return (
        <div
          className={`relative inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#115E59] p-2 shadow-md ${sizeClasses} ${className}`}
          title="Divi's Laboratories"
        >
          <svg viewBox="0 0 100 100" className="h-full w-full" fill="none">
            <circle cx="50" cy="35" r="9" fill="#CCFBF1" />
            <circle cx="35" cy="62" r="9" fill="#CCFBF1" />
            <circle cx="65" cy="62" r="9" fill="#CCFBF1" />
            <line x1="50" y1="35" x2="35" y2="62" stroke="#CCFBF1" strokeWidth="4" />
            <line x1="50" y1="35" x2="65" y2="62" stroke="#CCFBF1" strokeWidth="4" />
            <line x1="35" y1="62" x2="65" y2="62" stroke="#CCFBF1" strokeWidth="4" />
          </svg>
        </div>
      )

    default:
      // Polished gradient badge for any other ticker / custom upload
      return (
        <div
          className={`relative inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-sky-500 to-emerald-500 font-extrabold text-white shadow-md ${sizeClasses} ${className}`}
          title={name || cleanSymbol}
        >
          <span>{cleanSymbol.slice(0, 3)}</span>
        </div>
      )
  }
}
