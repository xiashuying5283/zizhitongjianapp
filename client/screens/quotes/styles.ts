import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    header: {
      marginBottom: Spacing.lg,
      paddingHorizontal: Spacing["2xl"],
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    backButton: {
      padding: Spacing.sm,
    },
    headerSubtitle: {
      marginTop: Spacing.xs,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      marginBottom: Spacing.lg,
      marginHorizontal: Spacing["2xl"],
    },
    searchInput: {
      flex: 1,
      marginLeft: Spacing.sm,
      marginRight: Spacing.sm,
      fontSize: 16,
      color: theme.textPrimary,
    },
    categoryContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: Spacing.lg,
      gap: Spacing.sm,
      paddingHorizontal: Spacing["2xl"],
    },
    categoryChip: {
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.full,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
    },
    categoryChipActive: {
      backgroundColor: '#10B981',
    },
    scrollContent: {
      paddingBottom: Spacing.xl,
      paddingHorizontal: Spacing["2xl"],
    },
    quoteGroup: {
      marginBottom: Spacing.xl,
    },
    groupTitle: {
      marginBottom: Spacing.md,
    },
    quoteCard: {
      flexDirection: 'row',
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.md,
      padding: Spacing.lg,
      marginBottom: Spacing.md,
    },
    quoteIcon: {
      width: 40,
      height: 40,
      borderRadius: BorderRadius.md,
      backgroundColor: `${'#10B981'}15`,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: Spacing.md,
    },
    quoteContent: {
      flex: 1,
    },
    quoteText: {
      marginBottom: Spacing.sm,
      lineHeight: 28,
    },
    quoteMeta: {
      flexDirection: 'row',
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.xl * 3,
    },
    emptyText: {
      marginTop: Spacing.md,
    },
  });
};
