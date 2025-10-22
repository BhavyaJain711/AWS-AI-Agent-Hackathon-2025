import { useParams } from 'react-router-dom';
import { MainAgentConfig } from '@/components/config';

export const MainAgent = () => {
  const { projectId } = useParams<{ projectId: string }>();

  if (!projectId) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">Project Not Found</h1>
          <p className="text-muted-foreground mt-2">Please select a valid project.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Main Agent</h1>
        <p className="text-muted-foreground">
          Configure your main orchestrator agent that coordinates other agents.
        </p>
      </div>

      <div className="max-w-4xl">
        <MainAgentConfig projectId={projectId} />
      </div>
    </div>
  );
};
