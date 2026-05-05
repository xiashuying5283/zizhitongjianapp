import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
    return StyleSheet.create({
        container: {
            flexGrow: 1,
            paddingBottom: Spacing.xl,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: Spacing.lg,
            paddingVertical: Spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: theme.borderLight,
        },
        backButton: {
            marginRight: Spacing.md,
            padding: Spacing.xs,
        },
        form: {
            paddingHorizontal: Spacing.lg,
            paddingTop: Spacing.lg,
        },
        inputGroup: {
            marginBottom: Spacing.lg,
        },
        label: {
            marginBottom: Spacing.xs,
        },
        input: {
            height: 48,
            borderRadius: BorderRadius.md,
            paddingHorizontal: Spacing.md,
            fontSize: 16,
            borderWidth: 1,
            borderColor: theme.borderLight,
        },
        textArea: {
            height: 100,
            paddingTop: Spacing.md,
            textAlignVertical: 'top',
        },
        hint: {
            marginTop: Spacing.xs,
        },
        actions: {
            paddingHorizontal: Spacing.lg,
            paddingTop: Spacing.xl,
        },
        submitButton: {
            height: 52,
            backgroundColor: theme.primary,
            borderRadius: BorderRadius.lg,
            alignItems: 'center',
            justifyContent: 'center',
        },
        submitButtonDisabled: {
            backgroundColor: theme.textMuted,
        },
    });
};
