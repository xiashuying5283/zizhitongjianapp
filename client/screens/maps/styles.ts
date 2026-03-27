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
    },
    headerSubtitle: {
      marginTop: Spacing.sm,
    },
    section: {
      marginBottom: Spacing["3xl"],
    },
    sectionTitle: {
      marginBottom: Spacing.lg,
    },
    mapModeCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: Spacing.xl,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    mapModeInfo: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.lg,
    },
    mapModeIcon: {
      width: 48,
      height: 48,
      borderRadius: 0,
      backgroundColor: theme.backgroundTertiary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    mapModeDetails: {
      flex: 1,
    },
    eventCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingVertical: Spacing.xl,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    eventInfo: {
      flex: 1,
    },
    eventSubtitle: {
      marginTop: Spacing.xs,
    },
    eventDescription: {
      marginTop: Spacing.sm,
      lineHeight: 20,
    },
    layerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
      gap: Spacing.md,
    },
    layerText: {
      flex: 1,
    },
  });
};
