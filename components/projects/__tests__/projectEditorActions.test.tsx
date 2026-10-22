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
    screen.queryByRole("button", { name: /Mark complete & archive/ }),
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
    screen.getByRole("button", { name: "Mark complete & archive" }),
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

it("dismisses disclosures with Escape, outside interaction, and keyboard focus leaving", () => {
  render(<ProjectEditor project={project} />);
  const trigger = screen.getByRole("button", { name: "More project actions" });
  fireEvent.click(trigger);
  screen.getByRole("button", { name: "Edit project overview" }).focus();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(trigger).toHaveAttribute("aria-expanded", "false");
  expect(trigger).toHaveFocus();
  fireEvent.click(trigger);
  fireEvent.pointerDown(document.body);
  expect(trigger).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(trigger);
  fireEvent.blur(trigger, { relatedTarget: document.body });
  expect(trigger).toHaveAttribute("aria-expanded", "false");
});

it("keeps Filter and Chat available while filtering and groups project management in More", async () => {
  const onOpenProjectThread = jest.fn();
  await act(async () => {
    render(
      <ProjectsDashboard
        projects={[project]}
        selectedProjectId={project.id}
        onOpenProjectThread={onOpenProjectThread}
        onConvertTemplate={jest.fn()}
        onImportProject={jest.fn()}
      />,
    );
  });
  const tools = within(screen.getByRole("group", { name: "Project tools" }));
  expect(tools.getAllByRole("button")).toHaveLength(4);
  expect(
    screen.queryByRole("button", { name: "Convert to template" }),
  ).not.toBeInTheDocument();
  fireEvent.click(tools.getByRole("button", { name: "Filter tasks" }));
  expect(screen.getByTitle("Close filters")).toBeInTheDocument();
  fireEvent.click(tools.getByRole("button", { name: "Project conversation" }));
  expect(onOpenProjectThread).toHaveBeenCalledWith(project);
  fireEvent.click(tools.getByRole("button", { name: "More project actions" }));
  expect(
    screen.getByRole("button", { name: "Convert to template" }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Import sub-projects" }));
  expect(
    screen.getByRole("heading", { name: "Import into Launch plan" }),
  ).toBeInTheDocument();
});

it("preserves the two-step leave confirmation inside More", async () => {
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
  fireEvent.click(screen.getByRole("button", { name: "Leave" }));
  expect(onRemoveMember).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Confirm Leave?" }));
  expect(onRemoveMember).toHaveBeenCalledWith(project.id, "self");
  expect(
    screen.getByRole("button", { name: "More project actions" }),
  ).toHaveAttribute("aria-expanded", "false");
});
