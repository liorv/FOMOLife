import React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { ProjectItem } from "@myorg/types";
import ProjectEditor from "../ProjectEditor";
import ProjectsDashboard from "../ProjectsDashboard";

const project: ProjectItem = {
  id: "project",
  text: "Launch plan",
  color: "#1976D2",
  avatarUrl: "/project.svg",
  members: [{ userId: "self", name: "Me" }],
  subprojects: [
    {
      id: "section",
      text: "Planning",
      collapsed: false,
      tasks: [
        {
          id: "task",
          text: "Review launch",
          done: false,
          favorite: false,
          dueDate: null,
          people: [],
        },
      ],
    },
  ],
};

beforeEach(() => {
  jest.spyOn(global, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({ counts: {}, available: false }),
  } as Response);
});

afterEach(() => {
  jest.restoreAllMocks();
});

it("does not count completed-task visibility as an active task filter", async () => {
  await act(async () => {
    render(
      <ProjectsDashboard
        projects={[project]}
        selectedProjectId={project.id}
        filters={["hide_completed"]}
      />,
    );
  });
  expect(screen.getByRole("button", { name: "Filter tasks" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  expect(screen.queryByText("Filter (1)")).not.toBeInTheDocument();
});

it("shows the project-tile-style header with a breadcrumb back action", async () => {
  const onSelectProject = jest.fn();
  await act(async () => {
    render(
      <ProjectsDashboard
        projects={[project]}
        selectedProjectId={project.id}
        onSelectProject={onSelectProject}
      />,
    );
  });

  const projectHeading = screen.getByRole("heading", { name: "Launch plan" });
  const projectHeader = projectHeading.closest(".dashboard-project-header");
  expect(projectHeader).toHaveClass("dashboard-project-header--tile");
  expect(screen.getByRole("progressbar", { name: "Launch plan progress" })).toHaveAttribute("aria-valuenow", "0");
  const nameRow = projectHeading.closest(".dashboard-project-name-row");
  expect(nameRow).toContainElement(screen.getByRole("button", { name: "Invite to project" }));
  const actionsArea = projectHeader?.nextElementSibling;
  expect(actionsArea).toHaveClass("project-editor-actions-area");
  expect(actionsArea).toContainElement(screen.getByRole("button", { name: "Filter tasks" }));
  expect(actionsArea).toContainElement(screen.getByRole("group", { name: "Project tools" }));
  expect(projectHeader).not.toContainElement(screen.getByRole("button", { name: "Filter tasks" }));
  expect(screen.queryByRole("button", { name: "Edit project image and overview" })).not.toBeInTheDocument();
  expect(screen.queryByRole("group", { name: "Back button layout preview" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Back to projects" }));
  expect(onSelectProject).toHaveBeenCalledWith(null);
});

it("offers restoration rather than completion for archived projects", () => {
  const onArchiveToggle = jest.fn();
  render(
    <ProjectEditor
      project={{ ...project, archived: true }}
      onArchiveToggle={onArchiveToggle}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "More project actions" }));
  fireEvent.click(screen.getByRole("button", { name: "Restore project" }));
  expect(onArchiveToggle).toHaveBeenCalledWith(false);
});

it("keeps secondary actions hidden until requested, preserving archive and export callbacks", () => {
  const onArchiveToggle = jest.fn();
  const onExport = jest.fn();
  render(
    <ProjectEditor
      project={project}
      onArchiveToggle={onArchiveToggle}
      onExport={onExport}
    />,
  );
  expect(
    screen.queryByRole("button", { name: /Complete & archive/ }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /Export JSON/ }),
  ).not.toBeInTheDocument();
  const trigger = screen.getByRole("button", { name: "More project actions" });
  fireEvent.click(trigger);
  fireEvent.click(screen.getByRole("button", { name: "Export JSON" }));
  expect(onExport).toHaveBeenCalledTimes(1);
  expect(trigger).toHaveAttribute("aria-expanded", "false");
  expect(trigger).toHaveFocus();
  fireEvent.click(trigger);
  fireEvent.click(
    screen.getByRole("button", { name: "Complete & archive" }),
  );
  expect(onArchiveToggle).toHaveBeenCalledWith(true);
});

it("exposes completed visibility and section controls through View", () => {
  const onToggleFilter = jest.fn();
  const onApplyChange = jest.fn();
  render(
    <ProjectEditor
      project={project}
      taskFilters={["hide_completed"]}
      onToggleFilter={onToggleFilter}
      onApplyChange={onApplyChange}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "View options" }));
  const toggle = screen.getByRole("checkbox", { name: "Show completed tasks" });
  expect(toggle).not.toBeChecked();
  fireEvent.click(toggle);
  expect(onToggleFilter).toHaveBeenCalledWith(null);
  expect(
    screen.getByRole("group", { name: "View options" }),
  ).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Collapse all sections" }),
  );
  expect(onApplyChange).toHaveBeenLastCalledWith(
    expect.objectContaining({
      subprojects: [
        expect.objectContaining({ id: "section", collapsed: true }),
      ],
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: "View options" }));
  fireEvent.click(screen.getByRole("button", { name: "Expand all sections" }));
  expect(onApplyChange).toHaveBeenLastCalledWith(
    expect.objectContaining({
      subprojects: [
        expect.objectContaining({ id: "section", collapsed: false }),
      ],
    }),
  );
});

