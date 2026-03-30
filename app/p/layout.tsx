export default function PublicLandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        html, body {
          overflow: auto !important;
          position: static !important;
          height: auto !important;
          overscroll-behavior: auto !important;
          width: 100% !important;
          touch-action: auto !important;
        }
        @media (max-width: 767px) {
          html, body {
            position: static !important;
            inset: auto !important;
          }
        }
      `}</style>
      {children}
    </>
  );
}
