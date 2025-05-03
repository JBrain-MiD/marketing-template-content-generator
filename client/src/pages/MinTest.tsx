export default function MinTest() {
  return (
    <div style={{
      margin: '20px auto',
      maxWidth: '500px',
      padding: '20px',
      border: '1px solid #ccc',
      borderRadius: '8px',
      textAlign: 'center'
    }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>
        Minimal Test Page
      </h1>
      <p>
        This is a minimal test page with no dependencies.
        If you can see this, the app is loading correctly.
      </p>
    </div>
  );
}