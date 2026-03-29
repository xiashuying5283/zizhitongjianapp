import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.lg,
    },
    scrollContent: {
      flexGrow: 1,
      padding: Spacing.lg,
    },
    header: {
      padding: Spacing.xl,
      borderRadius: BorderRadius.lg,
      marginBottom: Spacing.md,
      backgroundColor: theme.backgroundDefault,
      alignItems: 'center',
    },
    dynastyBadge: {
      marginTop: Spacing.sm,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
      backgroundColor: theme.primary + '20',
      borderRadius: BorderRadius.sm,
    },
    section: {
      padding: Spacing.xl,
      borderRadius: BorderRadius.lg,
      marginBottom: Spacing.md,
      backgroundColor: theme.backgroundDefault,
    },
    sectionTitle: {
      marginBottom: Spacing.md,
      textTransform: 'uppercase',
    },
    infoRow: {
      flexDirection: 'row',
      marginBottom: Spacing.sm,
    },
    infoLabel: {
      width: 80,
      flexShrink: 0,
    },
    description: {
      lineHeight: 24,
    },
  });
};
