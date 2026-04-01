import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Toaster } from "@/components/ui/sonner";
import { Switch } from "@/components/ui/switch";
import {
  Link,
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import {
  LayoutDashboard,
  LogIn,
  LogOut,
  Timer,
  UserCircle2,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { BottomNav } from "./components/BottomNav";
import { Sidebar } from "./components/Sidebar";
import { TimerView } from "./components/TimerView";
import { type AppTheme, useAppSettings } from "./hooks/useAppSettings";
import { useLocalAuth } from "./hooks/useLocalAuth";
import type { Category, SubTopic } from "./hooks/useQueries";
import { DashboardPage } from "./pages/DashboardPage";
import { TodoPage } from "./pages/TodoPage";
import { WelcomePage } from "./pages/WelcomePage";

// ── Selection Context ──────────────────────────────────────────────────────────
interface SelectionContextValue {
  selectedSubTopic: SubTopic | null;
  selectedCategory: Category | null;
  onSelectSubTopic: (st: SubTopic, cat: Category) => void;
}

const SelectionContext = createContext<SelectionContextValue>({
  selectedSubTopic: null,
  selectedCategory: null,
  onSelectSubTopic: () => {},
});

function LogoutButton() {
  const { user, isGuest, logout } = useLocalAuth();
  const displayName = isGuest ? "Guest" : (user ?? "");
  return (
    <div className="flex items-center gap-3">
      {displayName && (
        <span className="text-xs font-mono text-muted-foreground hidden sm:block flex items-center gap-1">
          <UserCircle2 className="h-3.5 w-3.5 inline" />
          {displayName}
        </span>
      )}
      <Button
        data-ocid="auth.logout_button"
        variant="ghost"
        size="sm"
        onClick={logout}
        className="gap-1.5 text-muted-foreground hover:text-foreground text-xs"
      >
        <LogOut className="h-3.5 w-3.5" />
        Log out
      </Button>
    </div>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, login, loginAsGuest } = useLocalAuth();
  const [usernameInput, setUsernameInput] = useState("");

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-sm mx-auto px-6"
        >
          {/* Neomorphic card */}
          <div
            className="rounded-3xl p-8 space-y-6"
            style={{
              background: "var(--card)",
              boxShadow:
                "8px 8px 20px rgba(0,0,0,0.18), -4px -4px 12px rgba(255,255,255,0.06)",
            }}
          >
            {/* Branding */}
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                <Timer className="h-8 w-8 text-primary" />
              </div>
              <h1 className="font-display text-3xl font-bold text-foreground mt-3">
                Naksha 🧭
              </h1>
              <p className="text-muted-foreground text-sm">
                Your Time. Your Orbit. 🪐
              </p>
            </div>

            {/* Username input */}
            <div className="space-y-3">
              <input
                data-ocid="auth.username_input"
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && usernameInput.trim()) {
                    login(usernameInput);
                  }
                }}
                placeholder="Enter your name"
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-base"
              />
              <Button
                data-ocid="auth.login_button"
                onClick={() => login(usernameInput)}
                disabled={!usernameInput.trim()}
                className="w-full gap-2 py-5 text-base rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <LogIn className="h-4 w-4" />
                Continue
              </Button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Guest mode */}
            <Button
              data-ocid="auth.guest_button"
              variant="ghost"
              onClick={loginAsGuest}
              className="w-full py-5 text-sm rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent border border-border"
            >
              Continue as Guest
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}

const THEME_SWATCHES: {
  id: AppTheme;
  label: string;
  bg: string;
  border: string;
  dot: string;
}[] = [
  {
    id: "light",
    label: "Light",
    bg: "bg-white",
    border: "border-sky-300",
    dot: "bg-sky-400",
  },
  {
    id: "dark",
    label: "Dark",
    bg: "bg-slate-800",
    border: "border-slate-600",
    dot: "bg-cyan-400",
  },
  {
    id: "bw",
    label: "B&W",
    bg: "bg-white",
    border: "border-gray-400",
    dot: "bg-black",
  },
  {
    id: "grey",
    label: "Grey",
    bg: "bg-gray-300",
    border: "border-gray-500",
    dot: "bg-gray-700",
  },
];

interface CropState {
  x: number;
  y: number;
  width: number;
  height: number;
}

