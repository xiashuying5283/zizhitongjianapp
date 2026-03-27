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
    
    // ==================== Header ====================
    header: {
      marginBottom: Spacing["3xl"],
    },
    
    // ==================== Recent Reading ====================
    recentReading: {
      marginBottom: Spacing.xl,
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      // 有色阴影
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    recentLabel: {
      marginBottom: Spacing.xs,
      letterSpacing: 1,
    },
    recentContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    recentInfo: {
      flex: 1,
      marginRight: Spacing.lg,
    },
    recentMeta: {
      marginTop: Spacing.xs,
    },
    continueButton: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      backgroundColor: theme.primary,
      borderRadius: BorderRadius.md,
    },
    
    // ==================== Stats Card ====================
    statsCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.lg,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
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
      height: 24,
      backgroundColor: theme.border,
      marginHorizontal: Spacing.sm,
    },
    
    // ==================== Search ====================
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.lg,
      marginBottom: Spacing.lg,
      gap: Spacing.sm,
      borderWidth: 1,
      borderColor: theme.border,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: theme.textPrimary,
    },
    
    // ==================== Search Results ====================
    searchResultsSection: {
      marginBottom: Spacing.lg,
    },
    searchResultHeader: {
      marginBottom: Spacing.sm,
    },
    searchResultsList: {
      gap: Spacing.sm,
    },
    searchResultItem: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      borderLeftWidth: 3,
      borderLeftColor: theme.primary,
    },
    resultHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.sm,
    },
    moreResultsButton: {
      paddingVertical: Spacing.md,
      alignItems: 'center',
    },
    
    // ==================== Filter Tags ====================
    filterSection: {
      marginBottom: Spacing.lg,
    },
    filterLabel: {
      marginBottom: Spacing.sm,
      letterSpacing: 1,
    },
    filterTagsContainer: {
      flexDirection: 'row',
      gap: Spacing.sm,
      paddingVertical: Spacing.xs,
    },
    filterTag: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: theme.border,
    },
    filterTagActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    
    // ==================== Groups ====================
    groupsContainer: {
      gap: Spacing.md,
    },
    groupContainer: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      // 有色阴影
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    groupHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    groupHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      flex: 1,
    },
    groupTitle: {
      // 无额外样式
    },
    groupStats: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    miniBadge: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: BorderRadius.xs,
    },
    groupContent: {
      // 无额外样式
    },
    
    // ==================== Volume Item ====================
    volumeItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.borderLight,
    },
    volumeIcon: {
      width: 32,
      height: 32,
      borderRadius: BorderRadius.sm,
      backgroundColor: theme.backgroundTertiary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: Spacing.md,
    },
    volumeInfo: {
      flex: 1,
    },
    volumeStatus: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    
    // ==================== Common ====================
    centerContainer: {
      paddingVertical: Spacing["4xl"],
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
};
