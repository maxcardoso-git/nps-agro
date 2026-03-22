import {
  LayoutList,
  Star,
  SlidersHorizontal,
  Type,
  Hash,
  CircleDot,
  CheckSquare,
  ToggleLeft,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { EditorFieldType, EditorField } from './types';
import { generateFieldId } from './types';

export interface FieldTypeDefinition {
  type: EditorFieldType;
  label: string;
  icon: LucideIcon;
  defaultField: () => Partial<EditorField>;
}

export const QUESTION_TYPES: FieldTypeDefinition[] = [
  {
    type: 'section',
    label: 'Section',
    icon: LayoutList,
    defaultField: () => ({
      label: 'New Section',
      required: false,
      _sectionTitle: 'New Section',
    }),
  },
  {
    type: 'nps',
    label: 'NPS (0–10)',
    icon: Star,
    defaultField: () => ({
      label: 'How likely are you to recommend us?',
      required: true,
      scale: { min: 0, max: 10 },
    }),
  },
  {
    type: 'scale',
    label: 'Scale',
    icon: SlidersHorizontal,
    defaultField: () => ({
      label: 'Rate your experience',
      required: true,
      scale: { min: 1, max: 5 },
    }),
  },
  {
    type: 'text',
    label: 'Text',
    icon: Type,
    defaultField: () => ({
      label: 'New question',
      required: false,
    }),
  },
  {
    type: 'number',
    label: 'Number',
    icon: Hash,
    defaultField: () => ({
      label: 'New question',
      required: false,
    }),
  },
  {
    type: 'single_choice',
    label: 'Single Choice',
    icon: CircleDot,
    defaultField: () => ({
      label: 'New question',
      required: false,
      options: ['Option 1', 'Option 2'],
    }),
  },
  {
    type: 'multi_choice',
    label: 'Multiple Choice',
    icon: CheckSquare,
    defaultField: () => ({
      label: 'New question',
      required: false,
      options: ['Option 1', 'Option 2'],
    }),
  },
  {
    type: 'boolean',
    label: 'Yes / No',
    icon: ToggleLeft,
    defaultField: () => ({
      label: 'New question',
      required: false,
    }),
  },
];

export function createField(type: EditorFieldType): EditorField {
  const def = QUESTION_TYPES.find((t) => t.type === type);
  const defaults = def?.defaultField() ?? {};
  return {
    id: generateFieldId(),
    type,
    label: 'New question',
    required: false,
    ...defaults,
  };
}

export function getFieldTypeDefinition(type: EditorFieldType): FieldTypeDefinition | undefined {
  return QUESTION_TYPES.find((t) => t.type === type);
}
