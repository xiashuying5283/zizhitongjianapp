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
      marginBottom: Spacing.lg,
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
    filterContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: Spacing.lg,
      gap: Spacing.sm,
    },
    filterChip: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.full,
      backgroundColor: theme.backgroundTertiary,
    },
    filterChipActive: {},
    mapsGrid: {
      gap: Spacing.lg,
    },
    mapCard: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 2,
    },
    mapImageContainer: {
      height: 180,
      position: 'relative',
    },
    mapImage: {
      width: '100%',
      height: '100%',
    },
    mapBadge: {
      position: 'absolute',
      top: Spacing.md,
      right: Spacing.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.sm,
    },
    mapContent: {
      padding: Spacing.lg,
    },
    mapHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.xs,
    },
    mapYears: {
      marginBottom: Spacing.sm,
    },
  });
};
