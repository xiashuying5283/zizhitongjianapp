import React, { useState } from 'react';
import {
    View,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { createStyles } from './styles';
import { createCustomCharacter } from '@/utils/custom-characters-api';

export default function CreateCharacterScreen() {
    const { theme } = useTheme();
    const styles = createStyles(theme);
    const router = useSafeRouter();

    const [name, setName] = useState('');
    const [dynasty, setDynasty] = useState('');
    const [title, setTitle] = useState('');
    const [personality, setPersonality] = useState('');
    const [speakingStyle, setSpeakingStyle] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!name.trim()) {
            Alert.alert('提示', '请输入角色名字');
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await createCustomCharacter({
                name: name.trim(),
                dynasty: dynasty.trim() || undefined,
                title: title.trim() || undefined,
                personality: personality.trim() || undefined,
                speaking_style: speakingStyle.trim() || undefined,
            });

            if (result) {
                Alert.alert('成功', '角色创建成功！', [
                    {
                        text: '确定',
                        onPress: () => router.back(),
                    },
                ]);
            } else {
                Alert.alert('错误', '创建失败，请重试');
            }
        } catch (error) {
            Alert.alert('错误', '创建失败，请重试');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Screen backgroundColor={theme.backgroundRoot} statusBarStyle="dark">
    <KeyboardAvoidingView
        style={{ flex: 1 }}
    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
    <ScrollView contentContainerStyle={styles.container}>
        {/* 头部 */}
        <View style={styles.header}>
    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
    <FontAwesome6 name="chevron-left" size={20} color={theme.textPrimary} />
    </TouchableOpacity>
    <ThemedText variant="h3" color={theme.textPrimary}>
        创建角色
        </ThemedText>
        </View>

    {/* 表单 */}
    <View style={styles.form}>
        {/* 名字 */}
        <View style={styles.inputGroup}>
    <ThemedText variant="small" color={theme.textSecondary} style={styles.label}>
        名字 <ThemedText color="#EF4444">*</ThemedText>
        </ThemedText>
        <TextInput
    style={[styles.input, { color: theme.textPrimary, backgroundColor: theme.backgroundTertiary }]}
    placeholder="如：张三、李四"
    placeholderTextColor={theme.textMuted}
    value={name}
    onChangeText={setName}
    maxLength={20}
    />
    <ThemedText variant="tiny" color={theme.textMuted} style={styles.hint}>
        头像将自动显示名字的最后一个字
        </ThemedText>
        </View>

    {/* 朝代 */}
    <View style={styles.inputGroup}>
    <ThemedText variant="small" color={theme.textSecondary} style={styles.label}>
        朝代
        </ThemedText>
        <TextInput
    style={[styles.input, { color: theme.textPrimary, backgroundColor: theme.backgroundTertiary }]}
    placeholder="如：秦朝、汉朝、三国"
    placeholderTextColor={theme.textMuted}
    value={dynasty}
    onChangeText={setDynasty}
    maxLength={20}
    />
    </View>

    {/* 身份 */}
    <View style={styles.inputGroup}>
    <ThemedText variant="small" color={theme.textSecondary} style={styles.label}>
        身份/官职
        </ThemedText>
        <TextInput
    style={[styles.input, { color: theme.textPrimary, backgroundColor: theme.backgroundTertiary }]}
    placeholder="如：大将军、谋士、皇帝"
    placeholderTextColor={theme.textMuted}
    value={title}
    onChangeText={setTitle}
    maxLength={50}
    />
    </View>

    {/* 性格 */}
    <View style={styles.inputGroup}>
    <ThemedText variant="small" color={theme.textSecondary} style={styles.label}>
        性格特点
        </ThemedText>
        <TextInput
    style={[styles.input, styles.textArea, { color: theme.textPrimary, backgroundColor: theme.backgroundTertiary }]}
    placeholder="如：勇猛果敢、足智多谋、忠诚正直"
    placeholderTextColor={theme.textMuted}
    value={personality}
    onChangeText={setPersonality}
    multiline
    numberOfLines={3}
    maxLength={200}
    />
    </View>

    {/* 说话风格 */}
    <View style={styles.inputGroup}>
    <ThemedText variant="small" color={theme.textSecondary} style={styles.label}>
        说话风格
        </ThemedText>
        <TextInput
    style={[styles.input, styles.textArea, { color: theme.textPrimary, backgroundColor: theme.backgroundTertiary }]}
    placeholder="如：豪爽直率、文绉绉、言简意赅"
    placeholderTextColor={theme.textMuted}
    value={speakingStyle}
    onChangeText={setSpeakingStyle}
    multiline
    numberOfLines={3}
    maxLength={200}
    />
    </View>
    </View>

    {/* 提交按钮 */}
    <View style={styles.actions}>
    <TouchableOpacity
        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
    onPress={handleSubmit}
    disabled={isSubmitting || !name.trim()}
>
    {isSubmitting ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
    ) : (
        <ThemedText variant="smallMedium" color="#FFFFFF">
        创建角色
        </ThemedText>
    )}
    </TouchableOpacity>
    </View>
    </ScrollView>
    </KeyboardAvoidingView>
    </Screen>
);
}
