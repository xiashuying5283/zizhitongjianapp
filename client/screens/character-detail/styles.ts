import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: Spacing["2xl"],
      paddingVertical: Spacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    graphButton: {
      width: 40,
      height: 40,
      borderRadius: BorderRadius.lg,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scrollContent: {
      flexGrow: 1,
      paddingBottom: Spacing["5xl"],
    },
    profileCard: {
      margin: Spacing["2xl"],
      padding: Spacing.xl,
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.xl,
      alignItems: 'center',
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: BorderRadius.full,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: Spacing.lg,
    },
    nameText: {
      marginBottom: Spacing.xs,
    },
    titleText: {
      marginBottom: Spacing.md,
    },
    metaContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: Spacing.lg,
      marginBottom: Spacing.lg,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    summaryText: {
      textAlign: 'center',
      lineHeight: 24,
    },
    section: {
      marginHorizontal: Spacing["2xl"],
      marginBottom: Spacing.xl,
    },
    sectionTitle: {
      marginBottom: Spacing.lg,
    },
    relationsContainer: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
    },
    relationItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Spacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    relationAvatar: {
      width: 36,
      height: 36,
      borderRadius: BorderRadius.full,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: Spacing.md,
    },
    relationInfo: {
      flex: 1,
    },
    relationTypeTag: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: BorderRadius.xs,
      marginRight: Spacing.sm,
    },
    eventsContainer: {
      paddingLeft: Spacing.sm,
    },
    eventItem: {
      flexDirection: 'row',
      marginBottom: Spacing.md,
    },
    eventTimeline: {
      width: 24,
      alignItems: 'center',
      marginRight: Spacing.md,
    },
    eventDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.primary,
      marginTop: 4,
    },
    eventLine: {
      width: 2,
      flex: 1,
      backgroundColor: theme.border,
      marginTop: Spacing.sm,
    },
    eventContent: {
      flex: 1,
      paddingBottom: Spacing.sm,
    },
  });
};
