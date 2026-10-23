'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main style={{ display: 'grid', minHeight: '100vh', placeItems: 'center', padding: '2rem', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
          <div>
            <h1>Something went wrong</h1>
            <p>تعذر تحميل نبراس. يرجى المحاولة مرة أخرى.</p>
            <button type="button" onClick={() => reset()} style={{ marginTop: '1rem', padding: '0.6rem 1rem', cursor: 'pointer' }}>
              Try again / المحاولة مرة أخرى
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
