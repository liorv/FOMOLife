import { fireEvent, render, screen } from "@testing-library/react";
import ProjectsDashboard from "../ProjectsDashboard";

beforeEach(() => {
  localStorage.removeItem("project-swipe-actions-hint-dismissed");
  localStorage.removeItem("fomo:projects:view");
  jest.spyOn(global, "fetch").mockImplementation(() => new Promise(() => {}));
});

afterEach(() => {
  localStorage.removeItem("project-swipe-actions-hint-dismissed");
  localStorage.removeItem("fomo:projects:view");
  jest.restoreAllMocks();
});

it("switches between card, list, and compact project layouts", () => {
  const onOpenColorPicker = jest.fn();
  render(
    <ProjectsDashboard
      onOpenColorPicker={onOpenColorPicker}
      projects={[
        {
          id: "project-1",
          text: "Project One",
          color: "#1976D2",
          externalUrl: "https://example.com/project",
          subprojects: [
            {
              id: "subproject-1",
              text: "Subproject One",
              tasks: [
                {
                  id: "task-1",
                  text: "Done",
                  done: true,
                  dueDate: null,
                  favorite: false,
                  people: [],
                },
                {
                  id: "task-2",
                  text: "To do",
                  done: false,
                  dueDate: null,
                  favorite: false,
                  people: [],
                },
              ],
            },
          ],
        },
      ]}
    />,
  );

  const cardsButton = screen.getByRole("button", { name: "Cards view" });
  const listButton = screen.getByRole("button", { name: "List view" });
  const compactButton = screen.getByRole("button", { name: "Compact view" });

  expect(cardsButton).toHaveAttribute("aria-pressed", "true");
  expect(document.querySelector(".dashboard-tiles-grid--cards")).toBeInTheDocument();
  expect(screen.getByRole("progressbar", { name: "Project One progress" })).toHaveAttribute("aria-valuenow", "50");

  fireEvent.click(listButton);
  expect(listButton).toHaveAttribute("aria-pressed", "true");
  expect(localStorage.getItem("fomo:projects:view")).toBe("list");
  expect(cardsButton).toHaveAttribute("aria-pressed", "false");
  expect(document.querySelector(".dashboard-tiles-grid--list")).toBeInTheDocument();
  expect(document.querySelector(".project-inline-progress-fill")).toHaveStyle({ width: "50%" });
  const projectLink = screen.getByRole("link", {
    name: "Open project link for Project One (opens in a new tab)",
  });
  expect(projectLink).toHaveAttribute("href", "https://example.com/project");
  expect(projectLink).toHaveClass("project-layout-link");
  expect(projectLink.querySelector(".material-icons")).toHaveTextContent("link");

  const colorButton = screen.getByRole("button", { name: "Change Project One color" });
  const actions = screen.getByRole("group", { name: "Project One actions" });
  expect(actions).toContainElement(
    screen.getByRole("button", { name: "Rename Project One" }),
  );
  expect(actions).toContainElement(
    screen.getByRole("button", { name: "Edit Project One" }),
  );
  expect(screen.queryByRole("button", { name: "Project menu" })).not.toBeInTheDocument();
  fireEvent.click(colorButton);
  expect(onOpenColorPicker).toHaveBeenCalledWith("project-1", expect.any(HTMLElement));

  fireEvent.click(compactButton);
  expect(compactButton).toHaveAttribute("aria-pressed", "true");
  expect(document.querySelector(".dashboard-tiles-grid--compact")).toBeInTheDocument();
  expect(localStorage.getItem("fomo:projects:view")).toBe("compact");
  const hint = screen.getByText("Swipe left for actions").closest("div")!;
  expect(hint.querySelectorAll("svg")).toHaveLength(1);
  fireEvent.click(hint.querySelector("button")!);
  expect(screen.queryByText("Swipe left for actions")).not.toBeInTheDocument();
  expect(localStorage.getItem("project-swipe-actions-hint-dismissed")).toBe("1");
});

it("restores the previously selected project layout", () => {
  localStorage.setItem("fomo:projects:view", "list");
  render(
    <ProjectsDashboard
      projects={[{ id: "p1", text: "Project", color: "#1976D2", subprojects: [] }]}
    />,
  );

  expect(screen.getByRole("button", { name: "List view" })).toHaveAttribute("aria-pressed", "true");
  expect(document.querySelector(".dashboard-tiles-grid--list")).toBeInTheDocument();
});

it("does not show the swipe hint again after it has been dismissed", () => {
  localStorage.setItem("project-swipe-actions-hint-dismissed", "1");
  render(
    <ProjectsDashboard
      projects={[{ id: "p1", text: "Project", color: "#1976D2", subprojects: [] }]}
    />,
  );
  expect(screen.queryByText("Swipe left for actions")).not.toBeInTheDocument();
});

it("does not show a swipe hint when there are no project tiles", () => {
  render(<ProjectsDashboard projects={[]} />);
  expect(screen.queryByText("Swipe left for actions")).not.toBeInTheDocument();
});
