import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
    return StyleSheet.create({
        scrollContent: {
            flexGrow: 1,
            paddingBottom: Spacing["5xl"],
        },
        container: {
            flex: 1,
        },
        // Header
        header: {
            paddingHorizontal: Spacing["2xl"],
            paddingTop: Spacing.xl,
            paddingBottom: Spacing.lg,
        },
        headerTitle: {
            marginBottom: Spacing.xs,
        },
        headerSubtitle: {
            opacity: 0.7,
        },
        // 话题选择区
        topicSection: {
            paddingHorizontal: Spacing["2xl"],
            marginBottom: Spacing.xl,
        },
        sectionTitle: {
            marginBottom: Spacing.md,
        },
        topicTagsContainer: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: Spacing.sm,
        },
        topicTag: {
            paddingHorizontal: Spacing.md,
            paddingVertical: Spacing.sm,
            borderRadius: BorderRadius.full,
            backgroundColor: theme.backgroundTertiary,
            borderWidth: 1,
            borderColor: theme.borderLight,
        },
        topicTagActive: {
            backgroundColor: theme.primary,
            borderColor: theme.primary,
        },
        topicTagText: {
            color: theme.textSecondary,
        },
        topicTagTextActive: {
            color: '#FFFFFF',
        },
        // 自定义话题输入
        customTopicContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: Spacing.md,
            gap: Spacing.sm,
        },
        customTopicInput: {
            flex: 1,
            height: 44,
            backgroundColor: theme.backgroundTertiary,
            borderRadius: BorderRadius.md,
            paddingHorizontal: Spacing.md,
            color: theme.textPrimary,
            borderWidth: 1,
            borderColor: theme.borderLight,
        },
        // 角色选择区
        characterSection: {
            paddingHorizontal: Spacing["2xl"],
            marginBottom: Spacing.xl,
        },
        characterCount: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: Spacing.md,
            gap: Spacing.sm,
        },
        characterGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: Spacing.sm,
        },
        // 已选中人物卡片（旧样式）
        characterCard: {
            width: '31%',
            paddingVertical: Spacing.md,
            paddingHorizontal: Spacing.sm,
            backgroundColor: theme.backgroundSecondary,
            borderRadius: BorderRadius.lg,
            alignItems: 'center',
            borderWidth: 2,
            borderColor: 'transparent',
        },
        characterCardSelected: {
            borderColor: theme.primary,
            backgroundColor: theme.primary + '10',
        },
        characterAvatar: {
            width: 48,
            height: 48,
            borderRadius: 24,
            marginBottom: Spacing.xs,
            backgroundColor: theme.backgroundTertiary,
        },
        characterName: {
            fontSize: 14,
            fontWeight: '600',
            color: theme.textPrimary,
            textAlign: 'center',
        },
        characterDynasty: {
            fontSize: 11,
            color: theme.textMuted,
            marginTop: 2,
        },
        // 新的人物选择卡片 - 更宽更大
        characterSelectGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: Spacing.sm,
        },
        characterSelectCard: {
            width: '48%',
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: Spacing.sm,
            paddingHorizontal: Spacing.md,
            backgroundColor: theme.backgroundSecondary,
            borderRadius: BorderRadius.md,
            borderWidth: 1,
            borderColor: theme.borderLight,
            marginBottom: Spacing.xs,
        },
        characterSelectCardActive: {
            borderColor: theme.primary,
            backgroundColor: theme.primary + '10',
        },
        characterSelectContent: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
        },
        characterSelectAvatar: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: theme.backgroundTertiary,
            marginRight: Spacing.sm,
        },
        characterSelectName: {
            flex: 1,
            fontSize: 15,
            fontWeight: '600',
        },
        characterSelectDynasty: {
            width: 50,
            textAlign: 'right',
        },
        checkMark: {
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: theme.primary,
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: Spacing.xs,
        },
        // 添加更多人物按钮
        addCharacterButton: {
            width: '31%',
            paddingVertical: Spacing.md,
            backgroundColor: theme.backgroundTertiary,
            borderRadius: BorderRadius.lg,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderStyle: 'dashed',
            borderColor: theme.borderLight,
        },
        // 创建角色按钮
        createCharacterButton: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: Spacing.md,
            marginTop: Spacing.md,
            backgroundColor: theme.backgroundTertiary,
            borderRadius: BorderRadius.md,
            borderWidth: 1,
            borderColor: theme.primary,
            borderStyle: 'dashed',
        },
        // 操作按钮区
        actionSection: {
            paddingHorizontal: Spacing["2xl"],
            marginBottom: Spacing.xl,
        },
        primaryButton: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.primary,
            paddingVertical: Spacing.md,
            borderRadius: BorderRadius.lg,
            gap: Spacing.sm,
        },
        primaryButtonDisabled: {
            backgroundColor: theme.textMuted,
        },
        primaryButtonText: {
            color: '#FFFFFF',
            fontSize: 16,
            fontWeight: '600',
        },
        // 聊天区域 - 微信风格
        chatSection: {
            flex: 1,
            backgroundColor: '#E8E8E8',
        },
        chatHeader: {
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            paddingVertical: Spacing.md,
            backgroundColor: theme.backgroundSecondary,
            borderBottomWidth: 1,
            borderBottomColor: theme.borderLight,
        },
        chatTitleText: {
            fontSize: 16,
            fontWeight: '600',
            color: theme.textPrimary,
        },
        messageList: {
            paddingHorizontal: Spacing.md,
            paddingVertical: Spacing.md,
        },
        // 微信消息气泡
        messageRow: {
            flexDirection: 'row',
            marginBottom: Spacing.md,
            alignItems: 'flex-start',
        },
        messageRowUser: {
            flexDirection: 'row-reverse',
        },
        // 头像
        avatar: {
            width: 44,
            height: 44,
            borderRadius: 4,
            backgroundColor: theme.backgroundTertiary,
        },
        avatarUser: {
            marginLeft: Spacing.sm,
        },
        avatarAI: {
            marginRight: Spacing.sm,
        },
        // 消息内容区域
        messageContentArea: {
            maxWidth: '70%',
        },
        // 用户名（AI消息显示）
        messageSenderName: {
            fontSize: 12,
            color: theme.textMuted,
            marginBottom: 4,
            marginLeft: Spacing.xs,
        },
        // 气泡
        bubble: {
            paddingHorizontal: Spacing.md,
            paddingVertical: Spacing.sm,
            borderRadius: BorderRadius.md,
            maxWidth: '100%',
        },
        bubbleAI: {
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 4,
        },
        bubbleUser: {
            backgroundColor: '#95EC69',
            borderTopRightRadius: 4,
        },
        messageText: {
            fontSize: 16,
            lineHeight: 22,
            color: theme.textPrimary,
        },
        messageTextUser: {
            color: '#1A1A1A',
        },
        // 空状态
        emptyState: {
            paddingVertical: Spacing.xl,
            alignItems: 'center',
            backgroundColor: theme.backgroundSecondary,
            borderRadius: BorderRadius.md,
        },
        emptyIcon: {
            fontSize: 48,
            marginBottom: Spacing.md,
        },
        emptyTitle: {
            fontSize: 18,
            fontWeight: '600',
            color: theme.textPrimary,
            marginBottom: Spacing.sm,
        },
        emptyText: {
            fontSize: 14,
            color: theme.textMuted,
            textAlign: 'center',
        },
        // 输入区域
        inputSection: {
            flexDirection: 'row',
            alignItems: 'flex-end',
            paddingHorizontal: Spacing.md,
            paddingVertical: Spacing.sm,
            paddingBottom: Spacing.xl,
            backgroundColor: '#F5F5F5',
            gap: Spacing.sm,
            borderTopWidth: 1,
            borderTopColor: '#D9D9D9',
        },
        textInput: {
            flex: 1,
            minHeight: 36,
            maxHeight: 100,
            backgroundColor: '#FFFFFF',
            borderRadius: BorderRadius.md,
            paddingHorizontal: Spacing.md,
            paddingVertical: Spacing.xs,
            color: theme.textPrimary,
            fontSize: 16,
            borderWidth: 1,
            borderColor: '#D9D9D9',
        },
        sendButton: {
            width: 60,
            height: 36,
            backgroundColor: theme.primary,
            borderRadius: BorderRadius.md,
            alignItems: 'center',
            justifyContent: 'center',
        },
        sendButtonDisabled: {
            backgroundColor: '#C8C8C8',
        },
        sendButtonText: {
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: '600',
        },
        // 加载状态
        loadingContainer: {
            paddingVertical: Spacing.xl,
            alignItems: 'center',
        },
        loadingText: {
            marginTop: Spacing.sm,
            color: theme.textMuted,
            fontSize: 14,
        },
        // 底部操作栏
        bottomActions: {
            flexDirection: 'row',
            padding: Spacing.md,
            paddingBottom: Spacing.lg,
            backgroundColor: '#F5F5F5',
            gap: Spacing.md,
        },
        actionButton: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.backgroundSecondary,
            paddingVertical: Spacing.sm,
            borderRadius: BorderRadius.md,
            gap: Spacing.xs,
        },
        actionButtonText: {
            fontSize: 14,
            color: theme.textSecondary,
        },
        // 自动推演激活状态 - 使用醒目的深色背景
        autoModeActive: {
            backgroundColor: theme.primary,
            borderWidth: 0,
        },
        // @按钮
        atButton: {
            width: 40,
            height: 36,
            alignItems: 'center',
            justifyContent: 'center',
        },
        // @选择弹窗
        atPickerOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
        },
        atPickerContent: {
            borderTopLeftRadius: BorderRadius.xl,
            borderTopRightRadius: BorderRadius.xl,
            maxHeight: '60%',
            paddingBottom: Spacing.xl,
        },
        atPickerHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: Spacing.lg,
            paddingVertical: Spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: theme.borderLight,
        },
        atPickerList: {
            maxHeight: 300,
        },
        atPickerItem: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: Spacing.lg,
            paddingVertical: Spacing.md,
            borderBottomWidth: 1,
        },
        atPickerAvatar: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: theme.backgroundTertiary,
        },
        atPickerInfo: {
            flex: 1,
            marginLeft: Spacing.md,
        },
    });
};
