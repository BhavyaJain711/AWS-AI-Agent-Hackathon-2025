import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Save } from 'lucide-react';
import { useProjectConfigStore } from '@/stores/projectConfigStore';

export const Config = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvValue, setNewEnvValue] = useState('');

  // Get project config from store
  const { 
    project, 
    loading, 
    loadProject, 
    setEnvironmentVar, 
    deleteEnvironmentVar, 
    saveEnvironment,
    savingEnvironment,
    hasUnsavedEnvironment
  } = useProjectConfigStore();

  // Load project on mount
  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
    }
  }, [projectId, loadProject]);

  const envVars = project?.config.environment || {};

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

  const handleAddEnvVar = () => {
    if (newEnvKey.trim() && newEnvValue.trim()) {
      setEnvironmentVar(newEnvKey.trim(), newEnvValue.trim());
      setNewEnvKey('');
      setNewEnvValue('');
    }
  };

  const handleRemoveEnvVar = (key: string) => {
    deleteEnvironmentVar(key);
  };

  const handleSaveEnvironment = async () => {
    if (projectId) {
      await saveEnvironment(projectId);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Environment Variables</h1>
        <p className="text-muted-foreground">
          Configure environment variables for your project.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          {/* Environment Variables */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Environment Variables</CardTitle>
                {hasUnsavedEnvironment && (
                  <Button 
                    onClick={handleSaveEnvironment}
                    disabled={savingEnvironment}
                    size="sm"
                  >
                    {savingEnvironment ? (
                      <>Saving...</>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Key (e.g., API_KEY)"
                  value={newEnvKey}
                  onChange={(e) => setNewEnvKey(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddEnvVar()}
                  className="flex-1"
                />
                <Input
                  placeholder="Value"
                  value={newEnvValue}
                  onChange={(e) => setNewEnvValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddEnvVar()}
                  className="flex-1"
                />
                <Button 
                  onClick={handleAddEnvVar}
                  disabled={!newEnvKey.trim() || !newEnvValue.trim()}
                  size="icon"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {Object.keys(envVars).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(envVars).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                      <Label className="font-mono text-sm flex-1">
                        {key} = {value}
                      </Label>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveEnvVar(key)}
                        className="h-6 w-6"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No environment variables configured yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Configuration Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Environment Variables Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-md p-4 text-sm font-mono max-h-96 overflow-auto">
                <pre className="text-muted-foreground whitespace-pre-wrap">
                  {JSON.stringify(envVars, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {loading && (
        <div className="mt-8 text-center text-muted-foreground">
          Loading configuration...
        </div>
      )}
    </div>
  );
};