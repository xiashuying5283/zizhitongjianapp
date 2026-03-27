import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingBottom: Spacing['3xl'],
    },
    header: {
      padding: Spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    backButton: {
      padding: Spacing.sm,
      marginRight: Spacing.sm,
    },
    headerTitle: {
      flex: 1,
    },
    headerMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    metaBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.backgroundTertiary,
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.sm,
      gap: Spacing.xs,
    },
    // Map Container
    mapContainer: {
      margin: Spacing.lg,
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      backgroundColor: theme.backgroundDefault,
      borderWidth: 1,
      borderColor: theme.border,
    },
    mapPlaceholder: {
      height: 300,
      backgroundColor: theme.backgroundTertiary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    // Timeline
    timelineSection: {
      padding: Spacing.lg,
    },
    timelineHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.md,
    },
    timelineScroll: {
      marginHorizontal: -Spacing.lg,
      paddingHorizontal: Spacing.lg,
    },
    timelineItem: {
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.md,
      marginRight: Spacing.sm,
      borderRadius: BorderRadius.md,
      backgroundColor: theme.backgroundDefault,
      borderWidth: 1,
      borderColor: theme.border,
      minWidth: 100,
      alignItems: 'center',
    },
    timelineItemActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    // Events List
    eventsSection: {
      padding: Spacing.lg,
    },
    eventCard: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.md,
      borderWidth: 1,
      borderColor: theme.border,
    },
    eventHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: Spacing.sm,
    },
    eventIcon: {
      width: 36,
      height: 36,
      borderRadius: BorderRadius.md,
      backgroundColor: theme.backgroundTertiary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: Spacing.md,
    },
    eventContent: {
      flex: 1,
    },
    eventTitle: {
      marginBottom: Spacing.xs,
    },
    eventMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    eventDescription: {
      marginTop: Spacing.sm,
      lineHeight: 22,
    },
    // Location markers
    markerLegend: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
      padding: Spacing.md,
      backgroundColor: theme.backgroundDefault,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    legendDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    // Stats
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      padding: Spacing.lg,
      backgroundColor: theme.backgroundTertiary,
      marginHorizontal: Spacing.lg,
      borderRadius: BorderRadius.lg,
      marginBottom: Spacing.lg,
    },
    statItem: {
      alignItems: 'center',
    },
    statValue: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.textPrimary,
    },
    statLabel: {
      fontSize: 12,
      color: theme.textMuted,
      marginTop: Spacing.xs,
    },
  });
};