it("opens inline options below the toolbar and closes them with the trigger, close button, or Escape", () => {
  render(<ProjectEditor project={project} />);
  const trigger = screen.getByRole("button", { name: "More project actions" });
  expect(trigger).not.toHaveClass("project-action-btn--active");
  fireEvent.click(trigger);
  const panel = screen.getByRole("group", { name: "More project actions" });
  expect(panel).toHaveClass("project-editor-tool-options");
  expect(panel.closest(".project-editor-actions-area")).toBeInTheDocument();
  expect(screen.getByRole("group", { name: "Project tools" })).not.toContainElement(panel);
  expect(panel).toHaveAttribute("id", trigger.getAttribute("aria-controls"));
  expect(trigger).toHaveClass("project-action-btn--active");
  fireEvent.pointerDown(document.body);
  fireEvent.blur(trigger, { relatedTarget: document.body });
  expect(trigger).toHaveAttribute("aria-expanded", "true");
  screen.getByRole("button", { name: "Project overview" }).focus();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(trigger).toHaveAttribute("aria-expanded", "false");
  expect(trigger).not.toHaveClass("project-action-btn--active");
  expect(trigger).toHaveFocus();
  fireEvent.click(trigger);
  fireEvent.click(screen.getByRole("button", { name: "Close more project actions" }));
  expect(trigger).toHaveAttribute("aria-expanded", "false");
  expect(trigger).toHaveFocus();
  fireEvent.click(trigger);
  fireEvent.click(trigger);
  expect(trigger).toHaveAttribute("aria-expanded", "false");
});

it("switches between View and More inline panels and keeps View open for checkbox changes", () => {
  render(<ProjectEditor project={project} onToggleFilter={jest.fn()} />);
  const view = screen.getByRole("button", { name: "View options" });
  const more = screen.getByRole("button", { name: "More project actions" });
  fireEvent.click(view);
  expect(view).toHaveClass("project-action-btn--active");
  fireEvent.click(screen.getByRole("checkbox", { name: "Show completed tasks" }));
  expect(view).toHaveAttribute("aria-expanded", "true");
  fireEvent.click(more);
  expect(view).toHaveAttribute("aria-expanded", "false");
  expect(view).not.toHaveClass("project-action-btn--active");
  expect(screen.queryByRole("group", { name: "View options" })).not.toBeInTheDocument();
  expect(more).toHaveClass("project-action-btn--active");
  fireEvent.click(view);
  fireEvent.click(screen.getByRole("button", { name: "Close view options" }));
  expect(view).toHaveAttribute("aria-expanded", "false");
  expect(view).toHaveFocus();
});

it("resets inline options when switching projects and preserves the Invite dialog", () => {
  const { rerender } = render(<ProjectEditor project={project} />);
  fireEvent.click(screen.getByRole("button", { name: "View options" }));
  rerender(<ProjectEditor project={{ ...project, id: "another-project" }} />);
  expect(screen.getByRole("button", { name: "View options" })).toHaveAttribute("aria-expanded", "false");
  const invite = screen.getByRole("button", { name: "Invite to project" });
  expect(invite).toHaveClass("invite-members-btn");
  expect(invite).not.toHaveClass("expand-collapse-btn");
  fireEvent.click(invite);
  expect(screen.getByRole("heading", { name: "Invite to project" })).toBeInTheDocument();
});

