import { RuleEngine } from '../src/survey/rule-engine';

describe('RuleEngine', () => {
  const engine = new RuleEngine();

  it('evaluates equals operator', () => {
    const answers = new Map<string, unknown>([['q1', 'abc']]);
    const result = engine.evaluateCondition(
      {
        question_id: 'q1',
        operator: 'equals',
        value: 'abc',
      },
      answers,
    );

    expect(result).toBe(true);
  });

  it('evaluates in operator', () => {
    const answers = new Map<string, unknown>([['q1', 'dificil']]);
    const result = engine.evaluateCondition(
      {
        question_id: 'q1',
        operator: 'in',
        value: ['dificil', 'extremamente_dificil'],
      },
      answers,
    );

    expect(result).toBe(true);
  });

  it('returns false when answer does not exist', () => {
    const answers = new Map<string, unknown>();
    const result = engine.evaluateCondition(
      {
        question_id: 'q1',
        operator: 'equals',
        value: 'abc',
      },
      answers,
    );

    expect(result).toBe(false);
  });
});

