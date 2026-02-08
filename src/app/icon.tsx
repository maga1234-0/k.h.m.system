
import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const size = {
  width: 32,
  height: 32,
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
          borderRadius: '8px',
          border: '1.5px solid #66D3B2',
          color: '#66D3B2',
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Towers */}
          <path d="M30 80V35L40 25V80H30Z" fill="currentColor" />
          <path d="M70 80V35L60 25V80H70Z" fill="currentColor" />
          {/* Bridge */}
          <path d="M40 45C40 45 45 40 50 40C55 40 60 45 60 45V60C60 60 55 65 50 65C45 65 40 60 40 60V45Z" fill="#55C2A1" />
          {/* Keyhole */}
          <circle cx="50" cy="50" r="4" fill="white" />
          <path d="M48 50L52 50L54 58L46 58Z" fill="white" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  )
}
