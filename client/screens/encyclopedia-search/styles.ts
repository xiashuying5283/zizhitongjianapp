import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.backgroundRoot,
        },
        searchContainer: {
            paddingHorizontal: Spacing.lg,
            paddingVertical: Spacing.md,
        },
        searchBox: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: Spacing.md,
            paddingVertical: Spacing.sm,
            borderRadius: BorderRadius.lg,
            borderWidth: 1,
            gap: Spacing.sm,
        },
        searchInput: {
            flex: 1,
            fontSize: 15,
            color: theme.textPrimary,
            paddingVertical: 4,
        },
        sectionHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: Spacing.lg,
            paddingTop: Spacing.md,
            paddingBottom: Spacing.sm,
        },
        sectionMore: {
            fontSize: 13,
            color: theme.primary,
        },
        resultCard: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.backgroundDefault,
            borderRadius: BorderRadius.lg,
            padding: Spacing.md,
            marginHorizontal: Spacing.lg,
            marginBottom: Spacing.sm,
            shadowColor: theme.primary,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 2,
        },
        resultIcon: {
            width: 40,
            height: 40,
            borderRadius: BorderRadius.md,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: Spacing.md,
        },
        resultContent: {
            flex: 1,
            gap: 2,
        },
        resultTitle: {
            fontSize: 15,
            fontWeight: '600',
            color: theme.textPrimary,
        },
        resultSubtitle: {
            fontSize: 13,
            color: theme.textSecondary,
        },
        tagChip: {
            paddingHorizontal: Spacing.sm,
            paddingVertical: 2,
            borderRadius: BorderRadius.sm,
            marginRight: Spacing.xs,
        },
        tagText: {
            fontSize: 11,
            fontWeight: '500',
        },
        emptyContainer: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: 80,
            paddingHorizontal: Spacing.xl,
        },
        emptyTitle: {
            fontSize: 18,
            fontWeight: '600',
            color: theme.textSecondary,
            marginTop: Spacing.md,
        },
        emptySubtitle: {
            fontSize: 14,
            color: theme.textMuted,
            marginTop: Spacing.xs,
            textAlign: 'center',
        },
        loadingContainer: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: 80,
        },
    });
};
