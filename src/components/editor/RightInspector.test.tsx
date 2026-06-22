import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { defaultEnvironment, defaultPerformance, type ObjectMetadata } from "../../types/editor";
import { defaultHaRuntimeConfig } from "../../lib/ha-config";
import { RightInspector } from "./RightInspector";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;
HTMLElement.prototype.hasPointerCapture ??= () => false;
HTMLElement.prototype.setPointerCapture ??= () => undefined;
HTMLElement.prototype.releasePointerCapture ??= () => undefined;
Element.prototype.scrollIntoView ??= () => undefined;

function openPositionPanel() {
  fireEvent.click(screen.getByRole("button", { name: "位置" }));
}

function createMetadata(patch: Partial<ObjectMetadata> = {}): ObjectMetadata {
  return {
    id: "object-1",
    objectId: "home/lamp",
    bindingGroupId: null,
    entityId: null,
    deviceType: "auto",
    bindings: [],
    coverCapability: null,
    lightCapability: null,
    name: "主灯",
    type: "Mesh",
    parentName: "home",
    childCount: 0,
    meshCount: 1,
    position: { x: 0, y: 0.5, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    regionAssignment: {
      mode: "auto",
      regionId: null,
      initialized: false,
    },
    resolvedRegionId: null,
    ...patch,
  };
}

function renderInspector(props: Partial<Parameters<typeof RightInspector>[0]> = {}) {
  return render(
    <RightInspector
      environment={defaultEnvironment}
      performance={defaultPerformance}
      haConfig={defaultHaRuntimeConfig()}
      haStatus="not_configured"
      haStatusMessage=""
      metadata={createMetadata()}
      selectionTransform={null}
      selectionBindings={[]}
      selectedCount={1}
      regions={[
        {
          id: "region-living",
          name: "客厅",
          points: [
            { x: 0, z: 0 },
            { x: 3, z: 0 },
            { x: 3, z: 3 },
          ],
        },
      ]}
      onEnvironmentChange={vi.fn()}
      onPerformanceChange={vi.fn()}
      onHaConfigChange={vi.fn()}
      onRetryHaConnection={vi.fn()}
      onPositionChange={vi.fn()}
      onScaleChange={vi.fn()}
      onSizeChange={vi.fn()}
      onCenterChange={vi.fn()}
      onUniformScale={vi.fn()}
      onOpenBindingDialog={vi.fn()}
      onBindingsChange={vi.fn()}
      onCoverCapabilityChange={vi.fn()}
      onLightCapabilityChange={vi.fn()}
      onManualDeviceTypeChange={vi.fn()}
      onRegionAssignmentChange={vi.fn()}
      haStates={{}}
      onGroupSelected={vi.fn()}
      onDeleteSelected={vi.fn()}
      defaultTab="model"
      {...props}
    />,
  );
}

describe("RightInspector", () => {
  it("lets mobile users replace zero-valued numeric fields without creating prefixed values", () => {
    const onPositionChange = vi.fn();
    renderInspector({ onPositionChange });
    openPositionPanel();

    const xInput = screen.getByRole("textbox", { name: "X" });
    fireEvent.focus(xInput);
    fireEvent.change(xInput, { target: { value: "03" } });

    expect((xInput as HTMLInputElement).value).toBe("3");
    expect(onPositionChange).toHaveBeenLastCalledWith({ x: 3, y: 0.5, z: 0 });
  });

  it("allows clearing decimal numeric fields while editing", () => {
    const onPositionChange = vi.fn();
    renderInspector({ onPositionChange });
    openPositionPanel();

    const yInput = screen.getByRole("textbox", { name: "高度Y" });
    fireEvent.focus(yInput);
    fireEvent.change(yInput, { target: { value: "" } });

    expect((yInput as HTMLInputElement).value).toBe("");
    expect(onPositionChange).not.toHaveBeenCalledWith({ x: 0, y: 0, z: 0 });
  });

  it("changes selected object region assignment from the position panel", async () => {
    const onRegionAssignmentChange = vi.fn();
    renderInspector({ onRegionAssignmentChange });
    openPositionPanel();

    const trigger = screen.getByRole("combobox", { name: "所属区域" });
    fireEvent.pointerDown(trigger, {
      button: 0,
      ctrlKey: false,
      pointerType: "mouse",
    });
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    const option = await screen.findByRole("option", { name: "客厅" });
    fireEvent.pointerDown(option, { button: 0, pointerType: "mouse" });
    fireEvent.pointerUp(option, { button: 0, pointerType: "mouse" });
    fireEvent.click(option);

    expect(onRegionAssignmentChange).toHaveBeenCalledWith({
      initialized: false,
      mode: "manual",
      regionId: "region-living",
    });
  });
});
