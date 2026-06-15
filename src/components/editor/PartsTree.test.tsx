import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { modelLibraryItems } from "../../lib/model-library";
import { PartsTree } from "./PartsTree";

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
    fireEvent.click(screen.getAllByRole("button", { name: "添加" })[0]);

    expect(screen.getByText(modelLibraryItems[0].name)).toBeTruthy();
    expect(onAddLocalModelClick).toHaveBeenCalledTimes(1);
    expect(onAddLibraryModel).toHaveBeenCalledWith(modelLibraryItems[0]);
  });
});
