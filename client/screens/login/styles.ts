import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.backgroundRoot,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing['3xl'],
      paddingBottom: Spacing['3xl'],
      justifyContent: 'center',
    },
    header: {
      alignItems: 'center',
      marginBottom: Spacing['3xl'],
    },
    title: {
      marginBottom: Spacing.sm,
    },
    subtitle: {
      textAlign: 'center',
    },
    form: {
      gap: Spacing.lg,
    },
    inputGroup: {
      gap: Spacing.xs,
    },
    label: {
      marginLeft: Spacing.xs,
    },
    input: {
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.lg,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      fontSize: 16,
      color: theme.textPrimary,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    inputFocused: {
      borderColor: theme.primary,
    },
    button: {
      backgroundColor: theme.primary,
      borderRadius: BorderRadius.lg,
      paddingVertical: Spacing.lg,
      alignItems: 'center',
      marginTop: Spacing.md,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: theme.buttonPrimaryText,
      fontSize: 16,
      fontWeight: '600',
    },
    switchMode: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: Spacing.xl,
      gap: Spacing.xs,
    },
    switchText: {
      color: theme.textSecondary,
    },
    switchLink: {
      color: theme.primary,
      fontWeight: '600',
    },
    errorText: {
      color: theme.error || '#DC2626',
      textAlign: 'center',
      marginTop: Spacing.sm,
    },
    forgotPassword: {
      alignItems: 'flex-end',
      marginTop: Spacing.sm,
    },
    forgotText: {
      color: theme.textMuted,
    },
  });
