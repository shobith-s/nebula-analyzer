import { ChevronsLeft } from "lucide-react";

export default function Header({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  return (
    <header
      style={{
        position: "fixed",
        insetInline: 0,
        top: 0,
        height: 64,
        background: "rgba(15,17,23,.9)",
        borderBottom: "1px solid rgba(255,255,255,.06)",
        backdropFilter: "blur(6px)",
        zIndex: 50,
      }}
    >
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 12,
          paddingInline: 24,
        }}
      >
        <button
          onClick={onToggleSidebar}
          aria-label="Collapse sidebar"
          style={{
            border: "1px solid rgba(255,255,255,.12)",
            background: "transparent",
            borderRadius: 12,
            padding: 8,
            cursor: "pointer",
          }}
        >
          <ChevronsLeft style={{ width: 18, height: 18 }} />
        </button>

        <div style={{ marginLeft: "auto" }}>
          <span
            style={{
              fontSize: 12,
              padding: "6px 12px",
              borderRadius: 999,
              border: "1px solid rgba(16,185,129,.35)",
              background: "rgba(16,185,129,.12)",
              color: "#19c28a",
            }}
          >
            Ready for Analysis
          </span>
        </div>
      </div>
    </header>
  );
}
