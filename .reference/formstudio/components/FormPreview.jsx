import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { CheckCircle2, AlertTriangle, Send, RotateCcw, Eye, Code } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Validation functions
const validators = {
  required: (value, config, field) => {
    if (field.type === 'checkbox' || field.type === 'switch') {
      return value === true || 'This field is required';
    }
    if (value === null || value === undefined || value === '') {
      return 'This field is required';
    }
    if (Array.isArray(value) && value.length === 0) {
      return 'Please select at least one option';
    }
    return true;
  },

  minLength: (value, config) => {
    if (!value || typeof value !== 'string') return true;
    if (value.length < config) {
      return `Minimum ${config} characters`;
    }
    return true;
  },

  maxLength: (value, config) => {
    if (!value || typeof value !== 'string') return true;
    if (value.length > config) {
      return `Maximum ${config} characters`;
    }
    return true;
  },

  min: (value, config) => {
    if (value === null || value === undefined || value === '') return true;
    const num = parseFloat(value);
    if (isNaN(num)) return true;
    if (num < config) {
      return `Minimum value: ${config}`;
    }
    return true;
  },

  max: (value, config) => {
    if (value === null || value === undefined || value === '') return true;
    const num = parseFloat(value);
    if (isNaN(num)) return true;
    if (num > config) {
      return `Maximum value: ${config}`;
    }
    return true;
  },

  pattern: (value, config) => {
    if (!value || typeof value !== 'string') return true;
    try {
      const regex = new RegExp(config.pattern);
      if (!regex.test(value)) {
        return config.message || 'Invalid format';
      }
    } catch (e) {
      return true;
    }
    return true;
  },

  email: (value) => {
    if (!value) return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Invalid email';
    }
    return true;
  },

  phone: (value, config) => {
    if (!value) return true;
    const cleaned = value.replace(/\D/g, '');
    if (config?.format === 'BR') {
      if (cleaned.length < 10 || cleaned.length > 11) {
        return 'Invalid phone number (area code + number)';
      }
    }
    return true;
  },

  custom: (value, config, field, allValues) => {
    if (!config.expression) return true;
    try {
      // Simple expression evaluation (safe subset)
      const fn = new Function('value', 'field', 'allValues', `return ${config.expression}`);
      const result = fn(value, field, allValues);
      if (result !== true) {
        return config.message || 'Custom validation failed';
      }
    } catch (e) {
      return true;
    }
    return true;
  }
};

// Validate a single field
const validateField = (field, value, allValues) => {
  const errors = [];

  // Required validation
  if (field.required) {
    const result = validators.required(value, true, field);
    if (result !== true) errors.push(result);
  }

  // Skip other validations if empty and not required
  if (!field.required && (value === null || value === undefined || value === '')) {
    return errors;
  }

  // Type-specific validations
  if (field.type === 'text' || field.type === 'textarea') {
    if (field.minLength) {
      const result = validators.minLength(value, field.minLength);
      if (result !== true) errors.push(result);
    }
    if (field.maxLength) {
      const result = validators.maxLength(value, field.maxLength);
      if (result !== true) errors.push(result);
    }
  }

  if (field.type === 'number') {
    if (field.min !== null && field.min !== undefined) {
      const result = validators.min(value, field.min);
      if (result !== true) errors.push(result);
    }
    if (field.max !== null && field.max !== undefined) {
      const result = validators.max(value, field.max);
      if (result !== true) errors.push(result);
    }
  }

  if (field.type === 'email') {
    const result = validators.email(value);
    if (result !== true) errors.push(result);
  }

  if (field.type === 'phone') {
    const result = validators.phone(value, { format: field.format });
    if (result !== true) errors.push(result);
  }

  // Custom validation rules
  if (field.validationRules && Array.isArray(field.validationRules)) {
    for (const rule of field.validationRules) {
      if (rule.type === 'pattern') {
        const result = validators.pattern(value, rule);
        if (result !== true) errors.push(result);
      }
      if (rule.type === 'custom') {
        const result = validators.custom(value, rule, field, allValues);
        if (result !== true) errors.push(result);
      }
    }
  }

  return errors;
};

// Check if field should be visible based on conditions
const isFieldVisible = (field, allValues) => {
  if (!field.displayCondition) return true;

  const { dependsOn, operator, value: conditionValue } = field.displayCondition;
  if (!dependsOn) return true;

  const dependentValue = allValues[dependsOn];

  switch (operator) {
    case 'equals':
      return dependentValue === conditionValue;
    case 'not_equals':
      return dependentValue !== conditionValue;
    case 'contains':
      return String(dependentValue || '').includes(conditionValue);
    case 'not_empty':
      return dependentValue !== null && dependentValue !== undefined && dependentValue !== '';
    case 'empty':
      return dependentValue === null || dependentValue === undefined || dependentValue === '';
    case 'greater_than':
      return parseFloat(dependentValue) > parseFloat(conditionValue);
    case 'less_than':
      return parseFloat(dependentValue) < parseFloat(conditionValue);
    default:
      return true;
  }
};

