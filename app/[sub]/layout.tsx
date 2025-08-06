export default function SubLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Serve manifest from current subdomain */}
        <link rel="manifest" href={`/manifest`} />
        <meta name="theme-color" content="#ffffff" />
        <link rel="icon" href="/favicon.ico" />
        {/* Add other subdomain-specific meta if needed */}
      </head>
      <body>{children}</body>
    </html>
  );
}
