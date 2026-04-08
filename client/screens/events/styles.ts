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
    eraContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: Spacing.lg,
      paddingHorizontal: Spacing["2xl"],
      gap: Spacing.sm,
    },
    eraChip: {
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.full,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
    },
    eraChipActive: {
      backgroundColor: '#F59E0B',
    },
    listContent: {
      paddingHorizontal: Spacing["2xl"],
      paddingBottom: Spacing["5xl"],
    },
    eventGroup: {
      marginBottom: Spacing.xl,
    },
    groupTitle: {
      marginBottom: Spacing.md,
    },
    eventCard: {
      flexDirection: 'row',
      marginBottom: Spacing.md,
    },
    timelineConnector: {
      alignItems: 'center',
      width: 24,
    },
    timelineDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: '#F59E0B',
      borderWidth: 3,
      borderColor: theme.backgroundRoot,
    },
    timelineLine: {
      flex: 1,
      width: 2,
      backgroundColor: theme.border,
      marginTop: Spacing.xs,
    },
    eventContent: {
      flex: 1,
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      marginLeft: Spacing.sm,
    },
    eventHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.sm,
    },
    yearBadge: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: BorderRadius.full,
      backgroundColor: `${'#F59E0B'}15`,
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
