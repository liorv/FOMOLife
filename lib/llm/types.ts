export interface GenerateBlueprintRequest {
  goal: string;
  targetDate?: string;
  complexity: string;
  context?: string;
}

export interface TaskDraft {
  description: string;
  priority: string;
  effort: number;
  deadline_offset_days: number;
}

export interface SubprojectDraft {
  title: string;
  tasks: TaskDraft[];
}

export interface GenerateBlueprintResponse {
  project_name: string;
  sub_projects: SubprojectDraft[];
}

export interface ILLMProvider {
  /**
   * Generates a structured JSON blueprint matching GenerateBlueprintResponse
   */
  generateBlueprint(request: GenerateBlueprintRequest): Promise<GenerateBlueprintResponse>;
}
