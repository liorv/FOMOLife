import { fireEvent, render, screen, within } from "@testing-library/react";
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

it("opens the optional Plan view and returns to the unchanged task editor", () => {
  render(
    <ProjectsDashboard
      projects={[{ id: "p", text: "Release", color: "#1976D2", subprojects: [] }]}
      selectedProjectId="p"
    />,
  );
  const views = screen.getByRole("group", { name: "Project workspace view" });
  const tasks = within(views).getByRole("button", { name: "Tasks" });
  const projectHeader = screen.getByRole("heading", { name: "Release" }).closest(".dashboard-project-header");
  expect(projectHeader).toBeInTheDocument();
  expect(within(projectHeader as HTMLElement).getByRole("progressbar", { name: "Release progress" })).toBeInTheDocument();
  expect(tasks).toHaveAttribute("aria-pressed", "true");
  expect(screen.queryByRole("region", { name: "Release project plan" })).not.toBeInTheDocument();
  fireEvent.click(within(views).getByRole("button", { name: "Plan" }));
  expect(screen.getByRole("region", { name: "Release project plan" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Release" }).closest(".dashboard-project-header")).toBe(projectHeader);
  expect(screen.queryByRole("button", { name: "Back to projects" })).not.toBeInTheDocument();
  expect(screen.queryByRole("group", { name: "Project tools" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Open AI assistant" })).not.toBeInTheDocument();
  fireEvent.click(tasks);
  expect(screen.queryByRole("region", { name: "Release project plan" })).not.toBeInTheDocument();
  expect(tasks).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("group", { name: "Project tools" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Open AI assistant" })).toBeInTheDocument();
});

it("places Material graph actions in the Plan header instead of members and Invite", () => {
  render(
    <ProjectsDashboard
      selectedProjectId="p"
      projects={[{
        id: "p", text: "Release", color: "#1976D2",
        subprojects: [{ id: "s", text: "Launch", tasks: [
          { id: "a", text: "Approve", done: false, favorite: false, dueDate: null, people: [] },
          { id: "b", text: "Publish", done: false, favorite: false, dueDate: null, people: [] },
        ] }],
        planningLinks: [{ dependent: { kind: "task", id: "b" }, prerequisite: { kind: "task", id: "a" } }],
      }]}
    />,
  );
  expect(screen.getByRole("button", { name: "Invite to project" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Plan" }));
  expect(screen.queryByRole("button", { name: "Invite to project" })).not.toBeInTheDocument();
  expect(document.querySelector(".project-members-bar")).not.toBeInTheDocument();
  const header = screen.getByRole("heading", { name: "Release" }).closest(".dashboard-project-header")!;
  const map = within(screen.getByRole("region", { name: "Dependency map" }));
  fireEvent.click(map.getByRole("button", { name: "Inspect: Publish (task, Launch)" }));
  const actions = screen.getByRole("group", { name: "Selected graph item" });
  expect(header).toContainElement(actions);
  expect(screen.getByRole("region", { name: "Release project plan" })).not.toContainElement(actions);
  const add = within(actions).getByRole("button", { name: "Add dependency" });
  expect(add.querySelector(".material-icons")).toHaveTextContent("add_link");
  fireEvent.click(add);
  expect(screen.getByText("Select what it depends on")).toHaveFocus();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  fireEvent.click(map.getByRole("button", { name: "Dependency: Publish depends on Approve" }));
  const remove = screen.getByRole("button", { name: "Remove dependency" });
  expect(header).toContainElement(remove);
  expect(remove.querySelector(".material-icons")).toHaveTextContent("link_off");
  fireEvent.keyDown(remove, { key: "Escape" });
  expect(screen.queryByRole("group", { name: "Selected graph item" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Tasks" }));
  expect(screen.getByRole("button", { name: "Invite to project" })).toBeInTheDocument();
});

it("shows Roadmap as a peer tab with the shared project header and no embedded roadmap in Plan", () => {
  const projects = [{
    id: "p", text: "Release", color: "#1976D2",
    subprojects: [{ id: "s", text: "Launch", tasks: [
      { id: "a", text: "Approve", done: false, effort: 3, favorite: false, dueDate: null, people: [] },
    ] }],
  }];
  const { rerender } = render(<ProjectsDashboard selectedProjectId="p" projects={projects} />);
  const views = within(screen.getByRole("group", { name: "Project workspace view" }));
  expect(views.getAllByRole("button")).toHaveLength(3);
  fireEvent.click(views.getByRole("button", { name: "Plan" }));
  expect(screen.queryByRole("region", { name: "Roadmap" })).not.toBeInTheDocument();
  fireEvent.click(views.getByRole("button", { name: "Roadmap" }));
  expect(views.getByRole("button", { name: "Roadmap" })).toHaveAttribute("aria-pressed", "true");
  expect(views.getByRole("button", { name: "Tasks" })).toHaveAttribute("aria-pressed", "false");
  expect(views.getByRole("button", { name: "Plan" })).toHaveAttribute("aria-pressed", "false");
  expect(screen.getByRole("heading", { name: "Release" }).closest(".dashboard-project-header")).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Roadmap" })).toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "Release project plan" })).not.toBeInTheDocument();
  expect(screen.queryByRole("group", { name: "Project tools" })).not.toBeInTheDocument();
  expect(screen.getByText("3 days")).toBeInTheDocument();
  rerender(<ProjectsDashboard selectedProjectId="p" selectedTaskId="a" projects={projects} />);
  expect(views.getByRole("button", { name: "Tasks" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.queryByRole("region", { name: "Roadmap" })).not.toBeInTheDocument();
});

it("slides workspace content in the tab direction while keeping the header outside the animation", () => {
  render(<ProjectsDashboard selectedProjectId="p" projects={[{
    id: "p", text: "Release", color: "#1976D2",
    subprojects: [{ id: "s", text: "Launch", tasks: [
      { id: "a", text: "Approve", done: false, effort: 1, favorite: false, dueDate: null, people: [] },
    ] }],
  }]} />);
  const views = within(screen.getByRole("group", { name: "Project workspace view" }));
  const workspace = () => document.querySelector(".project-editor-workspace") as HTMLElement;
  const header = screen.getByRole("heading", { name: "Release" }).closest(".dashboard-project-header")!;
  expect(workspace()).toHaveClass("project-editor-workspace--none");
  expect(workspace()).toContainElement(screen.getByRole("group", { name: "Project tools" }));
  expect(workspace()).not.toContainElement(header as HTMLElement);
  fireEvent.click(views.getByRole("button", { name: "Roadmap" }));
  expect(workspace()).toHaveClass("project-editor-workspace--forward");
  expect(workspace()).toHaveAttribute("data-workspace-view", "roadmap");
  expect(workspace()).toContainElement(screen.getByRole("region", { name: "Roadmap" }));
  expect(workspace()).not.toContainElement(header as HTMLElement);
  fireEvent.click(views.getByRole("button", { name: "Plan" }));
  expect(workspace()).toHaveClass("project-editor-workspace--backward");
  expect(workspace()).toContainElement(screen.getByRole("region", { name: "Release project plan" }));
  fireEvent.click(views.getByRole("button", { name: "Roadmap" }));
  expect(workspace()).toHaveClass("project-editor-workspace--forward");
  fireEvent.click(views.getByRole("button", { name: "Tasks" }));
  expect(workspace()).toHaveClass("project-editor-workspace--backward");
  expect(workspace()).toHaveAttribute("data-workspace-view", "tasks");
});

it("shows Roadmap task actions in the project header", () => {
  render(<ProjectsDashboard selectedProjectId="p" onApplyChange={jest.fn()} projects={[{
    id: "p", text: "Release", color: "#1976D2",
    subprojects: [{ id: "s", text: "Launch", tasks: [
      { id: "a", text: "Approve", done: false, effort: 1, favorite: false, dueDate: null, people: [] },
    ] }],
  }]} />);
  fireEvent.click(screen.getByRole("button", { name: "Roadmap" }));
  fireEvent.click(screen.getByRole("button", { name: /^Approve:/ }));
  const header = screen.getByRole("heading", { name: "Release" }).closest(".dashboard-project-header")!;
  const actions = screen.getByRole("group", { name: "Selected roadmap task" });
  expect(header).toContainElement(actions);
  expect(within(actions).getByRole("button", { name: "Edit" })).toBeInTheDocument();
  expect(within(actions).getByRole("button", { name: "Add dependency" })).toBeInTheDocument();
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

it("slides the projects page content in from the side matching the selected switcher", () => {
  render(
    <ProjectsDashboard
      projects={[{ id: "p1", text: "Project", color: "#1976D2", subprojects: [] }]}
    />,
  );
  const view = () => document.querySelector(".projects-home-view")!;

  expect(view()).toHaveClass("project-editor-workspace--none");
  fireEvent.click(screen.getByRole("button", { name: "Compact view" }));
  expect(view()).toHaveAttribute("data-home-view", "compact");
  expect(view()).toHaveClass("project-editor-workspace--forward");
  fireEvent.click(screen.getByRole("button", { name: "List view" }));
  expect(view()).toHaveClass("project-editor-workspace--backward");
  fireEvent.click(screen.getByRole("button", { name: /Templates \(0\)/ }));
  expect(view()).toHaveAttribute("data-home-view", "templates");
  expect(view()).toHaveClass("project-editor-workspace--forward");
  fireEvent.click(screen.getByRole("button", { name: /Projects$/ }));
  expect(view()).toHaveClass("project-editor-workspace--backward");
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

it("shows only the creation action for the selected tab and preserves the project layout", () => {
  const onAddProject = jest.fn();
  const onCreateTemplate = jest.fn();
  render(
    <ProjectsDashboard
      onAddProject={onAddProject}
      onCreateTemplate={onCreateTemplate}
    />,
  );

  expect(screen.getByRole("group", { name: "Project views" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /New template/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /New project/ }));
  expect(onAddProject).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Compact view" }));

  fireEvent.click(screen.getByRole("button", { name: /Templates \(0\)/ }));
  expect(screen.queryByRole("group", { name: "Project layout" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /New project/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /New template/ }));
  expect(screen.getByRole("dialog", { name: "Create a template" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(onCreateTemplate).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: /Projects$/ }));
  expect(screen.getByRole("button", { name: "Compact view" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: /New project/ })).toBeInTheDocument();
});

it("does not offer creation actions without the corresponding permission", () => {
  render(<ProjectsDashboard />);
  expect(screen.queryByRole("button", { name: /New project/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Templates \(0\)/ }));
  expect(screen.queryByRole("button", { name: /New template/ })).not.toBeInTheDocument();
});
