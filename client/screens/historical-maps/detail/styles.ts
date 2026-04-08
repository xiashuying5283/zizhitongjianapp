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
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      marginBottom: Spacing.lg,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    backButton: {
      padding: Spacing.sm,
    },
    shareButton: {
      padding: Spacing.sm,
    },
    mapContainer: {
      height: 400,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      marginBottom: Spacing.lg,
    },
    mapImage: {
      width: '100%',
      height: '100%',
    },
    webView: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    infoContainer: {
      gap: Spacing.md,
    },
    titleSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
    },
    badge: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.sm,
    },
    years: {
      marginTop: Spacing.xs,
    },
    sectionTitle: {
      marginTop: Spacing.lg,
      marginBottom: Spacing.sm,
    },
    description: {
      lineHeight: 24,
    },
    details: {
      lineHeight: 24,
    },
  });
};
