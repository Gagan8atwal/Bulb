// src/features/capture/CaptureInput.tsx
// The main capture UI component.
//
// Layout (top to bottom):
//   1. Multiline text field (autofocused)
//   2. Live transcript preview (when voice is active)
//   3. Type toggle: Task | Note
//   4. Project picker row
//   5. Bottom row: Mic button (push-to-talk) + Save button
//
// Critical UX invariant: the user's text is NEVER cleared on error.
// On a failed save, the error message appears inline and the text stays editable.

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useCapture, CaptureType, CaptureSource } from './useCapture';
import { usePushToTalk } from './usePushToTalk';
import { useProjects } from '../projects/useProjects';
import { Project } from '../../types/models';
import { colors } from '../../theme/colors';
import { spacing, typography, radius } from '../../theme/spacing';

interface Props {
  /** If launched from a Project Detail, pre-select that project */
  initialProjectId?: string | null;
  /** Called after a successful save */
  onSaved: () => void;
  /** Called when the user taps Cancel */
  onCancel: () => void;
  /** Called whenever text content changes — lets parent track dirty state */
  onTextChange?: (text: string) => void;
}

export function CaptureInput({ initialProjectId, onSaved, onCancel, onTextChange }: Props): React.ReactElement {
  const [text, setText] = useState('');
  const [type, setType] = useState<CaptureType>('task');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    initialProjectId ?? null
  );
  const [showProjectPicker, setShowProjectPicker] = useState(false);

  const { saving, error, save, clearError } = useCapture();
  const { projects } = useProjects();
  const {
    micState,
    transcript,
    partialTranscript,
    startListening,
    stopListening,
    clearTranscript,
    isAvailable: micAvailable,
  } = usePushToTalk();

  const inputRef = useRef<TextInput>(null);
  const captureSource = useRef<CaptureSource>('text');

  // Auto-focus the text field on mount
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(t);
  }, []);

  // When voice recognition returns a final transcript, fill the field
  useEffect(() => {
    if (transcript) {
      setText((prev) => {
        // Append if there's existing text, otherwise replace
        const trimmed = prev.trim();
        return trimmed ? `${trimmed} ${transcript}` : transcript;
      });
      clearTranscript();
    }
  }, [transcript, clearTranscript]);

  // Track whether last input was voice
  useEffect(() => {
    if (micState === 'listening' || micState === 'processing') {
      captureSource.current = 'voice';
    }
  }, [micState]);

  async function handleSave(): Promise<void> {
    const result = await save({
      text,
      type,
      source: captureSource.current,
      projectId: selectedProjectId,
    });
    if (result) {
      onSaved();
    }
    // If result is null, error is set in useCapture — keep text intact
  }

  function handleTextChange(value: string): void {
    captureSource.current = 'text';
    setText(value);
    onTextChange?.(value);
    if (error) clearError();
  }

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const liveText = micState === 'listening' ? partialTranscript : undefined;
  const canSave = text.trim().length > 0 && !saving;
  const isVoiceActive = micState === 'listening' || micState === 'processing';

  const maxLength = type === 'task' ? 280 : 5000;

  return (
    <View style={styles.container}>
      {/* ── Text field ─────────────────────────────────────────────────── */}
      <TextInput
        ref={inputRef}
        value={text}
        onChangeText={handleTextChange}
        placeholder={type === 'task' ? 'What do you need to do?' : 'What do you want to remember?'}
        placeholderTextColor={colors.textTertiary}
        multiline
        maxLength={maxLength}
        selectionColor={colors.accent}
        style={styles.textInput}
        textAlignVertical="top"
        returnKeyType="default"
        blurOnSubmit={false}
        accessibilityLabel="Capture text"
      />

      {/* ── Live voice preview ─────────────────────────────────────────── */}
      {isVoiceActive && (
        <View style={styles.voicePreview}>
          <View style={styles.voiceDot} />
          <Text style={styles.voicePreviewText} numberOfLines={2}>
            {micState === 'processing'
              ? 'Processing…'
              : partialTranscript || 'Listening…'}
          </Text>
        </View>
      )}

      {/* ── Error ──────────────────────────────────────────────────────── */}
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {/* ── Character count ────────────────────────────────────────────── */}
      <View style={styles.countRow}>
        <View />
        <Text style={[
          styles.countText,
          text.length > maxLength * 0.9 && styles.countWarn
        ]}>
          {text.length}/{maxLength}
        </Text>
      </View>

      {/* ── Type toggle ────────────────────────────────────────────────── */}
      <View style={styles.typeToggle}>
        <TypeToggleButton
          label="Task"
          active={type === 'task'}
          onPress={() => setType('task')}
        />
        <TypeToggleButton
          label="Note"
          active={type === 'note'}
          onPress={() => setType('note')}
        />
      </View>

      {/* ── Project picker ─────────────────────────────────────────────── */}
      <TouchableOpacity
        onPress={() => setShowProjectPicker(true)}
        style={styles.projectRow}
        accessibilityRole="button"
        accessibilityLabel={`Project: ${selectedProject?.name ?? 'Inbox'}`}
      >
        <Text style={styles.projectLabel}>Project</Text>
        <View style={styles.projectRight}>
          <Text style={styles.projectValue}>
            {selectedProject?.name ?? 'Inbox'}
          </Text>
          <Text style={styles.chevron}>›</Text>
        </View>
      </TouchableOpacity>

      {/* ── Bottom bar: mic + cancel + save ────────────────────────────── */}
      <View style={styles.bottomBar}>
        {/* Mic button — only shown if Voice is available */}
        {micAvailable && (
          <TouchableOpacity
            onPressIn={startListening}
            onPressOut={stopListening}
            style={[styles.micBtn, isVoiceActive && styles.micBtnActive]}
            accessibilityRole="button"
            accessibilityLabel={isVoiceActive ? 'Stop recording' : 'Hold to record'}
            accessibilityHint="Hold to dictate a task"
          >
            {micState === 'processing' ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Text style={[styles.micIcon, isVoiceActive && styles.micIconActive]}>
                🎤
              </Text>
            )}
          </TouchableOpacity>
        )}

        <View style={styles.bottomActions}>
          <TouchableOpacity
            onPress={onCancel}
            style={styles.cancelBtn}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSave}
            disabled={!canSave}
            style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Save"
            accessibilityState={{ disabled: !canSave }}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <Text style={styles.saveText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Project picker modal ────────────────────────────────────────── */}
      <ProjectPickerModal
        visible={showProjectPicker}
        projects={projects}
        selectedId={selectedProjectId}
        onSelect={(id) => {
          setSelectedProjectId(id);
          setShowProjectPicker(false);
        }}
        onClose={() => setShowProjectPicker(false)}
      />
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TypeToggleButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}): React.ReactElement {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.toggleBtn, active && styles.toggleBtnActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${label}${active ? ', selected' : ''}`}
    >
      <Text style={[styles.toggleLabel, active && styles.toggleLabelActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ProjectPickerModal({
  visible,
  projects,
  selectedId,
  onSelect,
  onClose,
}: {
  visible: boolean;
  projects: Project[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onClose: () => void;
}): React.ReactElement {
  const items: Array<{ id: string | null; name: string }> = [
    { id: null, name: 'Inbox (no project)' },
    ...projects.map((p) => ({ id: p.id, name: p.name })),
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.pickerOverlay}
        onPress={onClose}
        activeOpacity={1}
      />
      <View style={styles.pickerSheet}>
        <View style={styles.pickerHandle} />
        <Text style={styles.pickerTitle}>Choose project</Text>
        <FlatList
          data={items}
          keyExtractor={(item) => item.id ?? '__inbox__'}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => onSelect(item.id)}
              style={styles.pickerRow}
              accessibilityRole="button"
              accessibilityLabel={item.name}
              accessibilityState={{ selected: item.id === selectedId }}
            >
              <Text style={[
                styles.pickerRowText,
                item.id === selectedId && styles.pickerRowTextSelected,
              ]}>
                {item.name}
              </Text>
              {item.id === selectedId && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    fontSize: typography.size.lg,
    color: colors.textPrimary,
    padding: spacing.md,
    minHeight: 120,
    textAlignVertical: 'top',
    lineHeight: typography.size.lg * 1.45,
  },
  voicePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.md,
    gap: spacing.sm,
  },
  voiceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  voicePreviewText: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.accent,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: typography.size.sm,
    color: colors.destructive,
    paddingHorizontal: spacing.md,
  },
  countRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
  },
  countText: {
    fontSize: typography.size.xs,
    color: colors.textTertiary,
  },
  countWarn: {
    color: colors.warning,
  },
  typeToggle: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 3,
    gap: 3,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md - 2,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: colors.surfaceElevated,
  },
  toggleLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.textSecondary,
  },
  toggleLabelActive: {
    color: colors.textPrimary,
    fontWeight: typography.weight.semibold,
  },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginHorizontal: spacing.md,
  },
  projectLabel: {
    fontSize: typography.size.sm,
    color: colors.textSecondary,
    fontWeight: typography.weight.medium,
  },
  projectRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  projectValue: {
    fontSize: typography.size.sm,
    color: colors.textPrimary,
  },
  chevron: {
    fontSize: typography.size.md,
    color: colors.textTertiary,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  micBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  micBtnActive: {
    backgroundColor: colors.accentLight,
    borderColor: colors.accent,
  },
  micIcon: {
    fontSize: 22,
  },
  micIconActive: {
    // Tint achieved via container background
  },
  bottomActions: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelText: {
    fontSize: typography.size.base,
    color: colors.textSecondary,
    fontWeight: typography.weight.medium,
  },
  saveBtn: {
    flex: 1,
    height: 48,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.45,
  },
  saveText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.textInverse,
  },
  // Project picker modal
  pickerOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
  },
  pickerSheet: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: radius.lg + 4,
    borderTopRightRadius: radius.lg + 4,
    paddingBottom: spacing.xxl,
    maxHeight: '60%',
  },
  pickerHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  pickerTitle: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pickerRowText: {
    fontSize: typography.size.base,
    color: colors.textPrimary,
  },
  pickerRowTextSelected: {
    color: colors.accent,
    fontWeight: typography.weight.semibold,
  },
  checkmark: {
    fontSize: typography.size.md,
    color: colors.accent,
  },
});
