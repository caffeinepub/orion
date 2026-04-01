import {
  BarChart2,
  BookOpen,
  CheckSquare,
  Settings,
  Timer,
} from "lucide-react";

interface Props {
  onOpenTopics: () => void;
  onOpenSettings: () => void;
  activePath: string;
  onNavigate: (path: string) => void;
}

export function BottomNav({
  onOpenTopics,
  onOpenSettings,
  activePath,
  onNavigate,
}: Props) {
  const tabs = [
    {
      id: "topics",
      icon: BookOpen,
      label: "Topics",
      action: onOpenTopics,
    },
    {
      id: "timer",
      icon: Timer,
      label: "Timer",
      action: () => onNavigate("/"),
      path: "/",
    },
    {
      id: "todos",
      icon: CheckSquare,
      label: "To-Do",
      action: () => onNavigate("/todos"),
      path: "/todos",
    },
    {
      id: "dashboard",
      icon: BarChart2,
      label: "Stats",
      action: () => onNavigate("/dashboard"),
      path: "/dashboard",
    },
    {
      id: "settings",
      icon: Settings,
      label: "Settings",
      action: onOpenSettings,
    },
  ];

  return (
    <nav
      data-ocid="nav.bottom_nav"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-stretch">
        {tabs.map((tab) => {
          const isActive = tab.path ? activePath === tab.path : false;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              data-ocid={`nav.${tab.id}_link`}
              onClick={tab.action}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="text-[9px] font-medium tracking-wide uppercase">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
