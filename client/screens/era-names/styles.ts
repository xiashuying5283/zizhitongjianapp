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
      gap: Spacing.md,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: theme.textPrimary,
    },
    dynastyContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: Spacing.lg,
      paddingHorizontal: Spacing["2xl"],
      gap: Spacing.sm,
    },
    dynastyChip: {
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.full,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
    },
    dynastyChipActive: {
      backgroundColor: '#EF4444',
    },
    listContent: {
      paddingHorizontal: Spacing["2xl"],
      paddingBottom: Spacing["5xl"],
    },
    eraGroup: {
      marginBottom: Spacing.xl,
    },
    groupTitle: {
      marginBottom: Spacing.md,
    },
    eraList: {
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
    },
    eraItem: {
      paddingVertical: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    eraHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.xs,
    },
    dynastyBadge: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: BorderRadius.full,
      backgroundColor: `${'#EF4444'}15`,
    },
    eraInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.xs,
    },
    yearConversion: {
      marginTop: Spacing.xs,
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
