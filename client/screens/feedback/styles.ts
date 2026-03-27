import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.md,
      paddingBottom: Spacing['5xl'],
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: BorderRadius.full,
      backgroundColor: theme.backgroundTertiary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    section: {
      marginBottom: Spacing.lg,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
    },
    sectionTitle: {
      marginBottom: Spacing.lg,
    },
    typeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -Spacing.sm,
    },
    typeItem: {
      width: '50%',
      paddingHorizontal: Spacing.sm,
      marginBottom: Spacing.md,
    },
    typeItemSelected: {
      // Selected state handled by children
    },
    typeIcon: {
      width: 48,
      height: 48,
      borderRadius: BorderRadius.lg,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: Spacing.sm,
    },
    inputContainer: {
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.lg,
      padding: Spacing.md,
    },
    contentInput: {
      minHeight: 150,
      fontSize: 15,
      color: theme.textPrimary,
      lineHeight: 24,
    },
    charCount: {
      alignItems: 'flex-end',
      marginTop: Spacing.sm,
    },
    contactInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.lg,
      paddingHorizontal: Spacing.md,
      height: 48,
    },
    inputIcon: {
      marginRight: Spacing.sm,
    },
    contactInput: {
      flex: 1,
      fontSize: 15,
      color: theme.textPrimary,
    },
    contactHint: {
      marginTop: Spacing.sm,
    },
    tipsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      marginBottom: Spacing.md,
    },
    tipsContent: {
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
    },
    submitButton: {
      backgroundColor: theme.primary,
      paddingVertical: Spacing.lg,
      borderRadius: BorderRadius.full,
      alignItems: 'center',
      marginVertical: Spacing.lg,
    },
    submitButtonDisabled: {
      opacity: 0.6,
    },
  });
};
