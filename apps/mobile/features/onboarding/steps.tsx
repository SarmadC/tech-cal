import { Pressable, Text, View } from 'react-native';
import type {
  CareerGoal,
  CareerOnboardingData,
  LearningStyle,
  MobileCareerOnboardingBootstrap,
  OnboardingTaxonomyOption,
  SeniorityLevel,
} from '@kurecal/domain';
import { SectionCard } from '@/components/chrome/SectionCard';
import {
  CurrentSkillsComposer,
  FocusChoiceCard,
  PreferenceTile,
  RoleChoiceRow,
  SectionTitle,
  SeniorityChoiceRow,
  TagInput,
} from '@/features/onboarding/controls';
import { CURATED_SENIORITY_OPTIONS } from '@/features/onboarding/constants';
import { styles } from '@/features/onboarding/styles';
import type { RoleGroup, ValidationErrors } from '@/features/onboarding/types';
import type { AppThemeTokens } from '@/theme/tokens';

export function WelcomeStep({ tokens }: { tokens: AppThemeTokens }) {
  return (
    <>
      <View style={styles.welcomeBlock}>
        <Text
          style={[
            styles.welcomeEyebrow,
            { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans },
          ]}
        >
          Career onboarding
        </Text>
        <Text
          style={[
            styles.welcomeTitle,
            { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans },
          ]}
        >
          Sign in. Calibrate the feed. Move faster.
        </Text>
        <Text
          style={[
            styles.welcomeBody,
            { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans },
          ]}
        >
          Answer a few career questions so the mobile app can rank events, recommendations,
          and planning surfaces the same way the web onboarding does.
        </Text>
      </View>
      <SectionCard
        title="What this covers"
        detail="Role, learning topics, goals, and optional preferences for how you want to grow and who you want to meet."
      >
        <View style={styles.infoStack}>
          {[
            'Role and seniority',
            'Topics you want to learn about',
            'Career goals',
            'Optional learning, networking, and team preferences',
          ].map((item) => (
            <View key={item} style={styles.infoRow}>
              <View
                style={[
                  styles.infoDot,
                  { backgroundColor: tokens.colors.accent, borderRadius: tokens.radius.pill },
                ]}
              />
              <Text
                style={[
                  styles.infoText,
                  { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans },
                ]}
              >
                {item}
              </Text>
            </View>
          ))}
        </View>
      </SectionCard>
    </>
  );
}

interface RoleStepProps {
  tokens: AppThemeTokens;
  visibleRoleGroups: RoleGroup[];
  hiddenRoleGroups: RoleGroup[];
  activeRoleGroup: RoleGroup | null;
  currentRole: string | undefined;
  curatedRoles: string[];
  remainingRoles: string[];
  showAllRoles: boolean;
  showAllRoleGroups: boolean;
  selectedRolePayoff: string | null;
  validationErrors: ValidationErrors;
  onSelectRoleCategory: (value: string) => void;
  onShowAllRoleGroups: () => void;
  onSelectRole: (value: string) => void;
  onSetShowAllRoles: (nextValue: boolean) => void;
}

