import React from "react";

const DebugAdComponent = () => {
  console.log("DebugAdComponent: Component rendered!");

  return (
    <div
      style={{
        position: "fixed",
        top: "50px",
        right: "20px",
        width: "200px",
        height: "100px",
        backgroundColor: "red",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        border: "3px solid yellow",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div>🚨 DEBUG AD</div>
        <div>Component Working!</div>
      </div>
    </div>
  );
};

export default DebugAdComponent;
