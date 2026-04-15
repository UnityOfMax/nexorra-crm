'use client';

/**
 * Renders a cold-email landing page from raw HTML.
 * Uses an iframe with srcdoc for full isolation from the CRM app styles.
 */
export default function ColdEmailPageShell({ html }: { html: string }) {
  return (
    <iframe
      srcDoc={html}
      style={{
        width: '100%',
        height: '100vh',
        border: 'none',
        display: 'block',
      }}
      title="Landing Page"
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-top-navigation-by-user-activation"
    />
  );
}
