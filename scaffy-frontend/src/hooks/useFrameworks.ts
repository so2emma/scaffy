import { useQuery } from "@tanstack/react-query";

export interface FeatureDescriptor {
  id: string;
  label: string;
  description: string;
  enabledByDefault: boolean;
}

export interface FrameworkDescriptor {
  frameworkId: string;
  displayName: string;
  language: string;
  description: string;
  color: string;
  availableFeatures: FeatureDescriptor[];
}

async function fetchFrameworks(): Promise<FrameworkDescriptor[]> {
  const response = await fetch("http://localhost:8080/api/scaffold/frameworks");
  if (!response.ok) {
    throw new Error(`Failed to fetch frameworks: ${response.statusText}`);
  }
  return response.json();
}

export function useFrameworks() {
  const { data, isLoading, error } = useQuery<FrameworkDescriptor[], Error>({
    queryKey: ["frameworks"],
    queryFn: fetchFrameworks,
  });

  return {
    frameworks: data ?? [],
    isLoading,
    error,
  };
}
