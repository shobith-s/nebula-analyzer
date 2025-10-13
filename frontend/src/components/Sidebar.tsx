import { Cpu, Database } from "lucide-react";

type Props = {
  collapsed: boolean; // desktop-only collapse
};

export default function Sidebar({ collapsed }: Props) {
  const w = collapsed ? 72 : 240; // px

  return (
    <aside
      aria-label="Neural Control Panel"
      style={{
        position: "fixed",
        insetBlock: 0,
        left: 0,
        width: w,
        background: "#0e141a",
        borderRight: "1px solid rgba(255,255,255,.06)",
        zIndex: 40,
      }}
    >
      {/* Brand row matches screenshot */}
      <div
        style={{
          height: 64,
          display: "flex",
          alignItems: "center",
          gap: 8,
          paddingInline: 16,
          borderBottom: "1px solid rgba(255,255,255,.06)",
        }}
      >
        <div
          style={{
            fontWeight: 700,
            letterSpacing: ".2px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {!collapsed ? (
            <>
              <span>NEBULA</span>
              <span style={{ opacity: 0.7, marginLeft: 6 }}>Analyzer</span>
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 10,
                  padding: "2px 6px",
                  borderRadius: 999,
                  border: "1px solid rgba(84,101,255,.35)",
                  background: "rgba(84,101,255,.12)",
                }}
              >
                v0.1
              </span>
            </>
          ) : (
            <span style={{ fontSize: 12 }}>NB</span>
          )}
        </div>
      </div>

      {/* Section: matches “Neural Control Panel” + “Data Sources” */}
      <nav style={{ padding: 12 }}>
        <SidebarGroup label="Neural Control Panel" collapsed={collapsed} />
        <SidebarItem
          icon={<Database className="h-4 w-4" />}
          label="Data Sources"
          collapsed={collapsed}
        />
      </nav>
    </aside>
  );
}

function SidebarGroup({ label, collapsed }: { label: string; collapsed: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        color: "rgba(148,163,184,.85)",
        fontSize: 12,
        margin: "4px 0 8px",
        paddingInline: 8,
      }}
    >
      <Cpu style={{ width: 14, height: 14, opacity: 0.85 }} />
      {!collapsed && <span>{label}</span>}
    </div>
  );
}

function SidebarItem({
  icon,
  label,
  collapsed,
}: {
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
}) {
  return (
    <div
      title={collapsed ? label : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 10px",
        borderRadius: 10,
        color: "#c8d3ea",
        border: "1px solid transparent",
        background: "transparent",
      }}
      className="sidebar-item"
    >
      <span style={{ display: "grid", placeItems: "center" }}>{icon}</span>
      {!collapsed && <span style={{ fontSize: 14 }}>{label}</span>}
    </div>
  );
}
