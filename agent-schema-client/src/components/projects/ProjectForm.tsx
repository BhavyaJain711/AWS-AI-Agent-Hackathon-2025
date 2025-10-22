import { useState } from 'react';
import { type CreateProjectRequest } from '@/types';

interface ProjectFormProps {
  onSave: (data: CreateProjectRequest) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ProjectForm = ({ onSave, onCancel, isLoading }: ProjectFormProps) => {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Project name must be 100 characters or less';
    } else if (!/^[a-zA-Z0-9\s_-]+$/.test(formData.name)) {
      newErrors.name = 'Project name can only contain letters, numbers, spaces, hyphens, and underscores';
    }

    // Description validation
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length > 500) {
      newErrors.description = 'Description must be 500 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const projectData: CreateProjectRequest = {
      name: formData.name.trim(),
      description: formData.description.trim()
    };

    onSave(projectData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background p-6 rounded-lg border max-w-md w-full mx-4">
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-2">Create New Project</h2>
          <p className="text-sm text-muted-foreground">
            Create a new multi-agent system project to organize your agents, tools, and configurations.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium mb-2">Project Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="e.g., Customer Support System"
              className={`w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-ring ${
                errors.name ? 'border-destructive' : 'border-border'
              }`}
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-sm text-destructive mt-1">{errors.name}</p>
            )}
          </div>

          {/* Project Description */}
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe what this project will be used for..."
              rows={3}
              className={`w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-ring ${
                errors.description ? 'border-destructive' : 'border-border'
              }`}
              disabled={isLoading}
            />
            {errors.description && (
              <p className="text-sm text-destructive mt-1">{errors.description}</p>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex gap-2 justify-end pt-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 text-sm border border-border rounded-md hover:bg-accent transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading && (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
              )}
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};