function CropModal({
  src,
  open,
  onSave,
  onUseFullImage,
  onCancel,
}: {
  src: string;
  open: boolean;
  onSave: (dataUrl: string) => void;
  onUseFullImage: () => void;
  onCancel: () => void;
}) {
  const [crop, setCrop] = useState<CropState>({
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  });
  const imgRef = useRef<HTMLImageElement>(null);

  const handleCropAndSave = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const canvas = document.createElement("canvas");
    const sw = (img.naturalWidth * crop.width) / 100;
    const sh = (img.naturalHeight * crop.height) / 100;
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(
      img,
      (img.naturalWidth * crop.x) / 100,
      (img.naturalHeight * crop.y) / 100,
      sw,
      sh,
      0,
      0,
      sw,
      sh,
    );
    onSave(canvas.toDataURL("image/jpeg", 0.92));
  }, [crop, onSave]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent
        data-ocid="settings.crop.dialog"
        className="max-w-md w-full"
      >
        <DialogHeader>
          <DialogTitle>Crop Background Image</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div
            className="relative overflow-hidden rounded-lg border border-border"
            style={{
              backgroundImage: `url(${src})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              height: "220px",
            }}
          >
            {/* Crop preview overlay */}
            <div
              className="absolute border-2 border-primary shadow-lg"
              style={{
                left: `${crop.x}%`,
                top: `${crop.y}%`,
                width: `${crop.width}%`,
                height: `${crop.height}%`,
                background: "rgba(255,255,255,0.05)",
              }}
            />
            {/* Hidden img for canvas use */}
            <img
              ref={imgRef}
              src={src}
              alt="Crop source"
              className="hidden"
              crossOrigin="anonymous"
            />
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                X offset: {crop.x}%
              </p>
              <Slider
                data-ocid="settings.crop.x_input"
                min={0}
                max={90}
                step={1}
                value={[crop.x]}
                onValueChange={([v]) => setCrop((p) => ({ ...p, x: v }))}
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Y offset: {crop.y}%
              </p>
              <Slider
                data-ocid="settings.crop.y_input"
                min={0}
                max={90}
                step={1}
                value={[crop.y]}
                onValueChange={([v]) => setCrop((p) => ({ ...p, y: v }))}
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Width: {crop.width}%
              </p>
              <Slider
                data-ocid="settings.crop.width_input"
                min={10}
                max={100}
                step={1}
                value={[crop.width]}
                onValueChange={([v]) => setCrop((p) => ({ ...p, width: v }))}
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Height: {crop.height}%
              </p>
              <Slider
                data-ocid="settings.crop.height_input"
                min={10}
                max={100}
                step={1}
                value={[crop.height]}
                onValueChange={([v]) => setCrop((p) => ({ ...p, height: v }))}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              data-ocid="settings.crop.confirm_button"
              className="flex-1"
              onClick={handleCropAndSave}
            >
              Crop & Save
            </Button>
            <Button
              data-ocid="settings.crop.use_full_button"
              variant="outline"
              className="flex-1"
              onClick={onUseFullImage}
            >
              Use Full Image
            </Button>
            <Button
              data-ocid="settings.crop.cancel_button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SettingsSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const {
    theme,
    setTheme,
    bgImage,
    setBgImage,
    bgOpacity,
    setBgOpacity,
    starsEnabled,
    setStarsEnabled,
    shootingStarEnabled,
    setShootingStarEnabled,
    beltEnabled,
    setBeltEnabled,
    starsOpacity,
    setStarsOpacity,
    shootingStarOpacity,
    setShootingStarOpacity,
    beltOpacity,
    setBeltOpacity,
  } = useAppSettings();
  const { logout } = useLocalAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setCropSrc(result);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-uploaded
    e.target.value = "";
  }

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent
          side="bottom"
          data-ocid="settings.sheet"
          className={`rounded-t-2xl max-h-[85vh] overflow-y-auto ${theme === "grey" ? "bg-white text-black [&_*]:text-black [&_.text-muted-foreground]:text-gray-500" : ""}`}
        >
          <SheetHeader className="pb-4">
            <SheetTitle className="text-base font-semibold">
              Settings
            </SheetTitle>
          </SheetHeader>

          {/* Theme Picker */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Theme
            </p>
            <div className="flex gap-3">
              {THEME_SWATCHES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  data-ocid={`settings.${s.id}_theme_button`}
                  onClick={() => setTheme(s.id)}
                  className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    theme === s.id
                      ? "border-primary shadow-sm"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full ${s.bg} ${s.border} border-2 flex items-center justify-center`}
                  >
                    <div className={`w-3 h-3 rounded-full ${s.dot}`} />
                  </div>
                  <span className="text-xs font-medium text-foreground">
                    {s.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Background Image */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Background Image
            </p>
            {bgImage && (
              <>
                <div className="mb-3 relative">
                  <img
                    src={bgImage}
                    alt="Custom background"
                    className="w-full h-24 object-cover rounded-xl border border-border"
                  />
                  <button
                    type="button"
                    data-ocid="settings.remove_bg_button"
                    onClick={() => setBgImage(null)}
                    className="absolute top-2 right-2 bg-card/80 backdrop-blur-sm rounded-full p-1 text-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  data-ocid="settings.remove_bg_text_button"
                  onClick={() => setBgImage(null)}
                  className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 mb-2"
                >
                  Remove Background
                </Button>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              variant="outline"
              size="sm"
              data-ocid="settings.upload_button"
              className="w-full gap-2 border-dashed"
              onClick={() => fileInputRef.current?.click()}
            >
              {bgImage ? "Change Background" : "Upload Background Image"}
            </Button>
          </div>

          {/* Background Transparency */}
          {bgImage && (
            <div className="mb-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Background Transparency ({bgOpacity}%)
              </p>
              <Slider
                data-ocid="settings.bg_opacity_slider"
                min={0}
                max={100}
                step={5}
                value={[bgOpacity]}
                onValueChange={([v]) => setBgOpacity(v)}
              />
            </div>
          )}

          {/* Living Space */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Living Space
            </p>

            {/* Stars row */}
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium">Stars</span>
              <Switch
                data-ocid="settings.stars.toggle"
                checked={starsEnabled}
                onCheckedChange={setStarsEnabled}
              />
            </div>
            {starsEnabled && (
              <div className="pl-2 mb-2">
                <p className="text-xs text-muted-foreground mb-1">
                  Opacity: {starsOpacity}%
                </p>
                <Slider
                  data-ocid="settings.stars_opacity_slider"
                  min={0}
                  max={100}
                  step={5}
                  value={[starsOpacity]}
                  onValueChange={([v]) => setStarsOpacity(v)}
                />
              </div>
            )}

            {/* Shooting Star row */}
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium">Shooting Star</span>
              <Switch
                data-ocid="settings.shooting_star.toggle"
                checked={shootingStarEnabled}
                onCheckedChange={setShootingStarEnabled}
              />
            </div>
            {shootingStarEnabled && (
              <div className="pl-2 mb-2">
                <p className="text-xs text-muted-foreground mb-1">
                  Opacity: {shootingStarOpacity}%
                </p>
                <Slider
                  data-ocid="settings.shooting_star_opacity_slider"
                  min={0}
                  max={100}
                  step={5}
                  value={[shootingStarOpacity]}
                  onValueChange={([v]) => setShootingStarOpacity(v)}
                />
              </div>
            )}

            {/* Orion Belt row */}
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium">Orion Belt</span>
              <Switch
                data-ocid="settings.belt.toggle"
                checked={beltEnabled}
                onCheckedChange={setBeltEnabled}
              />
            </div>
            {beltEnabled && (
              <div className="pl-2 mb-2">
                <p className="text-xs text-muted-foreground mb-1">
                  Opacity: {beltOpacity}%
                </p>
                <Slider
                  data-ocid="settings.belt_opacity_slider"
                  min={0}
                  max={100}
                  step={5}
                  value={[beltOpacity]}
                  onValueChange={([v]) => setBeltOpacity(v)}
                />
              </div>
            )}
          </div>

          {/* Logout */}
          <div className="pt-2 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              data-ocid="settings.logout_button"
              onClick={() => {
                logout();
                onClose();
              }}
              className="w-full gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 justify-start"
            >
              <LogOut className="h-4 w-4" />
              Log Out
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {cropSrc && (
        <CropModal
          src={cropSrc}
          open={cropModalOpen}
          onSave={(dataUrl) => {
            setBgImage(dataUrl);
            setCropModalOpen(false);
            setCropSrc(null);
          }}
          onUseFullImage={() => {
            setBgImage(cropSrc);
            setCropModalOpen(false);
            setCropSrc(null);
          }}
          onCancel={() => {
            setCropModalOpen(false);
            setCropSrc(null);
          }}
        />
      )}
    </>
  );
}

// ── AppShell uses SelectionContext + TanStack navigate ─────────────────────────
function AppShell({ children }: { children: React.ReactNode }) {
  const { selectedSubTopic, selectedCategory, onSelectSubTopic } =
    useContext(SelectionContext);
  const { bgImage, bgOpacity, theme } = useAppSettings();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const routerState = useRouterState();
  const activePath = routerState.location.pathname;
  const navigate = useNavigate();

  function handleNavigate(path: string) {
    navigate({ to: path });
  }

  return (
    <div
      className="flex min-h-screen bg-background"
      style={
        bgImage
          ? {
              backgroundImage: `url(${bgImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundAttachment: "fixed",
            }
          : undefined
      }
    >
      {/* BG overlay when custom image set */}
      {bgImage && (
        <div
          className="fixed inset-0 backdrop-blur-[2px] pointer-events-none z-0"
          style={{
            backgroundColor: `oklch(var(--background) / ${bgOpacity / 100})`,
          }}
        />
      )}

      {/* Desktop sidebar */}
      <div className="relative z-10 hidden md:block">
        <Sidebar
          selectedSubTopicId={selectedSubTopic?.id ?? null}
          onSelectSubTopic={(st, cat) => {
            onSelectSubTopic(st, cat);
          }}
        />
      </div>

      {/* Mobile sidebar drawer */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent
          side="left"
          data-ocid="sidebar.sheet"
          className="p-0 w-72"
        >
          <Sidebar
            selectedSubTopicId={selectedSubTopic?.id ?? null}
            onSelectSubTopic={(st, cat) => {
              onSelectSubTopic(st, cat);
              setSidebarOpen(false);
            }}
          />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col min-h-screen">
        {/* Desktop header */}
        <header className="hidden md:flex h-14 border-b border-border bg-card/90 backdrop-blur-sm items-center justify-between px-6 shrink-0">
          <nav className="flex items-center gap-1" data-ocid="nav.section">
            <Link
              to="/"
              data-ocid="nav.timer_link"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Timer className="h-4 w-4" />
              Timer
            </Link>
            <Link
              to="/dashboard"
              data-ocid="nav.dashboard_link"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
          </nav>
          <LogoutButton />
        </header>

        {/* Mobile header */}
        <header className="md:hidden flex h-12 border-b border-border bg-card/90 backdrop-blur-sm items-center justify-between px-4 shrink-0">
          <span
            className={`font-display text-sm font-bold ${
              theme === "grey" ? "text-gray-500" : "text-foreground"
            }`}
          >
            Naksha 🧭
          </span>
          {selectedSubTopic && (
            <span className="text-xs text-muted-foreground truncate max-w-[160px]">
              {selectedCategory?.name} › {selectedSubTopic.name}
            </span>
          )}
        </header>

        <main className="flex-1 overflow-y-auto md:p-8 pb-20 md:pb-8">
          {children}
        </main>

        <footer className="hidden md:block border-t border-border px-6 py-3 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()}. Built with ❤️ using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              caffeine.ai
            </a>
          </p>
        </footer>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav
        onOpenTopics={() => setSidebarOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        activePath={activePath}
        onNavigate={handleNavigate}
      />

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}

// ── Route components that read from context ────────────────────────────────────
function IndexRouteComponent() {
  const { selectedSubTopic, selectedCategory } = useContext(SelectionContext);
  return selectedSubTopic && selectedCategory ? (
    <TimerView subTopic={selectedSubTopic} category={selectedCategory} />
  ) : (
    <WelcomePage />
  );
}

// ── Router created once via useMemo ────────────────────────────────────────────
const rootRoute = createRootRoute({
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: IndexRouteComponent,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: DashboardPage,
});

const todosRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/todos",
  component: TodoPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  dashboardRoute,
  todosRoute,
]);
const stableRouter = createRouter({ routeTree });

function AppWithState() {
  const [selectedSubTopic, setSelectedSubTopic] = useState<SubTopic | null>(
    null,
  );
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );

  const selectionValue = useMemo(
    () => ({
      selectedSubTopic,
      selectedCategory,
      onSelectSubTopic: (st: SubTopic, cat: Category) => {
        setSelectedSubTopic(st);
        setSelectedCategory(cat);
      },
    }),
    [selectedSubTopic, selectedCategory],
  );

  return (
    <SelectionContext.Provider value={selectionValue}>
      <RouterProvider router={stableRouter} />
    </SelectionContext.Provider>
  );
}

export default function App() {
  return (
    <>
      <AuthGuard>
        <AppWithState />
      </AuthGuard>
      <Toaster />
    </>
  );
}
