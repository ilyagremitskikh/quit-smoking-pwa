export function haptic(duration = 35): void {
  navigator.vibrate?.(duration);
  clickHiddenSwitch();
}

export function hapticStrong(): void {
  navigator.vibrate?.([45, 35, 45]);
  clickHiddenSwitch();
}

function clickHiddenSwitch(): void {
  const id = "quitkit-haptic-switch";
  let input = document.getElementById(id) as HTMLInputElement | null;
  if (!input) {
    input = document.createElement("input");
    input.id = id;
    input.type = "checkbox";
    input.setAttribute("switch", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    input.style.pointerEvents = "none";
    input.style.width = "1px";
    input.style.height = "1px";
    input.style.left = "-10px";
    document.body.append(input);
  }
  input.click();
}
