import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { appColors, radius, spacing, typography } from '@/theme/tokens';

export function PickerModal({
  visible,
  onCancel,
  onConfirm,
  confirmLabel,
  children
}: {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          {children}
          <View style={styles.modalActions}>
            <Pressable onPress={onCancel} style={styles.actionBtn}>
              <Text style={styles.actionText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={onConfirm} style={styles.actionBtn}>
              <Text style={styles.actionText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    padding: spacing.lg
  },
  modalCard: {
    backgroundColor: appColors.surface,
    borderRadius: radius.md,
    padding: spacing.md
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.sm
  },
  actionBtn: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  actionText: { color: appColors.primary, ...typography.bodyStrong }
});
