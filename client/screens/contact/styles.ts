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
    authorCard: {
      borderRadius: BorderRadius.lg,
      padding: Spacing.xl,
      alignItems: 'center',
      marginBottom: Spacing.lg,
    },
    authorAvatar: {
      width: 80,
      height: 80,
      borderRadius: BorderRadius.full,
      backgroundColor: theme.primary + '15',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: Spacing.lg,
    },
    authorName: {
      marginBottom: Spacing.md,
    },
    authorBio: {
      textAlign: 'center',
      lineHeight: 24,
    },
    section: {
      marginBottom: Spacing.lg,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
    },
    sectionTitle: {
      marginBottom: Spacing.lg,
    },
    contactItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    contactInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    contactIcon: {
      width: 40,
      height: 40,
      borderRadius: BorderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: Spacing.md,
    },
    contactText: {
      flex: 1,
    },
    contactAction: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.full,
      backgroundColor: theme.primary + '10',
    },
    teamItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.md,
    },
    teamAvatar: {
      width: 44,
      height: 44,
      borderRadius: BorderRadius.full,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: Spacing.md,
    },
    teamInfo: {
      flex: 1,
    },
    appreciationCard: {
      borderRadius: BorderRadius.lg,
      padding: Spacing.xl,
      alignItems: 'center',
      marginBottom: Spacing.lg,
      backgroundColor: theme.primary + '08',
    },
    appreciationIcon: {
      marginBottom: Spacing.md,
    },
    appreciationText: {
      textAlign: 'center',
      lineHeight: 24,
    },
    socialLinks: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: Spacing.lg,
      marginVertical: Spacing.xl,
    },
    socialButton: {
      width: 48,
      height: 48,
      borderRadius: BorderRadius.full,
      justifyContent: 'center',
      alignItems: 'center',
    },
    copyright: {
      alignItems: 'center',
      paddingBottom: Spacing.xl,
    },
  });
};
