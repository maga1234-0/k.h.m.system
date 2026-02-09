import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'white',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '40px',
        }}
      >
        <svg
          width="140"
          height="140"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Multi-layered border circles */}
          <circle cx="50" cy="50" r="48" stroke="#66D3B2" strokeWidth="1" opacity="0.3" />
          <circle cx="50" cy="50" r="45" stroke="#66D3B2" strokeWidth="2" />
          <circle cx="50" cy="50" r="42" stroke="#E2E8F0" strokeWidth="1" />
          
          {/* Towers */}
          <path d="M32 75V38L40 30V75H32Z" fill="#66D3B2" />
          <path d="M68 75V38L60 30V75H68Z" fill="#66D3B2" />
          
          {/* Bridge with Keyhole focus */}
          <path d="M40 48C40 48 45 42 50 42C55 42 60 48 60 48V62C60 62 55 68 50 68C45 68 40 62 40 62V48Z" fill="#55C2A1" />
          
          {/* Keyhole */}
          <circle cx="50" cy="53" r="5" fill="white" />
          <path d="M47 53L53 53L55 63L45 63Z" fill="white" />
          
          {/* Waves at bottom */}
          <path d="M20 85Q35 80 50 85T80 85" stroke="#66D3B2" strokeWidth="2" fill="none" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  )
}
