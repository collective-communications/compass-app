import type { DimensionCode } from '@compass/types';

export interface QuestionMeta {
  questionId: string;
  text: string;
  reverseScored: boolean;
  dimensionCode: DimensionCode;
  subDimensionCode: string;
  weight: number;
}

export interface QuestionAnswer extends QuestionMeta {
  value: number;
}

export const QUESTIONS = [
  { questionId: 'Q1',  text: 'I feel comfortable admitting mistakes or uncertainties.', reverseScored: false, dimensionCode: 'core', subDimensionCode: 'psychological_safety', weight: 1.0 },
  { questionId: 'Q2',  text: "It's safe to bring up problems or tough issues on my team.", reverseScored: false, dimensionCode: 'core', subDimensionCode: 'psychological_safety', weight: 1.0 },
  { questionId: 'Q3',  text: 'I assume my colleagues have positive intentions, even during disagreements.', reverseScored: false, dimensionCode: 'core', subDimensionCode: 'trust', weight: 1.0 },
  { questionId: 'Q4',  text: 'I trust that my leaders will follow through on their commitments.', reverseScored: false, dimensionCode: 'core', subDimensionCode: 'trust', weight: 1.0 },
  { questionId: 'Q5',  text: 'I trust the information I receive from my leaders.', reverseScored: false, dimensionCode: 'core', subDimensionCode: 'trust', weight: 1.0 },
  { questionId: 'Q6',  text: 'Our purpose and values are evident in everyday actions.', reverseScored: false, dimensionCode: 'core', subDimensionCode: 'fairness_integrity', weight: 1.0 },
  { questionId: 'Q7',  text: 'Decisions that affect people in our organization are made fairly and consistently.', reverseScored: false, dimensionCode: 'core', subDimensionCode: 'fairness_integrity', weight: 1.0 },
  { questionId: 'Q8',  text: 'People are held to the same standards, regardless of their position or who they are.', reverseScored: false, dimensionCode: 'core', subDimensionCode: 'fairness_integrity', weight: 1.0 },
  { questionId: 'Q9',  text: 'I understand why this organization exists and what it stands for.', reverseScored: false, dimensionCode: 'core', subDimensionCode: 'purpose_meaning', weight: 1.0 },
  { questionId: 'Q10', text: 'The work I do here gives me a sense of personal meaning.', reverseScored: false, dimensionCode: 'core', subDimensionCode: 'purpose_meaning', weight: 1.0 },
  { questionId: 'Q11', text: 'Working here feels consistent with what I stand for personally.', reverseScored: false, dimensionCode: 'core', subDimensionCode: 'purpose_meaning', weight: 1.0 },
  { questionId: 'Q12', text: "Leaders' actions align with what they say.", reverseScored: false, dimensionCode: 'core', subDimensionCode: 'leader_behaviour', weight: 1.0 },
  { questionId: 'Q13', text: 'I often receive mixed messages from different leaders.', reverseScored: true,  dimensionCode: 'core', subDimensionCode: 'leader_behaviour', weight: 1.0 },
  { questionId: 'Q14', text: 'Priorities often change without clear explanation.', reverseScored: true,  dimensionCode: 'clarity', subDimensionCode: 'decision_making', weight: 1.0 },
  { questionId: 'Q15', text: 'The reasons behind major decisions are communicated.', reverseScored: false, dimensionCode: 'clarity', subDimensionCode: 'decision_making', weight: 1.0 },
  { questionId: 'Q16', text: "I don't know what decisions I am allowed to make.", reverseScored: true,  dimensionCode: 'clarity', subDimensionCode: 'decision_making', weight: 1.0 },
  { questionId: 'Q17', text: 'When expectations change, I understand why.', reverseScored: false, dimensionCode: 'clarity', subDimensionCode: 'decision_making', weight: 1.0 },
  { questionId: 'Q18', text: "I know what's expected of me in my role.", reverseScored: false, dimensionCode: 'clarity', subDimensionCode: 'role_clarity', weight: 1.0 },
  { questionId: 'Q19', text: "It's clear who is responsible for what on my team.", reverseScored: false, dimensionCode: 'clarity', subDimensionCode: 'role_clarity', weight: 1.0 },
  { questionId: 'Q20', text: "I often do work that I'm not sure if I should be doing because responsibilities aren't clear.", reverseScored: true,  dimensionCode: 'clarity', subDimensionCode: 'role_clarity', weight: 1.0 },
  { questionId: 'Q21', text: 'I often feel unsure about where the organization is heading.', reverseScored: true,  dimensionCode: 'clarity', subDimensionCode: 'strategic_clarity', weight: 1.0 },
  { questionId: 'Q22', text: "I understand how my team's work connects to organizational priorities.", reverseScored: false, dimensionCode: 'clarity', subDimensionCode: 'strategic_clarity', weight: 1.0 },
  { questionId: 'Q23', text: 'Our tools and technology make collaboration simple and efficient.', reverseScored: false, dimensionCode: 'clarity', subDimensionCode: 'empowerment', weight: 1.0 },
  { questionId: 'Q24', text: 'I know where to find what I need without asking multiple people.', reverseScored: false, dimensionCode: 'clarity', subDimensionCode: 'empowerment', weight: 1.0 },
  { questionId: 'Q25', text: 'I can see how my work contributes to something meaningful.', reverseScored: false, dimensionCode: 'clarity', subDimensionCode: 'goal_alignment', weight: 1.0 },
  { questionId: 'Q26', text: "My team's goals clearly support the organization's top priorities.", reverseScored: false, dimensionCode: 'clarity', subDimensionCode: 'goal_alignment', weight: 1.0 },
  { questionId: 'Q27', text: "I sometimes work on things that don't seem connected to any larger goal.", reverseScored: true,  dimensionCode: 'clarity', subDimensionCode: 'goal_alignment', weight: 1.0 },
  { questionId: 'Q28', text: 'I feel seen and included, regardless of my role.', reverseScored: false, dimensionCode: 'connection', subDimensionCode: 'belonging_inclusion', weight: 1.0 },
  { questionId: 'Q29', text: 'I have fun at work.', reverseScored: false, dimensionCode: 'connection', subDimensionCode: 'belonging_inclusion', weight: 1.0 },
  { questionId: 'Q30', text: 'I feel lonely at work.', reverseScored: true,  dimensionCode: 'connection', subDimensionCode: 'belonging_inclusion', weight: 1.0 },
  { questionId: 'Q31', text: 'I feel a genuine sense of belonging here.', reverseScored: false, dimensionCode: 'connection', subDimensionCode: 'belonging_inclusion', weight: 1.0 },
  { questionId: 'Q32', text: 'I can express a different point of view without negative consequences.', reverseScored: false, dimensionCode: 'connection', subDimensionCode: 'employee_voice', weight: 1.0 },
  { questionId: 'Q33', text: 'When I speak up, my input genuinely influences decisions.', reverseScored: false, dimensionCode: 'connection', subDimensionCode: 'employee_voice', weight: 1.0 },
  { questionId: 'Q34', text: 'Feedback here often goes into a black hole.', reverseScored: true,  dimensionCode: 'connection', subDimensionCode: 'employee_voice', weight: 1.0 },
  { questionId: 'Q35', text: 'Communication between all levels of the organization feels open.', reverseScored: false, dimensionCode: 'connection', subDimensionCode: 'information_flow', weight: 1.0 },
  { questionId: 'Q36', text: 'Important information reaches me in time for me to act on it.', reverseScored: false, dimensionCode: 'connection', subDimensionCode: 'information_flow', weight: 1.0 },
  { questionId: 'Q37', text: 'Information flows well between teams, not just within them.', reverseScored: false, dimensionCode: 'connection', subDimensionCode: 'information_flow', weight: 1.0 },
  { questionId: 'Q38', text: 'Team members look out for each other.', reverseScored: false, dimensionCode: 'connection', subDimensionCode: 'shared_identity', weight: 1.0 },
  { questionId: 'Q39', text: "There is a strong sense of 'we're all in this together' across the organization.", reverseScored: false, dimensionCode: 'connection', subDimensionCode: 'shared_identity', weight: 1.0 },
  { questionId: 'Q40', text: 'I have a say in decisions that affect my day-to-day work.', reverseScored: false, dimensionCode: 'connection', subDimensionCode: 'involvement', weight: 1.0 },
  { questionId: 'Q41', text: 'People closest to the work are included in decisions about it.', reverseScored: false, dimensionCode: 'connection', subDimensionCode: 'involvement', weight: 1.0 },
  { questionId: 'Q42', text: 'I feel recognized for the contributions that matter most.', reverseScored: false, dimensionCode: 'connection', subDimensionCode: 'recognition', weight: 1.0 },
  { questionId: 'Q43', text: "Recognition here often feels like a box-ticking exercise rather than genuine appreciation.", reverseScored: true,  dimensionCode: 'connection', subDimensionCode: 'recognition', weight: 1.0 },
  { questionId: 'Q44', text: 'We have the right balance between collaboration time and focus time.', reverseScored: false, dimensionCode: 'collaboration', subDimensionCode: 'sustainable_pace', weight: 1.0 },
  { questionId: 'Q45', text: 'The pace of work here is sustainable over the long term.', reverseScored: false, dimensionCode: 'collaboration', subDimensionCode: 'sustainable_pace', weight: 1.0 },
  { questionId: 'Q46', text: 'When something goes wrong, blame is a common first reaction.', reverseScored: true,  dimensionCode: 'collaboration', subDimensionCode: 'adaptability_learning', weight: 1.0 },
  { questionId: 'Q47', text: "Our team regularly reflects on what's working and what isn't, and adjusts.", reverseScored: false, dimensionCode: 'collaboration', subDimensionCode: 'adaptability_learning', weight: 1.0 },
  { questionId: 'Q48', text: 'It\'s easy to access the people or information I need to do my job.', reverseScored: false, dimensionCode: 'collaboration', subDimensionCode: 'cross_functional', weight: 1.0 },
  { questionId: 'Q49', text: 'There are silos in our organization.', reverseScored: true,  dimensionCode: 'collaboration', subDimensionCode: 'cross_functional', weight: 1.0 },
  { questionId: 'Q50', text: 'I have opportunities to co-create and problem-solve across functions.', reverseScored: false, dimensionCode: 'collaboration', subDimensionCode: 'cross_functional', weight: 1.0 },
  { questionId: 'Q51', text: 'We have the right balance between meetings and focus time.', reverseScored: false, dimensionCode: 'collaboration', subDimensionCode: 'ways_of_working', weight: 1.0 },
  { questionId: 'Q52', text: 'We have clear processes for how we get work done.', reverseScored: false, dimensionCode: 'collaboration', subDimensionCode: 'ways_of_working', weight: 1.0 },
  { questionId: 'Q53', text: 'People here follow through on their commitments.', reverseScored: false, dimensionCode: 'collaboration', subDimensionCode: 'ownership_accountability', weight: 1.0 },
  { questionId: 'Q54', text: 'I understand what is expected of me.', reverseScored: false, dimensionCode: 'collaboration', subDimensionCode: 'ownership_accountability', weight: 1.0 },
  { questionId: 'Q55', text: 'Things fall through the cracks because nobody clearly owns them.', reverseScored: true,  dimensionCode: 'collaboration', subDimensionCode: 'ownership_accountability', weight: 1.0 },
] as const satisfies readonly QuestionMeta[];

/** Returns all 55 questions initialized to the midpoint for the given scale.
 * Midpoint = Math.floor((1 + scaleSize) / 2) → 2 for 4-point, 3 for 5-point. */
export function defaultAnswers(scaleSize: 4 | 5): QuestionAnswer[] {
  const midpoint = Math.floor((1 + scaleSize) / 2);
  return QUESTIONS.map((q) => ({ ...q, value: midpoint }));
}
