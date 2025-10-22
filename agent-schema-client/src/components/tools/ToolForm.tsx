import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { type LegacyTool, type CreateToolRequest } from '@/types';

interface ToolFormProps {
  tool?: LegacyTool;
  onSave: (data: CreateToolRequest) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ToolForm = ({ tool, onSave, onCancel, isLoading }: ToolFormProps) => {
  const { projectId } = useParams<{ projectId: string }>();
  const [formData, setFormData] = useState({
    name: tool?.name || '',
    description: tool?.description || '',
    type: tool?.type || 'frontend_action' as 'frontend_action' | 'code',
    code: tool?.code || '',
    inputSchema: JSON.stringify(tool?.inputSchema || {
      type: 'object',
      properties: {},
      required: []
    }, null, 2)
  });

  // Initialize schema fields from existing tool
  useEffect(() => {
    if (tool?.inputSchema) {
      const fields: SchemaField[] = [];
      const properties = tool.inputSchema.properties || {};
      const required = tool.inputSchema.required || [];
      
      Object.entries(properties).forEach(([key, prop]: [string, any]) => {
        fields.push({
          id: Date.now().toString() + Math.random(),
          name: key,
          type: prop.type || 'string',
          description: prop.description || '',
          required: required.includes(key),
          enumValues: prop.enum,
          arrayItemType: prop.items?.type
        });
      });
      
      setSchemaFields(fields);
    }
  }, [tool]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSchemaHelp, setShowSchemaHelp] = useState(false);
  const [schemaFields, setSchemaFields] = useState<SchemaField[]>([]);

  interface SchemaField {
    id: string;
    name: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    description: string;
    required: boolean;
    enumValues?: string[];
    arrayItemType?: 'string' | 'number' | 'boolean';
  }

  // Schema templates for different use cases
  const schemaTemplates = {
    simple: {
      type: 'object',
      properties: {
        input: {
          type: 'string',
          description: 'Input parameter'
        }
      },
      required: ['input']
    },
    multiple: {
      type: 'object',
      properties: {
        param1: {
          type: 'string',
          description: 'First parameter'
        },
        param2: {
          type: 'number',
          description: 'Second parameter'
        },
        optional_param: {
          type: 'boolean',
          description: 'Optional parameter'
        }
      },
      required: ['param1', 'param2']
    },
    complex: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: { type: 'string' }
            },
            count: { type: 'number' }
          }
        },
        options: {
          type: 'object',
          properties: {
            format: {
              type: 'string',
              enum: ['json', 'xml', 'csv']
            }
          }
        }
      },
      required: ['data']
    }
  };



  // Generate JSON schema from fields
  const generateSchema = (fields: SchemaField[]) => {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    fields.forEach(field => {
      const property: any = {
        type: field.type,
        description: field.description
      };

      if (field.enumValues && field.enumValues.length > 0) {
        property.enum = field.enumValues;
      }

      if (field.type === 'array' && field.arrayItemType) {
        property.items = { type: field.arrayItemType };
      }

      properties[field.name] = property;

      if (field.required) {
        required.push(field.name);
      }
    });

    return {
      type: 'object',
      properties,
      required
    };
  };

  // Update schema when fields change
  useEffect(() => {
    const schema = generateSchema(schemaFields);
    setFormData(prev => ({
      ...prev,
      inputSchema: JSON.stringify(schema, null, 2)
    }));
  }, [schemaFields]);

  // Add new schema field
  const addSchemaField = () => {
    const newField: SchemaField = {
      id: Date.now().toString() + Math.random(),
      name: '',
      type: 'string',
      description: '',
      required: false
    };
    setSchemaFields(prev => [...prev, newField]);
  };

  // Update schema field
  const updateSchemaField = (id: string, updates: Partial<SchemaField>) => {
    setSchemaFields(prev => prev.map(field => 
      field.id === id ? { ...field, ...updates } : field
    ));
  };

  // Remove schema field
  const removeSchemaField = (id: string) => {
    setSchemaFields(prev => prev.filter(field => field.id !== id));
  };

  // Apply schema template
  const applyTemplate = (templateKey: keyof typeof schemaTemplates) => {
    const template = schemaTemplates[templateKey];
    const properties = template.properties || {};
    const required = template.required || [];
    
    const fields: SchemaField[] = Object.entries(properties).map(([key, prop]: [string, any]) => ({
      id: Date.now().toString() + Math.random() + key,
      name: key,
      type: prop.type || 'string',
      description: prop.description || '',
      required: required.includes(key),
      enumValues: prop.enum,
      arrayItemType: prop.items?.type
    }));
    
    setSchemaFields(fields);
    
    // Clear schema errors when applying template
    if (errors.inputSchema) {
      setErrors(prev => ({ ...prev, inputSchema: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Tool name is required';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Tool name must be 100 characters or less';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.name)) {
      newErrors.name = 'Tool name can only contain letters, numbers, hyphens, and underscores';
    }

    // Description validation
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length > 500) {
      newErrors.description = 'Description must be 500 characters or less';
    }

    // Code validation for code tools
    if (formData.type === 'code' && !formData.code.trim()) {
      newErrors.code = 'Code is required for code tools';
    }

    // Schema fields validation
    if (schemaFields.length === 0) {
      newErrors.inputSchema = 'At least one input parameter is required';
    } else {
      // Validate each field
      for (const field of schemaFields) {
        if (!field.name.trim()) {
          newErrors.inputSchema = 'All parameters must have a name';
          break;
        }
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field.name)) {
          newErrors.inputSchema = `Parameter name "${field.name}" must be a valid identifier (letters, numbers, underscores, starting with letter or underscore)`;
          break;
        }
        if (!field.description.trim()) {
          newErrors.inputSchema = `Parameter "${field.name}" must have a description`;
          break;
        }
      }
      
      // Check for duplicate names
      const names = schemaFields.map(f => f.name.trim().toLowerCase());
      const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
      if (duplicates.length > 0) {
        newErrors.inputSchema = `Duplicate parameter names found: ${duplicates.join(', ')}`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const parsedSchema = JSON.parse(formData.inputSchema);
      
      const toolData: CreateToolRequest = {
        projectId: projectId!,
        name: formData.name.trim(),
        description: formData.description.trim(),
        type: formData.type,
        inputSchema: parsedSchema,
        ...(formData.type === 'code' && { code: formData.code.trim() })
      };

      onSave(toolData);
    } catch (error) {
      setErrors({ inputSchema: 'Invalid JSON schema format' });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };



  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">
          {tool ? 'Edit Tool' : 'Create New Tool'}
        </h2>
        <p className="text-muted-foreground">
          {tool ? 'Update your custom tool configuration.' : 'Create a new custom tool for your agents.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Basic Information</h3>
          
          <div>
            <label className="block text-sm font-medium mb-2">Tool Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="e.g., email-sender, data-processor"
              className={`w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-ring ${
                errors.name ? 'border-destructive' : 'border-border'
              }`}
            />
            {errors.name && (
              <p className="text-sm text-destructive mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe what this tool does and how agents should use it"
              rows={3}
              className={`w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-ring ${
                errors.description ? 'border-destructive' : 'border-border'
              }`}
            />
            {errors.description && (
              <p className="text-sm text-destructive mt-1">{errors.description}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Tool Type</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  formData.type === 'frontend_action' 
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => handleInputChange('type', 'frontend_action')}
              >
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="radio"
                    name="toolType"
                    value="frontend_action"
                    checked={formData.type === 'frontend_action'}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    className="text-primary"
                  />
                  <span className="font-medium">Frontend Action</span>
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">UI</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Triggers actions in the frontend interface, such as form submissions, navigation, or UI updates.
                </p>
              </div>
              
              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  formData.type === 'code' 
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => handleInputChange('type', 'code')}
              >
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="radio"
                    name="toolType"
                    value="code"
                    checked={formData.type === 'code'}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    className="text-primary"
                  />
                  <span className="font-medium">Code Tool</span>
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">CODE</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Executes custom code with the provided input parameters and returns processed results.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Code Section (only for code tools) */}
        {formData.type === 'code' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Code Implementation</h3>
            <p className="text-sm text-muted-foreground">
              Write the code that will be executed when this tool is called. The input parameters will be passed according to your schema.
            </p>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">Code</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const template = `def execute_tool(input_data):
    """
    Execute the tool with the provided input data.
    
    Args:
        input_data (dict): Input parameters matching the schema
        
    Returns:
        dict: Result of the tool execution
    """
    # Your implementation here
    result = {}
    
    return result`;
                      setFormData(prev => ({ ...prev, code: template }));
                    }}
                    className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
                  >
                    Python Template
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const template = `function executeTool(inputData) {
    /**
     * Execute the tool with the provided input data.
     * 
     * @param {Object} inputData - Input parameters matching the schema
     * @returns {Object} Result of the tool execution
     */
    // Your implementation here
    const result = {};
    
    return result;
}`;
                      setFormData(prev => ({ ...prev, code: template }));
                    }}
                    className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
                  >
                    JavaScript Template
                  </button>
                </div>
              </div>
              
              <textarea
                value={formData.code}
                onChange={(e) => handleInputChange('code', e.target.value)}
                placeholder="def execute_tool(input_data):&#10;    # Your code implementation&#10;    return result"
                rows={12}
                className={`w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm ${
                  errors.code ? 'border-destructive' : 'border-border'
                }`}
              />
              {errors.code && (
                <p className="text-sm text-destructive mt-1">{errors.code}</p>
              )}
              
              <div className="mt-2 p-3 bg-muted rounded text-sm">
                <strong>Code Guidelines:</strong>
                <ul className="mt-1 space-y-1 text-muted-foreground">
                  <li>• Function should accept input parameters matching your schema</li>
                  <li>• Return a result object or value</li>
                  <li>• Handle errors gracefully with try/catch blocks</li>
                  <li>• Include comments for complex logic</li>
                  <li>• Test your code before deploying</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Input Parameters */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Input Parameters</h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowSchemaHelp(!showSchemaHelp)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {showSchemaHelp ? 'Hide Help' : 'Show Help'}
              </button>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Define the input parameters that agents will provide when using this tool.
          </p>

          {/* Schema Templates */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground">Quick templates:</span>
            <button
              type="button"
              onClick={() => applyTemplate('simple')}
              className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
            >
              Simple
            </button>
            <button
              type="button"
              onClick={() => applyTemplate('multiple')}
              className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
            >
              Multiple Params
            </button>
            <button
              type="button"
              onClick={() => applyTemplate('complex')}
              className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
            >
              Complex
            </button>
          </div>

          {/* Help Section */}
          {showSchemaHelp && (
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <h4 className="font-medium">Parameter Guidelines:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Add parameters that your tool needs to function</li>
                <li>• Use descriptive names and clear descriptions</li>
                <li>• Mark parameters as required if they're essential</li>
                <li>• Choose appropriate data types for validation</li>
                <li>• Use enums for predefined options</li>
              </ul>
            </div>
          )}

          {/* Parameter Fields */}
          <div className="space-y-4">
            {schemaFields.map((field, index) => (
              <div key={field.id} className="p-4 border rounded-lg bg-card">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-muted-foreground">Parameter {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeSchemaField(field.id)}
                    className="text-destructive hover:text-destructive/80 text-sm"
                  >
                    Remove
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Parameter Name */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Parameter Name</label>
                    <input
                      type="text"
                      value={field.name}
                      onChange={(e) => updateSchemaField(field.id, { name: e.target.value })}
                      placeholder="e.g., message, count, options"
                      className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                    />
                  </div>

                  {/* Parameter Type */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Type</label>
                    <select
                      value={field.type}
                      onChange={(e) => updateSchemaField(field.id, { type: e.target.value as any })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                    >
                      <option value="string">Text (string)</option>
                      <option value="number">Number</option>
                      <option value="boolean">True/False (boolean)</option>
                      <option value="array">List (array)</option>
                      <option value="object">Object</option>
                    </select>
                  </div>
                </div>

                {/* Array Item Type */}
                {field.type === 'array' && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium mb-1">Array Item Type</label>
                    <select
                      value={field.arrayItemType || 'string'}
                      onChange={(e) => updateSchemaField(field.id, { arrayItemType: e.target.value as any })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                    >
                      <option value="string">Text</option>
                      <option value="number">Number</option>
                      <option value="boolean">True/False</option>
                    </select>
                  </div>
                )}

                {/* Description */}
                <div className="mt-3">
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={field.description}
                    onChange={(e) => updateSchemaField(field.id, { description: e.target.value })}
                    placeholder="Describe what this parameter is used for"
                    rows={2}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  />
                </div>

                {/* Enum Values */}
                {(field.type === 'string') && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium mb-1">
                      Predefined Options (optional)
                      <span className="text-xs text-muted-foreground ml-1">- comma separated</span>
                    </label>
                    <input
                      type="text"
                      value={field.enumValues?.join(', ') || ''}
                      onChange={(e) => {
                        const values = e.target.value.split(',').map(v => v.trim()).filter(v => v);
                        updateSchemaField(field.id, { enumValues: values.length > 0 ? values : undefined });
                      }}
                      placeholder="e.g., small, medium, large"
                      className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                    />
                  </div>
                )}

                {/* Required Checkbox */}
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`required-${field.id}`}
                    checked={field.required}
                    onChange={(e) => updateSchemaField(field.id, { required: e.target.checked })}
                    className="rounded border-border"
                  />
                  <label htmlFor={`required-${field.id}`} className="text-sm">
                    Required parameter
                  </label>
                </div>
              </div>
            ))}

            {/* Add Parameter Button */}
            <button
              type="button"
              onClick={addSchemaField}
              className="w-full p-4 border-2 border-dashed border-border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors text-muted-foreground hover:text-foreground"
            >
              + Add Parameter
            </button>
          </div>

          {/* Generated Schema Preview */}
          {schemaFields.length > 0 && (
            <div className="mt-4">
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground font-medium">
                  View Generated JSON Schema
                </summary>
                <div className="mt-2 p-3 bg-muted rounded border">
                  <pre className="text-xs overflow-x-auto font-mono">
                    {formData.inputSchema}
                  </pre>
                </div>
              </details>
            </div>
          )}

          {errors.inputSchema && (
            <p className="text-sm text-destructive">{errors.inputSchema}</p>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-4 pt-6 border-t border-border">
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
            {tool ? 'Update Tool' : 'Create Tool'}
          </button>
        </div>
      </form>
    </div>
  );
};