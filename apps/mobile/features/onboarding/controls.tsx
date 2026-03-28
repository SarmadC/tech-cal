import { useState } from 'react';
import { FontAwesome } from '@expo/vector-icons';
import { Pressable, Text, TextInput, View } from 'react-native';
import type { OnboardingTaxonomyOption } from '@kurecal/domain';
import { STEP_COUNT } from '@/features/onboarding/constants';
import { taxonomyLabel } from '@/features/onboarding/model';
import { styles } from '@/features/onboarding/styles';
import type { AppThemeTokens } from '@/theme/tokens';

interface TokensProp {
  tokens: AppThemeTokens;
}

export function StepProgress({
  currentStep,
  title,
  tokens,
}: TokensProp & { currentStep: number; title: string }) {
  return (
    <View style={styles.progressBlock}>
      <Text
        style={[
          styles.stepLabel,
          { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans },
        ]}
      >
        {`Step ${currentStep} \u2014 ${title}`}
      </Text>
      <View
        style={[
          styles.progressTrack,
          {
            backgroundColor: tokens.colors.border,
            borderRadius: tokens.radius.pill,
          },
        ]}
      >
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: tokens.colors.accent,
              borderRadius: tokens.radius.pill,
              width: `${(currentStep / STEP_COUNT) * 100}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

export function SectionTitle({
  title,
  subtitle,
  tokens,
}: TokensProp & { title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionTitleBlock}>
      <Text
        style={[
          styles.sectionTitle,
          { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans },
        ]}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={[
            styles.sectionSubtitle,
            { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans },
          ]}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

function FieldLabel({
  label,
  required = false,
  tokens,
}: TokensProp & { label: string; required?: boolean }) {
  return (
    <Text
      style={[styles.fieldLabel, { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans }]}
    >
      {label}
      {required ? <Text style={{ color: tokens.colors.accent }}> *</Text> : null}
    </Text>
  );
}

function InputField({
  value,
  onChangeText,
  placeholder,
  tokens,
  multiline = false,
  onSubmitEditing,
  compact = false,
}: TokensProp & {
  value: string;
  onChangeText: (next: string) => void;
  placeholder: string;
  multiline?: boolean;
  onSubmitEditing?: () => void;
  compact?: boolean;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      multiline={multiline}
      onSubmitEditing={onSubmitEditing}
      placeholder={placeholder}
      placeholderTextColor={tokens.colors.textTertiary}
      style={[
        styles.input,
        {
          color: tokens.colors.textPrimary,
          backgroundColor: tokens.colors.input,
          borderColor: tokens.colors.border,
          borderRadius: tokens.radius.sm,
          fontFamily: tokens.typography.sans,
        },
        compact && styles.compactInput,
        multiline && styles.multilineInput,
      ]}
    />
  );
}

function SkillSuggestionRow({
  label,
  onPress,
  tokens,
}: TokensProp & { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.skillSuggestionRow,
        {
          backgroundColor: pressed ? tokens.colors.surface : 'transparent',
          borderTopColor: tokens.colors.border,
          borderRadius: 10,
          opacity: 1,
        },
      ]}
    >
      <Text
        style={[
          styles.skillSuggestionLabel,
          { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans },
        ]}
      >
        {label}
      </Text>
      <FontAwesome name="plus" size={10} color={tokens.colors.textTertiary} />
    </Pressable>
  );
}

function PillButton({
  label,
  selected,
  onPress,
  tokens,
  subtle = false,
}: TokensProp & { label: string; selected: boolean; onPress: () => void; subtle?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        {
          borderColor: selected ? tokens.colors.accent : tokens.colors.borderStrong,
          backgroundColor: selected
            ? tokens.colors.accent
            : subtle
              ? tokens.colors.surface
              : 'transparent',
          borderRadius: tokens.radius.pill,
          opacity: pressed ? 0.86 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.pillLabel,
          {
            color: selected ? tokens.colors.textInverse : tokens.colors.textPrimary,
            fontFamily: tokens.typography.sans,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function RoleChoiceRow({
  label,
  selected,
  onPress,
  tokens,
}: TokensProp & { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.roleChoiceRow,
        {
          transform: [{ scale: pressed ? 0.992 : 1 }],
          opacity: pressed ? 0.97 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.selectionCheckbox,
          {
            borderColor: selected ? 'rgba(116, 164, 235, 0.96)' : tokens.colors.borderStrong,
            backgroundColor: selected ? 'rgba(116, 164, 235, 0.92)' : 'transparent',
          },
        ]}
      >
        {selected ? (
          <Text
            style={[
              styles.selectionCheckboxCheck,
              { color: '#F7FAFF', fontFamily: tokens.typography.sans },
            ]}
          >
            ✓
          </Text>
        ) : null}
      </View>
      <Text
        style={[
          styles.roleChoiceLabel,
          {
            color: tokens.colors.textPrimary,
            fontFamily: tokens.typography.sans,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function SeniorityChoiceRow({
  label,
  description,
  selected,
  onPress,
  tokens,
}: TokensProp & { label: string; description: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.seniorityChoiceRow,
        {
          opacity: pressed ? 0.96 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.selectionCheckbox,
          {
            borderColor: selected ? 'rgba(116, 164, 235, 0.96)' : tokens.colors.borderStrong,
            backgroundColor: selected ? 'rgba(116, 164, 235, 0.92)' : 'transparent',
          },
        ]}
      >
        {selected ? (
          <Text
            style={[
              styles.selectionCheckboxCheck,
              { color: '#F7FAFF', fontFamily: tokens.typography.sans },
            ]}
          >
            ✓
          </Text>
        ) : null}
      </View>
      <View style={styles.seniorityChoiceCopy}>
        <Text
          style={[
            styles.seniorityChoiceLabel,
            {
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {label}
        </Text>
        {selected && description ? (
          <Text
            style={[
              styles.seniorityChoiceDescription,
              {
                color: tokens.colors.textSecondary,
                fontFamily: tokens.typography.sans,
              },
            ]}
          >
            {description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export function FocusChoiceCard({
  label,
  selected,
  onPress,
  tokens,
  testID,
}: TokensProp & { label: string; selected: boolean; onPress: () => void; testID?: string }) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.seniorityChoiceRow,
        {
          opacity: pressed ? 0.96 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.selectionCheckbox,
          {
            borderColor: selected ? 'rgba(116, 164, 235, 0.96)' : tokens.colors.borderStrong,
            backgroundColor: selected ? 'rgba(116, 164, 235, 0.92)' : 'transparent',
          },
        ]}
      >
        {selected ? (
          <Text
            style={[
              styles.selectionCheckboxCheck,
              { color: '#F7FAFF', fontFamily: tokens.typography.sans },
            ]}
          >
            ✓
          </Text>
        ) : null}
      </View>
      <View style={styles.seniorityChoiceCopy}>
        <Text
          style={[
            styles.seniorityChoiceLabel,
            {
              color: tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

export function PreferenceTile({
  label,
  selected,
  onPress,
  tokens,
}: TokensProp & { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.preferenceTile,
        {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          opacity: pressed ? 0.95 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.selectionCheckbox,
          {
            borderColor: selected ? 'rgba(116, 164, 235, 0.96)' : tokens.colors.borderStrong,
            backgroundColor: selected ? 'rgba(116, 164, 235, 0.92)' : 'transparent',
          },
        ]}
      >
        {selected ? (
          <Text
            style={[
              styles.selectionCheckboxCheck,
              { color: '#F7FAFF', fontFamily: tokens.typography.sans },
            ]}
          >
            ✓
          </Text>
        ) : null}
      </View>
      <View style={styles.preferenceTileCopy}>
        <Text
          style={[
            styles.preferenceTileLabel,
            {
              color: selected ? '#F7FAFF' : tokens.colors.textPrimary,
              fontFamily: tokens.typography.sans,
            },
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function SelectedTagChip({
  label,
  onPress,
  tokens,
}: TokensProp & { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.selectedTagChip,
        {
          backgroundColor: tokens.colors.surface,
          borderColor: tokens.colors.borderStrong,
          borderRadius: tokens.radius.pill,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.selectedTagLabel,
          { color: tokens.colors.textPrimary, fontFamily: tokens.typography.sans },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.selectedTagRemove,
          { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans },
        ]}
      >
        ×
      </Text>
    </Pressable>
  );
}

export function TagInput({
  title,
  description,
  selectedValues,
  options,
  suggestedValues,
  inputPlaceholder,
  onAdd,
  onRemove,
  tokens,
  showLabel = true,
  suggestedLabel = 'Suggested',
  showSelectedValues = true,
  selectedLabel = 'Selected',
  compactInput = true,
}: TokensProp & {
  title: string;
  description: string;
  selectedValues: string[];
  options: OnboardingTaxonomyOption[];
  suggestedValues?: string[];
  inputPlaceholder: string;
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  showLabel?: boolean;
  suggestedLabel?: string;
  showSelectedValues?: boolean;
  selectedLabel?: string;
  compactInput?: boolean;
}) {
  const [draftValue, setDraftValue] = useState('');
  const visibleSuggestedValues = (suggestedValues ?? []).filter((value) => !selectedValues.includes(value));

  function commitDraftValue() {
    if (!draftValue.trim()) {
      return;
    }
    onAdd(draftValue.trim());
    setDraftValue('');
  }

  return (
    <View style={styles.fieldBlock}>
      {showLabel ? <FieldLabel label={title} tokens={tokens} /> : null}
      {description ? (
        <Text
          style={[
            styles.fieldHint,
            { color: tokens.colors.textSecondary, fontFamily: tokens.typography.sans },
          ]}
        >
          {description}
        </Text>
      ) : null}
      <View style={styles.inlineComposer}>
        <View style={styles.inlineComposerInput}>
          <InputField
            value={draftValue}
            onChangeText={setDraftValue}
            placeholder={inputPlaceholder}
            tokens={tokens}
            onSubmitEditing={commitDraftValue}
            compact={compactInput}
          />
        </View>
      </View>
      {showSelectedValues && selectedValues.length > 0 ? (
        <View style={styles.selectedValuesBlock}>
          <Text
            style={[
              styles.suggestionLabel,
              { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans },
            ]}
          >
            {selectedLabel}
          </Text>
          <View style={styles.pillWrap}>
            {selectedValues.map((value) => (
              <SelectedTagChip
                key={`${title}-selected-${value}`}
                label={taxonomyLabel(options, value)}
                onPress={() => onRemove(value)}
                tokens={tokens}
              />
            ))}
          </View>
        </View>
      ) : null}
      {visibleSuggestedValues.length > 0 ? (
        <View style={styles.suggestionsBlock}>
          <Text
            style={[
              styles.suggestionLabel,
              { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans },
            ]}
          >
            {suggestedLabel}
          </Text>
          <View style={styles.pillWrap}>
            {visibleSuggestedValues.map((value) => (
              <PillButton
                key={`${title}-${value}`}
                label={taxonomyLabel(options, value)}
                selected={false}
                onPress={() => onAdd(value)}
                tokens={tokens}
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function CurrentSkillsComposer({
  selectedValues,
  options,
  suggestedValues,
  onAdd,
  onRemove,
  tokens,
  placeholder = 'Search or add a skill to explore',
  selectedLabel = 'What you want to learn',
  suggestionsLabel = 'Suggested for your goals',
}: TokensProp & {
  selectedValues: string[];
  options: OnboardingTaxonomyOption[];
  suggestedValues?: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  placeholder?: string;
  selectedLabel?: string;
  suggestionsLabel?: string;
}) {
  const [draftValue, setDraftValue] = useState('');
  const normalizedQuery = draftValue.trim().toLowerCase();
  const suggestionPool = normalizedQuery
    ? options
        .map((option) => option.label)
        .filter((label) => label.toLowerCase().includes(normalizedQuery))
    : (suggestedValues ?? []).map((value) => taxonomyLabel(options, value));
  const visibleSuggestions = Array.from(new Set(suggestionPool))
    .filter((label) => !selectedValues.includes(label))
    .slice(0, 6);

  function commitDraftValue() {
    const normalized = draftValue.trim();
    if (!normalized) {
      return;
    }
    onAdd(normalized);
    setDraftValue('');
  }

  return (
    <View style={styles.fieldBlock}>
      <View
        style={[
          styles.searchInputShell,
          {
            backgroundColor: tokens.colors.input,
            borderColor: tokens.colors.borderStrong,
            borderRadius: 12,
          },
        ]}
      >
        <FontAwesome name="search" size={13} color={tokens.colors.textTertiary} />
        <View style={styles.searchInputField}>
          <InputField
            value={draftValue}
            onChangeText={setDraftValue}
            placeholder={placeholder}
            tokens={tokens}
            onSubmitEditing={commitDraftValue}
            compact
          />
        </View>
      </View>
      {selectedValues.length > 0 ? (
        <View style={styles.selectedValuesBlock}>
          <Text
            style={[
              styles.suggestionLabel,
              { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans },
            ]}
          >
            {selectedLabel}
          </Text>
          <View style={styles.pillWrap}>
            {selectedValues.map((value) => (
              <SelectedTagChip
                key={`current-skill-${value}`}
                label={value}
                onPress={() => onRemove(value)}
                tokens={tokens}
              />
            ))}
          </View>
        </View>
      ) : null}
      {visibleSuggestions.length > 0 ? (
        <View style={styles.suggestionsBlock}>
          <Text
            style={[
              styles.suggestionLabel,
              { color: tokens.colors.textTertiary, fontFamily: tokens.typography.sans },
            ]}
          >
            {normalizedQuery ? 'Matching topics' : suggestionsLabel}
          </Text>
          <View style={styles.skillSuggestionsList}>
            {visibleSuggestions.map((label) => (
              <SkillSuggestionRow
                key={`suggestion-${label}`}
                label={label}
                onPress={() => onAdd(label)}
                tokens={tokens}
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}
