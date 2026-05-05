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
    eraTag: {
      position: 'absolute',
      top: Spacing.md,
      right: Spacing.md,
      backgroundColor: theme.primary,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: BorderRadius.sm,
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
    metaSection: {
      width: '100%',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.border,
      paddingTop: Spacing.md,
      marginTop: Spacing.sm,
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingVertical: Spacing.xs,
    },
    aliasesContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.xs,
      justifyContent: 'flex-end',
    },
    aliasTag: {
      backgroundColor: theme.backgroundTertiary,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: BorderRadius.sm,
    },
    // 生平纪事卡片
    biographyCard: {
      marginHorizontal: Spacing["2xl"],
      padding: Spacing.xl,
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.xl,
      marginBottom: Spacing.lg,
    },
    cardTitle: {
      marginBottom: Spacing.md,
    },
    summaryText: {
      lineHeight: 24,
    },
    // 人际网络卡片
    relationsCard: {
      marginHorizontal: Spacing["2xl"],
      padding: Spacing.xl,
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.xl,
      marginBottom: Spacing.lg,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    viewGraphBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    relationsList: {
      marginTop: Spacing.sm,
    },
    emptyRelations: {
      alignItems: 'center',
      paddingVertical: Spacing.xl,
    },
    relationItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    relationAvatar: {
      width: 40,
      height: 40,
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
    // 生平大事卡片
    eventsCard: {
      marginHorizontal: Spacing["2xl"],
      padding: Spacing.xl,
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.xl,
      marginBottom: Spacing.lg,
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
