import { useQuery } from "@tanstack/react-query";

export interface TemplateDescriptor {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  entityCount: number;
}

export interface DiagramDto {
  projectName: string;
  basePackage: string;
  framework: string;
  entities: any[];
  relationships: any[];
}

async function fetchTemplates(): Promise<TemplateDescriptor[]> {
  const response = await fetch("http://localhost:8080/api/scaffold/templates");
  if (!response.ok) {
    throw new Error(`Failed to fetch templates: ${response.statusText}`);
  }
  return response.json();
}

async function fetchTemplateDiagram(templateId: string): Promise<DiagramDto> {
  const response = await fetch(`http://localhost:8080/api/scaffold/templates/${templateId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch template diagram: ${response.statusText}`);
  }
  return response.json();
}

export function useTemplates() {
  const { data, isLoading, error } = useQuery<TemplateDescriptor[], Error>({
    queryKey: ["templates"],
    queryFn: fetchTemplates,
  });

  return {
    templates: data ?? [],
    isLoading,
    error,
    fetchTemplateDiagram,
  };
}
