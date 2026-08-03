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
import { SymbolView, type SFSymbol } from 'expo-symbols';

import type {
    MobileCareerOnboardingBootstrap,
    MobileCareerOnboardingData,
} from '@kurecal/domain';

import { ScreenStateView } from '../src/components/ScreenStateView';
import { useAuth } from '../src/context/AuthProvider';
import { useScalePress } from '../src/hooks/useAnimation';
import { useUsernameAvailability } from '../src/hooks/useUsernameAvailability';
import { haptics } from '../src/lib/haptics';
import {
    completeMobileCareerOnboarding,
    loadMobileCareerOnboardingBootstrap,
    saveMobileCareerOnboardingDraft,
    skipMobileCareerOnboarding,
    updateMobileProfile,
} from '../src/lib/mobileApi';
import { useAppTheme } from '../src/providers/ThemeProvider';

const GOAL_OPTIONS = [
    { value: 'skill-development', label: 'Learn new skills', description: 'Courses, events, and practical resources', icon: 'sparkles' },
    { value: 'role-transition', label: 'Change roles', description: 'Career paths and relevant opportunities', icon: 'arrow.up.right' },
    { value: 'leadership-growth', label: 'Grow as a leader', description: 'Management, communication, and strategy', icon: 'person.2' },
    { value: 'networking', label: 'Build your network', description: 'Relevant people, communities, and events', icon: 'person.3' },
] as const;

const CAREER_LEVELS = ['student', 'entry-level', 'junior', 'mid-level', 'senior', 'staff', 'lead', 'manager', 'director', 'vp', 'founder'] as const;

type SheetKind = 'roles' | 'skills' | 'topics' | 'seniority' | null;
type RoleGroup = { key: string; label: string; roles: string[] };
type TaxonomyOption = MobileCareerOnboardingBootstrap['taxonomy']['skillOptions'][number];
type SelectionOptionInput = string | TaxonomyOption;

const SUGGESTED_ROLE_ORDER = [
    'Backend Engineer',
    'Product Designer',
    'Product Manager',
    'Founder',
] as const;

const ROLE_SEARCH_ALIASES: Record<string, string[]> = {
    'Backend Engineer': ['backend', 'server', 'api', 'backend developer'],
    'Platform Engineer': ['backend', 'platform', 'infrastructure', 'developer tools'],
    'DevOps Engineer': ['devops', 'infrastructure', 'operations'],
    'Site Reliability Engineer': ['sre', 'reliability', 'infrastructure'],
    'Product Designer': ['design', 'ux', 'ui', 'product design'],
    'UX Designer': ['design', 'ux', 'user experience'],
    'UI Designer': ['design', 'ui', 'user interface'],
    'Product Manager': ['product', 'pm', 'product lead'],
    'Founder': ['founder', 'cofounder', 'startup'],
    'Entrepreneur / Startup Operator': ['founder', 'operator', 'startup'],
};

const EASE_OUT = Easing.bezier(0, 0, 0.2, 1);
const EASE_IN = Easing.bezier(0.4, 0, 1, 1);
const STANDARD_LAYOUT = LinearTransition.duration(220)
    .easing(EASE_OUT)
    .reduceMotion(ReduceMotion.System);

