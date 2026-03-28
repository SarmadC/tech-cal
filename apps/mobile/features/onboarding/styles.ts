import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingShell: {
    flex: 1,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 15,
  },
  welcomeBlock: {
    gap: 10,
  },
  welcomeEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
  },
  welcomeBody: {
    fontSize: 15,
    lineHeight: 22,
  },
  infoStack: {
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  compactStepLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  roleGroupPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    flex: 1,
  },
  roleGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roleGroupPill: {
    minHeight: 34,
    borderWidth: 1,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  roleGroupPillLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  roleGroupMore: {
    minHeight: 34,
    justifyContent: 'center',
  },
  roleGroupMoreLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  infoDot: {
    width: 8,
    height: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  headerBlock: {
    gap: 6,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  progressBlock: {
    gap: 8,
  },
  progressTrack: {
    width: '100%',
    height: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  sectionTitleBlock: {
    gap: 6,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 21,
  },
  fieldBlock: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  fieldHint: {
    fontSize: 13,
    lineHeight: 19,
  },
  inlineHint: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 4,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  compactInput: {
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: 0,
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  multilineInput: {
    minHeight: 92,
    textAlignVertical: 'top',
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    justifyContent: 'center',
  },
  pillLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  choiceStack: {
    gap: 8,
  },
  secondaryTextAction: {
    alignSelf: 'flex-start',
    minHeight: 24,
    justifyContent: 'center',
    marginTop: 2,
    paddingLeft: 13,
  },
  secondaryTextLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  choiceRow: {
    minHeight: 64,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  choiceCopy: {
    flex: 1,
    gap: 4,
  },
  choiceLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  choiceDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  choiceCheck: {
    width: 18,
    height: 18,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  roleChoiceRow: {
    minHeight: 42,
    paddingRight: 0,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roleChoiceLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 18,
  },
  seniorityChoiceRow: {
    minHeight: 52,
    paddingRight: 0,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  seniorityChoiceCopy: {
    flex: 1,
    gap: 1,
  },
  seniorityChoiceLabel: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 18,
  },
  seniorityChoiceDescription: {
    fontSize: 13,
    lineHeight: 17,
  },
  selectionCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionCheckboxCheck: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 12,
  },
  rolePayoffText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
    marginBottom: 2,
    paddingLeft: 13,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
  },
  inlineComposer: {
    gap: 10,
  },
  inlineComposerInput: {
    flex: 1,
  },
  selectedValuesBlock: {
    gap: 6,
    marginTop: 2,
  },
  selectedTagChip: {
    minHeight: 30,
    paddingLeft: 9,
    paddingRight: 7,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectedTagLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  selectedTagRemove: {
    fontSize: 10,
    fontWeight: '600',
  },
  searchInputShell: {
    minHeight: 42,
    paddingLeft: 12,
    paddingRight: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInputField: {
    flex: 1,
  },
  suggestionsBlock: {
    gap: 8,
    marginTop: 4,
  },
  skillSuggestionsList: {
    gap: 0,
  },
  skillSuggestionRow: {
    minHeight: 50,
    paddingHorizontal: 8,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    gap: 12,
  },
  skillSuggestionLabel: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 18,
  },
  suggestionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  focusChoiceCard: {
    minHeight: 54,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  checklistChoiceCopy: {
    flex: 1,
    gap: 2,
  },
  checklistChoiceLabel: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 18,
  },
  checklistChoiceDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  preferenceTileGrid: {
    flexDirection: 'column',
    gap: 6,
  },
  preferenceTile: {
    minHeight: 50,
    width: '100%',
    paddingHorizontal: 0,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  preferenceTileCopy: {
    flex: 1,
    gap: 2,
  },
  preferenceTileLabel: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 18,
  },
  preferenceTileDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  compactSegmentWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  compactSegmentButton: {
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 999,
    justifyContent: 'center',
  },
  compactSegmentLabel: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 14,
  },
  skillsOptionalStack: {
    gap: 2,
  },
  skillsOptionalRow: {
    minHeight: 46,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    gap: 12,
  },
  skillsOptionalCopy: {
    flex: 1,
    gap: 1,
  },
  skillsOptionalTitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 18,
  },
  skillsOptionalMeta: {
    fontSize: 12,
    lineHeight: 16,
  },
  skillsOptionalCta: {
    fontSize: 13,
    fontWeight: '600',
  },
  optionalToggle: {
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  optionalCopy: {
    flex: 1,
    gap: 4,
  },
  optionalTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  optionalBody: {
    fontSize: 13,
    lineHeight: 19,
  },
  optionalCta: {
    fontSize: 13,
    fontWeight: '700',
  },
  optionalStack: {
    gap: 12,
  },
  preferencePickerStack: {
    gap: 2,
  },
  preferencePickerRow: {
    minHeight: 46,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    gap: 12,
  },
  preferencePickerCopy: {
    flex: 1,
    gap: 2,
  },
  preferencePickerTitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 18,
  },
  preferencePickerMeta: {
    fontSize: 13,
    lineHeight: 18,
  },
  preferencePickerCta: {
    fontSize: 13,
    fontWeight: '600',
  },
  preferenceListStack: {
    gap: 4,
    paddingTop: 4,
    paddingBottom: 6,
  },
  preferenceListRow: {
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  preferenceListLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
  preferenceListCheck: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 13,
  },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingTop: 10,
    paddingHorizontal: 20,
    gap: 8,
  },
  actionButtons: {
    alignItems: 'stretch',
  },
  primaryAction: {
    width: '100%',
  },
  textAction: {
    minHeight: 30,
    justifyContent: 'center',
  },
  textActionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});
