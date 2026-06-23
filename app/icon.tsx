import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#020617',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          border: '1px solid rgba(6, 182, 212, 0.3)',
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 100 100"
          fill="none"
        >
          <path
            d="M45,15 L18,31 L18,69 L45,85 L45,71 L31,63 L31,56 L45,48 L45,43 L31,35 L31,28 L45,20 Z"
            fill="#FFFFFF"
          />
          <path
            d="M55,15 L82,31 L82,43 L69,51 L69,58 L82,66 L82,69 L55,85 L55,80 L69,72 L69,65 L55,57 L55,52 L69,44 L69,37 L55,29 Z"
            fill="#00f0ff"
          />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
