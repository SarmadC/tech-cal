export type StepIndex = 0 | 1 | 2 | 3 | 4;

export type ValidationErrors = Partial<
  Record<'currentRole' | 'seniority' | 'primarySkills' | 'careerGoals', string>
>;

export type RoleGroup = {
  key: string;
  label: string;
  roles: string[];
};
