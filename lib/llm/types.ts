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

// Blueprint types removed — use conversational `generateChat` instead

export interface GenerateChatRequest {
  message: string;
  context?: string;
  history?: { role: string; text: string }[];
}

export interface ActionOption {
  type: string; // e.g., 'add_subproject', 'update_project'
  label: string;
  payload?: any;
}

export interface GenerateChatResponse {
  text: string;
  actions?: ActionOption[];
}

export interface ILLMProvider {
  /**
   * Generates a conversational response and optional actionable UI options
   */
  generateChat(request: GenerateChatRequest): Promise<GenerateChatResponse>;
}
