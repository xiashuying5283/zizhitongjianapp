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
    centerContainer: {
      paddingVertical: Spacing['4xl'],
      alignItems: 'center',
      justifyContent: 'center',
    },
    header: {
      marginBottom: isClassic ? Spacing.md : Spacing.lg,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: isClassic ? 'center' : 'flex-start',
      justifyContent: 'space-between',
      gap: Spacing.md,
    },
    headerText: {
      flex: 1,
    },
    headerSubtitle: {
      marginTop: Spacing.xs,
      lineHeight: 20,
    },
    seal: {
      width: isClassic ? 36 : 42,
      height: isClassic ? 36 : 42,
      borderRadius: isClassic ? BorderRadius.sm : BorderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isClassic ? theme.backgroundSecondary : theme.primary,
      borderWidth: 1,
      borderColor: theme.border,
    },
    recentReading: {
      borderRadius: isClassic ? BorderRadius.md : BorderRadius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      padding: isClassic ? Spacing.md : Spacing.lg,
      marginBottom: isClassic ? Spacing.md : Spacing.lg,
      overflow: 'hidden',
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isClassic ? 0.02 : 0.08,
      shadowRadius: isClassic ? 8 : 20,
      elevation: isClassic ? 1 : 4,
    },
    recentLabel: {
      alignSelf: 'flex-start',
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
      borderRadius: BorderRadius.full,
      backgroundColor: theme.backgroundOverlay,
      marginBottom: Spacing.sm,
    },
    recentContent: {
      flexDirection: isClassic ? 'column' : 'row',
      alignItems: isClassic ? 'flex-start' : 'center',
      justifyContent: 'space-between',
      gap: Spacing.md,
    },
    recentInfo: {
      flex: 1,
    },
    recentMeta: {
      marginTop: Spacing.xs,
      lineHeight: 18,
    },
    continueButton: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      borderRadius: isClassic ? BorderRadius.sm : BorderRadius.md,
      backgroundColor: isClassic ? theme.backgroundDefault : theme.primary,
      borderWidth: 1,
      borderColor: isClassic ? theme.primary : 'rgba(255,255,255,0.15)',
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
      backgroundColor: isClassic ? theme.backgroundDefault : theme.backgroundOverlay,
      borderRadius: isClassic ? BorderRadius.md : BorderRadius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: Spacing.md,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: theme.textPrimary,
    },
    searchResultsSection: {
      marginBottom: Spacing.md,
    },
    searchResultHeader: {
      marginBottom: Spacing.sm,
    },
    searchResultsList: {
      gap: Spacing.sm,
    },
    searchResultItem: {
      backgroundColor: isClassic ? theme.backgroundDefault : theme.backgroundOverlay,
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      padding: Spacing.lg,
      gap: Spacing.sm,
    },
    resultHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: Spacing.md,
    },
    moreResultsButton: {
      paddingVertical: Spacing.md,
      alignItems: 'center',
    },
    filterSection: {
      marginBottom: Spacing.md,
    },
    filterLabel: {
      marginBottom: Spacing.sm,
    },
    filterTagsContainer: {
      gap: Spacing.sm,
      paddingRight: Spacing.sm,
    },
    filterTag: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      backgroundColor: theme.backgroundOverlay,
      borderRadius: BorderRadius.full,
      borderWidth: 1,
      borderColor: theme.border,
    },
    filterTagActive: {
      backgroundColor: theme.accent,
      borderColor: theme.accent,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.sm,
    },
    groupsContainer: {
      gap: Spacing.sm,
    },
    groupContainer: {
      backgroundColor: isClassic ? theme.backgroundDefault : theme.backgroundOverlay,
      borderRadius: isClassic ? BorderRadius.md : BorderRadius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isClassic ? 0.01 : 0.04,
      shadowRadius: isClassic ? 4 : 12,
      elevation: isClassic ? 0 : 2,
    },
    groupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.sm,
      paddingHorizontal: isClassic ? Spacing.sm : Spacing.md,
      paddingVertical: isClassic ? Spacing.sm : Spacing.md,
    },
    groupHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      flex: 1,
    },
    groupStamp: {
      width: 30,
      height: 30,
      borderRadius: BorderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.accentSoft,
    },
    groupTitle: {
      marginBottom: 2,
    },
    groupStats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    miniBadge: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
      borderRadius: BorderRadius.full,
    },
    groupContent: {
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    volumeItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingHorizontal: isClassic ? Spacing.sm : Spacing.md,
      paddingVertical: isClassic ? Spacing.sm : Spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.borderLight,
    },
    volumeIcon: {
      width: 30,
      height: 30,
      borderRadius: BorderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.backgroundTertiary,
    },
    volumeInfo: {
      flex: 1,
    },
    volumeStatus: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
      borderRadius: BorderRadius.full,
    },
  });
};
