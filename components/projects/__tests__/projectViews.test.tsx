import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import ProjectEditor from "../ProjectEditor";
import ProjectsDashboard from "../ProjectsDashboard";
import { validateProjectImportJson } from "@/lib/projects/importProject";

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

it("defaults to tasks only and places the management switch in the action bar beneath the header", () => {
  render(<ProjectsDashboard selectedProjectId="p" onProjectManagementChange={jest.fn()} projects={[
    { id: "p", text: "Release", color: "#1976D2", subprojects: [] },
  ]} />);
  const toggle = screen.getByRole("switch", { name: "Enable project management" });
  expect(toggle).not.toBeChecked();
  const tools = screen.getByRole("group", { name: "Project tools" });
  expect(tools).toContainElement(toggle);
  const header = screen.getByRole("heading", { name: "Release" }).closest(".dashboard-project-header")!;
  expect(header.compareDocumentPosition(tools) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Manage" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Plan" })).not.toBeInTheDocument();
});

it("saves enabling and disabling management without changing its data, and restores the saved setting on remount", async () => {
  const project = {
    id: "p", text: "Release", color: "#1976D2", subprojects: [],
    deadlines: [{ id: "d", label: "Launch", date: "2026-12-01" }],
  };
  const enabled = { ...project, projectManagementEnabled: true };
  const disabled = { ...project, projectManagementEnabled: false };
  const save = jest.fn().mockResolvedValueOnce(enabled).mockResolvedValueOnce(disabled);
  const props = { selectedProjectId: "p", onProjectManagementChange: save };
  const page = render(<ProjectsDashboard {...props} projects={[project]} />);
  fireEvent.click(screen.getByRole("switch", { name: "Enable project management" }));
  expect(screen.getByRole("switch")).toBeDisabled();
  await waitFor(() => expect(screen.getByRole("switch")).not.toBeDisabled());
  expect(save).toHaveBeenLastCalledWith("p", true);
  page.rerender(<ProjectsDashboard {...props} projects={[enabled]} />);
  expect(screen.getByRole("switch")).toBeChecked();
  fireEvent.click(screen.getByRole("button", { name: "Manage" }));
  expect(screen.getByRole("navigation", { name: "Manage" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Tasks" }));
  fireEvent.click(screen.getByRole("switch"));
  await waitFor(() => expect(screen.getByRole("switch")).not.toBeDisabled());
  expect(save).toHaveBeenLastCalledWith("p", false);
  page.rerender(<ProjectsDashboard {...props} projects={[disabled]} />);
  expect(screen.queryByRole("button", { name: "Manage" })).not.toBeInTheDocument();
  expect(disabled.deadlines).toEqual(project.deadlines);
  page.unmount();
  render(<ProjectsDashboard {...props} projects={[enabled]} />);
  expect(screen.getByRole("switch")).toBeChecked();
  expect(screen.getByRole("button", { name: "Manage" })).toBeInTheDocument();
});

it("surfaces a management save failure and allows retrying without changing the setting", async () => {
  const save = jest.fn().mockRejectedValue(new Error("Storage unavailable"));
  render(<ProjectsDashboard selectedProjectId="p" onProjectManagementChange={save} projects={[
    { id: "p", text: "Release", color: "#1976D2", subprojects: [] },
  ]} />);
  fireEvent.click(screen.getByRole("switch"));
  expect(await screen.findByRole("alert")).toHaveTextContent("Storage unavailable");
  expect(screen.getByRole("switch")).not.toBeChecked();
  expect(screen.getByRole("switch")).not.toBeDisabled();
  expect(screen.queryByRole("button", { name: "Manage" })).not.toBeInTheDocument();
});

it("keeps pending management saves isolated when switching projects", async () => {
  let resolveFirst!: () => void;
  let resolveSecond!: () => void;
  const projects = [
    { id: "p", text: "Release", color: "#1976D2", subprojects: [] },
    { id: "p2", text: "Other", color: "#1976D2", subprojects: [] },
  ];
  const save = jest.fn()
    .mockImplementationOnce(() => new Promise<void>(resolve => { resolveFirst = resolve; }))
    .mockImplementationOnce(() => new Promise<void>(resolve => { resolveSecond = resolve; }));
  const page = render(<ProjectsDashboard projects={projects} selectedProjectId="p" onProjectManagementChange={save} />);
  fireEvent.click(screen.getByRole("switch"));
  page.rerender(<ProjectsDashboard projects={projects} selectedProjectId="p2" onProjectManagementChange={save} />);
  expect(screen.getByRole("switch")).not.toBeDisabled();
  fireEvent.click(screen.getByRole("switch"));
  await act(async () => resolveFirst());
  expect(screen.getByRole("switch")).toBeDisabled();
  await act(async () => resolveSecond());
  expect(screen.getByRole("switch")).not.toBeDisabled();
});

it("gates management deep links and read-only changes per project", () => {
  const onWorkspaceChange = jest.fn();
  const save = jest.fn();
  const props = {
    selectedWorkspaceView: "risks" as const,
    onWorkspaceChange, onProjectManagementChange: save, canManage: false,
    projects: [
      { id: "p", text: "Release", color: "#1976D2", subprojects: [] },
      { id: "managed", text: "Managed", color: "#1976D2", subprojects: [], projectManagementEnabled: true },
    ],
  };
  const page = render(<ProjectsDashboard {...props} selectedProjectId="p" />);
  expect(onWorkspaceChange).toHaveBeenCalledWith("tasks");
  expect(screen.queryByRole("navigation", { name: "Manage" })).not.toBeInTheDocument();
  expect(screen.getByRole("switch")).toBeDisabled();
  fireEvent.click(screen.getByRole("switch"));
  expect(save).not.toHaveBeenCalled();
  page.rerender(<ProjectsDashboard {...props} selectedProjectId="managed" />);
  expect(screen.getByRole("button", { name: "Manage" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "Risks" })).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByRole("button", { name: "Tasks" }));
  page.rerender(<ProjectsDashboard {...props} selectedProjectId="managed" selectedWorkspaceView="tasks" />);
  expect(screen.getByRole("switch")).toBeChecked();
  expect(screen.getByRole("switch")).toBeDisabled();
});

it("renders URL-controlled workspace changes and reports user navigation", () => {
  const onWorkspaceChange = jest.fn();
  const props = {
    projects: [{ id: "p", text: "Release", color: "#1976D2", subprojects: [], projectManagementEnabled: true }],
    selectedProjectId: "p",
    onWorkspaceChange,
  };
  const page = render(<ProjectsDashboard {...props} selectedWorkspaceView="plan" />);
  expect(screen.getByRole("button", { name: "Plan" })).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByRole("button", { name: "Roadmap" }));
  expect(onWorkspaceChange).toHaveBeenCalledWith("roadmap");
  page.rerender(<ProjectsDashboard {...props} selectedWorkspaceView="roadmap" />);
  expect(screen.getByRole("button", { name: "Roadmap" })).toHaveAttribute("aria-pressed", "true");
  page.rerender(<ProjectsDashboard {...props} selectedWorkspaceView="tasks" />);
  expect(screen.getByRole("button", { name: "Tasks" })).toHaveAttribute("aria-pressed", "true");
});

it("expands linked sections without saving UI state and reports section navigation", () => {
  const onApplyChange = jest.fn();
  const onSelectSubproject = jest.fn();
  const project = {
    id: "p", text: "Release", color: "#1976D2",
    subprojects: [
      { id: "s", text: "Launch", collapsed: true, tasks: [] },
      { id: "s2", text: "Follow-up", collapsed: true, tasks: [] },
    ],
  };
  const page = render(<ProjectEditor project={project} targetSubprojectId="s" onSelectSubproject={onSelectSubproject} onApplyChange={onApplyChange} />);
  expect(page.container.querySelector('[data-subproject-id="s"]')).toHaveClass("expanded");
  expect(page.container.querySelector('[data-subproject-id="s2"]')).not.toHaveClass("expanded");
  expect(onApplyChange).not.toHaveBeenCalled();
  page.rerender(<ProjectEditor project={project} targetSubprojectId="s2" onSelectSubproject={onSelectSubproject} onApplyChange={onApplyChange} />);
  expect(page.container.querySelector('[data-subproject-id="s2"]')).toHaveClass("expanded");
  fireEvent.click(screen.getByText("Follow-up"));
  expect(onSelectSubproject).toHaveBeenLastCalledWith(null);
  fireEvent.click(screen.getByText("Follow-up"));
  expect(onSelectSubproject).toHaveBeenLastCalledWith("s2");
});

it("expands a linked section when fresh data adds it after a cached project renders", () => {
  const onApplyChange = jest.fn();
  const project = { id: "p", text: "Release", color: "#1976D2", subprojects: [] };
  const page = render(<ProjectEditor project={project} targetSubprojectId="new-section" onApplyChange={onApplyChange} />);
  page.rerender(<ProjectEditor project={{
    ...project,
    subprojects: [{ id: "new-section", text: "New section", collapsed: true, tasks: [] }],
  }} targetSubprojectId="new-section" onApplyChange={onApplyChange} />);
  expect(page.container.querySelector('[data-subproject-id="new-section"]')).toHaveClass("expanded");
  expect(onApplyChange).not.toHaveBeenCalled();
});

it("opens the optional Plan view and returns to the unchanged task editor", () => {
  render(
    <ProjectsDashboard
      projects={[{ id: "p", text: "Release", color: "#1976D2", subprojects: [], projectManagementEnabled: true }]}
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
  expect(within(views).getAllByRole("button")).toHaveLength(2);
  expect(screen.queryByRole("group", { name: "Manage sections" })).not.toBeInTheDocument();
  fireEvent.click(within(views).getByRole("button", { name: "Manage" }));
  expect(within(screen.getByRole("navigation", { name: "Manage" })).getAllByRole("button").map(button => button.textContent))
    .toEqual(["Plan", "Roadmap", "Risks", "Status"]);
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

it("opens Risks under Manage and saves task risks through the project editor", () => {
  const apply = jest.fn();
  const projects = [{
    id: "p", text: "Release", color: "#1976D2", projectManagementEnabled: true,
    subprojects: [{ id: "s", text: "Launch", tasks: [
      { id: "a", text: "Approve", done: false, favorite: false, dueDate: null, people: [] },
    ] }],
  }];
  const { rerender } = render(<ProjectsDashboard selectedProjectId="p" projects={projects} onApplyChange={apply} />);
  const views = within(screen.getByRole("group", { name: "Project workspace view" }));
  fireEvent.click(views.getByRole("button", { name: "Manage" }));
  fireEvent.click(screen.getByRole("button", { name: "Risks" }));
  expect(screen.getByRole("button", { name: "Risks" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("table", { name: "Risk Management" })).toBeInTheDocument();
  expect(screen.queryByRole("group", { name: "Project tools" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("row", { name: "Select row: Approve" }));
  const riskInput = screen.getByRole("textbox", { name: "New risk for Approve" });
  fireEvent.change(riskInput, { target: { value: "Delay" } });
  fireEvent.submit(riskInput.closest("form")!);
  const update = apply.mock.calls.at(-1)!;
  expect(update[0]).toBe("p");
  expect(update[1].subprojects[0].tasks[0].risks).toEqual([
    { id: expect.any(String), name: "Delay", description: "", mitigations: [] },
  ]);
  rerender(<ProjectsDashboard selectedProjectId="p" projects={[{ ...projects[0]!, ...update[1] }]} onApplyChange={apply} />);
  fireEvent.click(views.getByRole("button", { name: "Tasks" }));
  expect(screen.queryByRole("table", { name: "Risk Management" })).not.toBeInTheDocument();
  fireEvent.click(views.getByRole("button", { name: "Manage" }));
  fireEvent.click(screen.getByRole("button", { name: "Risks" }));
  expect(screen.getByText("Delay")).toBeInTheDocument();
  expect(within(screen.getByRole("table", { name: "Risk Management" })).getByText("Unmitigated", { exact: true })).toBeInTheDocument();
});

it("opens unmitigated risks from a roadmap warning, including in read-only projects", () => {
  render(<ProjectsDashboard selectedProjectId="p" projects={[{
    id: "p", text: "Release", color: "#1976D2", projectManagementEnabled: true,
    subprojects: [{ id: "s", text: "Launch", tasks: [{
      id: "a", text: "Approve", done: false, favorite: false, dueDate: null, people: [],
      risks: [
        { id: "r", name: "Delay", description: "", mitigations: [] },
        { id: "r2", name: "Damage", description: "", mitigations: [{ id: "m", text: "Packaging" }] },
      ],
    }] }],
  }]} />);
  const views = within(screen.getByRole("group", { name: "Project workspace view" }));
  fireEvent.click(views.getByRole("button", { name: "Manage" }));
  fireEvent.click(screen.getByRole("button", { name: "Roadmap" }));
  fireEvent.click(screen.getByRole("button", { name: "View unmitigated risks for Approve" }));
  expect(screen.getByRole("button", { name: "Risks" })).toHaveAttribute("aria-pressed", "true");
  const filters = within(screen.getByRole("group", { name: "Filter risks" }));
  expect(filters.getByRole("button", { name: "Unmitigated" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByText("Delay")).toBeInTheDocument();
  expect(screen.queryByText("Damage")).not.toBeInTheDocument();
  fireEvent.click(filters.getByRole("button", { name: "All" }));
  expect(screen.getByText("Damage")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Roadmap" }));
  fireEvent.click(screen.getByRole("button", { name: "Risks" }));
  expect(within(screen.getByRole("group", { name: "Filter risks" })).getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
});

it("round-trips risks and mitigations through JSON export/import without exporting their IDs", () => {
  const createUrl = URL.createObjectURL;
  const revokeUrl = URL.revokeObjectURL;
  URL.createObjectURL = jest.fn(() => "blob:project-export");
  URL.revokeObjectURL = jest.fn();
  jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  const NativeBlob = global.Blob;
  const blob = jest.spyOn(global, "Blob").mockImplementation((parts, options) => new NativeBlob(parts, options));
  try {
    render(<ProjectsDashboard selectedProjectId="p" projects={[{
      id: "p", text: "Release", color: "#1976D2",
      subprojects: [{ id: "s", text: "Launch", tasks: [{
        id: "a", text: "Approve", done: false, favorite: false, dueDate: null, people: [],
        risks: [{ id: "r", name: "Delay", description: "Lead time", mitigations: [{ id: "m", text: "Reserve stock" }] }],
      }] }],
    }]} />);
    fireEvent.click(screen.getByRole("button", { name: "More project actions" }));
    fireEvent.click(screen.getByRole("button", { name: "Export JSON" }));
    const json = String(blob.mock.calls.at(-1)![0]![0]);
    const exported = JSON.parse(json);
    expect(exported.sub_projects[0].tasks[0].risks).toEqual([
      { name: "Delay", description: "Lead time", mitigations: [{ text: "Reserve stock" }] },
    ]);
    const imported = validateProjectImportJson(json);
    expect(imported.ok).toBe(true);
    expect(imported.data!.subprojects[0]!.tasks[0]!.risks).toEqual([
      { id: expect.any(String), name: "Delay", description: "Lead time", mitigations: [{ id: expect.any(String), text: "Reserve stock" }] },
    ]);
  } finally {
    if (createUrl) URL.createObjectURL = createUrl;
    else Reflect.deleteProperty(URL, "createObjectURL");
    if (revokeUrl) URL.revokeObjectURL = revokeUrl;
    else Reflect.deleteProperty(URL, "revokeObjectURL");
  }
});

it("places Material graph actions in the Plan header instead of members and Invite", () => {
  render(
    <ProjectsDashboard
      selectedProjectId="p"
      projects={[{
        id: "p", text: "Release", color: "#1976D2", projectManagementEnabled: true,
        subprojects: [{ id: "s", text: "Launch", tasks: [
          { id: "a", text: "Approve", done: false, favorite: false, dueDate: null, people: [] },
          { id: "b", text: "Publish", done: false, favorite: false, dueDate: null, people: [] },
        ] }],
        planningLinks: [{ dependent: { kind: "task", id: "b" }, prerequisite: { kind: "task", id: "a" } }],
      }]}
    />,
  );
  expect(screen.getByRole("button", { name: "Invite to project" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Manage" }));
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

it("shows Roadmap under Manage with the shared project header and no embedded roadmap in Plan", () => {
  const projects = [{
    id: "p", text: "Release", color: "#1976D2", projectManagementEnabled: true,
    subprojects: [{ id: "s", text: "Launch", tasks: [
      { id: "a", text: "Approve", done: false, effort: 3, favorite: false, dueDate: null, people: [] },
    ] }],
  }];
  const { rerender } = render(<ProjectsDashboard selectedProjectId="p" projects={projects} />);
  const views = within(screen.getByRole("group", { name: "Project workspace view" }));
  expect(views.getAllByRole("button")).toHaveLength(2);
  fireEvent.click(views.getByRole("button", { name: "Manage" }));
  expect(screen.queryByRole("region", { name: "Roadmap" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Roadmap" }));
  expect(screen.getByRole("button", { name: "Roadmap" })).toHaveAttribute("aria-pressed", "true");
  expect(views.getByRole("button", { name: "Tasks" })).toHaveAttribute("aria-pressed", "false");
  expect(screen.getByRole("button", { name: "Plan" })).toHaveAttribute("aria-pressed", "false");
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
    id: "p", text: "Release", color: "#1976D2", projectManagementEnabled: true,
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
  fireEvent.click(views.getByRole("button", { name: "Manage" }));
  fireEvent.click(screen.getByRole("button", { name: "Roadmap" }));
  expect(workspace()).toHaveClass("project-editor-workspace--forward");
  expect(workspace()).toHaveAttribute("data-workspace-view", "roadmap");
  expect(workspace()).toContainElement(screen.getByRole("region", { name: "Roadmap" }));
  expect(workspace()).not.toContainElement(header as HTMLElement);
  fireEvent.click(screen.getByRole("button", { name: "Plan" }));
  expect(workspace()).toHaveClass("project-editor-workspace--backward");
  expect(workspace()).toContainElement(screen.getByRole("region", { name: "Release project plan" }));
  fireEvent.click(screen.getByRole("button", { name: "Roadmap" }));
  expect(workspace()).toHaveClass("project-editor-workspace--forward");
  fireEvent.click(views.getByRole("button", { name: "Tasks" }));
  expect(workspace()).toHaveClass("project-editor-workspace--backward");
  expect(workspace()).toHaveAttribute("data-workspace-view", "tasks");
});

it("shows Roadmap task actions in the project header", () => {
  render(<ProjectsDashboard selectedProjectId="p" onApplyChange={jest.fn()} projects={[{
    id: "p", text: "Release", color: "#1976D2", projectManagementEnabled: true,
    subprojects: [{ id: "s", text: "Launch", tasks: [
      { id: "a", text: "Approve", done: false, effort: 1, favorite: false, dueDate: null, people: [] },
    ] }],
  }]} />);
  fireEvent.click(screen.getByRole("button", { name: "Manage" }));
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