export function RoleStep({
  tokens,
  visibleRoleGroups,
  hiddenRoleGroups,
  activeRoleGroup,
  currentRole,
  curatedRoles,
  remainingRoles,
  showAllRoles,
  showAllRoleGroups,
  selectedRolePayoff,
  validationErrors,
  onSelectRoleCategory,
  onShowAllRoleGroups,
  onSelectRole,
  onSetShowAllRoles,
}: RoleStepProps) {
  return (
    <>
      <SectionTitle title="What's your role?" tokens={tokens} />
      <View style={styles.fieldBlock}>
        <View style={styles.roleGroupRow}>
          <View style={styles.roleGroupPills}>
            {visibleRoleGroups.map((item) => (
              <Pressable
                key={item.key}
                onPress={() => {
                  onSelectRoleCategory(item.key);
                  onSetShowAllRoles(false);
                }}
                style={({ pressed }) => [
                  styles.roleGroupPill,
                  {
                    backgroundColor:
                      activeRoleGroup?.key === item.key ? 'rgba(90, 137, 208, 0.2)' : 'transparent',
                    borderColor:
                      activeRoleGroup?.key === item.key
                        ? 'rgba(116, 164, 235, 0.6)'
                        : tokens.colors.border,
                    borderRadius: tokens.radius.pill,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.roleGroupPillLabel,
                    {
                      color:
                        activeRoleGroup?.key === item.key
                          ? '#F7FAFF'
                          : tokens.colors.textPrimary,
                      fontFamily: tokens.typography.sans,
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
          {hiddenRoleGroups.length > 0 && !showAllRoleGroups ? (
            <Pressable
              onPress={onShowAllRoleGroups}
              style={({ pressed }) => [
                styles.roleGroupMore,
                {
                  opacity: pressed ? 0.82 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.roleGroupMoreLabel,
                  { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans },
                ]}
              >
                More
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.fieldBlock}>
        <View style={styles.choiceStack}>
          {curatedRoles.map((role) => (
            <RoleChoiceRow
              key={role}
              label={role}
              selected={currentRole === role}
              onPress={() => onSelectRole(role)}
              tokens={tokens}
            />
          ))}
        </View>
        {showAllRoles ? (
          <View style={styles.choiceStack}>
            {remainingRoles.map((role) => (
              <RoleChoiceRow
                key={`all-${role}`}
                label={role}
                selected={currentRole === role}
                onPress={() => onSelectRole(role)}
                tokens={tokens}
              />
            ))}
          </View>
        ) : null}
        {validationErrors.currentRole ? (
          <Text
            style={[
              styles.errorText,
              { color: tokens.colors.danger, fontFamily: tokens.typography.sans },
            ]}
          >
            {validationErrors.currentRole}
          </Text>
        ) : null}
        {selectedRolePayoff ? (
          <Text
            style={[
              styles.rolePayoffText,
              { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans },
            ]}
          >
            {selectedRolePayoff}
          </Text>
        ) : null}
        {!showAllRoles && remainingRoles.length > 0 ? (
          <Pressable
            onPress={() => onSetShowAllRoles(true)}
            style={({ pressed }) => [styles.secondaryTextAction, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Text
              style={[
                styles.secondaryTextLabel,
                { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans },
              ]}
            >
              {activeRoleGroup ? `See all ${activeRoleGroup.label.toLowerCase()} roles` : 'See more roles'}
            </Text>
          </Pressable>
        ) : null}
        {showAllRoles ? (
          <Pressable
            onPress={() => onSetShowAllRoles(false)}
            style={({ pressed }) => [styles.secondaryTextAction, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Text
              style={[
                styles.secondaryTextLabel,
                { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans },
              ]}
            >
              Hide uncommon roles
            </Text>
          </Pressable>
        ) : null}
      </View>
    </>
  );
}

export function SeniorityStep({
  tokens,
  seniority,
  validationErrors,
  onSelectSeniority,
}: {
  tokens: AppThemeTokens;
  seniority: SeniorityLevel | undefined;
  validationErrors: ValidationErrors;
  onSelectSeniority: (value: SeniorityLevel) => void;
}) {
  return (
    <>
      <SectionTitle title="What's your seniority?" tokens={tokens} />
      <View style={styles.fieldBlock}>
        <Text
          style={[
            styles.fieldHint,
            { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans },
          ]}
        >
          Which level best matches your current scope?
        </Text>
        <View style={styles.choiceStack}>
          {CURATED_SENIORITY_OPTIONS.map((option) => (
            <SeniorityChoiceRow
              key={option.value}
              label={option.label}
              description={option.description}
              selected={seniority === option.value}
              onPress={() => onSelectSeniority(option.value)}
              tokens={tokens}
            />
          ))}
        </View>
        {validationErrors.seniority ? (
          <Text
            style={[
              styles.errorText,
              { color: tokens.colors.danger, fontFamily: tokens.typography.sans },
            ]}
          >
            {validationErrors.seniority}
          </Text>
        ) : null}
      </View>
    </>
  );
}

interface SkillsStepProps {
  tokens: AppThemeTokens;
  bootstrap: MobileCareerOnboardingBootstrap;
  draft: Partial<CareerOnboardingData>;
  currentSkillSuggestions: string[];
  validationErrors: ValidationErrors;
  showInterests: boolean;
  onToggleInterests: () => void;
  onAddPrimarySkill: (value: string) => void;
  onRemovePrimarySkill: (value: string) => void;
  onAddInterest: (value: string) => void;
  onRemoveInterest: (value: string) => void;
}

export function SkillsStep({
  tokens,
  bootstrap,
  draft,
  currentSkillSuggestions,
  validationErrors,
  showInterests,
  onToggleInterests,
  onAddPrimarySkill,
  onRemovePrimarySkill,
  onAddInterest,
  onRemoveInterest,
}: SkillsStepProps) {
  return (
    <>
      <SectionTitle
        title="What do you want to learn about?"
        subtitle="Pick at least 2 topics you want more recommendations for. Interests are optional."
        tokens={tokens}
      />
      <View style={styles.fieldBlock}>
        <CurrentSkillsComposer
          selectedValues={draft.step2_skills?.primarySkills ?? []}
          options={bootstrap.taxonomy.skillOptions}
          suggestedValues={currentSkillSuggestions}
          placeholder="Search or add a topic"
          selectedLabel="Topics you want to learn"
          suggestionsLabel="Suggested for your role"
          onAdd={onAddPrimarySkill}
          onRemove={onRemovePrimarySkill}
          tokens={tokens}
        />
        {validationErrors.primarySkills ? (
          <Text
            style={[
              styles.errorText,
              { color: tokens.colors.danger, fontFamily: tokens.typography.sans },
            ]}
          >
            {validationErrors.primarySkills}
          </Text>
        ) : null}
      </View>

      {(draft.step2_skills?.primarySkills?.length ?? 0) >= 2 ? (
        <View style={styles.skillsOptionalStack}>
          <Pressable
            onPress={onToggleInterests}
            style={({ pressed }) => [
              styles.skillsOptionalRow,
              {
                borderTopColor: tokens.colors.border,
                opacity: pressed ? 0.94 : 1,
              },
            ]}
          >
            <View style={styles.skillsOptionalCopy}>
              <Text
                style={[
                  styles.skillsOptionalTitle,
                  { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans },
                ]}
              >
                What are you interested in?
              </Text>
              <Text
                style={[
                  styles.skillsOptionalMeta,
                  { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans },
                ]}
              >
                {draft.step2_skills?.interests?.length
                  ? `${draft.step2_skills.interests.length} added`
                  : 'Optional'}
              </Text>
            </View>
            <Text
              style={[
                styles.skillsOptionalCta,
                { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans },
              ]}
            >
              {showInterests ? '⌄' : '›'}
            </Text>
          </Pressable>
          {showInterests ? (
            <TagInput
              title="Interests"
              description=""
              showLabel={false}
              selectedValues={draft.step2_skills?.interests ?? []}
              options={bootstrap.taxonomy.interestOptions}
              inputPlaceholder="Add an interest"
              compactInput
              onAdd={onAddInterest}
              onRemove={onRemoveInterest}
              tokens={tokens}
            />
          ) : null}
        </View>
      ) : null}
    </>
  );
}

interface GoalsStepProps {
  tokens: AppThemeTokens;
  mobileGoalOptions: { value: CareerGoal; label: string }[];
  mobileLearningStyleOptions: { value: LearningStyle; label: string }[];
  selectedGoals: CareerGoal[];
  selectedLearningStyles: LearningStyle[];
  validationErrors: ValidationErrors;
  showOptionalPreferences: boolean;
  optionalPreferenceCount: number;
  onToggleGoal: (value: CareerGoal) => void;
  onToggleOptionalPreferences: () => void;
  onToggleLearningStyle: (value: LearningStyle) => void;
}

export function GoalsStep({
  tokens,
  mobileGoalOptions,
  mobileLearningStyleOptions,
  selectedGoals,
  selectedLearningStyles,
  validationErrors,
  showOptionalPreferences,
  optionalPreferenceCount,
  onToggleGoal,
  onToggleOptionalPreferences,
  onToggleLearningStyle,
}: GoalsStepProps) {
  return (
    <>
      <View style={styles.fieldBlock}>
        <Text
          style={[
            styles.sectionTitle,
            { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans },
          ]}
        >
          Choose up to 2 priorities.
        </Text>
        <View style={styles.choiceStack}>
          {mobileGoalOptions.map((option) => (
            <FocusChoiceCard
              key={option.value}
              label={option.label}
              selected={selectedGoals.includes(option.value)}
              testID={`goal-option-${option.value}`}
              onPress={() => onToggleGoal(option.value)}
              tokens={tokens}
            />
          ))}
        </View>
        {validationErrors.careerGoals ? (
          <Text
            style={[
              styles.errorText,
              { color: tokens.colors.danger, fontFamily: tokens.typography.sans },
            ]}
          >
            {validationErrors.careerGoals}
          </Text>
        ) : null}
      </View>

      <View style={styles.skillsOptionalStack}>
        <Pressable
          onPress={onToggleOptionalPreferences}
          style={({ pressed }) => [
            styles.skillsOptionalRow,
            {
              borderTopColor: tokens.colors.border,
              opacity: pressed ? 0.94 : 1,
            },
          ]}
        >
          <View style={styles.skillsOptionalCopy}>
            <Text
              style={[
                styles.skillsOptionalTitle,
                { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans },
              ]}
            >
              Refine recommendations further
            </Text>
            <Text
              style={[
                styles.skillsOptionalMeta,
                { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans },
              ]}
            >
              {optionalPreferenceCount > 0 ? `${optionalPreferenceCount} added` : 'Optional'}
            </Text>
          </View>
          <Text
            style={[
              styles.skillsOptionalCta,
              { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans },
            ]}
          >
            {showOptionalPreferences ? '⌄' : '›'}
          </Text>
        </Pressable>

        {showOptionalPreferences ? (
          <View style={styles.optionalStack}>
            <View style={styles.fieldBlock}>
              <Text
                style={[
                  styles.suggestionLabel,
                  { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans },
                ]}
              >
                How you like to learn
              </Text>
              <View style={styles.preferenceTileGrid}>
                {mobileLearningStyleOptions.map((option) => (
                  <PreferenceTile
                    key={option.value}
                    label={option.label}
                    selected={selectedLearningStyles.includes(option.value)}
                    onPress={() => onToggleLearningStyle(option.value)}
                    tokens={tokens}
                  />
                ))}
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </>
  );
}
