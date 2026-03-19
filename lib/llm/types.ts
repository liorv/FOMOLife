export interface GenerateBlueprintRequest {
  goal: string;
  targetDate?: string;
  complexity: string;
  context?: string;
  existingSubprojects?: SubprojectDraft[];
  isForExistingProject?: boolean;
}

export interface TaskDraft {
  description: string;
  priority: string;
  effort: number;
  deadline_offset_days: number;
  done?: boolean; // For existing tasks
}

export interface SubprojectDraft {
  title: string;
  tasks: TaskDraft[];
}

export interface GenerateBlueprintResponse {
  project_name: string;
  goal?: string;
  sub_projects: SubprojectDraft[];
}

export interface ILLMProvider {
  /**
   * Generates a structured JSON blueprint matching GenerateBlueprintResponse
   */
  generateBlueprint(request: GenerateBlueprintRequest): Promise<GenerateBlueprintResponse>;
}