// Phone mask
const applyPhoneMask = (value, format = 'BR') => {
  if (!value) return '';
  const cleaned = value.replace(/\D/g, '');
  if (format === 'BR') {
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    if (cleaned.length <= 10) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
  }
  return cleaned;
};

export default function FormPreview({ formName, formDescription, fields, onSubmit, onTest, initialValues, submitLabel }) {
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [viewMode, setViewMode] = useState('preview');

  // Initialize default values (merge initialValues on top for edit mode)
  React.useEffect(() => {
    const defaults = {};
    fields.forEach(field => {
      if (field.defaultValue !== undefined) {
        defaults[field.name] = field.defaultValue;
      } else if (field.type === 'checkbox' || field.type === 'switch') {
        defaults[field.name] = false;
      } else {
        defaults[field.name] = '';
      }
    });
    if (initialValues && typeof initialValues === 'object') {
      Object.keys(initialValues).forEach(key => {
        if (initialValues[key] !== undefined && initialValues[key] !== null) {
          defaults[key] = initialValues[key];
        }
      });
    }
    setValues(defaults);
    setErrors({});
    setTouched({});
    setSubmitResult(null);
  }, [fields, initialValues]);

  const handleChange = useCallback((fieldName, value) => {
    setValues(prev => {
      const newValues = { ...prev, [fieldName]: value };
      return newValues;
    });
    setSubmitResult(null);
  }, []);

  const handleBlur = useCallback((field) => {
    setTouched(prev => ({ ...prev, [field.name]: true }));
    const fieldErrors = validateField(field, values[field.name], values);
    setErrors(prev => ({ ...prev, [field.name]: fieldErrors }));
  }, [values]);

  const validateAll = useCallback(() => {
    const allErrors = {};
    let hasErrors = false;

    fields.forEach(field => {
      if (!isFieldVisible(field, values)) return;
      const fieldErrors = validateField(field, values[field.name], values);
      if (fieldErrors.length > 0) {
        allErrors[field.name] = fieldErrors;
        hasErrors = true;
      }
    });

    setErrors(allErrors);
    setTouched(fields.reduce((acc, f) => ({ ...acc, [f.name]: true }), {}));
    return !hasErrors;
  }, [fields, values]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!validateAll()) {
      setSubmitResult({ success: false, message: 'Please fix the errors before submitting' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (onSubmit) {
        await onSubmit(values);
        setSubmitResult({ success: true, message: 'Form submitted successfully!' });
      } else if (onTest) {
        const result = await onTest(values);
        setSubmitResult(result);
      } else {
        setSubmitResult({ success: true, message: 'Validation passed (preview mode)' });
      }
    } catch (error) {
      setSubmitResult({ success: false, message: error.message || 'Error submitting form' });
    } finally {
      setIsSubmitting(false);
    }
  }, [validateAll, values, onSubmit, onTest]);

  const handleReset = useCallback(() => {
    const defaults = {};
    fields.forEach(field => {
      if (field.defaultValue !== undefined) {
        defaults[field.name] = field.defaultValue;
      } else if (field.type === 'checkbox' || field.type === 'switch') {
        defaults[field.name] = false;
      } else {
        defaults[field.name] = '';
      }
    });
    setValues(defaults);
    setErrors({});
    setTouched({});
    setSubmitResult(null);
  }, [fields]);

  // Visible fields based on conditions
  const visibleFields = useMemo(() => {
    return fields.filter(field => isFieldVisible(field, values));
  }, [fields, values]);

  // Render field input
  const renderField = (field) => {
    const value = values[field.name];
    const fieldErrors = touched[field.name] ? (errors[field.name] || []) : [];
    const hasError = fieldErrors.length > 0;

    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            onBlur={() => handleBlur(field)}
            placeholder={field.placeholder}
            rows={field.rows || 4}
            className={hasError ? 'border-destructive' : ''}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value ?? ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            onBlur={() => handleBlur(field)}
            placeholder={field.placeholder}
            min={field.min}
            max={field.max}
            step={field.step || 1}
            className={hasError ? 'border-destructive' : ''}
          />
        );

      case 'email':
        return (
          <Input
            type="email"
            value={value || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            onBlur={() => handleBlur(field)}
            placeholder={field.placeholder || 'email@example.com'}
            className={hasError ? 'border-destructive' : ''}
          />
        );

      case 'phone':
        return (
          <Input
            type="tel"
            value={field.mask ? applyPhoneMask(value, field.format) : value || ''}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, '');
              handleChange(field.name, raw);
            }}
            onBlur={() => handleBlur(field)}
            placeholder={field.format === 'BR' ? '(11) 99999-9999' : field.placeholder}
            className={hasError ? 'border-destructive' : ''}
          />
        );

      case 'date':
        return (
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            onBlur={() => handleBlur(field)}
            min={field.minDate}
            max={field.maxDate}
            className={hasError ? 'border-destructive' : ''}
          />
        );

      case 'datetime':
        return (
          <Input
            type="datetime-local"
            value={value || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            onBlur={() => handleBlur(field)}
            className={hasError ? 'border-destructive' : ''}
          />
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={field.name}
              checked={value || false}
              onCheckedChange={(checked) => {
                handleChange(field.name, checked);
                setTimeout(() => handleBlur(field), 0);
              }}
            />
            <label htmlFor={field.name} className="text-sm">
              {field.description || field.label}
            </label>
          </div>
        );

      case 'switch':
        return (
          <div className="flex items-center justify-between">
            <span className="text-sm">{value ? (field.labelOn || 'Yes') : (field.labelOff || 'No')}</span>
            <Switch
              checked={value || false}
              onCheckedChange={(checked) => {
                handleChange(field.name, checked);
                setTimeout(() => handleBlur(field), 0);
              }}
            />
          </div>
        );

      case 'radio':
        return (
          <RadioGroup
            value={value || ''}
            onValueChange={(v) => {
              handleChange(field.name, v);
              setTimeout(() => handleBlur(field), 0);
            }}
            className={field.layout === 'horizontal' ? 'flex flex-wrap gap-4' : 'space-y-2'}
          >
            {(field.options || []).map((opt, idx) => {
              const optValue = typeof opt === 'string' ? opt : opt.value;
              const optLabel = typeof opt === 'string' ? opt : opt.label;
              return (
                <div key={idx} className="flex items-center space-x-2">
                  <RadioGroupItem value={optValue} id={`${field.name}-${idx}`} />
                  <Label htmlFor={`${field.name}-${idx}`}>{optLabel}</Label>
                </div>
              );
            })}
          </RadioGroup>
        );

      case 'select':
        return (
          <Select
            value={value || ''}
            onValueChange={(v) => {
              handleChange(field.name, v);
              setTimeout(() => handleBlur(field), 0);
            }}
          >
            <SelectTrigger className={hasError ? 'border-destructive' : ''}>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {(field.options || []).map((opt, idx) => {
                const optValue = typeof opt === 'string' ? opt : opt.value;
                const optLabel = typeof opt === 'string' ? opt : opt.label;
                return (
                  <SelectItem key={idx} value={optValue}>{optLabel}</SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        );

      case 'hidden':
        return null;

      case 'context_hint':
        return (
          <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground">
            <Badge variant="outline" className="mb-2">AI Hint</Badge>
            <p>{field.hint}</p>
          </div>
        );

      default:
        return (
          <Input
            type="text"
            value={value || ''}
            onChange={(e) => handleChange(field.name, e.target.value)}
            onBlur={() => handleBlur(field)}
            placeholder={field.placeholder}
            className={hasError ? 'border-destructive' : ''}
          />
        );
    }
  };

  return (
    <div className="space-y-4">
      <Tabs value={viewMode} onValueChange={setViewMode}>
        <TabsList>
          <TabsTrigger value="preview" className="gap-2">
            <Eye className="h-4 w-4" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-2">
            <Code className="h-4 w-4" />
            Data
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>{formName}</CardTitle>
              {formDescription && <CardDescription>{formDescription}</CardDescription>}
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {visibleFields.map((field) => {
                  if (field.type === 'hidden') {
                    return <input key={field.id} type="hidden" name={field.name} value={values[field.name] || ''} />;
                  }

                  const fieldErrors = touched[field.name] ? (errors[field.name] || []) : [];

                  return (
                    <div key={field.id} className="space-y-2">
                      {field.type !== 'checkbox' && (
                        <Label className="flex items-center gap-2">
                          {field.label}
                          {field.required && <span className="text-destructive">*</span>}
                        </Label>
                      )}
                      {renderField(field)}
                      {field.description && field.type !== 'checkbox' && field.type !== 'context_hint' && (
                        <p className="text-xs text-muted-foreground">{field.description}</p>
                      )}
                      {fieldErrors.map((err, idx) => (
                        <p key={idx} className="text-xs text-destructive flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {err}
                        </p>
                      ))}
                    </div>
                  );
                })}

                {submitResult && (
                  <Alert variant={submitResult.success ? 'default' : 'destructive'}>
                    {submitResult.success ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    <AlertDescription>{submitResult.message}</AlertDescription>
                  </Alert>
                )}
              </form>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button type="button" variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Clear
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                <Send className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Submitting...' : (submitLabel || 'Submit')}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="data">
          <Card>
            <CardHeader>
              <CardTitle>Form Data</CardTitle>
              <CardDescription>JSON that would be sent on submission</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="p-4 bg-muted rounded-md text-sm font-mono overflow-auto max-h-96">
                {JSON.stringify(values, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
