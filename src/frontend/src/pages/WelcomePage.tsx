import { motion } from "motion/react";
import { StarCanvas } from "../components/StarCanvas";
import { useAppSettings } from "../hooks/useAppSettings";

export function WelcomePage() {
  const {
    theme,
    starsEnabled,
    shootingStarEnabled,
    beltEnabled,
    starsOpacity,
    shootingStarOpacity,
    beltOpacity,
  } = useAppSettings();

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[80vh]">
      <StarCanvas
        theme={theme}
        starsEnabled={starsEnabled}
        shootingStarEnabled={shootingStarEnabled}
        beltEnabled={beltEnabled}
        starsOpacity={starsOpacity}
        shootingStarOpacity={shootingStarOpacity}
        beltOpacity={beltOpacity}
      />
      <style>{`
        @keyframes waveBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.35; }
          30% { transform: translateY(-12px); opacity: 1; }
        }
      `}</style>
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center gap-6"
      >
        <span
          className="font-mono font-bold text-primary select-none"
          style={{ fontSize: "clamp(5rem, 20vw, 10rem)", lineHeight: 1 }}
        >
          00:00
        </span>
        <div className="flex items-end gap-2.5" style={{ height: "2.5rem" }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="rounded-full bg-primary/70 inline-block"
              style={{
                width: "0.6rem",
                height: "0.6rem",
                animation: "waveBounce 1.5s ease-in-out infinite",
                animationDelay: `${i * 0.18}s`,
              }}
            />
          ))}
        </div>
        <p className="text-muted-foreground text-sm mt-2 text-center">
          Open Topics to pick a subject and start a session
        </p>
      </motion.div>
    </div>
  );
}
