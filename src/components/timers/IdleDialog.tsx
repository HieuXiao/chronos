import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNow } from "@/hooks/useNow";
import { formatTimeOfDay } from "@/lib/time";
import { useAppStore } from "@/store/appStore";
import { useUiStore } from "@/store/uiStore";

export function IdleDialog() {
  const prompt = useUiStore((s) => s.idlePrompt);
  const setIdlePrompt = useUiStore((s) => s.setIdlePrompt);
  const discardIdle = useAppStore((s) => s.discardIdle);
  const nowMs = useNow(1000, prompt !== null);

  const endMs = prompt?.returnedAtMs ?? nowMs;
  const minutes = prompt ? Math.max(1, Math.round((endMs - prompt.idleFromMs) / 60_000)) : 0;

  const keep = () => setIdlePrompt(null);
  const discard = () => {
    if (!prompt) return;
    const { idleFromMs } = prompt;
    const resumeAt = prompt.returnedAtMs ?? Date.now();
    setIdlePrompt(null);
    void discardIdle(idleFromMs, resumeAt);
  };

  return (
    <Dialog open={prompt !== null} onOpenChange={(open) => !open && keep()}>
      <DialogContent
        className="sm:max-w-md"
        showCloseButton={false}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Bạn có đang làm không?</DialogTitle>
          <DialogDescription>
            {prompt &&
              `Không có thao tác bàn phím/chuột từ ${formatTimeOfDay(prompt.idleFromMs)} (${minutes} phút) trong khi timer vẫn chạy.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={keep}>
            Giữ {minutes} phút này
          </Button>
          <Button variant="destructive" onClick={discard}>
            Bỏ {minutes} phút này
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
