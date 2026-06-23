import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CareerStrategist — Resume Analysis & Career Roadmap',
  description:
    "Upload your resume and the role you're chasing. We'll build a custom strategy to bridge the gap and secure your next move.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Literata:ital,opsz,wght@0,7..72,200..900;1,7..72,200..900&family=Nunito+Sans:ital,wght@0,200..1000;1,200..1000&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
