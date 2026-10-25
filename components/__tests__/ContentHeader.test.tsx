import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import ContentHeader from "../ContentHeader";

jest.mock("../ReleaseNotes", () => ({ __esModule: true, default: () => null }));

it("renders the page title as a heading by default", () => {
  render(<ContentHeader title="Projects" />);
  expect(screen.getByRole("heading", { level: 1, name: "Projects" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Back to/ })).not.toBeInTheDocument();
});

it("replaces the title with a back button that uses the title styling", () => {
  const onBack = jest.fn();
  render(<ContentHeader title="Projects" onBack={onBack} backLabel="Back to projects" />);

  expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  const back = screen.getByRole("button", { name: "Back to projects" });
  expect(back).toHaveTextContent("Projects");
  expect(back).toHaveClass("title");
  fireEvent.click(back);
  expect(onBack).toHaveBeenCalledTimes(1);
});

it("pins the header while the back button is shown and publishes its height to the scroll container", () => {
  const { container, rerender } = render(
    <div data-testid="scroller"><ContentHeader title="Projects" onBack={jest.fn()} /></div>,
  );
  const scroller = container.firstElementChild as HTMLElement;
  expect(scroller.firstElementChild).toHaveClass("sticky");
  expect(scroller.style.getPropertyValue("--content-header-height")).toMatch(/px$/);

  rerender(<div data-testid="scroller"><ContentHeader title="Projects" /></div>);
  expect(scroller.firstElementChild).not.toHaveClass("sticky");
  expect(scroller.style.getPropertyValue("--content-header-height")).toBe("");
});
