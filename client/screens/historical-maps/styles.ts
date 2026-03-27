import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing['2xl'],
      paddingBottom: Spacing['5xl'],
    },
    header: {
      marginBottom: Spacing.xl,
    },
    title: {
      marginBottom: Spacing.xs,
    },
    subtitle: {
      lineHeight: 24,
    },
    sectionTitle: {
      marginBottom: Spacing.md,
    },
    mapCard: {
      marginBottom: Spacing.md,
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      backgroundColor: theme.backgroundDefault,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    mapCardCover: {
      width: '100%',
      height: 140,
      backgroundColor: theme.backgroundTertiary,
    },
    mapCardContent: {
      padding: Spacing.md,
    },
    mapCardTitle: {
      marginBottom: Spacing.xs,
    },
    mapCardMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      marginBottom: Spacing.sm,
    },
    mapCardMetaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    mapCardDescription: {
      lineHeight: 20,
    },
    mapCardTags: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.xs,
      marginTop: Spacing.sm,
    },
    tag: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.sm,
      backgroundColor: theme.backgroundTertiary,
    },
    comingSoon: {
      padding: Spacing.lg,
      borderRadius: BorderRadius.lg,
      backgroundColor: theme.backgroundTertiary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.md,
    },
  });
};
