import { SchemaValidatorService } from '../src/modules/questionnaire/schema-validator.service';

describe('SchemaValidatorService', () => {
  const service = new SchemaValidatorService();

  it('validates a correct schema', () => {
    const result = service.validate({
      meta: { name: 'NPS', segment: 'Revendas' },
      questions: [
        {
          id: 'nps',
          label: 'NPS',
          type: 'nps',
          required: true,
          scale: { min: 0, max: 10 },
        },
      ],
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects duplicate ids and invalid condition reference', () => {
    const result = service.validate({
      questions: [
        {
          id: 'q1',
          label: 'Q1',
          type: 'single_choice',
          required: true,
          options: ['a'],
        },
        {
          id: 'q1',
          label: 'Q2',
          type: 'text',
          required: false,
          display_condition: {
            question_id: 'q_missing',
            operator: 'equals',
            value: 'a',
          },
        },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes('duplicado'))).toBe(true);
    expect(result.errors.some((error) => error.includes('inexistente'))).toBe(true);
  });
});

