import { GenerateBlueprintRequest, GenerateBlueprintResponse, ILLMProvider } from '../types';

export class MockProvider implements ILLMProvider {
  async generateBlueprint(request: GenerateBlueprintRequest): Promise<GenerateBlueprintResponse> {
    
    // Simulate AI loading delay
    await new Promise(resolve => setTimeout(resolve, 1500)); 

    let mockProjectName = "AI Blueprint Project";
    if (request.goal) {
      mockProjectName = request.goal.split(' ').slice(0, 4).join(' ') + '...';
    }

    let subProjects = [];
    if (request.complexity === 'Simple') {
      subProjects = [
        {
          title: "Setup & Prep",
          tasks: [
            { description: "Identify resources needed", priority: "Medium", effort: 1, deadline_offset_days: 1 },
            { description: "Gather initial context", priority: "Low", effort: 1, deadline_offset_days: 2 }
          ]
        },
        {
          title: "Execution",
          tasks: [
            { description: "Draft first version", priority: "High", effort: 1, deadline_offset_days: 5 },
            { description: "Review and refine", priority: "Medium", effort: 1, deadline_offset_days: 7 }
          ]
        }
      ];
    } else if (request.complexity === 'Detailed') {
      subProjects = [
        {
          title: "Phase 1: Research & Discovery",
          tasks: [
            { description: "Conduct market analysis", priority: "High", effort: 1, deadline_offset_days: 2 },
            { description: "Identify competitor benchmarks", priority: "Medium", effort: 1, deadline_offset_days: 3 },
            { description: "Compile requirement docs", priority: "High", effort: 1, deadline_offset_days: 5 }
          ]
        },
        {
          title: "Phase 2: Strategy & Planning",
          tasks: [
            { description: "Draft strategic roadmap", priority: "High", effort: 1, deadline_offset_days: 7 },
            { description: "Define KPIs and metrics", priority: "Medium", effort: 1, deadline_offset_days: 8 },
            { description: "Allocate budget and resources", priority: "Medium", effort: 1, deadline_offset_days: 10 }
          ]
        },
        {
          title: "Phase 3: Execution & Delivery",
          tasks: [
            { description: "Kickoff implementation", priority: "High", effort: 1, deadline_offset_days: 12 },
            { description: "Mid-point review", priority: "Medium", effort: 1, deadline_offset_days: 15 },
            { description: "Final QA and launch", priority: "High", effort: 1, deadline_offset_days: 20 }
          ]
        }
      ];
    } else {
      // Standard
      subProjects = [
        {
          title: "Phase 1: Preparation",
          tasks: [
            { description: "Define clear objectives", priority: "High", effort: 1, deadline_offset_days: 1 },
            { description: "Initial setup", priority: "Medium", effort: 1, deadline_offset_days: 3 }
          ]
        },
        {
          title: "Phase 2: Core Work",
          tasks: [
            { description: "Develop main deliverables", priority: "High", effort: 1, deadline_offset_days: 7 },
            { description: "Iterate on feedback", priority: "Medium", effort: 1, deadline_offset_days: 10 }
          ]
        }
      ];
    }

    return {
      project_name: mockProjectName,
      sub_projects: subProjects
    };
  }
}
