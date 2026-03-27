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
      marginBottom: Spacing["3xl"],
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.lg,
      flex: 1,
    },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.backgroundTertiary,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    avatarImage: {
      width: 64,
      height: 64,
      borderRadius: 32,
    },
    avatarPlaceholder: {
      width: 64,
      height: 64,
      borderRadius: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    userDetails: {
      flex: 1,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    editIcon: {
      marginLeft: Spacing.xs,
    },
    authButton: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.full,
      borderWidth: 1,
      borderColor: theme.primary,
    },
    logoutButton: {
      borderColor: theme.error || '#DC2626',
    },
    section: {
      marginBottom: Spacing["3xl"],
    },
    sectionTitle: {
      marginBottom: Spacing.lg,
    },
    // Quick Actions
    quickActions: {
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    quickActionItem: {
      alignItems: 'center',
      gap: Spacing.sm,
    },
    quickActionIcon: {
      width: 56,
      height: 56,
      borderRadius: BorderRadius.lg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    // Settings
    settingItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: Spacing.xl,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    settingInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    // App Info
    appInfo: {
      alignItems: 'center',
      paddingVertical: Spacing.xl,
    },
    // VIP Card
    vipCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: '#FFD70015',
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing["3xl"],
      borderWidth: 1,
      borderColor: '#FFD70030',
    },
    vipContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      flex: 1,
    },
    vipIconContainer: {
      width: 48,
      height: 48,
      borderRadius: BorderRadius.full,
      backgroundColor: '#FFD70025',
      justifyContent: 'center',
      alignItems: 'center',
    },
    vipText: {
      flex: 1,
    },
    // Stats Card
    statsCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing['3xl'],
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    statsItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    statsText: {
      flex: 1,
    },
    statsDivider: {
      width: 1,
      height: 32,
      backgroundColor: theme.border,
      marginHorizontal: Spacing.sm,
    },
  });
};
