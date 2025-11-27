/**
 * Reusable Form component for consistent form handling across the application
 * Eliminates duplicate form components and provides consistent validation
 */

"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

export interface FormField {
  name: string;
  label: string;
  type:
    | "text"
    | "email"
    | "password"
    | "number"
    | "tel"
    | "url"
    | "textarea"
    | "select"
    | "checkbox"
    | "radio";
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    pattern?: RegExp;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    custom?: (value: any) => string | null;
  };
  helpText?: string;
  className?: string;
}

export interface FormProps {
  fields: FormField[];
  initialValues?: Record<string, any>;
  onSubmit: (values: Record<string, any>) => Promise<void> | void;
  submitLabel?: string;
  loading?: boolean;
  title?: string;
  description?: string;
  className?: string;
  showSuccessMessage?: boolean;
  successMessage?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function Form({
  fields,
  initialValues = {},
  onSubmit,
  submitLabel = "Submit",
  loading = false,
  title,
  description,
  className = "",
  showSuccessMessage = false,
  successMessage = "Form submitted successfully!",
}: FormProps) {
  const [values, setValues] = useState<Record<string, any>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // ============================================================================
  // VALIDATION
  // ============================================================================

  const validateField = useCallback(
    (field: FormField, value: any): string | null => {
      // Required validation
      if (field.required && (!value || value === "")) {
        return `${field.label} is required`;
      }

      // Skip validation if field is empty and not required
      if (!value || value === "") return null;

      // Type-specific validation
      if (field.type === "email") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return "Invalid email format";
        }
      }

      if (field.type === "number") {
        const numValue = Number(value);
        if (isNaN(numValue)) {
          return "Must be a valid number";
        }
        if (
          field.validation?.min !== undefined &&
          numValue < field.validation.min
        ) {
          return `Must be at least ${field.validation.min}`;
        }
        if (
          field.validation?.max !== undefined &&
          numValue > field.validation.max
        ) {
          return `Must be at most ${field.validation.max}`;
        }
      }

      if (field.type === "tel") {
        const phoneRegex = /^[+]?[\d\s\-\(\)]{10,}$/;
        if (!phoneRegex.test(value)) {
          return "Invalid phone number format";
        }
      }

      if (field.type === "url") {
        try {
          new URL(value);
        } catch {
          return "Invalid URL format";
        }
      }

      // Length validation
      if (
        field.validation?.minLength &&
        value.length < field.validation.minLength
      ) {
        return `Must be at least ${field.validation.minLength} characters`;
      }
      if (
        field.validation?.maxLength &&
        value.length > field.validation.maxLength
      ) {
        return `Must be at most ${field.validation.maxLength} characters`;
      }

      // Pattern validation
      if (field.validation?.pattern && !field.validation.pattern.test(value)) {
        return "Invalid format";
      }

      // Custom validation
      if (field.validation?.custom) {
        return field.validation.custom(value);
      }

      return null;
    },
    [],
  );

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    fields.forEach((field) => {
      const error = validateField(field, values[field.name]);
      if (error) {
        newErrors[field.name] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [fields, values, validateField]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleChange = useCallback(
    (name: string, value: any) => {
      setValues((prev) => ({ ...prev, [name]: value }));

      // Clear error when user starts typing
      if (errors[name]) {
        setErrors((prev) => ({ ...prev, [name]: "" }));
      }
    },
    [errors],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm()) {
        return;
      }

      setIsSubmitting(true);
      setErrors({});

      try {
        await onSubmit(values);
        setIsSuccess(true);
        if (showSuccessMessage) {
          setTimeout(() => setIsSuccess(false), 3000);
        }
      } catch (error: any) {
        setErrors({
          submit:
            error.message || "An error occurred while submitting the form",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, validateForm, onSubmit, showSuccessMessage],
  );

  // ============================================================================
  // RENDER FIELD
  // ============================================================================

  const renderField = (field: FormField) => {
    const value = values[field.name] || "";
    const error = errors[field.name];
    const hasError = !!error;

    const commonProps = {
      id: field.name,
      name: field.name,
      value,
      onChange: (e: any) => handleChange(field.name, e.target.value),
      disabled: field.disabled || loading,
      className: `${field.className || ""} ${hasError ? "border-red-500" : ""}`,
    };

    switch (field.type) {
      case "textarea":
        return (
          <Textarea {...commonProps} placeholder={field.placeholder} rows={4} />
        );

      case "select":
        return (
          <Select
            value={value}
            onValueChange={(val) => handleChange(field.name, val)}
            disabled={field.disabled || loading}
          >
            <SelectTrigger className={hasError ? "border-red-500" : ""}>
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "checkbox":
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={field.name}
              checked={!!value}
              onCheckedChange={(checked) => handleChange(field.name, checked)}
              disabled={field.disabled || loading}
            />
            <Label htmlFor={field.name} className="text-sm font-medium">
              {field.label}
            </Label>
          </div>
        );

      case "radio":
        return (
          <RadioGroup
            value={value}
            onValueChange={(val) => handleChange(field.name, val)}
            disabled={field.disabled || loading}
          >
            {field.options?.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem
                  value={option.value}
                  id={`${field.name}-${option.value}`}
                />
                <Label htmlFor={`${field.name}-${option.value}`}>
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      default:
        return (
          <Input
            {...commonProps}
            type={field.type}
            placeholder={field.placeholder}
          />
        );
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Card className={className}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && (
            <p className="text-sm text-gray-600">{description}</p>
          )}
        </CardHeader>
      )}

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Success Message */}
          {isSuccess && showSuccessMessage && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {successMessage}
              </AlertDescription>
            </Alert>
          )}

          {/* Submit Error */}
          {errors.submit && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {errors.submit}
              </AlertDescription>
            </Alert>
          )}

          {/* Form Fields */}
          {fields.map((field) => (
            <div key={field.name} className="space-y-2">
              {field.type !== "checkbox" && (
                <Label htmlFor={field.name} className="text-sm font-medium">
                  {field.label}
                  {field.required && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </Label>
              )}

              {renderField(field)}

              {field.helpText && (
                <p className="text-xs text-gray-500">{field.helpText}</p>
              )}

              {errors[field.name] && (
                <p className="text-xs text-red-500">{errors[field.name]}</p>
              )}
            </div>
          ))}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting || loading}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
