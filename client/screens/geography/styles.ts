import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
    return StyleSheet.create({
        header: {
            paddingHorizontal: Spacing.lg,
            paddingTop: Spacing.md,
            paddingBottom: Spacing.md,
            backgroundColor: theme.backgroundRoot,
        },
        headerRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        headerSubtitle: {
            marginTop: 2,
        },
        searchContainer: {
            paddingHorizontal: Spacing.lg,
            paddingVertical: Spacing.sm,
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
        listContent: {
            paddingHorizontal: Spacing.lg,
            paddingBottom: Spacing.xl,
        },
        itemCard: {
            backgroundColor: theme.backgroundDefault,
            borderRadius: BorderRadius.lg,
            padding: Spacing.md,
            marginBottom: Spacing.sm,
            shadowColor: theme.primary,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 2,
        },
        itemMain: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        itemLeft: {
            flex: 1,
            gap: 2,
        },
        itemRight: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.sm,
        },
        categoryTag: {
            paddingHorizontal: Spacing.sm,
            paddingVertical: 2,
            borderRadius: BorderRadius.sm,
        },
        itemDesc: {
            marginTop: Spacing.xs,
            lineHeight: 18,
        },
        loadingMore: {
            paddingVertical: Spacing.lg,
            alignItems: 'center',
        },
    });
};
