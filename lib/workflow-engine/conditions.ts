import { WorkflowContext } from './types';

interface Condition {
  field: string;
  operator: string;
  value: string;
}

interface ConditionConfig {
  logic: 'and' | 'or';
  conditions: Condition[];
}

export async function evaluateConditions(
  context: WorkflowContext,
  config: ConditionConfig
): Promise<boolean> {
  const { logic, conditions } = config;

  if (!conditions || conditions.length === 0) {
    return true; // No conditions = always true
  }

  const results = await Promise.all(
    conditions.map((condition) => evaluateSingleCondition(context, condition))
  );

  if (logic === 'and') {
    return results.every((result) => result === true);
  } else {
    return results.some((result) => result === true);
  }
}

async function evaluateSingleCondition(
  context: WorkflowContext,
  condition: Condition
): Promise<boolean> {
  const { field, operator, value } = condition;

  // Get the actual value from context
  const actualValue = getFieldValue(context, field);

  // Evaluate based on operator
  switch (operator) {
    case 'equals':
      return String(actualValue) === String(value);

    case 'not_equals':
      return String(actualValue) !== String(value);

    case 'contains':
      return String(actualValue).toLowerCase().includes(String(value).toLowerCase());

    case 'not_contains':
      return !String(actualValue).toLowerCase().includes(String(value).toLowerCase());

    case 'is_empty':
      return !actualValue || String(actualValue).trim() === '';

    case 'is_not_empty':
      return !!actualValue && String(actualValue).trim() !== '';

    case 'greater_than':
      return Number(actualValue) > Number(value);

    case 'less_than':
      return Number(actualValue) < Number(value);

    case 'greater_or_equal':
      return Number(actualValue) >= Number(value);

    case 'less_or_equal':
      return Number(actualValue) <= Number(value);

    default:
      console.warn(`Unknown operator: ${operator}`);
      return false;
  }
}

function getFieldValue(context: WorkflowContext, field: string): any {
  const { variables } = context;

  // Field format: "contact.email", "deal.value", etc.
  const parts = field.split('.');

  if (parts[0] === 'contact' && variables.contact) {
    return variables.contact[parts[1]];
  }

  if (parts[0] === 'deal' && variables.deal) {
    return variables.deal[parts[1]];
  }

  // Fallback to direct variable access
  return variables[field];
}

export function replaceVariables(
  template: string,
  context: WorkflowContext
): string {
  if (!template) return '';

  let result = template;

  // Replace {{variable}} patterns
  const regex = /\{\{([^}]+)\}\}/g;
  const matches = template.match(regex);

  if (!matches) return template;

  matches.forEach((match) => {
    const variablePath = match.replace(/\{\{|\}\}/g, '').trim();
    const value = getFieldValue(context, variablePath);

    if (value !== undefined && value !== null) {
      result = result.replace(match, String(value));
    }
  });

  return result;
}
