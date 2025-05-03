import { useState } from "react";

function SimplifiedApp() {
  const [count, setCount] = useState(0);
  
  return (
    <div style={{ 
      maxWidth: "800px", 
      margin: "0 auto", 
      padding: "20px",
      fontFamily: "Arial, sans-serif"
    }}>
      <h1 style={{ textAlign: "center" }}>Simplified App</h1>
      <p style={{ textAlign: "center" }}>
        This is a simplified app with minimal dependencies.
        If you can see this, the basic React setup is working.
      </p>
      
      <div style={{ 
        display: "flex", 
        justifyContent: "center",
        alignItems: "center",
        margin: "30px 0",
        gap: "15px"
      }}>
        <button 
          onClick={() => setCount(prev => prev - 1)}
          style={{
            padding: "8px 16px",
            background: "#f1f1f1",
            border: "1px solid #ccc",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          -
        </button>
        
        <span style={{ fontSize: "24px", fontWeight: "bold" }}>
          {count}
        </span>
        
        <button 
          onClick={() => setCount(prev => prev + 1)}
          style={{
            padding: "8px 16px",
            background: "#f1f1f1",
            border: "1px solid #ccc",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}

export default SimplifiedApp;