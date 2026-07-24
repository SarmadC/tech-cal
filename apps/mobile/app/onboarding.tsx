import { useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, {
  Easing,
  FadeInLeft,
  FadeInRight,
  FadeInUp,
  FadeOutLeft,
  FadeOutRight,
  LinearTransition,
  ReduceMotion,
  SlideInUp,
} from 'react-native-reanimated';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type {
  MobileCareerOnboardingBootstrap,
  MobileCareerOnboardingData,
} from '@kurecal/domain';

import { ScreenStateView } from '../src/components/ScreenStateView';
import { useAuth } from '../src/context/AuthProvider';
import { useScalePress } from '../src/hooks/useAnimation';
import {
  completeMobileCareerOnboarding,
  loadMobileCareerOnboardingBootstrap,
  skipMobileCareerOnboarding,
} from '../src/lib/mobileApi';
import { useAppTheme } from '../src/providers/ThemeProvider';

const GOAL_OPTIONS = [
  { value: 'skill-development', label: 'Learn new skills' },
  { value: 'role-transition', label: 'Change roles' },
  { value: 'leadership-growth', label: 'Develop leadership' },
  { value: 'networking', label: 'Build your network' },
] as const;

const TIMEFRAME_OPTIONS = [
  { value: 'immediate', label: 'Immediate' },
  { value: 'short-term', label: 'Short-term' },
  { value: 'medium-term', label: 'Medium-term' },
  { value: 'long-term', label: 'Long-term' },
] as const;

const LEARNING_STYLE_OPTIONS = [
  { value: 'hands-on', label: 'Hands-on' },
  { value: 'theoretical', label: 'Lectures' },
  { value: 'interactive', label: 'Discussion' },
  { value: 'networking', label: 'Networking' },
] as const;

const NETWORKING_GOAL_OPTIONS = [
  { value: 'find-mentors', label: 'Find mentors' },
  { value: 'find-peers', label: 'Meet peers' },
  { value: 'find-collaborators', label: 'Find collaborators' },
] as const;

const SENIORITY_BANDS = [
  { label: 'Student', value: 'student', levels: ['student'] },
  { label: 'Early career', value: 'entry-level', levels: ['entry-level', 'junior'] },
  { label: 'Mid-level', value: 'mid-level', levels: ['mid-level'] },
  { label: 'Senior+', value: 'senior', levels: ['senior', 'staff', 'lead'] },
  { label: 'Leadership', value: 'manager', levels: ['manager', 'director', 'vp', 'founder'] },
] as const;

type SheetKind = 'roles' | 'skills' | 'seniority' | 'seniority-detail' | null;

const EASE_OUT = Easing.bezier(0, 0, 0.2, 1);
const EASE_IN = Easing.bezier(0.4, 0, 1, 1);
const STANDARD_LAYOUT = LinearTransition.duration(220)
  .easing(EASE_OUT)
  .reduceMotion(ReduceMotion.System);

function buildEmptyDraft(): MobileCareerOnboardingData {
  return {
    step1_role: { currentRole: '', seniority: 'mid-level', industry: '', companySize: 'medium' },
    step2_skills: { primarySkills: [], skillsToLearn: [], interests: [] },
    step3_goals: { careerGoals: [], timeframe: 'medium-term' },
    step4_preferences: { targetPath: '', learningStyle: [], availableTime: 'moderate', budget: 'moderate' },
    step5_networking: { networkingGoals: [], preferredEventTypes: [] },
    step6_teamBuilding: {
      teamRole: 'flexible', collaborationStyle: [], teamSizePreference: 'flexible',
      communicationPreferences: [], teamGoals: [], mentorshipPreference: 'neither',
      availabilityPattern: null, projectTypePreferences: [],
    },
  };
}

function toggleValue(values: string[], candidate: string, max?: number) {
  if (values.includes(candidate)) return values.filter((value) => value !== candidate);
  return max && values.length >= max ? [...values.slice(1), candidate] : [...values, candidate];
}

function formatSeniority(label: string) {
  return label.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function getSeniorityBand(value: string) {
  return SENIORITY_BANDS.find((band) => (band.levels as readonly string[]).includes(value)) ?? SENIORITY_BANDS[2];
}

function getStepError(step: number, draft: MobileCareerOnboardingData) {
  if (step === 0 && !draft.step1_role.currentRole.trim()) return 'Choose your current role.';
  if (step === 1 && draft.step2_skills.primarySkills.length < 2) return 'Pick at least two current skills.';
  if (step === 2 && draft.step3_goals.careerGoals.length === 0) return 'Choose at least one career goal.';
  return null;
}

function getFirstIncompleteStep(draft: MobileCareerOnboardingData) {
  return [0, 1, 2].find((step) => getStepError(step, draft) !== null) ?? null;
}

function getSaveErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('step1_role') || message.includes('currentRole')) {
    return 'Choose your current role, then try again.';
  }
  if (message.includes('step2_skills') || message.includes('primarySkills')) {
    return 'Pick at least two current skills, then try again.';
  }
  if (message.includes('step3_goals') || message.includes('careerGoals')) {
    return 'Choose a career goal, then try again.';
  }
  return 'We couldn’t save your profile. Please try again.';
}

