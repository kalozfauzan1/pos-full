export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ textAlign: 'center', color: '#737373' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#404040', marginBottom: '8px' }}>
          {title}
        </h1>
        <p style={{ fontSize: '14px', color: '#a3a3a3' }}>Coming soon.</p>
      </div>
    </div>
  );
}