function buildEmptyDraft(): MobileCareerOnboardingData {
    return {
        step1_role: { currentRole: '', seniority: 'mid-level', industry: '', companyName: '', companySize: 'medium' },
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

function toggleValue(values: string[], candidate: string) {
    if (values.includes(candidate)) return values.filter((value) => value !== candidate);
    return [...values, candidate];
}

function formatSeniority(label: string) {
    if (label === 'vp') return 'VP';
    return label.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function getRoleSymbol(role: string): SFSymbol {
    const normalizedRole = role.toLowerCase();
    if (normalizedRole.includes('backend') || normalizedRole.includes('engineer') || normalizedRole.includes('developer')) return 'terminal';
    if (normalizedRole.includes('design')) return 'cursorarrow';
    if (normalizedRole.includes('founder') || normalizedRole.includes('entrepreneur')) return 'sparkles';
    if (normalizedRole.includes('product')) return 'checklist';
    if (normalizedRole.includes('student') || normalizedRole.includes('explorer')) return 'graduationcap';
    return 'briefcase';
}

function getRoleDescription(role: string): string | null {
    const normalizedRole = role.toLowerCase();
    if (normalizedRole.includes('backend')) return 'APIs and systems';
    if (normalizedRole.includes('platform')) return 'Infrastructure and developer tools';
    if (normalizedRole.includes('product designer')) return 'Product and interface design';
    if (normalizedRole.includes('product manager')) return 'Product strategy and delivery';
    if (normalizedRole.includes('founder')) return 'Building a company';
    return null;
}

function matchesRoleSearch(role: string, discipline: string, query: string): boolean {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return true;

    return [role, discipline, ...(ROLE_SEARCH_ALIASES[role] ?? [])]
        .some((term) => term.toLocaleLowerCase().includes(normalizedQuery));
}

function getStepError(step: number, draft: MobileCareerOnboardingData) {
    if (step === 0 && !draft.step1_role.currentRole.trim()) return 'Choose your current role.';
    if (step === 2 && draft.step2_skills.primarySkills.length < 2) return 'Pick at least two current skills.';
    if (step === 3 && draft.step3_goals.careerGoals.length === 0) return 'Choose at least one career goal.';
    return null;
}

function getFirstIncompleteStep(draft: MobileCareerOnboardingData) {
    return [0, 2, 3].find((step) => getStepError(step, draft) !== null) ?? null;
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

function SkillChip({ skill, selected, onPress }: { skill: string; selected: boolean; onPress: () => void }) {
    const { tokens } = useAppTheme();
    return (
        <Pressable
            accessibilityLabel={`${selected ? 'Remove' : 'Add'} ${skill}`}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            hitSlop={4}
            onPress={onPress}
            style={({ pressed }) => [
                styles.skillChip,
                {
                    backgroundColor: selected ? tokens.colors.accentSoft : tokens.colors.surfaceMuted,
                    borderColor: selected ? tokens.colors.accent : tokens.colors.borderStrong,
                    borderRadius: tokens.radius.sm,
                    opacity: pressed ? 0.72 : 1,
                },
            ]}
        >
            <Text style={[styles.skillChipLabel, { color: selected ? tokens.colors.accent : tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>{skill}</Text>
            <Text accessibilityElementsHidden style={[styles.skillChipAction, { color: selected ? tokens.colors.accent : tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>{selected ? '×' : '+'}</Text>
        </Pressable>
    );
}

function GoalCard({ goal, selected, dimmed, onPress }: { goal: (typeof GOAL_OPTIONS)[number]; selected: boolean; dimmed: boolean; onPress: () => void }) {
    const { tokens } = useAppTheme();
    return (
        <Pressable
            accessibilityLabel={`${goal.label}. ${goal.description}`}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            onPress={onPress}
            style={({ pressed }) => [
                styles.goalCard,
                {
                    backgroundColor: selected ? tokens.colors.accentSoft : tokens.colors.surfaceMuted,
                    borderColor: selected ? tokens.colors.accent : tokens.colors.border,
                    borderRadius: tokens.radius.md,
                    opacity: pressed ? 0.7 : dimmed ? 0.5 : 1,
                },
            ]}
        >
            <View style={styles.goalIcon}><SymbolView name={goal.icon} size={18} tintColor={selected ? tokens.colors.accent : tokens.colors.textTertiary} type="monochrome" /></View>
            <View style={styles.goalCopy}><Text style={[styles.goalTitle, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>{goal.label}</Text><Text style={[styles.goalDescription, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>{goal.description}</Text></View>
            <View style={[styles.goalCheck, { backgroundColor: selected ? tokens.colors.accent : 'transparent', borderColor: selected ? tokens.colors.accent : tokens.colors.borderStrong }]}>{selected ? <SymbolView name="checkmark" size={12} tintColor={tokens.colors.textInverse} type="monochrome" /> : null}</View>
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

function OnboardingButton({ children, variant, disabled = false, onPress, accessibilityLabel, style }: PropsWithChildren<{ variant: 'primary' | 'secondary' | 'tertiary'; disabled?: boolean; onPress: () => void; accessibilityLabel: string; style?: StyleProp<ViewStyle> }>) {
    const { tokens } = useAppTheme();
    const { scale, onPressIn, onPressOut } = useScalePress({ haptic: true });
    const primary = variant === 'primary';
    const tertiary = variant === 'tertiary';
    return (
        <Pressable accessibilityLabel={accessibilityLabel} accessibilityRole="button" disabled={disabled} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} style={[styles.button, { backgroundColor: primary ? tokens.colors.pillActive : tertiary ? 'transparent' : tokens.colors.surface, borderColor: primary ? tokens.colors.pillActive : tertiary ? 'transparent' : tokens.colors.borderStrong, borderRadius: tokens.radius.md, borderWidth: tertiary ? 0 : 1 }, disabled && styles.buttonDisabled, style]}>
            <Animated.View style={{ transform: [{ scale }] }}><Text style={[styles.buttonLabel, { color: primary ? tokens.colors.pillActiveText : tertiary ? tokens.colors.textSecondary : tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>{children}</Text></Animated.View>
        </Pressable>
    );
}

function SelectionSheet({ visible, title, options, selectedValues, onToggle, onAdd, onClose, allowAdd = false, searchable = true, autoFocus = true }: { visible: boolean; title: string; options: SelectionOptionInput[]; selectedValues: string[]; onToggle: (value: string) => void; onAdd?: (value: string) => void; onClose: () => void; allowAdd?: boolean; searchable?: boolean; autoFocus?: boolean }) {
    const { tokens } = useAppTheme();
    const insets = useSafeAreaInsets();
    const isSkillSheet = title === 'Skills';
    const [query, setQuery] = useState('');
    const normalizedQuery = query.trim().toLowerCase();
    const normalizedOptions = useMemo(() => options.map((option) => typeof option === 'string' ? { value: option, label: option, category: null, description: null, keywords: [] } : option), [options]);
    const filtered = normalizedOptions.filter((option) => [option.value, option.label, ...(option.keywords ?? [])].some((term) => term.toLowerCase().includes(normalizedQuery)));
    const hasSelectedValue = selectedValues.some((value) => value.toLowerCase() === normalizedQuery);
    const showAddOption = allowAdd && Boolean(normalizedQuery) && filtered.length === 0 && !hasSelectedValue;
    const displayedOptions = normalizedQuery ? filtered : isSkillSheet ? normalizedOptions.slice(0, 12) : normalizedOptions;

    useEffect(() => { if (!visible) setQuery(''); }, [visible]);

    return (
        <Modal animationType="none" onRequestClose={onClose} transparent visible={visible}>
            <View style={styles.modalRoot}>
                <Pressable accessibilityLabel="Dismiss selection sheet" onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: tokens.colors.overlay }]} />
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetKeyboard}>
                    <Animated.View entering={SlideInUp.duration(220).easing(EASE_OUT).reduceMotion(ReduceMotion.System)} style={[styles.sheet, isSkillSheet && styles.skillSheet, { backgroundColor: tokens.colors.surfaceStrong, borderColor: tokens.colors.borderStrong, paddingBottom: insets.bottom + 12 }]}>
                        <View style={styles.sheetHeader}><Text style={[styles.sheetTitle, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>{title}</Text><Pressable accessibilityLabel="Close selection sheet" hitSlop={12} onPress={onClose}><Text style={[styles.closeLabel, { color: tokens.colors.accent, fontFamily: tokens.typography.sans }]}>Done</Text></Pressable></View>
                        {searchable ? <View style={[styles.sheetSearch, { backgroundColor: tokens.colors.input, borderColor: tokens.colors.borderStrong, borderRadius: tokens.radius.md }]}><SymbolView name="magnifyingglass" size={15} tintColor={tokens.colors.textTertiary} type="monochrome" /><TextInput accessibilityLabel={allowAdd ? 'Search skills' : `Search ${title.toLowerCase()}`} autoCapitalize="none" autoCorrect={false} autoFocus={autoFocus && visible} onChangeText={setQuery} placeholder={allowAdd ? 'Search skills' : `Search ${title.toLowerCase()}`} placeholderTextColor={tokens.colors.textTertiary} style={[styles.sheetSearchInput, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]} value={query} />{query ? <Pressable accessibilityLabel="Clear search" hitSlop={8} onPress={() => setQuery('')}><SymbolView name="xmark.circle.fill" size={16} tintColor={tokens.colors.textTertiary} type="monochrome" /></Pressable> : null}</View> : null}
                        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={styles.sheetList}>{!normalizedQuery && isSkillSheet ? <Text style={[styles.sheetSectionLabel, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>Popular skills</Text> : normalizedQuery && displayedOptions.length ? <Text style={[styles.sheetSectionLabel, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>Results for “{query.trim()}”</Text> : null}{showAddOption ? <Animated.View entering={FadeInUp.duration(150).easing(EASE_OUT).reduceMotion(ReduceMotion.System)}><Pressable accessibilityLabel={`Add ${query.trim()} as a custom skill`} accessibilityRole="button" onPress={() => { onAdd?.(query.trim()); setQuery(''); }} style={[styles.selectionRow, { borderBottomColor: tokens.colors.divider, borderLeftColor: tokens.colors.accent }]}><View style={styles.selectionContent}><Text style={[styles.selectionLabel, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>Add “{query.trim()}” as a custom skill</Text><Text style={[styles.selectedMark, { color: tokens.colors.accent, fontFamily: tokens.typography.sans }]}>+</Text></View></Pressable></Animated.View> : null}{displayedOptions.map((option, index) => isSkillSheet ? <Animated.View key={option.value} entering={FadeInUp.duration(150).delay(Math.min(index, 5) * 20).easing(EASE_OUT).reduceMotion(ReduceMotion.System)}><Pressable accessibilityLabel={`${selectedValues.includes(option.value) ? 'Remove' : 'Add'} ${option.label}`} accessibilityRole="checkbox" accessibilityState={{ checked: selectedValues.includes(option.value) }} onPress={() => onToggle(option.value)} style={({ pressed }) => [styles.skillResultRow, { borderBottomColor: tokens.colors.divider, opacity: pressed ? 0.72 : 1 }]}><View style={styles.skillResultCopy}><Text style={[styles.skillResultLabel, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>{option.label}</Text>{option.category ? <Text style={[styles.skillResultCategory, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>{option.category.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())}</Text> : null}</View><Text style={[styles.skillResultAction, { color: selectedValues.includes(option.value) ? tokens.colors.accent : tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>{selectedValues.includes(option.value) ? '✓' : '+'}</Text></Pressable></Animated.View> : <SelectionRow key={option.value} accessibilityLabel={option.label} entryDelay={Math.min(index, 5) * 20} label={option.label} onPress={() => onToggle(option.value)} selected={selectedValues.includes(option.value)} />)}{displayedOptions.length === 0 && !showAddOption ? <Text style={[styles.emptyLabel, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>No matches</Text> : null}</ScrollView>
                    </Animated.View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

function RolePickerSheet({ visible, roleGroups, selectedRole, onSelect, onClose }: { visible: boolean; roleGroups: RoleGroup[]; selectedRole: string; onSelect: (role: string) => void; onClose: () => void }) {
    const { tokens } = useAppTheme();
    const insets = useSafeAreaInsets();
    const [query, setQuery] = useState('');
    const [activeGroupKey, setActiveGroupKey] = useState<string | null>(null);
    const [showDisciplines, setShowDisciplines] = useState(false);
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const allRoles = useMemo(() => Array.from(new Set(roleGroups.flatMap((group) => group.roles))), [roleGroups]);
    const activeGroup = roleGroups.find((group) => group.key === activeGroupKey) ?? null;
    const suggestedRoles = SUGGESTED_ROLE_ORDER.filter((role) => allRoles.includes(role));
    const searchResults = Array.from(new Set(roleGroups.flatMap((group) =>
        group.roles.filter((role) => matchesRoleSearch(role, group.label, normalizedQuery))
    )));

    useEffect(() => {
        if (!visible) {
            setQuery('');
            setActiveGroupKey(null);
            setShowDisciplines(false);
        }
    }, [visible]);

    function renderRole(role: string) {
        const selected = selectedRole === role;
        const description = getRoleDescription(role);

        return <Pressable key={role} accessibilityLabel={`Choose ${role}`} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => onSelect(role)} style={({ pressed }) => [styles.roleOption, { borderBottomColor: tokens.colors.divider, opacity: pressed ? 0.74 : 1 }]}>
            <SymbolView name={getRoleSymbol(role)} size={16} tintColor={selected ? tokens.colors.accent : tokens.colors.textTertiary} type="monochrome" />
            <View style={styles.roleOptionCopy}>
                <Text style={[styles.roleOptionLabel, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>{role}</Text>
                {description ? <Text style={[styles.roleOptionDescription, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>{description}</Text> : null}
            </View>
            {selected ? <Text style={[styles.selectedMark, { color: tokens.colors.accent, fontFamily: tokens.typography.sans }]}>✓</Text> : null}
        </Pressable>;
    }

    return <Modal animationType="none" onRequestClose={onClose} transparent visible={visible}>
        <View style={styles.modalRoot}>
            <Pressable accessibilityLabel="Dismiss role picker" onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: tokens.colors.overlay }]} />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetKeyboard}>
                <Animated.View entering={SlideInUp.duration(220).easing(EASE_OUT).reduceMotion(ReduceMotion.System)} style={[styles.sheet, styles.roleSheet, { backgroundColor: tokens.colors.surfaceStrong, borderColor: tokens.colors.borderStrong, paddingBottom: insets.bottom + 12 }]}>
                    <View style={[styles.sheetHandle, { backgroundColor: tokens.colors.borderStrong }]} />
                    <View style={styles.sheetHeader}><Text style={[styles.sheetTitle, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>All roles</Text><Pressable accessibilityLabel="Close role picker" hitSlop={12} onPress={onClose}><Text style={[styles.closeLabel, { color: tokens.colors.accent, fontFamily: tokens.typography.sans }]}>Done</Text></Pressable></View>
                    <View style={[styles.roleSearch, { backgroundColor: tokens.colors.surfaceMuted, borderRadius: tokens.radius.md }]}>
                        <SymbolView name="magnifyingglass" size={15} tintColor={tokens.colors.textTertiary} type="monochrome" />
                        <TextInput accessibilityLabel="Search roles" autoCapitalize="none" autoCorrect={false} onChangeText={(value) => { setQuery(value); setActiveGroupKey(null); setShowDisciplines(false); }} placeholder="Search roles" placeholderTextColor={tokens.colors.textTertiary} style={[styles.roleSearchInput, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]} value={query} />
                        {query ? <Pressable accessibilityLabel="Clear role search" hitSlop={8} onPress={() => setQuery('')}><SymbolView name="xmark.circle.fill" size={16} tintColor={tokens.colors.textTertiary} type="monochrome" /></Pressable> : null}
                    </View>
                    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={styles.sheetList}>
                        {normalizedQuery ? <>
                            <Text style={[styles.sheetSectionLabel, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>{searchResults.length ? `${searchResults.length} roles found` : 'No roles found'}</Text>
                            {searchResults.map(renderRole)}
                        </> : activeGroup ? <>
                            <Pressable accessibilityLabel="Browse all disciplines" onPress={() => { setActiveGroupKey(null); setShowDisciplines(true); }} style={styles.sheetBackLink}><Text style={[styles.sheetBackLabel, { color: tokens.colors.accent, fontFamily: tokens.typography.sans }]}>‹ All disciplines</Text></Pressable>
                            <Text style={[styles.sheetSectionLabel, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>{activeGroup.label}</Text>
                            {activeGroup.roles.map(renderRole)}
                        </> : showDisciplines ? <>
                            <Text style={[styles.sheetSectionLabel, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>Browse by discipline</Text>
                            {roleGroups.map((group) => <Pressable key={group.key} accessibilityLabel={`Browse ${group.label} roles`} accessibilityRole="button" onPress={() => setActiveGroupKey(group.key)} style={({ pressed }) => [styles.disciplineRow, { borderBottomColor: tokens.colors.divider, opacity: pressed ? 0.74 : 1 }]}><Text style={[styles.disciplineLabel, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>{group.label}</Text><Text style={[styles.disciplineChevron, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>›</Text></Pressable>)}
                        </> : <>
                            {suggestedRoles.length ? <View style={styles.sheetSection}><Text style={[styles.sheetSectionLabel, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>Suggested</Text>{suggestedRoles.map(renderRole)}</View> : null}
                            <Pressable accessibilityLabel="Browse by discipline" accessibilityRole="button" onPress={() => setShowDisciplines(true)} style={({ pressed }) => [styles.disciplineEntry, { borderColor: tokens.colors.borderStrong, opacity: pressed ? 0.74 : 1 }]}><Text style={[styles.disciplineEntryLabel, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>Browse by discipline</Text><Text style={[styles.disciplineChevron, { color: tokens.colors.accent, fontFamily: tokens.typography.sans }]}>›</Text></Pressable>
                        </>}
                    </ScrollView>
                </Animated.View>
            </KeyboardAvoidingView>
        </View>
    </Modal>;
}

export default function OnboardingScreen() {
    const { resume } = useLocalSearchParams<{ resume?: string }>();
    const allowManualOpen = resume === '1' || resume === 'true';
    const { needsUsername, refreshProfile } = useAuth();
    const { tokens } = useAppTheme();
    const insets = useSafeAreaInsets();
    const [bootstrap, setBootstrap] = useState<MobileCareerOnboardingBootstrap | null>(null);
    const [draft, setDraft] = useState<MobileCareerOnboardingData>(buildEmptyDraft());
    const [currentStep, setCurrentStep] = useState(0);
    const [stepDirection, setStepDirection] = useState<'forward' | 'backward'>('forward');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeInput, setActiveInput] = useState<string | null>(null);
    const [sheet, setSheet] = useState<SheetKind>(null);
    const [skillSelectionMessage, setSkillSelectionMessage] = useState<string | null>(null);
    const [goalSelectionMessage, setGoalSelectionMessage] = useState<string | null>(null);
    const [completionReady, setCompletionReady] = useState(false);
    const [username, setUsername] = useState('');
    const { normalizedUsername, refreshAvailability, state: usernameAvailability } = useUsernameAvailability(username);

    useEffect(() => {
        let cancelled = false;
        async function loadBootstrap() {
            setLoading(true);
            try {
                const nextBootstrap = await loadMobileCareerOnboardingBootstrap();
                if (cancelled) return;
                setBootstrap(nextBootstrap);
                setDraft(nextBootstrap.initialData ?? buildEmptyDraft());
                setError(null);
            } catch (nextError) {
                if (!cancelled) setError(nextError instanceof Error ? nextError.message : 'Unable to load onboarding');
            } finally { if (!cancelled) setLoading(false); }
        }
        void loadBootstrap();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (bootstrap?.status.onboarded && !allowManualOpen && !needsUsername) {
            router.replace('./(tabs)/discover');
        }
    }, [allowManualOpen, bootstrap?.status.onboarded, needsUsername]);

    useEffect(() => {
        const hasDraftedFields = Boolean(
            draft.step1_role.currentRole.trim() ||
            draft.step1_role.companyName?.trim() ||
            draft.step2_skills.primarySkills.length ||
            draft.step2_skills.skillsToLearn.length ||
            draft.step2_skills.interests.length ||
            draft.step3_goals.careerGoals.length
        );

        if (needsUsername || !bootstrap || bootstrap.status.onboarded || !hasDraftedFields) {
            return;
        }

        const timeout = setTimeout(() => {
            void saveMobileCareerOnboardingDraft(draft).catch(() => {
                // Progress remains in the current screen and will retry on the next edit.
            });
        }, 350);

        return () => clearTimeout(timeout);
    }, [bootstrap, draft, needsUsername]);

    const currentSkillSuggestions = useMemo(() => !bootstrap || !draft.step1_role.currentRole ? [] : bootstrap.taxonomy.roleSuggestions[draft.step1_role.currentRole]?.current ?? [], [bootstrap, draft.step1_role.currentRole]);
    const availableCurrentSkillSuggestions = useMemo(() => {
        const selectedSkills = new Set(draft.step2_skills.primarySkills.map((skill) => skill.trim().toLocaleLowerCase()));
        return currentSkillSuggestions.filter((skill) => !selectedSkills.has(skill.trim().toLocaleLowerCase()));
    }, [currentSkillSuggestions, draft.step2_skills.primarySkills]);
    const allSkillOptions = useMemo(() => {
        if (!bootstrap) return [];
        const optionsByValue = new Map(bootstrap.taxonomy.skillOptions.map((option) => [option.value, option]));
        currentSkillSuggestions.forEach((skill) => {
            if (!optionsByValue.has(skill)) optionsByValue.set(skill, { value: skill, label: skill, category: null, description: null, keywords: [] });
        });
        return [...optionsByValue.values()].sort((left, right) => {
            const leftRank = currentSkillSuggestions.indexOf(left.value);
            const rightRank = currentSkillSuggestions.indexOf(right.value);
            if (leftRank !== -1 || rightRank !== -1) return (leftRank === -1 ? Number.MAX_SAFE_INTEGER : leftRank) - (rightRank === -1 ? Number.MAX_SAFE_INTEGER : rightRank);
            return left.label.localeCompare(right.label);
        });
    }, [bootstrap, currentSkillSuggestions]);
    const topicOptions = useMemo(() => bootstrap?.taxonomy.interestOptions ?? [], [bootstrap]);
    const topicLabel = (value: string) => topicOptions.find((topic) => topic.value === value)?.label ?? value;

    function selectRole(role: string) {
        const nextDraft = {
            ...draft,
            step1_role: { ...draft.step1_role, currentRole: role },
        };
        setDraft(nextDraft);
        if (!bootstrap?.status.onboarded) {
            void saveMobileCareerOnboardingDraft(nextDraft).catch(() => {
                // The debounced draft save retries this if the first request fails.
            });
        }
        setSheet(null);
    }

    function toggleSkill(value: string) {
        const isSelected = draft.step2_skills.primarySkills.includes(value);
        if (isSelected && draft.step2_skills.primarySkills.length <= 2) {
            setSkillSelectionMessage('Keep at least 2 skills selected.');
            haptics.warning();
            return;
        }
        setSkillSelectionMessage(null);
        haptics.selection();
        setDraft((current) => ({ ...current, step2_skills: { ...current.step2_skills, primarySkills: toggleValue(current.step2_skills.primarySkills, value) } }));
    }

    function addSkill(value: string) {
        const trimmed = value.trim();
        if (!trimmed) return;
        setSkillSelectionMessage(null);
        haptics.selection();
        setDraft((current) => current.step2_skills.primarySkills.some((skill) => skill.toLowerCase() === trimmed.toLowerCase())
            ? current
            : { ...current, step2_skills: { ...current.step2_skills, primarySkills: [...current.step2_skills.primarySkills, trimmed] } });
    }

    function toggleGoal(value: (typeof GOAL_OPTIONS)[number]['value']) {
        const selectedGoals = draft.step3_goals.careerGoals;
        if (!selectedGoals.includes(value) && selectedGoals.length >= 2) {
            setGoalSelectionMessage('Remove a goal to choose another.');
            haptics.warning();
            return;
        }
        setGoalSelectionMessage(null);
        haptics.selection();
        setDraft((current) => ({ ...current, step3_goals: { ...current.step3_goals, careerGoals: toggleValue(current.step3_goals.careerGoals, value) } }));
    }

    async function handleSkip() {
        Alert.alert('Skip career setup?', 'You can finish your career profile later from the Profile tab.', [
            { text: 'Keep editing', style: 'cancel' },
            { text: 'Skip now', style: 'destructive', onPress: () => { void (async () => { setSubmitting(true); try { await skipMobileCareerOnboarding(); await refreshProfile(); router.replace('./(tabs)/discover'); } catch (nextError) { Alert.alert('Unable to skip', nextError instanceof Error ? nextError.message : 'Unable to skip onboarding'); } finally { setSubmitting(false); } })(); } },
        ]);
    }

    async function handleUsernameContinue() {
        if (usernameAvailability.kind !== 'available') return;

        setSubmitting(true);
        try {
            await updateMobileProfile({ username: normalizedUsername });
            await refreshProfile();
            if (bootstrap?.status.onboarded) {
                router.replace('./(tabs)/discover');
            }
        } catch (nextError) {
            refreshAvailability();
            Alert.alert(
                'Username unavailable',
                nextError instanceof Error
                    ? nextError.message
                    : 'Unable to save that username. Try another one.'
            );
        } finally {
            setSubmitting(false);
        }
    }

    async function handleContinue() {
        const stepError = getStepError(currentStep, draft);
        if (stepError) { Alert.alert('Complete this step', stepError); return; }
        if (currentStep < 3) {
            setSubmitting(true);
            try {
                await saveMobileCareerOnboardingDraft(draft);
                setStepDirection('forward');
                setCurrentStep((step) => step + 1);
            } catch (nextError) {
                Alert.alert('Unable to save progress', getSaveErrorMessage(nextError));
            } finally {
                setSubmitting(false);
            }
            return;
        }
        const incompleteStep = getFirstIncompleteStep(draft);
        if (incompleteStep !== null) {
            setStepDirection('backward');
            setCurrentStep(incompleteStep);
            Alert.alert('Complete your profile', getStepError(incompleteStep, draft) ?? 'Complete this step before saving.');
            return;
        }
        setSubmitting(true);
        try { await completeMobileCareerOnboarding(draft); await refreshProfile(); setCompletionReady(true); haptics.success(); await new Promise((resolve) => setTimeout(resolve, 450)); router.replace('./(tabs)/discover'); }
        catch (nextError) { Alert.alert('Unable to save profile', getSaveErrorMessage(nextError)); }
        finally { setSubmitting(false); }
    }

    if (loading || error || !bootstrap) {
        return <View style={[styles.screen, { backgroundColor: tokens.colors.shell, paddingTop: insets.top, paddingBottom: insets.bottom }]}><View style={styles.stateWrap}><ScreenStateView mode={loading ? 'loading' : 'error'} title={loading ? 'Preparing onboarding' : 'Onboarding unavailable'} description={loading ? 'Loading your career profile bootstrap and role suggestions.' : error ?? 'Unable to load mobile onboarding.'} onRetry={loading ? undefined : () => router.replace('./onboarding')} /></View></View>;
    }

    const stepLabel = needsUsername ? 'Username' : currentStep === 0 ? 'Role' : currentStep === 1 ? 'Work context' : currentStep === 2 ? 'Skills' : 'Goals';
    const currentStepError = needsUsername ? null : getStepError(currentStep, draft);
    const selectedRole = draft.step1_role.currentRole.trim();
    const primaryLabel = currentStep === 0 && selectedRole.length > 0 && selectedRole.length <= 20
        ? `Continue as ${selectedRole}`
        : currentStep === 3
            ? 'Complete setup'
            : 'Continue';
    const stepProgress = `${Math.round(((currentStep + 1) / 4) * 100)}%` as `${number}%`;

    return (
        <View style={[styles.screen, { backgroundColor: tokens.colors.shell }]}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
                <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: 112 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    <View style={styles.topLine}>{allowManualOpen && !needsUsername ? <Pressable accessibilityLabel="Back to settings" hitSlop={12} onPress={() => router.back()}><Text style={[styles.backGlyph, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>‹</Text></Pressable> : <View style={styles.headerSpacer} />}<View accessibilityLabel={needsUsername ? 'Choose a username' : `Step ${currentStep + 1} of 4, ${stepLabel}`} style={styles.progressTreatment}><Text style={[styles.progress, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>{needsUsername ? 'Profile address' : `Step ${currentStep + 1} of 4`}</Text>{!needsUsername ? <View style={[styles.progressTrack, { backgroundColor: tokens.colors.borderStrong }]}><View style={[styles.progressFill, { backgroundColor: tokens.colors.accent, width: stepProgress }]} /></View> : null}</View><View style={styles.headerSpacer} /></View>
                    <Animated.View key={needsUsername ? 'username' : currentStep} entering={(stepDirection === 'forward' ? FadeInRight : FadeInLeft).duration(320).easing(EASE_OUT).reduceMotion(ReduceMotion.System)} exiting={(stepDirection === 'forward' ? FadeOutLeft : FadeOutRight).duration(320).easing(EASE_IN).reduceMotion(ReduceMotion.System)} layout={STANDARD_LAYOUT} style={styles.stepContent}>
                        {needsUsername ? <View style={styles.zone}>
                            <Text style={[styles.question, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>Choose your username</Text>
                            <Text style={[styles.usernameDescription, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>This is the address people see when they open your profile.</Text>
                            <View style={[styles.usernameInputWrap, { backgroundColor: tokens.colors.input, borderColor: usernameAvailability.kind === 'available' ? tokens.colors.success : usernameAvailability.kind === 'invalid' || usernameAvailability.kind === 'unavailable' || usernameAvailability.kind === 'error' ? tokens.colors.danger : tokens.colors.borderStrong, borderRadius: tokens.radius.md }]}>
                                <Text style={[styles.usernamePrefix, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.mono }]}>@</Text>
                                <TextInput accessibilityLabel="Username" autoCapitalize="none" autoCorrect={false} maxLength={30} onChangeText={setUsername} placeholder="username" placeholderTextColor={tokens.colors.textTertiary} style={[styles.usernameInput, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]} value={username} />
                            </View>
                            {usernameAvailability.message ? <Text accessibilityLiveRegion="polite" style={[styles.usernameStatus, { color: usernameAvailability.kind === 'available' ? tokens.colors.success : usernameAvailability.kind === 'checking' ? tokens.colors.textTertiary : tokens.colors.danger, fontFamily: tokens.typography.sans }]}>{usernameAvailability.message}</Text> : <Text style={[styles.usernameStatus, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>Use 3–30 characters: letters, numbers, _ or -.</Text>}
                        </View> : null}
                        {!needsUsername && currentStep === 0 ? <View style={styles.zone}>
                            <Text style={[styles.eyebrow, { color: tokens.colors.accent, fontFamily: tokens.typography.sans }]}>Set up your workspace</Text>
                            <Text style={[styles.question, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>What best describes{`\n`}your work?</Text>
                            <Text style={[styles.stepDescription, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>We’ll tailor your experience around it.</Text>
                            <Pressable accessibilityLabel={selectedRole ? `Change role, currently ${selectedRole}` : 'Choose role'} accessibilityRole="button" onPress={() => setSheet('roles')} style={({ pressed }) => [styles.roleSelector, { backgroundColor: selectedRole ? tokens.colors.accentSoft : tokens.colors.surfaceStrong, borderColor: tokens.colors.borderStrong, borderRadius: tokens.radius.md, opacity: pressed ? 0.82 : 1 }]}>
                                <View style={[styles.roleIcon, { backgroundColor: selectedRole ? tokens.colors.surface : tokens.colors.surfaceMuted, borderColor: selectedRole ? tokens.colors.borderStrong : tokens.colors.borderStrong, borderRadius: tokens.radius.sm }]}><SymbolView name={getRoleSymbol(selectedRole || 'role')} size={16} tintColor={selectedRole ? tokens.colors.accent : tokens.colors.textTertiary} type="monochrome" /></View>
                                <Text numberOfLines={1} style={[styles.roleSelectorValue, { color: selectedRole ? tokens.colors.textPrimary : tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>{selectedRole || 'Choose your role'}</Text>
                                <Text accessibilityElementsHidden style={[styles.roleChevron, { color: selectedRole ? tokens.colors.accent : tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>›</Text>
                            </Pressable>
                            <Text style={[styles.roleReassurance, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>You can change this anytime.</Text>
                        </View> : null}

                        {!needsUsername && currentStep === 1 ? <View style={styles.zone}>
                            <Text style={[styles.question, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>Work context</Text>
                            <Text style={[styles.stepDescription, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>Help us personalize your recommendations.</Text>
                            <View style={styles.contextSection}>
                                <Text style={[styles.sectionEyebrow, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>Your experience</Text>
                                <Text style={[styles.fieldHeading, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>Career level</Text>
                                <Pressable accessibilityLabel={`Choose career level, currently ${formatSeniority(draft.step1_role.seniority)}`} accessibilityRole="button" onPress={() => setSheet('seniority')} style={[styles.fieldButton, { backgroundColor: tokens.colors.accentSoft, borderColor: tokens.colors.borderStrong, borderRadius: tokens.radius.md }]}><Text style={[styles.fieldValue, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>{formatSeniority(draft.step1_role.seniority)}</Text><Text accessibilityElementsHidden style={[styles.fieldChevron, { color: tokens.colors.accent, fontFamily: tokens.typography.sans }]}>›</Text></Pressable>
                            </View>
                            <View style={styles.contextSection}>
                                <Text style={[styles.sectionEyebrow, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>Optional personalization</Text>
                                <View style={styles.optionalFieldHeader}><Text style={[styles.fieldHeading, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>Company</Text><Text style={[styles.optionalLabel, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>Optional</Text></View>
                                <View style={[styles.companyInputWrap, { backgroundColor: tokens.colors.input, borderColor: activeInput === 'company' ? tokens.colors.accent : tokens.colors.borderStrong, borderRadius: tokens.radius.md }]}><SymbolView name="briefcase" size={15} tintColor={tokens.colors.textTertiary} type="monochrome" /><TextInput accessibilityLabel="Company, optional" autoCorrect={false} onBlur={() => setActiveInput(null)} onFocus={() => setActiveInput('company')} onChangeText={(companyName) => setDraft((current) => ({ ...current, step1_role: { ...current.step1_role, companyName } }))} placeholder="Enter a company name" placeholderTextColor={tokens.colors.textTertiary} style={[styles.companyInput, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]} value={draft.step1_role.companyName} /></View>
                                <View style={styles.topicsHeader}><View><View style={styles.optionalFieldHeader}><Text style={[styles.fieldHeading, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>Topics you follow</Text><Text style={[styles.optionalLabel, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>Optional</Text></View><Text style={[styles.topicHelper, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>Tailor the events and recommendations you see.</Text></View></View>
                                <Pressable accessibilityLabel="Add topics" accessibilityRole="button" onPress={() => setSheet('topics')} style={({ pressed }) => [styles.addTopicsButton, { borderColor: tokens.colors.borderStrong, borderRadius: tokens.radius.sm, opacity: pressed ? 0.76 : 1 }]}><Text style={[styles.addTopicsLabel, { color: tokens.colors.accent, fontFamily: tokens.typography.sans }]}>+ Add topics</Text></Pressable>
                                {draft.step2_skills.interests.length > 0 ? <View style={styles.chipRow}>{draft.step2_skills.interests.map((topic) => <ChoiceChip key={topic} accessibilityLabel={`Remove ${topicLabel(topic)} topic`} label={`${topicLabel(topic)} ×`} onPress={() => setDraft((current) => ({ ...current, step2_skills: { ...current.step2_skills, interests: toggleValue(current.step2_skills.interests, topic) } }))} selected />)}</View> : null}
                            </View>
                        </View> : null}

                        {!needsUsername && currentStep === 2 ? <View style={styles.skillZone}>
                            <View style={styles.skillIntro}><Text style={[styles.question, styles.skillQuestion, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>Skills you use</Text><Text style={[styles.skillDescription, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>Choose at least 2 to personalize what you see.</Text><Text style={[styles.countLabel, styles.skillCount, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>{draft.step2_skills.primarySkills.length} selected</Text></View>
                            <Pressable accessibilityLabel="Search skills" accessibilityRole="button" onPress={() => setSheet('skills')} style={({ pressed }) => [styles.searchButton, { borderColor: tokens.colors.borderStrong, borderRadius: tokens.radius.md, opacity: pressed ? 0.72 : 1 }]}><View style={styles.searchButtonCopy}><SymbolView name="magnifyingglass" size={15} tintColor={tokens.colors.textTertiary} type="monochrome" /><Text style={[styles.searchButtonLabel, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>Search skills</Text></View></Pressable>
                            {availableCurrentSkillSuggestions.length > 0 ? <View style={styles.skillSection}><Text style={[styles.skillSectionLabel, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>Suggested for {selectedRole}</Text><View style={styles.chipRow}>{availableCurrentSkillSuggestions.slice(0, 10).map((skill) => <SkillChip key={skill} skill={skill} onPress={() => toggleSkill(skill)} selected={false} />)}</View></View> : null}
                            <View style={styles.skillSection}><Text style={[styles.skillSectionLabel, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>Selected</Text>{draft.step2_skills.primarySkills.length > 0 ? <View style={styles.chipRow}>{draft.step2_skills.primarySkills.map((skill) => <SkillChip key={skill} skill={skill} onPress={() => toggleSkill(skill)} selected />)}</View> : <Text style={[styles.skillEmpty, { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans }]}>Add at least 2 skills to continue.</Text>}{skillSelectionMessage ? <Text accessibilityLiveRegion="polite" style={[styles.skillLimitMessage, { color: tokens.colors.danger, fontFamily: tokens.typography.sans }]}>{skillSelectionMessage}</Text> : null}</View>
                        </View> : null}

                        {!needsUsername && currentStep === 3 ? <View style={styles.goalZone}>
                            <View style={styles.goalIntro}><Text style={[styles.question, styles.goalQuestion, { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans }]}>What are you working toward?</Text><Text style={[styles.goalSupport, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>Choose 1–2 goals.</Text><Text style={[styles.goalStatus, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}>Selected {draft.step3_goals.careerGoals.length} of 2</Text></View>
                            <View style={styles.goalList}>{GOAL_OPTIONS.map((goal) => { const selected = draft.step3_goals.careerGoals.includes(goal.value); return <GoalCard key={goal.value} dimmed={!selected && draft.step3_goals.careerGoals.length >= 2} goal={goal} onPress={() => toggleGoal(goal.value)} selected={selected} />; })}</View>
                            {goalSelectionMessage ? <Text accessibilityLiveRegion="polite" style={[styles.goalLimitMessage, { color: tokens.colors.danger, fontFamily: tokens.typography.sans }]}>{goalSelectionMessage}</Text> : null}
                        </View> : null}
                    </Animated.View>
                </ScrollView>
                <View style={[styles.footer, { backgroundColor: tokens.colors.shellElevated, borderTopColor: tokens.colors.divider, paddingBottom: insets.bottom + 10 }]}>{needsUsername ? <View style={styles.usernameFooter}><OnboardingButton accessibilityLabel="Continue with selected username" disabled={submitting || usernameAvailability.kind !== 'available'} onPress={() => { void handleUsernameContinue(); }} variant="primary">{submitting ? 'Saving…' : 'Continue'}</OnboardingButton></View> : <><OnboardingButton accessibilityLabel={currentStep === 0 ? 'Skip onboarding for now' : 'Go to previous onboarding step'} onPress={() => { if (currentStep === 0) { void handleSkip(); } else { setStepDirection('backward'); setCurrentStep((step) => step - 1); } }} style={currentStep === 0 ? styles.skipButton : undefined} variant={currentStep === 0 ? 'tertiary' : 'secondary'}>{currentStep === 0 ? 'Skip' : 'Back'}</OnboardingButton><OnboardingButton accessibilityLabel={currentStep === 3 ? 'Complete career setup' : 'Continue to next onboarding step'} disabled={submitting || Boolean(currentStepError)} onPress={() => { void handleContinue(); }} style={styles.primaryButton} variant="primary">{completionReady ? 'Workspace ready' : submitting && currentStep === 3 ? 'Preparing your workspace…' : submitting ? 'Saving…' : primaryLabel}</OnboardingButton></>}</View>
            </KeyboardAvoidingView>
            <SelectionSheet allowAdd onAdd={addSkill} onClose={() => setSheet(null)} onToggle={toggleSkill} options={allSkillOptions} selectedValues={draft.step2_skills.primarySkills} title="Skills" visible={sheet === 'skills'} />
            <SelectionSheet autoFocus={false} onClose={() => setSheet(null)} onToggle={(topic) => setDraft((current) => ({ ...current, step2_skills: { ...current.step2_skills, interests: toggleValue(current.step2_skills.interests, topic) } }))} options={topicOptions} selectedValues={draft.step2_skills.interests} title="Topics" visible={sheet === 'topics'} />
            <RolePickerSheet onClose={() => setSheet(null)} onSelect={selectRole} roleGroups={bootstrap.taxonomy.roleGroups} selectedRole={draft.step1_role.currentRole} visible={sheet === 'roles'} />
            <SelectionSheet onClose={() => setSheet(null)} onToggle={(label) => { const seniority = CAREER_LEVELS.find((value) => formatSeniority(value) === label); if (seniority) setDraft((current) => ({ ...current, step1_role: { ...current.step1_role, seniority } })); setSheet(null); }} options={CAREER_LEVELS.map(formatSeniority)} searchable={false} selectedValues={[formatSeniority(draft.step1_role.seniority)]} title="Career level" visible={sheet === 'seniority'} />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1 },
    stateWrap: { flex: 1, justifyContent: 'center', padding: 20 },
    content: { gap: 16, paddingHorizontal: 20 },
    topLine: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 28 },
    headerSpacer: { width: 28 },
    backGlyph: { fontSize: 28, fontWeight: '400', lineHeight: 26 },
    progressTreatment: { alignItems: 'center', gap: 4 },
    progress: { fontSize: 12, fontWeight: '600', lineHeight: 16 },
    progressTrack: { height: 2, overflow: 'hidden', width: 72 },
    progressFill: { height: 2 },
    stepContent: { minHeight: 0 },
    zone: { gap: 12 },
    eyebrow: { fontSize: 11, fontWeight: '600', lineHeight: 16, marginBottom: -2 },
    question: { fontSize: 24, fontWeight: '600', letterSpacing: -0.24, lineHeight: 29 },
    usernameDescription: { fontSize: 14, lineHeight: 20, marginTop: -8 },
    usernameInputWrap: { borderWidth: 1, minHeight: 44, position: 'relative' },
    usernamePrefix: { fontSize: 16, left: 12, lineHeight: 20, position: 'absolute', top: 11, zIndex: 1 },
    usernameInput: { fontSize: 15, lineHeight: 20, minHeight: 42, paddingHorizontal: 12, paddingLeft: 31, paddingVertical: 9 },
    usernameStatus: { fontSize: 12, lineHeight: 17, marginTop: -8 },
    countLabel: { fontSize: 13, fontWeight: '400', lineHeight: 18, marginTop: -8 },
    stepDescription: { fontSize: 14, lineHeight: 20, marginTop: -8 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { borderWidth: 1, minHeight: 32, justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 6 },
    chipLabel: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
    skillChip: { alignItems: 'center', borderWidth: 1, flexDirection: 'row', gap: 6, minHeight: 32, paddingHorizontal: 10, paddingVertical: 6 },
    skillChipLabel: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
    skillChipAction: { fontSize: 15, fontWeight: '600', lineHeight: 18 },
    selectionRow: { borderBottomWidth: StyleSheet.hairlineWidth, borderLeftWidth: 2, minHeight: 40, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 8 },
    selectionContent: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
    selectionLabel: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 20 },
    selectedMark: { fontSize: 16, fontWeight: '600', lineHeight: 20, width: 20 },
    fieldButton: { borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 44, paddingHorizontal: 12, paddingVertical: 10 },
    contextSection: { gap: 8, marginTop: 4 },
    sectionEyebrow: { fontSize: 11, fontWeight: '600', letterSpacing: 0.44, lineHeight: 16, textTransform: 'uppercase' },
    fieldHeading: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
    optionalFieldHeader: { alignItems: 'center', flexDirection: 'row', gap: 8 },
    optionalLabel: { fontSize: 11, fontWeight: '400', lineHeight: 16 },
    fieldValue: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
    fieldChevron: { fontSize: 22, lineHeight: 20 },
    companyInputWrap: { alignItems: 'center', borderWidth: 1, flexDirection: 'row', minHeight: 42, paddingLeft: 12 },
    companyInput: { flex: 1, fontSize: 14, lineHeight: 20, minHeight: 40, paddingHorizontal: 10, paddingVertical: 9 },
    topicsHeader: { gap: 4 },
    topicHelper: { fontSize: 12, lineHeight: 16 },
    addTopicsButton: { alignSelf: 'flex-start', borderWidth: 1, justifyContent: 'center', minHeight: 32, paddingHorizontal: 10 },
    addTopicsLabel: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
    roleSelector: { alignItems: 'center', borderWidth: 1, flexDirection: 'row', minHeight: 60, paddingHorizontal: 12 },
    roleIcon: { alignItems: 'center', borderWidth: 1, height: 28, justifyContent: 'center', width: 28 },
    roleSelectorValue: { flex: 1, fontSize: 15, fontWeight: '600', lineHeight: 20, marginLeft: 12 },
    roleChevron: { fontSize: 26, fontWeight: '400', lineHeight: 26, marginLeft: 12 },
    roleReassurance: { fontSize: 12, lineHeight: 16, marginTop: -2 },
    skillZone: { gap: 20 },
    skillIntro: { gap: 5 },
    skillQuestion: { fontSize: 22, lineHeight: 27 },
    skillDescription: { fontSize: 14, lineHeight: 20 },
    skillCount: { marginTop: 2 },
    skillSection: { gap: 10 },
    skillSectionLabel: { fontSize: 12, fontWeight: '600', lineHeight: 16 },
    skillEmpty: { fontSize: 13, lineHeight: 18 },
    skillLimitMessage: { fontSize: 12, fontWeight: '600', lineHeight: 17 },
    goalZone: { gap: 16 },
    goalIntro: { gap: 6 },
    goalQuestion: { fontSize: 22, lineHeight: 27 },
    goalSupport: { fontSize: 14, lineHeight: 20 },
    goalStatus: { fontSize: 12, fontWeight: '600', lineHeight: 16, marginTop: 2 },
    goalList: { gap: 8 },
    goalCard: { alignItems: 'center', borderWidth: 1, flexDirection: 'row', gap: 10, minHeight: 64, paddingHorizontal: 10, paddingVertical: 9 },
    goalIcon: { alignItems: 'center', height: 30, justifyContent: 'center', width: 24 },
    goalCopy: { flex: 1, gap: 1 },
    goalTitle: { fontSize: 14, fontWeight: '600', lineHeight: 19 },
    goalDescription: { fontSize: 12, lineHeight: 16 },
    goalCheck: { alignItems: 'center', borderRadius: 10, borderWidth: 1, height: 20, justifyContent: 'center', width: 20 },
    goalLimitMessage: { fontSize: 12, fontWeight: '600', lineHeight: 17 },
    searchButton: { alignItems: 'center', borderWidth: 1, flexDirection: 'row', minHeight: 44, paddingHorizontal: 12 },
    searchButtonCopy: { alignItems: 'center', flexDirection: 'row', gap: 9 },
    searchButtonLabel: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
    footer: { borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 10 },
    usernameFooter: { flex: 1 },
    button: { alignItems: 'center', borderWidth: 1, justifyContent: 'center', minHeight: 36, paddingHorizontal: 14 },
    skipButton: { minWidth: 56 },
    primaryButton: { flex: 1 },
    buttonLabel: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
    buttonDisabled: { opacity: 0.45 },
    modalRoot: { flex: 1, justifyContent: 'flex-end' },
    sheetKeyboard: { justifyContent: 'flex-end' },
    sheet: { borderTopLeftRadius: 6, borderTopRightRadius: 6, borderWidth: 1, gap: 12, maxHeight: '82%', paddingHorizontal: 20, paddingTop: 16 },
    skillSheet: { height: '92%', maxHeight: '92%' },
    roleSheet: { height: '72%' },
    sheetHandle: { alignSelf: 'center', borderRadius: 2, height: 3, marginBottom: -2, width: 32 },
    sheetHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
    sheetTitle: { fontSize: 18, fontWeight: '600', lineHeight: 24 },
    closeLabel: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
    sheetSearch: { alignItems: 'center', borderWidth: 1, flexDirection: 'row', minHeight: 42, paddingHorizontal: 12 },
    sheetSearchInput: { flex: 1, fontSize: 14, lineHeight: 20, minHeight: 40, paddingHorizontal: 9, paddingVertical: 9 },
    roleSearch: { alignItems: 'center', flexDirection: 'row', minHeight: 42, paddingHorizontal: 12 },
    roleSearchInput: { flex: 1, fontSize: 14, lineHeight: 20, minHeight: 42, paddingHorizontal: 10, paddingVertical: 9 },
    sheetList: { flex: 1 },
    sheetSection: { marginBottom: 14 },
    sheetSectionLabel: { fontSize: 12, fontWeight: '600', lineHeight: 16, paddingBottom: 6, paddingTop: 10 },
    skillResultRow: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', minHeight: 52, paddingHorizontal: 4, paddingVertical: 8 },
    skillResultCopy: { flex: 1, gap: 2 },
    skillResultLabel: { fontSize: 14, fontWeight: '600', lineHeight: 19 },
    skillResultCategory: { fontSize: 11, lineHeight: 15 },
    skillResultAction: { fontSize: 17, fontWeight: '600', lineHeight: 20, textAlign: 'center', width: 24 },
    roleOption: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', minHeight: 48, paddingHorizontal: 4, paddingVertical: 8 },
    roleOptionCopy: { flex: 1, marginLeft: 10 },
    roleOptionLabel: { fontSize: 14, fontWeight: '600', lineHeight: 19 },
    roleOptionDescription: { fontSize: 12, lineHeight: 16, marginTop: 1 },
    disciplineRow: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', minHeight: 42, paddingHorizontal: 4 },
    disciplineLabel: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 20 },
    disciplineEntry: { alignItems: 'center', borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 44, paddingHorizontal: 12 },
    disciplineEntryLabel: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
    disciplineChevron: { fontSize: 22, lineHeight: 22 },
    sheetBackLink: { alignSelf: 'flex-start', minHeight: 28, justifyContent: 'center', marginTop: 2 },
    sheetBackLabel: { fontSize: 12, fontWeight: '600', lineHeight: 16 },
    emptyLabel: { fontSize: 13, lineHeight: 18, paddingVertical: 16, textAlign: 'center' },
});
