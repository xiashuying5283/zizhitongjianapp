import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: Spacing["2xl"],
      paddingTop: Spacing["2xl"],
      paddingBottom: Spacing["5xl"],
    },
    header: {
      marginBottom: Spacing.xl,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.sm,
    },
    backButton: {
      padding: Spacing.sm,
    },
    placeholder: {
      width: 40,
    },
    headerSubtitle: {
      marginTop: Spacing.xs,
    },
    sectionsContainer: {
      gap: Spacing.lg,
      marginBottom: Spacing["2xl"],
    },
    sectionCard: {
      flexDirection: 'row',
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      borderWidth: 1,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 2,
    },
    iconContainer: {
      width: 64,
      height: 64,
      borderRadius: BorderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: Spacing.lg,
    },
    contentContainer: {
      flex: 1,
      justifyContent: 'space-between',
    },
    sectionTitle: {
      marginBottom: Spacing.xs,
    },
    sectionDescription: {
      marginBottom: Spacing.md,
      lineHeight: 22,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    countBadge: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.sm,
      backgroundColor: theme.backgroundTertiary,
    },
    infoCard: {
      flexDirection: 'row',
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.md,
      padding: Spacing.lg,
      gap: Spacing.md,
    },
    infoIconContainer: {
      width: 40,
      height: 40,
      borderRadius: BorderRadius.full,
      backgroundColor: `${theme.primary}15`,
      justifyContent: 'center',
      alignItems: 'center',
    },
    infoContent: {
      flex: 1,
      justifyContent: 'center',
    },
    infoTitle: {
      marginBottom: Spacing.xs,
    },
  });
};
