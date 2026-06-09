import type { HaBinding } from "../types/ha";

function bindingKey(binding: HaBinding) {
  return binding.type === "entity"
    ? `entity:${binding.entityId}`
    : `device:${binding.deviceId}`;
}

export function addHaBinding(bindings: HaBinding[], binding: HaBinding) {
  const next = [...bindings];
  const key = bindingKey(binding);
  if (!next.some((item) => bindingKey(item) === key)) {
    next.push(binding);
  }
  return next;
}

export function removeHaBinding(bindings: HaBinding[], id: string) {
  return bindings.filter((binding) =>
    binding.type === "entity" ? binding.entityId !== id : binding.deviceId !== id,
  );
}

export function getBoundEntityIds(bindings: HaBinding[]) {
  return [
    ...new Set(
      bindings.flatMap((binding) =>
        binding.type === "entity" ? [binding.entityId] : binding.entityIds,
      ),
    ),
  ];
}
