import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: Spacing["2xl"],
      paddingBottom: Spacing["5xl"],
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.lg,
    },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    // App Info
    appInfo: {
      alignItems: 'center',
      paddingVertical: Spacing["3xl"],
    },
    appLogo: {
      width: 96,
      height: 96,
      borderRadius: BorderRadius.xl,
      justifyContent: 'center',
      alignItems: 'center',
    },
    // Section
    section: {
      marginBottom: Spacing["2xl"],
    },
    sectionTitle: {
      marginBottom: Spacing.lg,
    },
    paragraph: {
      lineHeight: 24,
      marginBottom: Spacing.md,
    },
    // Author
    authorCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.lg,
    },
    authorAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    authorInfo: {
      marginLeft: Spacing.lg,
    },
    // Features
    featureList: {
      gap: Spacing.md,
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      paddingVertical: Spacing.sm,
    },
    // Footer
    footer: {
      alignItems: 'center',
      paddingVertical: Spacing["2xl"],
    },
  });
};