it("keeps Filter and Chat available while filtering and groups project management in More", async () => {
  const onOpenProjectThread = jest.fn();
  const onImportProject = jest.fn();
  await act(async () => {
    render(
      <ProjectsDashboard
        projects={[project]}
        selectedProjectId={project.id}
        onOpenProjectThread={onOpenProjectThread}
        onConvertTemplate={jest.fn()}
        onImportProject={onImportProject}
      />,
    );
  });
  const tools = within(screen.getByRole("group", { name: "Project tools" }));
  expect(tools.getAllByRole("button")).toHaveLength(4);
  expect(
    screen.queryByRole("button", { name: "Convert to template" }),
  ).not.toBeInTheDocument();
  fireEvent.click(tools.getByRole("button", { name: "Filter tasks" }));
  expect(tools.getByRole("button", { name: "Filter tasks" })).toHaveClass("project-action-btn--active");
  expect(screen.getByTitle("Close filters")).toBeInTheDocument();
  fireEvent.click(tools.getByRole("button", { name: "Project conversation" }));
  expect(onOpenProjectThread).toHaveBeenCalledWith(project);
  fireEvent.click(tools.getByRole("button", { name: "More project actions" }));
  expect(
    screen.getByRole("button", { name: "Convert to template" }),
  ).toBeInTheDocument();
  const morePanel = screen.getByRole("group", { name: "More project actions" });
  expect(morePanel.closest(".project-editor-actions-area")).toBeInTheDocument();
  expect(tools.getByRole("button", { name: "More project actions" })).toHaveClass("project-action-btn--active");
  expect(screen.getByRole("button", { name: "Export JSON" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Import JSON" }));
  expect(
    screen.getByRole("heading", { name: "Import into Launch plan" }),
  ).toBeInTheDocument();
  fireEvent.change(screen.getByPlaceholderText('{"name": "My project", "sub_projects": [...]}'), {
    target: {
      value: JSON.stringify({
        name: "Imported project",
        sub_projects: [{ title: "Preparation", tasks: [{ text: "Write brief" }] }],
      }),
    },
  });
  fireEvent.click(screen.getByRole("button", { name: "Preview" }));
  expect(screen.getByText("1 sub-project, 1 task")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Confirm Import" }));
  expect(onImportProject).toHaveBeenCalledWith(
    project.id,
    [expect.objectContaining({
      text: "Preparation",
      tasks: [expect.objectContaining({ text: "Write brief" })],
    })],
  );
  expect(screen.queryByRole("heading", { name: "Import into Launch plan" })).not.toBeInTheDocument();
});

it("places Leave project at the bottom of the overview with two-step confirmation", async () => {
  const onRemoveMember = jest.fn();
  await act(async () => {
    render(
      <ProjectsDashboard
        projects={[project]}
        selectedProjectId={project.id}
        currentUserId="self"
        onRemoveMember={onRemoveMember}
      />,
    );
  });
  fireEvent.click(screen.getByRole("button", { name: "More project actions" }));
  expect(screen.queryByRole("button", { name: "Leave project" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Project overview" }));
  const leave = screen.getByRole("button", { name: "Leave project" });
  const section = leave.closest(".project-overview-leave");
  expect(section?.parentElement).toHaveClass("project-overview-modal-content");
  expect(section?.nextElementSibling).toBeNull();
  fireEvent.click(leave);
  expect(onRemoveMember).not.toHaveBeenCalled();
  fireEvent.blur(leave);
  expect(leave).toHaveTextContent("Leave project");
  fireEvent.click(leave);
  fireEvent.click(screen.getByRole("button", { name: "Confirm leave project" }));
  expect(onRemoveMember).toHaveBeenCalledWith(project.id, "self");
  expect(screen.queryByRole("heading", { name: "Edit Project Overview" })).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "More project actions" }),
  ).toHaveAttribute("aria-expanded", "false");
});

it("does not offer Leave project to nonmembers or without a removal callback", () => {
  const { rerender } = render(
    <ProjectEditor project={project} currentUserId="other" onRemoveMember={jest.fn()} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "More project actions" }));
  fireEvent.click(screen.getByRole("button", { name: "Project overview" }));
  expect(screen.queryByRole("button", { name: "Leave project" })).not.toBeInTheDocument();
  rerender(<ProjectEditor project={project} currentUserId="self" />);
  expect(screen.queryByRole("button", { name: "Leave project" })).not.toBeInTheDocument();
});

it("expires the leave confirmation and resets it after closing the overview", () => {
  jest.useFakeTimers();
  try {
    render(<ProjectEditor project={project} currentUserId="self" onRemoveMember={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "More project actions" }));
    fireEvent.click(screen.getByRole("button", { name: "Project overview" }));
    fireEvent.click(screen.getByRole("button", { name: "Leave project" }));
    act(() => jest.advanceTimersByTime(3000));
    expect(screen.getByRole("button", { name: "Leave project" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Leave project" }));
    fireEvent.click(screen.getByTitle("Close"));
    fireEvent.click(screen.getByRole("button", { name: "More project actions" }));
    fireEvent.click(screen.getByRole("button", { name: "Project overview" }));
    expect(screen.getByRole("button", { name: "Leave project" })).toBeInTheDocument();
  } finally {
    jest.useRealTimers();
  }
});
