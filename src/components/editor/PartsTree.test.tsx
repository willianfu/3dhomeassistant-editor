import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { modelLibraryItems } from "../../lib/model-library";
import { PartsTree } from "./PartsTree";

HTMLElement.prototype.hasPointerCapture ??= () => false;
HTMLElement.prototype.setPointerCapture ??= () => undefined;
HTMLElement.prototype.releasePointerCapture ??= () => undefined;
Element.prototype.scrollIntoView ??= () => undefined;

describe("PartsTree", () => {
  it("renders parts and model library tabs", () => {
    render(
      <PartsTree
        tree={null}
        selectedIds={[]}
        modelLibraryItems={modelLibraryItems}
        onSelect={vi.fn()}
        onUploadClick={vi.fn()}
        onAddLocalModelClick={vi.fn()}
        onLoadSample={vi.fn()}
        onAddLibraryModel={vi.fn()}
        onBeginModelDrag={vi.fn()}
      />,
    );

    expect(screen.getByRole("tab", { name: "零件树" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "模型库" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "区域" })).toBeTruthy();
  });

  it("shows model library items and invokes add actions", () => {
    const onAddLocalModelClick = vi.fn();
    const onAddLibraryModel = vi.fn();
    render(
      <PartsTree
        tree={null}
        selectedIds={[]}
        modelLibraryItems={modelLibraryItems}
        onSelect={vi.fn()}
        onUploadClick={vi.fn()}
        onAddLocalModelClick={onAddLocalModelClick}
        onLoadSample={vi.fn()}
        onAddLibraryModel={onAddLibraryModel}
        onBeginModelDrag={vi.fn()}
        defaultTab="library"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "添加本地模型" }));
    fireEvent.click(
      screen.getByRole("button", { name: `添加 ${modelLibraryItems[0].name}` }),
    );

    expect(screen.getByText(modelLibraryItems[0].name)).toBeTruthy();
    expect(onAddLocalModelClick).toHaveBeenCalledTimes(1);
    expect(onAddLibraryModel).toHaveBeenCalledWith(modelLibraryItems[0]);
  });

  it("manages polygon drawing and region selection from the regions tab", () => {
    const onBeginRegionDraw = vi.fn();
    const onFinishRegionDraw = vi.fn();
    const onCancelRegionDraw = vi.fn();
    const onSelectRegion = vi.fn();
    const onRenameRegion = vi.fn();
    const onDeleteRegion = vi.fn();
    const onToggleRegionVisibility = vi.fn();
    const onRegionHighlightModeChange = vi.fn();

    render(
      <PartsTree
        tree={null}
        selectedIds={[]}
        modelLibraryItems={modelLibraryItems}
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
        selectedRegionId="region-living"
        regionDrawing
        regionDraftPointCount={3}
        onSelect={vi.fn()}
        onUploadClick={vi.fn()}
        onAddLocalModelClick={vi.fn()}
        onLoadSample={vi.fn()}
        onAddLibraryModel={vi.fn()}
        onBeginModelDrag={vi.fn()}
        onBeginRegionDraw={onBeginRegionDraw}
        onFinishRegionDraw={onFinishRegionDraw}
        onCancelRegionDraw={onCancelRegionDraw}
        onSelectRegion={onSelectRegion}
        onRenameRegion={onRenameRegion}
        onDeleteRegion={onDeleteRegion}
        onToggleRegionVisibility={onToggleRegionVisibility}
        onRegionHighlightModeChange={onRegionHighlightModeChange}
        defaultTab="regions"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "开始绘制多边形区域" }));
    fireEvent.click(screen.getByRole("button", { name: "完成区域绘制" }));
    fireEvent.click(screen.getByRole("button", { name: "取消区域绘制" }));
    fireEvent.click(screen.getByRole("button", { name: "客厅 3 点" }));
    fireEvent.change(screen.getByLabelText("区域名称"), {
      target: { value: "会客厅" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "隐藏客厅区域" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "删除选中区域" }));

    expect(screen.getByText("已记录 3 个点")).toBeTruthy();
    expect(onBeginRegionDraw).toHaveBeenCalledTimes(1);
    expect(onFinishRegionDraw).toHaveBeenCalledTimes(1);
    expect(onCancelRegionDraw).toHaveBeenCalledTimes(1);
    expect(onSelectRegion).toHaveBeenCalledWith("region-living");
    expect(onRenameRegion).toHaveBeenCalledWith("region-living", "会客厅");
    expect(onToggleRegionVisibility).toHaveBeenCalledWith("region-living", true);
    expect(onDeleteRegion).toHaveBeenCalledWith("region-living");
  });

  it("changes the selected region highlight mode from the regions tab", async () => {
    const onRegionHighlightModeChange = vi.fn();

    render(
      <PartsTree
        tree={null}
        selectedIds={[]}
        modelLibraryItems={modelLibraryItems}
        regions={[
          {
            id: "region-living",
            name: "客厅",
            highlightMode: "edges",
            points: [
              { x: 0, z: 0 },
              { x: 3, z: 0 },
              { x: 3, z: 3 },
            ],
          },
        ]}
        selectedRegionId="region-living"
        onSelect={vi.fn()}
        onUploadClick={vi.fn()}
        onAddLocalModelClick={vi.fn()}
        onLoadSample={vi.fn()}
        onAddLibraryModel={vi.fn()}
        onBeginModelDrag={vi.fn()}
        onRegionHighlightModeChange={onRegionHighlightModeChange}
        defaultTab="regions"
      />,
    );

    const trigger = screen.getByRole("combobox", { name: "选中效果" });
    fireEvent.pointerDown(trigger, {
      button: 0,
      ctrlKey: false,
      pointerType: "mouse",
    });
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    const option = await screen.findByRole("option", { name: "顶面高亮" });
    fireEvent.pointerDown(option, { button: 0, pointerType: "mouse" });
    fireEvent.pointerUp(option, { button: 0, pointerType: "mouse" });
    fireEvent.click(option);

    expect(onRegionHighlightModeChange).toHaveBeenCalledWith("region-living", "top");
  });

  it("shows hidden regions with a restore visibility action", () => {
    const onToggleRegionVisibility = vi.fn();

    render(
      <PartsTree
        tree={null}
        selectedIds={[]}
        modelLibraryItems={modelLibraryItems}
        regions={[
          {
            id: "region-living",
            name: "客厅",
            hidden: true,
            points: [
              { x: 0, z: 0 },
              { x: 3, z: 0 },
              { x: 3, z: 3 },
            ],
          },
        ]}
        selectedRegionId={null}
        onSelect={vi.fn()}
        onUploadClick={vi.fn()}
        onAddLocalModelClick={vi.fn()}
        onLoadSample={vi.fn()}
        onAddLibraryModel={vi.fn()}
        onBeginModelDrag={vi.fn()}
        onToggleRegionVisibility={onToggleRegionVisibility}
        defaultTab="regions"
      />,
    );

    expect(screen.getByText("已隐藏")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "显示客厅区域" }));

    expect(onToggleRegionVisibility).toHaveBeenCalledWith("region-living", false);
  });
});
