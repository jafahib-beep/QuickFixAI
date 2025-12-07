import React from "react";
import "./index.css";

function App() {
  return (
    <div className="qf-page">
      {/* Titel + introduktion */}
      <div className="qf-section">
        <h1 className="qf-section-title">QuickFix AI</h1>
        <p className="qf-section-text">
          Ta en bild eller skriv ditt problem – AI hjälper dig steg för steg.
        </p>
      </div>

      {/* Input-sektionen (du kan lägga din AI-chat här sen) */}
      <div className="qf-section qf-card">
        <p className="qf-section-text">
          Här kommer din AI-chat eller input-fält.
        </p>

        <button className="qf-btn-primary" style={{ marginTop: 12 }}>
          Skicka till AI
        </button>
      </div>

      {/* Sekundär-knapp */}
      <div className="qf-section">
        <button className="qf-btn-secondary">Inställningar</button>
      </div>
    </div>
  );
}

export default App;
