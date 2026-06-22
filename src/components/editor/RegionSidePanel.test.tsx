import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RegionSidePanel } from "./RegionSidePanel";

describe("RegionSidePanel", () => {
  it("renders horizontal region chips and toggles the group", () => {
    const onToggleExpanded = vi.fn();
    const onSelectRegion = vi.fn();

    render(
      <RegionSidePanel
        regions={[
          {
            id: "region-living",
            name: "客厅",
            points: [
              { x: 0, z: 0 },
              { x: 1, z: 0 },
              { x: 1, z: 1 },
            ],
          },
          {
            id: "region-bedroom",
            name: "卧室",
            points: [
              { x: 2, z: 0 },
              { x: 3, z: 0 },
              { x: 3, z: 1 },
            ],
          },
        ]}
        selectedRegionId="region-living"
        expanded
        devices={[]}
        states={{}}
        onToggleExpanded={onToggleExpanded}
        onSelectRegion={onSelectRegion}
        onCall={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "客厅" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.getByRole("button", { name: "卧室" }).getAttribute("aria-pressed")).toBe(
      "false",
    );

    fireEvent.click(screen.getByRole("button", { name: "折叠区域列表" }));
    fireEvent.click(screen.getByRole("button", { name: "卧室" }));

    expect(onToggleExpanded).toHaveBeenCalledTimes(1);
    expect(onSelectRegion).toHaveBeenCalledWith("region-bedroom");
    expect(screen.queryByRole("button", { name: "删除客厅区域" })).toBeNull();
  });

  it("keeps collapsed content in an animated hidden state", () => {
    render(
      <RegionSidePanel
        regions={[
          {
            id: "region-living",
            name: "客厅",
            points: [
              { x: 0, z: 0 },
              { x: 1, z: 0 },
              { x: 1, z: 1 },
            ],
          },
        ]}
        selectedRegionId="region-living"
        expanded={false}
        devices={[]}
        states={{}}
        onToggleExpanded={vi.fn()}
        onSelectRegion={vi.fn()}
        onCall={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "展开区域列表" })).toBeTruthy();
    expect(screen.getByTestId("region-chip-strip").getAttribute("data-state")).toBe("closed");
    expect(screen.getByTestId("region-device-stack").getAttribute("data-state")).toBe("closed");
  });
});
