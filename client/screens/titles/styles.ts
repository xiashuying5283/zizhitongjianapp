import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    header: {
      paddingHorizontal: Spacing["2xl"],
      paddingTop: Spacing["2xl"],
      paddingBottom: Spacing.lg,
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
    eraContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: Spacing.lg,
      gap: Spacing.sm,
      paddingHorizontal: Spacing["2xl"],
    },
    eraChip: {
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.full,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
    },
    eraChipActive: {
      backgroundColor: theme.accent,
    },
    listContent: {
      paddingBottom: Spacing.xl,
      paddingHorizontal: Spacing["2xl"],
    },
    titleCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.md,
      padding: Spacing.lg,
      marginBottom: Spacing.md,
    },
    titleIcon: {
      width: 40,
      height: 40,
      borderRadius: BorderRadius.md,
      backgroundColor: `${theme.accent}15`,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: Spacing.md,
    },
    titleInfo: {
      flex: 1,
    },
    titleHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.xs,
    },
    eraBadge: {
      marginLeft: Spacing.sm,
    },
    aliasesText: {
      marginTop: Spacing.xs,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.xl * 2,
    },
    emptyText: {
      marginTop: Spacing.md,
    },
  });
};
