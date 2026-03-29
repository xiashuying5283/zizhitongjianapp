import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme): any => {
  return StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
      paddingTop: Spacing.lg,
      paddingBottom: Spacing["5xl"],
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    // ==================== Header ====================
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: BorderRadius.md,
      backgroundColor: 'rgba(0,0,0,0.05)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      flex: 1,
      alignItems: 'center',
    },
    headerRight: {
      width: 40,
    },
    bookmarkButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    playButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    // ==================== TTS Control Bar ====================
    ttsControlBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      paddingBottom: Spacing.xl,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 8,
    },
    ttsControlBtn: {
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    ttsPlayBtn: {
      width: 52,
      height: 52,
      borderRadius: 26,
      justifyContent: 'center',
      alignItems: 'center',
      marginHorizontal: Spacing.sm,
    },
    ttsProgressInfo: {
      flex: 1,
      marginHorizontal: Spacing.md,
    },
    ttsStopBtn: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    // ==================== Meta Text ====================
    metaText: {
      marginBottom: Spacing.sm,
    },
    introductionText: {
      lineHeight: 20,
      marginBottom: Spacing.lg,
    },
    // ==================== Content ====================
    content: {
      paddingHorizontal: Spacing["2xl"],
      paddingTop: Spacing.sm,
    },
    // ==================== Year Section ====================
    yearSection: {
      marginBottom: Spacing.xl,
    },
    yearHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.md,
      paddingVertical: Spacing.xs,
      paddingHorizontal: Spacing.md,
      borderRadius: BorderRadius.md,
    },
    yearLabelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    yearLabel: {
      marginLeft: Spacing.xs,
    },
    yearBcText: {
      marginLeft: Spacing.md,
    },
    emperorNoteIcon: {
      marginLeft: Spacing.sm,
      padding: Spacing.xs,
    },
    emperorNoteInline: {
      marginHorizontal: Spacing.lg,
      marginBottom: Spacing.md,
      padding: Spacing.md,
      borderRadius: BorderRadius.md,
      borderLeftWidth: 3,
      borderLeftColor: theme.primary,
    },
    yearContent: {
      paddingTop: Spacing.md,
      gap: Spacing.lg,
    },
    // ==================== Footer ====================
    footer: {
      paddingVertical: Spacing["2xl"],
      alignItems: 'center',
      opacity: 0.5,
    },
    // ==================== Toolbar ====================
    toolbar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingVertical: Spacing.lg,
      paddingBottom: Spacing["2xl"],
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 10,
    },
    toolbarButton: {
      alignItems: 'center',
      gap: Spacing.xs,
    },
    toolbarButtonText: {
      fontSize: 12,
      marginTop: 2,
    },
    // ==================== Panel ====================
    panel: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      maxHeight: '55%',
      borderTopLeftRadius: BorderRadius.xl,
      borderTopRightRadius: BorderRadius.xl,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 20,
      borderWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: 0,
      borderColor: theme.border,
    },
    panelHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: Spacing["2xl"],
      paddingVertical: Spacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    panelContent: {
      paddingHorizontal: Spacing["2xl"],
      paddingVertical: Spacing.lg,
      maxHeight: 350,
    },
    panelScrollContent: {
      paddingBottom: Spacing["3xl"],
    },
    // ==================== Catalog ====================
    emperorGroup: {
      marginBottom: Spacing.sm,
    },
    emperorHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.md,
    },
    yearList: {
      marginTop: Spacing.xs,
      marginLeft: Spacing.sm,
      borderLeftWidth: 2,
      borderLeftColor: theme.border,
      paddingLeft: Spacing.sm,
    },
    yearItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.borderLight,
    },
    yearItemVertical: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
      gap: Spacing.sm,
    },
    yearItemVerticalContent: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.xs,
    },
    // ==================== Font Size ====================
    fontSizeList: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    fontSizeItem: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: Spacing.lg,
      marginHorizontal: Spacing.xs,
      borderRadius: BorderRadius.md,
      backgroundColor: theme.backgroundTertiary,
    },
    fontSizeLabel: {
      marginBottom: Spacing.xs,
    },
    fontSizeName: {
      fontSize: 12,
    },
    fontFamilyList: {
      gap: Spacing.sm,
    },
    fontFamilyItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      backgroundColor: theme.backgroundTertiary,
    },
    // ==================== Background ====================
    backgroundList: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    backgroundItem: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: Spacing.xl,
      marginHorizontal: Spacing.xs,
      borderRadius: BorderRadius.lg,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    backgroundName: {
      fontSize: 14,
    },
    // ==================== View Mode ====================
    viewModeList: {
      gap: Spacing.sm,
    },
    viewModeItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: Spacing.lg,
      paddingHorizontal: Spacing.lg,
      borderRadius: BorderRadius.md,
      backgroundColor: theme.backgroundTertiary,
    },
    viewModeItemLeft: {
      flex: 1,
    },
    viewModeLabel: {
      fontSize: 16,
      marginBottom: 2,
    },
    viewModeDesc: {
      fontSize: 12,
      opacity: 0.6,
    },
    // ==================== Script Mode ====================
    divider: {
      height: 1,
      marginVertical: Spacing.lg,
    },
    scriptModeSection: {
      gap: Spacing.sm,
    },
    sectionLabel: {
      fontSize: 14,
      fontWeight: '500',
    },
    scriptModeButtons: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    scriptButton: {
      flex: 1,
      paddingVertical: Spacing.lg,
      alignItems: 'center',
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: theme.border,
    },
    scriptButtonText: {
      fontSize: 16,
    },
    // ==================== Swipe Hint ====================
    swipeHint: {
      position: 'absolute',
      top: '50%',
      marginTop: -40,
      width: 80,
      height: 80,
      borderRadius: BorderRadius.xl,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 100,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 15,
    },
    swipeHintLeft: {
      left: 20,
    },
    swipeHintRight: {
      right: 20,
    },
    swipeHintText: {
      color: '#FFFFFF',
      fontSize: 12,
      marginTop: Spacing.xs,
      fontWeight: '500',
    },
    // TTS 设置面板样式
    ttsVoiceList: {
      gap: Spacing.sm,
    },
    ttsVoiceItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    ttsVoiceInfo: {
      flex: 1,
    },
    ttsVoiceName: {
      fontSize: 16,
      marginBottom: 2,
    },
    ttsVoiceDesc: {
      fontSize: 13,
    },
    ttsSpeedList: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    ttsSpeedItem: {
      flex: 1,
      paddingVertical: Spacing.md,
      borderRadius: BorderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ttsSpeedLabel: {
      fontSize: 15,
      fontWeight: '500',
    },
    // ==================== Bookmark Modal ====================
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    bookmarkModal: {
      borderTopLeftRadius: BorderRadius.xl,
      borderTopRightRadius: BorderRadius.xl,
      paddingBottom: Spacing["3xl"],
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: Spacing.xl,
      paddingVertical: Spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    modalBody: {
      paddingHorizontal: Spacing.xl,
      paddingVertical: Spacing.lg,
    },
    inputLabel: {
      marginBottom: Spacing.sm,
      marginTop: Spacing.md,
    },
    textInput: {
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      fontSize: 16,
    },
    textArea: {
      height: 80,
      paddingTop: Spacing.md,
    },
    modalFooter: {
      flexDirection: 'row',
      gap: Spacing.md,
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.lg,
    },
    modalButton: {
      flex: 1,
      paddingVertical: Spacing.lg,
      borderRadius: BorderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButton: {
      backgroundColor: theme.backgroundTertiary,
    },
    submitButton: {
      // backgroundColor is set dynamically
    },
  });
};
