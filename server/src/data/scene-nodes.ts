/**
 * 场景节点数据 - 用于沉浸式演绎历史事件
 * 每个话题有多个场景节点，按时间顺序推进
 */

export interface SceneNode {
    id: string;
    topicId: string;
    sequence: number; // 场景顺序
    name: string; // 场景名称
    description: string; // 场景描述（给AI看的）
    keyCharacters: string[]; // 关键人物ID
    atmosphere: string; // 氛围描述
    suggestedActions: string[]; // 建议的动作/对话方向
}

// 鸿门宴场景节点
export const HONGMENYAN_SCENES: SceneNode[] = [
    {
        id: 'hongmen-1',
        topicId: 'hongmen',
        sequence: 1,
        name: '刘邦赴宴',
        description: '刘邦带张良、樊哙等人到达鸿门，向项羽谢罪。宴席刚刚开始，气氛表面上和谐，但暗流涌动。',
        keyCharacters: ['liubang', 'xiangyu'],
        atmosphere: '表面谦和，暗藏杀机',
        suggestedActions: [
            '刘邦表达谢罪之意，示弱求和',
            '项羽以霸主姿态接纳，显得宽宏大量',
            '范增对刘邦的到来心存警惕'
        ]
    },
    {
        id: 'hongmen-2',
        topicId: 'hongmen',
        sequence: 2,
        name: '范增举玦',
        description: '酒过三巡，范增多次向项羽使眼色，举起玉玦暗示动手，但项羽犹豫不决，始终没有下令。',
        keyCharacters: ['fanzeng', 'xiangyu'],
        atmosphere: '紧张，一触即发',
        suggestedActions: [
            '范增焦急地暗示项羽',
            '项羽假装没看见，或以其他理由推脱',
            '范增对项羽的优柔寡断感到失望'
        ]
    },
    {
        id: 'hongmen-3',
        topicId: 'hongmen',
        sequence: 3,
        name: '项庄舞剑',
        description: '范增让项庄以舞剑助兴为名，意图刺杀刘邦。项伯看穿意图，也拔剑起舞，用身体保护刘邦。',
        keyCharacters: ['xiangzhuang', 'xiangbo'],
        atmosphere: '剑拔弩张，生死一线',
        suggestedActions: [
            '项庄舞剑，步步逼近刘邦',
            '项伯起身对舞，暗中保护',
            '张良观察局势，寻找对策'
        ]
    },
    {
        id: 'hongmen-4',
        topicId: 'hongmen',
        sequence: 4,
        name: '樊哙闯帐',
        description: '张良出去召樊哙，樊哙带剑拥盾闯入帐中，怒目而视项羽。项羽赞赏其勇猛，赐酒赐肉。',
        keyCharacters: ['fankuai', 'xiangyu'],
        atmosphere: '豪壮，震撼全场',
        suggestedActions: [
            '樊哙闯帐，质问项羽为何要杀有功之臣',
            '项羽被樊哙的气势折服，赐座',
            '刘邦借机提出上厕所，准备脱身'
        ]
    },
    {
        id: 'hongmen-5',
        topicId: 'hongmen',
        sequence: 5,
        name: '刘邦脱身',
        description: '刘邦借口上厕所，在樊哙等人护送下从小路逃回霸上。留下张良善后，向项羽献礼谢罪。',
        keyCharacters: ['liubang', 'zhangliang'],
        atmosphere: '惊险逃离，命悬一线',
        suggestedActions: [
            '刘邦果断决定逃离',
            '张良留下来应对项羽',
            '范增得知刘邦逃脱，愤怒摔碎玉斗'
        ]
    },
    {
        id: 'hongmen-6',
        topicId: 'hongmen',
        sequence: 6,
        name: '宴席结束',
        description: '鸿门宴结束，刘邦成功脱险。范增预言项羽必败于刘邦之手。',
        keyCharacters: ['fanzeng', 'xiangyu'],
        atmosphere: '遗憾，预示未来',
        suggestedActions: [
            '范增叹息：竖子不足与谋',
            '项羽不以为然',
            '事件结束，可由司马光做总结'
        ]
    }
];

