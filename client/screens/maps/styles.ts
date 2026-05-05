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
      marginBottom: isClassic ? Spacing.md : Spacing.lg,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: isClassic ? 'center' : 'flex-start',
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
      backgroundColor: isClassic ? theme.backgroundSecondary : theme.info,
      borderWidth: 1,
      borderColor: theme.border,
    },
    section: {
      marginBottom: isClassic ? Spacing.md : Spacing.lg,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.sm,
    },
    heroCard: {
      height: isClassic ? 172 : 204,
      borderRadius: isClassic ? BorderRadius.md : BorderRadius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: Spacing.sm,
      justifyContent: 'space-between',
      padding: isClassic ? Spacing.md : Spacing.lg,
    },
    heroBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
      borderRadius: BorderRadius.full,
      backgroundColor: 'rgba(255,255,255,0.74)',
    },
    heroMap: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    },
    heroCaption: {
      alignSelf: 'stretch',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: Spacing.md,
      padding: Spacing.md,
      borderRadius: isClassic ? BorderRadius.md : BorderRadius.lg,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.52)',
      backgroundColor: 'rgba(255, 250, 241, 0.82)',
    },
    heroCaptionMeta: {
      marginTop: Spacing.xs,
    },
    listGroup: {
      gap: Spacing.sm,
      marginBottom: Spacing.lg,
    },
    listItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      padding: isClassic ? Spacing.sm : Spacing.md,
      borderRadius: isClassic ? BorderRadius.md : BorderRadius.lg,
      backgroundColor: isClassic ? theme.backgroundDefault : theme.backgroundOverlay,
      borderWidth: 1,
      borderColor: theme.border,
    },
    listStamp: {
      width: 30,
      height: 30,
      borderRadius: BorderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.infoSoft,
    },
    listContent: {
      flex: 1,
      gap: 2,
    },
    eventCard: {
      padding: isClassic ? Spacing.sm : Spacing.md,
      borderRadius: isClassic ? BorderRadius.md : BorderRadius.lg,
      backgroundColor: isClassic ? theme.backgroundDefault : theme.backgroundOverlay,
      borderWidth: 1,
      borderColor: theme.border,
      gap: Spacing.sm,
    },
    eventMeta: {
      flexDirection: 'row',
      justifyContent: isClassic ? 'flex-start' : 'space-between',
      columnGap: isClassic ? Spacing.sm : 0,
      alignItems: 'center',
      gap: Spacing.md,
    },
    layerWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: Spacing.sm,
    },
    layerItem: {
      width: isClassic ? '100%' : '48.5%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      padding: isClassic ? Spacing.sm : Spacing.md,
      borderRadius: isClassic ? BorderRadius.md : BorderRadius.lg,
      backgroundColor: isClassic ? theme.backgroundDefault : theme.backgroundOverlay,
      borderWidth: 1,
      borderColor: theme.border,
    },
    layerIcon: {
      width: 32,
      height: 32,
      borderRadius: BorderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.backgroundTertiary,
    },
    layerText: {
      flex: 1,
    },
  });
};
