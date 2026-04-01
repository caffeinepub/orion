import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Minus, TrendingDown, Zap } from "lucide-react";
import { useState } from "react";

type EnergyRating = "High" | "Medium" | "Low";

interface Props {
  open: boolean;
  onSave: (note: string, energyRating: EnergyRating) => Promise<void>;
  onClose: () => void;
}

export function SessionEndModal({ open, onSave, onClose }: Props) {
  const [note, setNote] = useState("");
  const [energy, setEnergy] = useState<EnergyRating>("High");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(note, energy);
      setNote("");
      setEnergy("High");
    } finally {
      setSaving(false);
    }
  }

  const energyOptions: {
    value: EnergyRating;
    label: string;
    icon: typeof Zap;
    color: string;
  }[] = [
    {
      value: "High",
      label: "High",
      icon: Zap,
      color: "text-green-400 border-green-400/50 bg-green-400/10",
    },
    {
      value: "Medium",
      label: "Medium",
      icon: Minus,
      color: "text-amber-400 border-amber-400/50 bg-amber-400/10",
    },
    {
      value: "Low",
      label: "Low",
      icon: TrendingDown,
      color: "text-red-400 border-red-400/50 bg-red-400/10",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        data-ocid="session_end.dialog"
        className="bg-card border-border max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-lg text-foreground">
            Session Complete
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label className="text-muted-foreground text-sm">
              Session Note
            </Label>
            <Textarea
              data-ocid="session_end.textarea"
              placeholder="What did you work on? Any reflections..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="bg-muted/50 border-border resize-none text-foreground placeholder:text-muted-foreground min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground text-sm">
              Energy Rating
            </Label>
            <div className="flex gap-2">
              {energyOptions.map(({ value, label, icon: Icon, color }) => (
                <button
                  key={value}
                  type="button"
                  data-ocid={`session_end.${value.toLowerCase()}_button`}
                  onClick={() => setEnergy(value)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md border text-sm font-medium transition-all ${
                    energy === value
                      ? color
                      : "text-muted-foreground border-border hover:border-border/80"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            data-ocid="session_end.cancel_button"
            variant="ghost"
            onClick={onClose}
            className="text-muted-foreground"
          >
            Skip
          </Button>
          <Button
            data-ocid="session_end.save_button"
            onClick={handleSave}
            disabled={saving}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