// 夷陵之战场景节点
export const YILING_SCENES: SceneNode[] = [
    {
        id: 'yiling-1',
        topicId: 'yiling',
        sequence: 1,
        name: '刘备东征',
        description: '关羽被孙权所杀，刘备称帝后亲率大军东征伐吴，为关羽报仇。',
        keyCharacters: ['liubei'],
        atmosphere: '悲愤，复仇之战',
        suggestedActions: [
            '刘备表达对关羽之死的悲愤',
            '决心伐吴，不顾诸葛亮劝阻',
            '大军出发，气势汹汹'
        ]
    },
    {
        id: 'yiling-2',
        topicId: 'yiling',
        sequence: 2,
        name: '连营七百里',
        description: '刘备大军深入吴境，在夷陵一带连营七百里，与陆逊对峙。',
        keyCharacters: ['liubei', 'luxun'],
        atmosphere: '对峙，暗藏危机',
        suggestedActions: [
            '刘备部署连营',
            '陆逊坚守不战，等待时机',
            '吴军将领急于出战，被陆逊压制'
        ]
    },
    {
        id: 'yiling-3',
        topicId: 'yiling',
        sequence: 3,
        name: '火攻破蜀',
        description: '陆逊抓住刘备连营、天气炎热的破绽，发动火攻，蜀军大败。',
        keyCharacters: ['luxun', 'liubei'],
        atmosphere: '火光冲天，溃败',
        suggestedActions: [
            '陆逊下令火攻',
            '刘备军营起火，大乱',
            '刘备仓皇突围'
        ]
    },
    {
        id: 'yiling-4',
        topicId: 'yiling',
        sequence: 4,
        name: '白帝托孤',
        description: '刘备兵败后退守白帝城，病重不治，临终托孤于诸葛亮。',
        keyCharacters: ['liubei', 'zhugeliang'],
        atmosphere: '悲壮，托付后事',
        suggestedActions: [
            '刘备向诸葛亮托孤',
            '诸葛亮表忠心',
            '事件结束，可由司马光做总结'
        ]
    }
];

// 贞观之治场景节点
export const ZHENGUAN_SCENES: SceneNode[] = [
    {
        id: 'zhenguan-1',
        topicId: 'zhenguan',
        sequence: 1,
        name: '玄武门之变',
        description: '李世民在玄武门设伏，杀太子李建成和齐王李元吉，夺取皇位。',
        keyCharacters: ['lishimin', 'liyuan'],
        atmosphere: '血腥，权力更迭',
        suggestedActions: [
            '李世民果断出手',
            '李渊被迫退位',
            '新朝建立'
        ]
    },
    {
        id: 'zhenguan-2',
        topicId: 'zhenguan',
        sequence: 2,
        name: '纳谏如流',
        description: '李世民即位后，重用魏征等谏臣，虚心纳谏，开创贞观之治。',
        keyCharacters: ['lishimin', 'weizheng'],
        atmosphere: '开明，政治清明',
        suggestedActions: [
            '李世民鼓励大臣直言进谏',
            '魏征敢于犯颜直谏',
            '君臣共治天下'
        ]
    },
    {
        id: 'zhenguan-3',
        topicId: 'zhenguan',
        sequence: 3,
        name: '贞观盛世',
        description: '贞观年间政治清明、经济繁荣、国力强盛，四夷来朝。',
        keyCharacters: ['lishimin', 'weizheng', 'fangxuanling'],
        atmosphere: '盛世，万国来朝',
        suggestedActions: [
            '李世民总结治国经验',
            '大臣们称颂盛世',
            '事件结束，可由司马光做总结'
        ]
    }
];

