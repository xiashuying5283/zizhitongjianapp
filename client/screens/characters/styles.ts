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
      paddingHorizontal: Spacing["2xl"],
      paddingTop: Spacing["2xl"],
      paddingBottom: Spacing.lg,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    graphButton: {
      width: 44,
      height: 44,
      borderRadius: BorderRadius.lg,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerSubtitle: {
      marginTop: Spacing.sm,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: Spacing["2xl"],
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.lg,
      marginBottom: Spacing.lg,
      gap: Spacing.md,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: theme.textPrimary,
    },
    filterSection: {
      backgroundColor: theme.backgroundRoot,
      marginBottom: Spacing.md,
    },
    filterHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: Spacing["2xl"],
      paddingVertical: Spacing.sm,
    },
    filterHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    selectedEraTag: {
      backgroundColor: theme.primary,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: BorderRadius.sm,
    },
    eraContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: Spacing["2xl"],
      paddingBottom: Spacing.md,
      gap: Spacing.sm,
    },
    eraChip: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.full,
    },
    eraChipActive: {
      backgroundColor: theme.primary,
    },
    listContent: {
      paddingHorizontal: Spacing["2xl"],
      paddingBottom: Spacing["5xl"],
    },
    characterCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: Spacing.lg,
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.lg,
      marginBottom: Spacing.md,
      gap: Spacing.lg,
    },
    characterInfo: {
      flex: 1,
    },
    characterHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    eraTag: {
      marginLeft: 'auto',
      backgroundColor: theme.primary,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: BorderRadius.sm,
    },
    titleText: {
      marginTop: 2,
    },
    characterSubtitle: {
      marginTop: Spacing.xs,
    },
    characterSummary: {
      marginTop: Spacing.sm,
      lineHeight: 20,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: Spacing["6xl"],
    },
    emptyText: {
      marginTop: Spacing.lg,
    },
  });
};
