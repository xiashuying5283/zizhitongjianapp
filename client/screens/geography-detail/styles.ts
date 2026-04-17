import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
    return StyleSheet.create({
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: Spacing.lg,
            paddingVertical: Spacing.md,
            backgroundColor: theme.backgroundRoot,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.border,
        },
        backButton: {
            width: 40,
            height: 40,
            justifyContent: 'center',
            alignItems: 'center',
        },
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
        scrollContent: {
            padding: Spacing.lg,
            paddingBottom: 48,
        },
        mainCard: {
            backgroundColor: theme.backgroundDefault,
            borderRadius: BorderRadius.xl,
            padding: Spacing.xl,
            alignItems: 'center',
            shadowColor: theme.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
            elevation: 4,
        },
        categoryBadge: {
            position: 'absolute',
            top: Spacing.md,
            right: Spacing.md,
            paddingHorizontal: Spacing.md,
            paddingVertical: 4,
            borderRadius: BorderRadius.sm,
        },
        nameText: {
            marginTop: Spacing.sm,
            marginBottom: Spacing.xs,
        },
        levelTag: {
            paddingHorizontal: Spacing.md,
            paddingVertical: 2,
            borderRadius: BorderRadius.full,
            backgroundColor: theme.accent + '15',
            marginBottom: Spacing.md,
        },
        metaSection: {
            width: '100%',
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: theme.border,
            paddingTop: Spacing.md,
            marginTop: Spacing.sm,
            gap: Spacing.sm,
        },
        metaRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
        },
        aliasesContainer: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: Spacing.xs,
            justifyContent: 'flex-end',
            flex: 1,
            marginLeft: Spacing.md,
        },
        aliasTag: {
            paddingHorizontal: Spacing.sm,
            paddingVertical: 2,
            borderRadius: BorderRadius.sm,
            backgroundColor: theme.backgroundTertiary,
        },
        descCard: {
            backgroundColor: theme.backgroundDefault,
            borderRadius: BorderRadius.xl,
            padding: Spacing.xl,
            marginTop: Spacing.md,
            shadowColor: theme.primary,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 2,
        },
        cardTitle: {
            marginBottom: Spacing.md,
        },
        descText: {
            lineHeight: 24,
        },
    });
};