// 三家分晋场景节点
export const SANJIAFENJIN_SCENES: SceneNode[] = [
    {
        id: 'sanjia-1',
        topicId: 'sanjiafenjin',
        sequence: 1,
        name: '智伯索地',
        description: '智伯（智瑶）仗着智氏最强，向韩、魏两家索要土地。韩康子、魏桓子被迫献地。智伯又向赵氏索地，赵襄子断然拒绝。',
        keyCharacters: ['zhibo', 'hanhuzi', 'weiju', 'zhaowuxu'],
        atmosphere: '强权欺压，暗流涌动',
        suggestedActions: [
            '智伯傲慢索地，不把三家放在眼里',
            '韩康子、魏桓子被迫屈服，但心怀怨恨',
            '赵襄子据理力争，拒绝献地'
        ]
    },
    {
        id: 'sanjia-2',
        topicId: 'sanjiafenjin',
        sequence: 2,
        name: '晋阳之围',
        description: '智伯以赵氏不献地为由，联合韩、魏两家攻打赵氏。赵襄子退守晋阳城，三家联军围城。',
        keyCharacters: ['zhibo', 'zhaowuxu', 'hanhuzi', 'weiju'],
        atmosphere: '大军压境，危在旦夕',
        suggestedActions: [
            '智伯统领三家联军围攻晋阳',
            '赵襄子坚守城池',
            '韩、魏两家心存疑虑'
        ]
    },
    {
        id: 'sanjia-3',
        topicId: 'sanjiafenjin',
        sequence: 3,
        name: '水灌晋阳',
        description: '智伯引汾水灌晋阳城，城墙不浸者仅三版。赵氏危在旦夕，赵襄子派谋臣张孟谈夜出求援。',
        keyCharacters: ['zhibo', 'zhaowuxu', 'zhangmengtan'],
        atmosphere: '洪水滔天，生死存亡',
        suggestedActions: [
            '智伯得意洋洋，以为胜券在握',
            '赵襄子在城头望水叹息',
            '张孟谈夜见韩、魏，陈述利害'
        ]
    },
    {
        id: 'sanjia-4',
        topicId: 'sanjiafenjin',
        sequence: 4,
        name: '三家灭智',
        description: '韩、魏两家被张孟谈说服，决意反水。三家联手决堤反灌智伯军营，智伯兵败被杀，智氏一族尽灭。',
        keyCharacters: ['hanhuzi', 'weiju', 'zhaowuxu', 'zhibo'],
        atmosphere: '惊天逆转，灭门之祸',
        suggestedActions: [
            '韩、魏密谋反戈',
            '夜决堤坝，水淹智军',
            '智伯兵败被杀，智氏灭族'
        ]
    },
    {
        id: 'sanjia-5',
        topicId: 'sanjiafenjin',
        sequence: 5,
        name: '三家分晋',
        description: '韩、赵、魏三家瓜分智氏土地，并逐渐蚕分晋国。周威烈王正式册封三家为诸侯，晋国名存实亡。',
        keyCharacters: ['hanhuzi', 'weiju', 'zhaowuxu', 'zhouweilie'],
        atmosphere: '诸侯崛起，礼崩乐坏',
        suggestedActions: [
            '三家瓜分智氏土地',
            '周威烈王无奈册封三家为诸侯',
            '事件结束，可由司马光做总结'
        ]
    }
];

// 所有场景节点的映射
export const SCENE_NODES: Record<string, SceneNode[]> = {
    'hongmen': HONGMENYAN_SCENES,
    'yiling': YILING_SCENES,
    'zhenguan': ZHENGUAN_SCENES,
    'sanjiafenjin': SANJIAFENJIN_SCENES,
};

// 根据话题ID获取场景节点
export function getScenesByTopic(topicId: string): SceneNode[] {
    return SCENE_NODES[topicId] || [];
}

// 根据话题ID和场景ID获取场景
export function getSceneById(topicId: string, sceneId: string): SceneNode | undefined {
    const scenes = SCENE_NODES[topicId];
    return scenes?.find(s => s.id === sceneId);
}

// 获取下一个场景
export function getNextScene(topicId: string, currentSequence: number): SceneNode | undefined {
    const scenes = SCENE_NODES[topicId];
    return scenes?.find(s => s.sequence === currentSequence + 1);
}

// 检查是否是最后一个场景
export function isLastScene(topicId: string, currentSequence: number): boolean {
    const scenes = SCENE_NODES[topicId];
    if (!scenes) return true;
    return currentSequence >= scenes.length;
}
