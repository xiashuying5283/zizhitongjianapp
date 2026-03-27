import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.md,
      paddingBottom: Spacing['5xl'],
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: BorderRadius.full,
      backgroundColor: theme.backgroundTertiary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    vipHeader: {
      alignItems: 'center',
      paddingVertical: Spacing.xl,
    },
    vipIconContainer: {
      width: 80,
      height: 80,
      borderRadius: BorderRadius.full,
      backgroundColor: '#FFD70020',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    vipTitle: {
      marginBottom: Spacing.sm,
    },
    vipSubtitle: {
      textAlign: 'center',
    },
    section: {
      marginBottom: Spacing.lg,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
    },
    sectionTitle: {
      marginBottom: Spacing.lg,
    },
    benefitsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -Spacing.sm,
    },
    benefitItem: {
      width: '33%',
      paddingHorizontal: Spacing.sm,
      alignItems: 'center',
      marginBottom: Spacing.lg,
    },
    benefitIcon: {
      width: 48,
      height: 48,
      borderRadius: BorderRadius.full,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: Spacing.sm,
    },
    planCard: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.md,
      borderWidth: 2,
      borderColor: theme.border,
    },
    planCardSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primary + '05',
    },
    planCardRecommended: {
      borderColor: theme.primary,
    },
    recommendedTag: {
      position: 'absolute',
      top: -1,
      right: Spacing.lg,
      backgroundColor: theme.primary,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
      borderBottomLeftRadius: BorderRadius.sm,
      borderBottomRightRadius: BorderRadius.sm,
    },
    planHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: Spacing.md,
    },
    priceContainer: {
      alignItems: 'flex-end',
    },
    originalPrice: {
      textDecorationLine: 'line-through',
    },
    planFeatures: {
      gap: Spacing.sm,
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    planRadio: {
      position: 'absolute',
      top: Spacing.lg,
      right: Spacing.lg,
      width: 24,
      height: 24,
      borderRadius: BorderRadius.full,
      borderWidth: 2,
      justifyContent: 'center',
      alignItems: 'center',
    },
    subscribeButton: {
      backgroundColor: theme.primary,
      paddingVertical: Spacing.lg,
      borderRadius: BorderRadius.full,
      alignItems: 'center',
      marginVertical: Spacing.lg,
    },
    terms: {
      alignItems: 'center',
    },
    termsText: {
      textAlign: 'center',
      lineHeight: 20,
    },
  });
};
