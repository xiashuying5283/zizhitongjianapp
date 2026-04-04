import { StyleSheet } from 'react-native';
import { Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) =>
    StyleSheet.create({
        scrollContent: {
            flexGrow: 1,
        },
        container: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
        header: {
            padding: 16,
            paddingTop: 8,
        },
        headerRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        backButton: {
            padding: 8,
        },
        placeholder: {
            width: 36,
        },
        imageContainer: {
            width: '100%',
            height: 400,
            backgroundColor: theme.backgroundCard,
            justifyContent: 'center',
            alignItems: 'center',
        },
        mapImage: {
            width: '100%',
            height: '100%',
        },
        infoCard: {
            margin: 16,
            padding: 16,
            borderRadius: 12,
        },
        titleRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
        },
        badge: {
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 12,
        },
        description: {
            lineHeight: 24,
        },
        divider: {
            height: 1,
            backgroundColor: theme.border,
            marginVertical: 16,
        },
        statsRow: {
            flexDirection: 'row',
            justifyContent: 'flex-start',
        },
        statItem: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        sectionTitle: {
            marginBottom: 12,
        },
        fullscreenButton: {
            position: 'absolute',
            top: 12,
            right: 12,
            width: 40,
            height: 40,
            borderRadius: 20,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
        },
    });
