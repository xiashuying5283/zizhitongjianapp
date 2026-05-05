import { StyleSheet } from 'react-native';
import { BorderRadius, Spacing, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  const isClassic = false;

  return StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: isClassic ? Spacing.md : Spacing.lg,
      paddingTop: isClassic ? Spacing.md : Spacing.lg,
      paddingBottom: Spacing['5xl'],
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: isClassic ? 'center' : 'flex-start',
      gap: Spacing.sm,
      marginBottom: Spacing.md,
      padding: isClassic ? Spacing.md : Spacing.lg,
      borderRadius: isClassic ? BorderRadius.md : BorderRadius.lg,
      backgroundColor: isClassic ? theme.backgroundDefault : theme.backgroundOverlay,
      borderWidth: 1,
      borderColor: theme.border,
    },
    userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      flex: 1,
    },
    avatar: {
      width: isClassic ? 54 : 62,
      height: isClassic ? 54 : 62,
      borderRadius: BorderRadius.xl,
      backgroundColor: theme.primarySoft,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    avatarImage: {
      width: isClassic ? 54 : 62,
      height: isClassic ? 54 : 62,
      borderRadius: BorderRadius.xl,
    },
    avatarPlaceholder: {
      width: isClassic ? 54 : 62,
      height: isClassic ? 54 : 62,
      borderRadius: BorderRadius.xl,
      justifyContent: 'center',
      alignItems: 'center',
    },
    userDetails: {
      flex: 1,
      gap: 2,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    editIcon: {
      marginLeft: 2,
    },
    authButton: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.full,
      backgroundColor: isClassic ? theme.backgroundDefault : theme.backgroundSecondary,
      borderWidth: 1,
      borderColor: theme.primary,
    },
    logoutButton: {
      borderColor: theme.error,
    },
    statsCard: {
      flexDirection: 'row',
      borderRadius: isClassic ? BorderRadius.md : BorderRadius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: isClassic ? theme.backgroundDefault : theme.backgroundOverlay,
      marginBottom: Spacing.lg,
    },
    statsItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.lg,
      paddingHorizontal: Spacing.sm,
      gap: 4,
      backgroundColor: isClassic ? theme.backgroundSecondary : 'rgba(255,255,255,0.16)',
    },
    statsText: {
      alignItems: 'center',
    },
    statsDivider: {
      width: 1,
      backgroundColor: theme.border,
    },
    vipCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.sm,
      backgroundColor: isClassic ? theme.backgroundDefault : theme.backgroundOverlay,
      borderRadius: isClassic ? BorderRadius.md : BorderRadius.lg,
      padding: isClassic ? Spacing.md : Spacing.lg,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: Spacing.lg,
    },
    vipContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      flex: 1,
    },
    vipIconContainer: {
      width: 40,
      height: 40,
      borderRadius: BorderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.goldSoft,
    },
    vipText: {
      flex: 1,
    },
    section: {
      marginBottom: Spacing.lg,
    },
    sectionTitle: {
      marginBottom: Spacing.sm,
    },
    quickActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: isClassic ? 'flex-start' : 'space-between',
      columnGap: isClassic ? Spacing.sm : 0,
      rowGap: Spacing.sm,
    },
    quickActionItem: {
      width: isClassic ? '100%' : '48.5%',
      padding: Spacing.md,
      borderRadius: isClassic ? BorderRadius.md : BorderRadius.lg,
      backgroundColor: isClassic ? theme.backgroundDefault : theme.backgroundOverlay,
      borderWidth: 1,
      borderColor: theme.border,
      gap: Spacing.sm,
    },
    quickActionIcon: {
      width: 36,
      height: 36,
      borderRadius: BorderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      padding: Spacing.md,
      borderRadius: isClassic ? BorderRadius.md : BorderRadius.lg,
      backgroundColor: isClassic ? theme.backgroundDefault : theme.backgroundOverlay,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: Spacing.sm,
    },
    settingInfo: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    appInfo: {
      alignItems: 'center',
      paddingVertical: Spacing.lg,
    },
  });
};
