import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
    return StyleSheet.create({
        header: {
            paddingHorizontal: Spacing["2xl"],
            paddingTop: Spacing["2xl"],
            paddingBottom: Spacing.lg,
        },
        headerRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
        },
        headerSubtitle: {
            marginTop: Spacing.sm,
        },
        searchContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            marginHorizontal: Spacing["2xl"],
            paddingHorizontal: Spacing.lg,
            paddingVertical: Spacing.md,
            backgroundColor: theme.backgroundDefault,
            borderRadius: BorderRadius.lg,
            marginBottom: Spacing.lg,
            gap: Spacing.md,
        },
        searchInput: {
            flex: 1,
            fontSize: 16,
            color: theme.textPrimary,
        },
        listContent: {
            paddingHorizontal: Spacing["2xl"],
            paddingBottom: Spacing["5xl"],
        },
        itemCard: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: Spacing.lg,
            backgroundColor: theme.backgroundDefault,
            borderRadius: BorderRadius.lg,
            marginBottom: Spacing.md,
            gap: Spacing.lg,
        },
        itemInfo: {
            flex: 1,
        },
        itemHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.sm,
        },
        locationText: {
            marginTop: 2,
        },
        categoryTag: {
            marginLeft: 'auto',
            backgroundColor: theme.primary,
            paddingHorizontal: Spacing.sm,
            paddingVertical: 2,
            borderRadius: BorderRadius.sm,
        },
        itemSummary: {
            marginTop: Spacing.sm,
            lineHeight: 20,
        },
        emptyContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingVertical: Spacing["6xl"],
        },
        emptyText: {
            marginTop: Spacing.lg,
        },
        loadingMore: {
            paddingVertical: Spacing.lg,
            alignItems: 'center',
        },
    });
};