function ChoiceChip({ label, selected, onPress, accessibilityLabel }: { label: string; selected: boolean; onPress: () => void; accessibilityLabel: string }) {
  const { tokens } = useAppTheme();
  return (
    <Pressable accessibilityLabel={accessibilityLabel} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} hitSlop={6} onPress={onPress} style={[styles.chip, { backgroundColor: selected ? tokens.colors.accentSoft : tokens.colors.surfaceMuted, borderColor: selected ? tokens.colors.accent : tokens.colors.borderStrong, borderRadius: tokens.radius.sm }]}>
      <Text style={[styles.chipLabel, { color: selected ? tokens.colors.accent : tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>{label}</Text>
    </Pressable>
  );
}

function SelectionRow({ label, selected, onPress, accessibilityLabel, entryDelay }: { label: string; selected: boolean; onPress: () => void; accessibilityLabel: string; entryDelay?: number }) {
  const { tokens } = useAppTheme();
  const row = (
    <Pressable accessibilityLabel={accessibilityLabel} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={onPress} style={[styles.selectionRow, { backgroundColor: selected ? tokens.colors.accentSoft : 'transparent', borderBottomColor: tokens.colors.divider, borderLeftColor: selected ? tokens.colors.accent : 'transparent' }]}>
      <View style={styles.selectionContent}><Text style={[styles.selectionLabel, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>{label}</Text><Text style={[styles.selectedMark, { color: selected ? tokens.colors.accent : tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>{selected ? '✓' : ''}</Text></View>
    </Pressable>
  );
  return entryDelay === undefined ? row : <Animated.View entering={FadeInUp.duration(150).delay(entryDelay).easing(EASE_OUT).reduceMotion(ReduceMotion.System)}>{row}</Animated.View>;
}

function OnboardingButton({ children, variant, disabled = false, onPress, accessibilityLabel, style }: PropsWithChildren<{ variant: 'primary' | 'secondary'; disabled?: boolean; onPress: () => void; accessibilityLabel: string; style?: StyleProp<ViewStyle> }>) {
  const { tokens } = useAppTheme();
  const { scale, onPressIn, onPressOut } = useScalePress({ haptic: true });
  const primary = variant === 'primary';
  return (
    <Pressable accessibilityLabel={accessibilityLabel} accessibilityRole="button" disabled={disabled} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} style={[styles.button, { backgroundColor: primary ? tokens.colors.pillActive : tokens.colors.surface, borderColor: primary ? tokens.colors.pillActive : tokens.colors.borderStrong, borderRadius: tokens.radius.md }, disabled && styles.buttonDisabled, style]}>
      <Animated.View style={{ transform: [{ scale }] }}><Text style={[styles.buttonLabel, { color: primary ? tokens.colors.pillActiveText : tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>{children}</Text></Animated.View>
    </Pressable>
  );
}

function RefineToggle({ label, expanded, onPress }: { label: string; expanded: boolean; onPress: () => void }) {
  const { tokens } = useAppTheme();
  return <Pressable accessibilityLabel={label} accessibilityRole="button" accessibilityState={{ expanded }} onPress={onPress} style={[styles.refineToggle, { borderColor: tokens.colors.borderStrong, borderRadius: tokens.radius.md }]}><Text style={[styles.refineLabel, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>{label}</Text><Text style={[styles.refineIcon, { color: tokens.colors.textTertiary }]}>{expanded ? '−' : '+'}</Text></Pressable>;
}

function SelectionSheet({ visible, title, options, selectedValues, onToggle, onAdd, onClose, allowAdd = false, searchable = true }: { visible: boolean; title: string; options: string[]; selectedValues: string[]; onToggle: (value: string) => void; onAdd?: (value: string) => void; onClose: () => void; allowAdd?: boolean; searchable?: boolean }) {
  const { tokens } = useAppTheme();
  const insets = useSafeAreaInsets();
  const isSkillSheet = title === 'Skills';
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = options.filter((option) => option.toLowerCase().includes(normalizedQuery));
  const hasEquivalentOption = options.some((option) => option.toLowerCase() === normalizedQuery);
  const hasSelectedValue = selectedValues.some((value) => value.toLowerCase() === normalizedQuery);
  const showAddOption = allowAdd && Boolean(normalizedQuery) && !hasEquivalentOption && !hasSelectedValue;

  useEffect(() => { if (!visible) setQuery(''); }, [visible]);

  return (
    <Modal animationType="none" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.modalRoot}>
        <Pressable accessibilityLabel="Dismiss selection sheet" onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: tokens.colors.overlay }]} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetKeyboard}>
          <Animated.View entering={SlideInUp.duration(220).easing(EASE_OUT).reduceMotion(ReduceMotion.System)} style={[styles.sheet, isSkillSheet && styles.skillSheet, { backgroundColor: tokens.colors.surfaceStrong, borderColor: tokens.colors.borderStrong, paddingBottom: insets.bottom + 12 }]}>
            <View style={styles.sheetHeader}><Text style={[styles.sheetTitle, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>{title}</Text><Pressable accessibilityLabel="Close selection sheet" hitSlop={12} onPress={onClose}><Text style={[styles.closeLabel, { color: tokens.colors.accent, fontFamily: tokens.typography.sans }]}>Done</Text></Pressable></View>
            {searchable ? <TextInput accessibilityLabel={allowAdd ? 'Search or add a skill' : `Search ${title.toLowerCase()}`} autoCapitalize="none" autoCorrect={false} onChangeText={setQuery} placeholder={allowAdd ? 'Search or add a skill' : `Search ${title.toLowerCase()}`} placeholderTextColor={tokens.colors.textTertiary} style={[styles.searchInput, { backgroundColor: tokens.colors.input, borderColor: tokens.colors.borderStrong, borderRadius: tokens.radius.md, color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]} value={query} /> : null}
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={styles.sheetList}>{showAddOption ? <Animated.View entering={FadeInUp.duration(150).easing(EASE_OUT).reduceMotion(ReduceMotion.System)}><Pressable accessibilityLabel={`Add ${query.trim()} as a custom skill`} accessibilityRole="button" onPress={() => { onAdd?.(query.trim()); setQuery(''); }} style={[styles.selectionRow, { borderBottomColor: tokens.colors.divider, borderLeftColor: tokens.colors.accent }]}><View style={styles.selectionContent}><Text style={[styles.selectionLabel, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>Add “{query.trim()}”</Text><Text style={[styles.selectedMark, { color: tokens.colors.accent, fontFamily: tokens.typography.sans }]}>+</Text></View></Pressable></Animated.View> : null}{filtered.map((option, index) => <SelectionRow key={option} accessibilityLabel={option} entryDelay={Math.min(index, 5) * 20} label={option} onPress={() => onToggle(option)} selected={selectedValues.includes(option)} />)}{filtered.length === 0 && !showAddOption ? <Text style={[styles.emptyLabel, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>No matches</Text> : null}</ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export default function OnboardingScreen() {
  const { resume } = useLocalSearchParams<{ resume?: string }>();
  const allowManualOpen = resume === '1' || resume === 'true';
  const { refreshProfile } = useAuth();
  const { tokens } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [bootstrap, setBootstrap] = useState<MobileCareerOnboardingBootstrap | null>(null);
  const [draft, setDraft] = useState<MobileCareerOnboardingData>(buildEmptyDraft());
  const [currentStep, setCurrentStep] = useState(0);
  const [stepDirection, setStepDirection] = useState<'forward' | 'backward'>('forward');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeRoleGroup, setActiveRoleGroup] = useState('');
  const [activeInput, setActiveInput] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [showRoleDetails, setShowRoleDetails] = useState(false);
  const [showIndustry, setShowIndustry] = useState(false);
  const [showSkillRefinement, setShowSkillRefinement] = useState(false);
  const [showGoalRefinement, setShowGoalRefinement] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadBootstrap() {
      setLoading(true);
      try {
        const nextBootstrap = await loadMobileCareerOnboardingBootstrap();
        if (cancelled) return;
        setBootstrap(nextBootstrap);
        setDraft(nextBootstrap.initialData ?? buildEmptyDraft());
        setActiveRoleGroup(nextBootstrap.taxonomy.roleGroups[0]?.key ?? '');
        setShowRoleDetails(Boolean(nextBootstrap.initialData?.step1_role.currentRole));
        setShowIndustry(Boolean(nextBootstrap.initialData?.step1_role.industry));
        setError(null);
      } catch (nextError) {
        if (!cancelled) setError(nextError instanceof Error ? nextError.message : 'Unable to load onboarding');
      } finally { if (!cancelled) setLoading(false); }
    }
    void loadBootstrap();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { if (bootstrap?.status.onboarded && !allowManualOpen) router.replace('./(tabs)/discover'); }, [allowManualOpen, bootstrap?.status.onboarded]);

  const visibleRoleGroup = bootstrap?.taxonomy.roleGroups.find((group) => group.key === activeRoleGroup) ?? bootstrap?.taxonomy.roleGroups[0] ?? null;
  const allRoles = useMemo(() => bootstrap ? Array.from(new Set(bootstrap.taxonomy.roleGroups.flatMap((group) => group.roles))) : [], [bootstrap]);
  const currentSkillSuggestions = useMemo(() => !bootstrap || !draft.step1_role.currentRole ? [] : bootstrap.taxonomy.roleSuggestions[draft.step1_role.currentRole]?.current ?? [], [bootstrap, draft.step1_role.currentRole]);
  const availableCurrentSkillSuggestions = useMemo(() => {
    const selectedSkills = new Set(draft.step2_skills.primarySkills.map((skill) => skill.trim().toLocaleLowerCase()));
    return currentSkillSuggestions.filter((skill) => !selectedSkills.has(skill.trim().toLocaleLowerCase()));
  }, [currentSkillSuggestions, draft.step2_skills.primarySkills]);
  const learnSkillSuggestions = useMemo(() => !bootstrap || !draft.step1_role.currentRole ? [] : bootstrap.taxonomy.roleSuggestions[draft.step1_role.currentRole]?.learn ?? [], [bootstrap, draft.step1_role.currentRole]);
  const allSkills = useMemo(() => bootstrap ? Array.from(new Set([...currentSkillSuggestions, ...learnSkillSuggestions, ...bootstrap.taxonomy.skillOptions.map((option) => option.value)])) : [], [bootstrap, currentSkillSuggestions, learnSkillSuggestions]);

  function selectRole(role: string) {
    setDraft((current) => ({ ...current, step1_role: { ...current.step1_role, currentRole: role } }));
    setShowRoleDetails(true);
    setSheet(null);
  }

  function toggleSkill(value: string) {
    setDraft((current) => ({ ...current, step2_skills: { ...current.step2_skills, primarySkills: toggleValue(current.step2_skills.primarySkills, value) } }));
  }

  function addSkill(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    setDraft((current) => current.step2_skills.primarySkills.some((skill) => skill.toLowerCase() === trimmed.toLowerCase())
      ? current
      : { ...current, step2_skills: { ...current.step2_skills, primarySkills: [...current.step2_skills.primarySkills, trimmed] } });
  }

  async function handleSkip() {
    Alert.alert('Skip career setup?', 'You can finish your career profile later from the Profile tab.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Skip now', style: 'destructive', onPress: () => { void (async () => { setSubmitting(true); try { await skipMobileCareerOnboarding(); await refreshProfile(); router.replace('./(tabs)/discover'); } catch (nextError) { Alert.alert('Unable to skip', nextError instanceof Error ? nextError.message : 'Unable to skip onboarding'); } finally { setSubmitting(false); } })(); } },
    ]);
  }

  async function handleContinue() {
    const stepError = getStepError(currentStep, draft);
    if (stepError) { Alert.alert('Complete this step', stepError); return; }
    if (currentStep < 2) { setStepDirection('forward'); setCurrentStep((step) => step + 1); return; }
    const incompleteStep = getFirstIncompleteStep(draft);
    if (incompleteStep !== null) {
      setStepDirection('backward');
      setCurrentStep(incompleteStep);
      Alert.alert('Complete your profile', getStepError(incompleteStep, draft) ?? 'Complete this step before saving.');
      return;
    }
    setSubmitting(true);
    try { await completeMobileCareerOnboarding(draft); await refreshProfile(); router.replace('./(tabs)/discover'); }
    catch (nextError) { Alert.alert('Unable to save profile', getSaveErrorMessage(nextError)); }
    finally { setSubmitting(false); }
  }

  const inputStyle = (name: string) => [styles.input, { backgroundColor: tokens.colors.input, borderColor: activeInput === name ? tokens.colors.accent : tokens.colors.borderStrong, borderRadius: tokens.radius.md, color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }];

  if (loading || error || !bootstrap) {
    return <View style={[styles.screen, { backgroundColor: tokens.colors.shell, paddingTop: insets.top, paddingBottom: insets.bottom }]}><View style={styles.stateWrap}><ScreenStateView mode={loading ? 'loading' : 'error'} title={loading ? 'Preparing onboarding' : 'Onboarding unavailable'} description={loading ? 'Loading your career profile bootstrap and role suggestions.' : error ?? 'Unable to load mobile onboarding.'} onRetry={loading ? undefined : () => router.replace('./onboarding')} /></View></View>;
  }

  const stepLabel = currentStep === 0 ? 'Role' : currentStep === 1 ? 'Skills' : 'Goals';
  const primaryLabel = currentStep === 0 ? 'Continue' : currentStep === 1 ? 'Continue' : 'Complete setup';

  return (
    <View style={[styles.screen, { backgroundColor: tokens.colors.shell }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
        <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: 112 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.topLine}>{allowManualOpen ? <Pressable accessibilityLabel="Back to settings" hitSlop={12} onPress={() => router.back()}><Text style={[styles.backGlyph, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>‹</Text></Pressable> : <View /> }<Text accessibilityLabel={`${currentStep + 1} of 3, ${stepLabel}`} style={[styles.progress, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>{currentStep + 1} of 3 · {stepLabel}</Text></View>
          <Animated.View key={currentStep} entering={(stepDirection === 'forward' ? FadeInRight : FadeInLeft).duration(320).easing(EASE_OUT).reduceMotion(ReduceMotion.System)} exiting={(stepDirection === 'forward' ? FadeOutLeft : FadeOutRight).duration(320).easing(EASE_IN).reduceMotion(ReduceMotion.System)} layout={STANDARD_LAYOUT} style={styles.stepContent}>
            {currentStep === 0 ? <View style={styles.zone}>
              <Text style={[styles.question, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>What do you do?</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.familyRail}>{bootstrap.taxonomy.roleGroups.map((group) => <ChoiceChip key={group.key} label={group.label} selected={activeRoleGroup === group.key} onPress={() => setActiveRoleGroup(group.key)} accessibilityLabel={`${group.label} role family`} />)}</ScrollView>
              <View style={styles.rolePreview}>{visibleRoleGroup?.roles.slice(0, 5).map((role) => <SelectionRow key={role} accessibilityLabel={`${role} role`} label={role} onPress={() => selectRole(role)} selected={draft.step1_role.currentRole === role} />)}</View>
              <Pressable accessibilityLabel="Browse all roles" onPress={() => setSheet('roles')} style={styles.browseLink}><Text style={[styles.browseLabel, { color: tokens.colors.accent, fontFamily: tokens.typography.sans }]}>Browse all roles</Text></Pressable>
              {showRoleDetails ? <Animated.View entering={FadeInUp.duration(220).easing(EASE_OUT).reduceMotion(ReduceMotion.System)} layout={STANDARD_LAYOUT} style={[styles.revealedZone, { borderTopColor: tokens.colors.divider }]}><Text style={[styles.selectedSummary, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>Selected role · {draft.step1_role.currentRole}</Text><Pressable accessibilityLabel="Choose seniority level" accessibilityRole="button" onPress={() => setSheet('seniority')} style={[styles.fieldButton, { backgroundColor: tokens.colors.surfaceStrong, borderColor: tokens.colors.borderStrong, borderRadius: tokens.radius.md }]}><Text style={[styles.fieldLabel, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>Level</Text><Text style={[styles.fieldValue, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>{getSeniorityBand(draft.step1_role.seniority).label} ›</Text></Pressable><Pressable accessibilityLabel="Choose a more specific level" onPress={() => setSheet('seniority-detail')} style={styles.specificLevelButton}><Text style={[styles.specificLevelLabel, { color: tokens.colors.accent, fontFamily: tokens.typography.sans }]}>Choose a more specific level</Text></Pressable><RefineToggle expanded={showIndustry} label="Add industry context (optional)" onPress={() => setShowIndustry((value) => !value)} />{showIndustry ? <Animated.View entering={FadeInUp.duration(220).easing(EASE_OUT).reduceMotion(ReduceMotion.System)}><TextInput accessibilityLabel="Industry focus, optional" onBlur={() => setActiveInput(null)} onFocus={() => setActiveInput('industry')} onChangeText={(industry) => setDraft((current) => ({ ...current, step1_role: { ...current.step1_role, industry } }))} placeholder="Industry focus" placeholderTextColor={tokens.colors.textTertiary} style={inputStyle('industry')} value={draft.step1_role.industry} /></Animated.View> : null}</Animated.View> : null}
            </View> : null}

            {currentStep === 1 ? <View style={styles.zone}>
              <Text style={[styles.question, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>Pick 2 skills you use today</Text>
              <Text style={[styles.countLabel, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>{draft.step2_skills.primarySkills.length} selected · at least 2 required</Text>
              <View style={styles.chipRow}>{availableCurrentSkillSuggestions.slice(0, 8).map((skill) => <ChoiceChip key={skill} accessibilityLabel={`Add ${skill} as a current skill`} label={skill} onPress={() => toggleSkill(skill)} selected={false} />)}</View>
              <Pressable accessibilityLabel="Search or add skills" onPress={() => setSheet('skills')} style={[styles.searchButton, { borderColor: tokens.colors.borderStrong, borderRadius: tokens.radius.md }]}><Text style={[styles.searchButtonLabel, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>Search or add a skill</Text><Text style={[styles.searchSymbol, { color: tokens.colors.textTertiary }]}>⌕</Text></Pressable>
              {draft.step2_skills.primarySkills.length > 0 ? <View style={[styles.selectedRail, { borderTopColor: tokens.colors.divider }]}>{draft.step2_skills.primarySkills.map((skill) => <ChoiceChip key={skill} accessibilityLabel={`Remove ${skill}`} label={`${skill} ×`} onPress={() => toggleSkill(skill)} selected />)}</View> : null}
              <RefineToggle expanded={showSkillRefinement} label="Refine recommendations (optional)" onPress={() => setShowSkillRefinement((value) => !value)} />
              {showSkillRefinement ? <Animated.View entering={FadeInUp.duration(220).easing(EASE_OUT).reduceMotion(ReduceMotion.System)} layout={STANDARD_LAYOUT} style={styles.refinement}><Text style={[styles.sectionLabel, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>Skills to learn</Text><View style={styles.chipRow}>{learnSkillSuggestions.slice(0, 6).map((skill) => <ChoiceChip key={skill} accessibilityLabel={`${skill} skill to learn`} label={skill} onPress={() => setDraft((current) => ({ ...current, step2_skills: { ...current.step2_skills, skillsToLearn: toggleValue(current.step2_skills.skillsToLearn, skill) } }))} selected={draft.step2_skills.skillsToLearn.includes(skill)} />)}</View><Text style={[styles.sectionLabel, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>Interests</Text><View style={styles.chipRow}>{bootstrap.taxonomy.interestOptions.slice(0, 10).map((interest) => <ChoiceChip key={interest.value} accessibilityLabel={`${interest.label} interest`} label={interest.label} onPress={() => setDraft((current) => ({ ...current, step2_skills: { ...current.step2_skills, interests: toggleValue(current.step2_skills.interests, interest.value) } }))} selected={draft.step2_skills.interests.includes(interest.value)} />)}</View></Animated.View> : null}
            </View> : null}

            {currentStep === 2 ? <View style={styles.zone}>
              <Text style={[styles.question, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>What are you working toward?</Text>
              <Text style={[styles.countLabel, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>{draft.step3_goals.careerGoals.length} selected · choose up to 2</Text>
              <View style={styles.rolePreview}>{GOAL_OPTIONS.map((goal) => <SelectionRow key={goal.value} accessibilityLabel={`${goal.label} career goal`} label={goal.label} onPress={() => setDraft((current) => ({ ...current, step3_goals: { ...current.step3_goals, careerGoals: toggleValue(current.step3_goals.careerGoals, goal.value, 2) } }))} selected={draft.step3_goals.careerGoals.includes(goal.value)} />)}</View>
              <Text style={[styles.sectionLabel, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>Timeline</Text><View style={styles.chipRow}>{TIMEFRAME_OPTIONS.map((option) => <ChoiceChip key={option.value} accessibilityLabel={`${option.label} timeline`} label={option.label} onPress={() => setDraft((current) => ({ ...current, step3_goals: { ...current.step3_goals, timeframe: option.value } }))} selected={draft.step3_goals.timeframe === option.value} />)}</View>
              <RefineToggle expanded={showGoalRefinement} label="Refine recommendations (optional)" onPress={() => setShowGoalRefinement((value) => !value)} />
              {showGoalRefinement ? <Animated.View entering={FadeInUp.duration(220).easing(EASE_OUT).reduceMotion(ReduceMotion.System)} layout={STANDARD_LAYOUT} style={styles.refinement}><Text style={[styles.sectionLabel, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>Learning style</Text><View style={styles.chipRow}>{LEARNING_STYLE_OPTIONS.map((option) => <ChoiceChip key={option.value} accessibilityLabel={`${option.label} learning style`} label={option.label} onPress={() => setDraft((current) => ({ ...current, step4_preferences: { ...current.step4_preferences, learningStyle: toggleValue(current.step4_preferences.learningStyle, option.value) } }))} selected={draft.step4_preferences.learningStyle.includes(option.value)} />)}</View><Text style={[styles.sectionLabel, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>Networking goals</Text><View style={styles.chipRow}>{NETWORKING_GOAL_OPTIONS.map((option) => <ChoiceChip key={option.value} accessibilityLabel={`${option.label} networking goal`} label={option.label} onPress={() => setDraft((current) => ({ ...current, step5_networking: { ...current.step5_networking, networkingGoals: toggleValue(current.step5_networking.networkingGoals, option.value) } }))} selected={draft.step5_networking.networkingGoals.includes(option.value)} />)}</View></Animated.View> : null}
            </View> : null}
          </Animated.View>
        </ScrollView>
        <View style={[styles.footer, { backgroundColor: tokens.colors.shellElevated, borderTopColor: tokens.colors.divider, paddingBottom: insets.bottom + 10 }]}><OnboardingButton accessibilityLabel={currentStep === 0 ? 'Skip onboarding for now' : 'Go to previous onboarding step'} onPress={() => { if (currentStep === 0) { void handleSkip(); } else { setStepDirection('backward'); setCurrentStep((step) => step - 1); } }} variant="secondary">{currentStep === 0 ? 'Skip' : 'Back'}</OnboardingButton><OnboardingButton accessibilityLabel={currentStep === 2 ? 'Complete career setup' : 'Continue to next onboarding step'} disabled={submitting} onPress={() => { void handleContinue(); }} style={styles.primaryButton} variant="primary">{submitting ? 'Saving…' : primaryLabel}</OnboardingButton></View>
      </KeyboardAvoidingView>
      <SelectionSheet allowAdd onAdd={addSkill} onClose={() => setSheet(null)} onToggle={toggleSkill} options={allSkills} selectedValues={draft.step2_skills.primarySkills} title="Skills" visible={sheet === 'skills'} />
      <SelectionSheet onClose={() => setSheet(null)} onToggle={(role) => selectRole(role)} options={allRoles} selectedValues={draft.step1_role.currentRole ? [draft.step1_role.currentRole] : []} title="All roles" visible={sheet === 'roles'} />
      <SelectionSheet onClose={() => setSheet(null)} onToggle={(label) => { const band = SENIORITY_BANDS.find((item) => item.label === label); if (band) setDraft((current) => ({ ...current, step1_role: { ...current.step1_role, seniority: getSeniorityBand(current.step1_role.seniority).label === band.label ? current.step1_role.seniority : band.value } })); setSheet(null); }} options={SENIORITY_BANDS.map((band) => band.label)} searchable={false} selectedValues={[getSeniorityBand(draft.step1_role.seniority).label]} title="Level" visible={sheet === 'seniority'} />
      <SelectionSheet onClose={() => setSheet(null)} onToggle={(label) => { const seniority = getSeniorityBand(draft.step1_role.seniority).levels.find((value) => formatSeniority(value) === label); if (seniority) setDraft((current) => ({ ...current, step1_role: { ...current.step1_role, seniority } })); setSheet(null); }} options={getSeniorityBand(draft.step1_role.seniority).levels.map(formatSeniority)} searchable={false} selectedValues={[formatSeniority(draft.step1_role.seniority)]} title="Specific level" visible={sheet === 'seniority-detail'} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  stateWrap: { flex: 1, justifyContent: 'center', padding: 20 },
  content: { gap: 20, paddingHorizontal: 20 },
  topLine: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 28 },
  backGlyph: { fontSize: 28, fontWeight: '400', lineHeight: 26 },
  progress: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  stepContent: { minHeight: 360 },
  zone: { gap: 16 },
  question: { fontSize: 24, fontWeight: '600', letterSpacing: -0.24, lineHeight: 29 },
  countLabel: { fontSize: 13, fontWeight: '400', lineHeight: 18, marginTop: -8 },
  familyRail: { gap: 8, paddingRight: 20 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, minHeight: 32, justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 6 },
  chipLabel: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  rolePreview: {},
  selectionRow: { borderBottomWidth: StyleSheet.hairlineWidth, borderLeftWidth: 2, minHeight: 40, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  selectionContent: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  selectionLabel: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  selectedMark: { fontSize: 16, fontWeight: '600', lineHeight: 20, width: 20 },
  browseLink: { alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center' },
  browseLabel: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  specificLevelButton: { alignSelf: 'flex-start', minHeight: 28, justifyContent: 'center' },
  specificLevelLabel: { fontSize: 12, fontWeight: '600', lineHeight: 16 },
  revealedZone: { borderTopWidth: StyleSheet.hairlineWidth, gap: 12, marginTop: 4, paddingTop: 16 },
  selectedSummary: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  fieldButton: { borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 44, paddingHorizontal: 12, paddingVertical: 10 },
  fieldLabel: { fontSize: 12, fontWeight: '400', lineHeight: 20 },
  fieldValue: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  refineToggle: { alignItems: 'center', borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 40, paddingHorizontal: 12 },
  refineLabel: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  refineIcon: { fontSize: 18, lineHeight: 20 },
  refinement: { gap: 10 },
  sectionLabel: { fontSize: 12, fontWeight: '400', lineHeight: 16, marginTop: 2 },
  input: { borderWidth: 1, fontSize: 14, lineHeight: 20, minHeight: 40, paddingHorizontal: 12, paddingVertical: 9 },
  searchButton: { alignItems: 'center', borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 44, paddingHorizontal: 12 },
  searchButtonLabel: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  searchSymbol: { fontSize: 20, lineHeight: 20 },
  selectedRail: { borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 16 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 10 },
  button: { alignItems: 'center', borderWidth: 1, justifyContent: 'center', minHeight: 36, paddingHorizontal: 14 },
  primaryButton: { flex: 1 },
  buttonLabel: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  buttonDisabled: { opacity: 0.45 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  sheetKeyboard: { justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 6, borderTopRightRadius: 6, borderWidth: 1, gap: 12, maxHeight: '82%', paddingHorizontal: 20, paddingTop: 16 },
  skillSheet: { height: '68%' },
  sheetHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sheetTitle: { fontSize: 18, fontWeight: '600', lineHeight: 24 },
  closeLabel: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  searchInput: { borderWidth: 1, fontSize: 14, lineHeight: 20, minHeight: 40, paddingHorizontal: 12, paddingVertical: 9 },
  sheetList: { flex: 1 },
  emptyLabel: { fontSize: 13, lineHeight: 18, paddingVertical: 16, textAlign: 'center' },
});
