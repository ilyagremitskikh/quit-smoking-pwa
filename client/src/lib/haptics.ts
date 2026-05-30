export function hapticLight(): void {
  vibrate(12);
}

export function hapticTick(): void {
  vibrate(20);
}

export function hapticSuccess(): void {
  vibrate([28, 24, 28]);
}

export function haptic(duration = 35): void {
  vibrate(duration);
}

export function hapticStrong(): void {
  hapticSuccess();
}

function vibrate(pattern: number | number[]): void {
  if (typeof navigator === "undefined") {
    return;
  }
  navigator.vibrate?.(pattern);
}
