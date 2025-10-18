import Link from "next/link";
import { FC } from "react";

interface LoginPageProps {
  params: {
    sub: string; // e.g. 'car', 'bike'
  };
}

export default async function Page({ params }: any) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1e3c72, #2a5298)",
        fontFamily: "'Arial', sans-serif",
        padding: "20px",
        direction: "ltr", // Add RTL support for Persian if needed
      }}
    >
      <h1
        style={{
          color: "#ffffff",
          fontSize: "36px",
          fontWeight: "700",
          marginBottom: "40px",
          textAlign: "center",
          textShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
        }}
      ></h1>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          width: "100%",
          maxWidth: "400px",
        }}
      >
        <Link href="https://car.kiwipart.ir" style={{ display: "block", textDecoration: "none" }}>
          <button
            style={{
              width: "100%",
              padding: "15px",
              background: "#ff6b6b",
              border: "none",
              borderRadius: "8px",
              color: "#ffffff",
              fontSize: "18px",
              fontWeight: "500",
              cursor: "pointer",
              transition: "transform 0.2s ease, background 0.2s ease",
              boxShadow: "0 4px 10px rgba(0, 0, 0, 0.2)",
            }}
          >car</button>
        </Link>

        <Link href="https://bike.kiwipart.ir" style={{ display: "block", textDecoration: "none" }}>
          <button
            style={{
              width: "100%",
              padding: "15px",
              background: "#4ecdc4",
              border: "none",
              borderRadius: "8px",
              color: "#ffffff",
              fontSize: "18px",
              fontWeight: "500",
              cursor: "pointer",
              transition: "transform 0.2s ease, background 0.2s ease",
              boxShadow: "0 4px 10px rgba(0, 0, 0, 0.2)",
            }}
          >bike</button>
        </Link>

        <Link href="https://bus.kiwipart.ir" style={{ display: "block", textDecoration: "none" }}>
          <button
            style={{
              width: "100%",
              padding: "15px",
              background: "#ffa500",
              border: "none",
              borderRadius: "8px",
              color: "#ffffff",
              fontSize: "18px",
              fontWeight: "500",
              cursor: "pointer",
              transition: "transform 0.2s ease, background 0.2s ease",
              boxShadow: "0 4px 10px rgba(0, 0, 0, 0.2)",
            }}
          >bus</button>
        </Link>
      </div>
    </div>
  );
}
