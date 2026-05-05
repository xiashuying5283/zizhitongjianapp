import { Router } from 'express';
import OpenAI from 'openai';
import { getScenesByTopic, getNextScene, isLastScene } from '../data/scene-nodes';
import type { SceneNode } from '../data/scene-nodes';
import { getChenGuangYueByTopic, hasChenGuangYue } from '../data/chenguangyue';

const router = Router();

// 初始化 OpenAI 客户端
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL,
});

const MODEL = process.env.OPENAI_MODEL || 'doubao-seed-1-8-251228';

// 上下文限制
const MAX_CONTEXT_MESSAGES = 10;

// 回复长度
const MIN_RESPONSE_LENGTH = 20;
const MAX_RESPONSE_LENGTH = 120;

// ==================== 内容校验规则 ====================

// 违规关键词库（骂街、嘲讽、人身攻击）
const FORBIDDEN_KEYWORDS = [
    '傻逼', '煞笔', '草你', '操你', '妈的', '他妈', '王八蛋', '混蛋',
    '滚蛋', '去死', '屁话', '放屁', '狗屁', '贱人', '畜生', '杂种',
    '无赖', '小人', '卑鄙', '下流', '无耻', '垃圾', '废物',
    '你妈', '你爹', '娘的', '娘炮', '软蛋', '怂包',
];


// 检测发言是否包含违规内容
function hasForbiddenContent(content: string): boolean {
    const lowerContent = content.toLowerCase();
    return FORBIDDEN_KEYWORDS.some(keyword => lowerContent.includes(keyword));
}

// 计算两个字符串的相似度（简单版）
function calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().replace(/[，。！？、]/g, '');
    const s2 = str2.toLowerCase().replace(/[，。！？、]/g, '');

    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;

    // 计算公共子串比例
    let commonChars = 0;
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    for (const char of shorter) {
        if (longer.includes(char)) {
            commonChars++;
        }
    }

    return commonChars / longer.length;
}

// 检测发言是否与已有消息重复
function isRepetitiveContent(content: string, recentMessages: string[]): boolean {
    for (const msg of recentMessages) {
        const similarity = calculateSimilarity(content, msg);
        if (similarity > 0.6) { // 重复度超过60%
            return true;
        }
    }
    return false;
}

// 综合校验发言内容
interface ValidationResult {
    isValid: boolean;
    reason?: string;
}

function validateContent(
    content: string,
    topicId: string,
    recentMessages: string[]
): ValidationResult {
    // 1. 违规内容检测
    if (hasForbiddenContent(content)) {
        return { isValid: false, reason: '包含违规内容（辱骂/攻击）' };
    }

    // 2. 重复内容检测
    if (isRepetitiveContent(content, recentMessages)) {
        return { isValid: false, reason: '内容重复度过高' };
    }

    // 3. 长度检测
    if (content.length < MIN_RESPONSE_LENGTH) {
        return { isValid: false, reason: '发言过短' };
    }
    if (content.length > MAX_RESPONSE_LENGTH * 1.5) {
        return { isValid: false, reason: '发言过长' };
    }

    return { isValid: true };
}

// ==================== 控场检测 ====================

// 控场冷却记录（避免频繁控场）
let lastControlTime = 0;
const CONTROL_COOLDOWN_MS = 120000; // 控场冷却时间120秒（2分钟）

// 检测是否需要司马光控场
interface ControlTrigger {
    needed: boolean;
    reason: string;
}

function checkControlNeeded(
    recentMessages: Array<{ characterName: string; content: string }>,
    topicId: string
): ControlTrigger {
    // 冷却期内不触发控场
    const now = Date.now();
    if (now - lastControlTime < CONTROL_COOLDOWN_MS) {
        return { needed: false, reason: '' };
    }

    // 消息太少不检测
    if (recentMessages.length < 6) {
        return { needed: false, reason: '' };
    }

    // 只检测违规内容（辱骂、攻击等）
    let forbiddenCount = 0;

    for (let i = recentMessages.length - 1; i >= Math.max(0, recentMessages.length - 6); i--) {
        const msg = recentMessages[i];

        // 跳过系统消息和司马光自己的消息
        if (msg.characterName === '系统' || msg.characterName === '司马光') {
            continue;
        }

        if (hasForbiddenContent(msg.content)) {
            forbiddenCount++;
        }
    }

    // 场景1：连续出现违规内容（需要至少3条违规）
    if (forbiddenCount >= 3) {
        lastControlTime = now;
        return { needed: true, reason: '检测到违规内容，需要控场' };
    }

    // 场景2：检测重复拉扯（同一观点反复说）- 需要更严格
    const userMessages = recentMessages.filter(m =>
        m.characterName !== '系统' && m.characterName !== '司马光'
    );

    if (userMessages.length >= 6) {
        const lastSix = userMessages.slice(-6).map(m => m.content);
        let repeatCount = 0;
        for (let i = 0; i < lastSix.length - 1; i++) {
            for (let j = i + 1; j < lastSix.length; j++) {
                if (calculateSimilarity(lastSix[i], lastSix[j]) > 0.7) { // 相似度阈值提高到70%
                    repeatCount++;
                }
            }
        }
        // 需要更多重复才触发
        if (repeatCount >= 6) {
            lastControlTime = now;
            return { needed: true, reason: '检测到重复拉扯，需要控场' };
        }
    }

    return { needed: false, reason: '' };
}

// 生成司马光控场发言
// 司马光是《资治通鉴》作者（宋代），可以以"后世史官"身份评论历史
function generateControlMessage(topicId: string, reason: string): string {
    const topicInfo: Record<string, string> = {
        sanjiafenjin: '三家分晋',
        hongmen: '鸿门宴',
        zhenguan: '贞观君臣论治',
        yiling: '夷陵之战',
    };

    const topic = topicInfo[topicId] || '此事';

    const templates = [
        `臣光曰：诸位所言，多有空泛争执，少有实据。老夫著史千卷，载${topic}之本末，诸位不妨据实而论，莫做无谓之争。`,
        `臣光曰：同一事反复争执，并无新论。老夫编历代兴亡，意在以史为鉴。诸位不妨各抒己见，然须言之有物，不可空言相争。`,
        `臣光曰：群聊之意，在于还原${topic}之真相，供后人借鉴。诸位若只顾争执，不求实据，则失此聊之本意。望据实而论，实事求是。`,
    ];

    return templates[Math.floor(Math.random() * templates.length)];
}

// ==================== 原有功能 ====================

// 话题ID映射（话题名 -> topicId）
const TOPIC_ID_MAP: Record<string, string> = {
    '三家分晋': 'sanjiafenjin',
    '鸿门宴': 'hongmen',
    '鸿门宴对峙': 'hongmen',
    '贞观之治': 'zhenguan',
    '夷陵之战': 'yiling',
};

// 根据话题名称获取话题ID
function getTopicId(topicName: string): string {
    return TOPIC_ID_MAP[topicName] || topicName.toLowerCase();
}

// 构建单个角色的系统提示（加入人设锁死和话题锁死）
function buildCharacterPrompt(
    topic: string,
    character: {
        id: string;
        name: string;
        dynasty: string;
        title: string;
        personality: string;
        speakingStyle: string;
        constraints: string[];
    },
    otherCharacters: string[],
    relationships?: string,
    currentScene?: SceneNode
): string {
    const others = otherCharacters.filter(n => n !== character.name).join('、');

    // 构建场景信息
    const sceneInfo = currentScene ? `
【当前场景：${currentScene.name}】
${currentScene.description}
【场景氛围】${currentScene.atmosphere}
【关键人物】${currentScene.keyCharacters.join('、')}
【建议行为】${currentScene.suggestedActions.join('、')}
` : '';

    return `你是【${character.name}】（${character.dynasty}·${character.title}）。

# 群聊全局核心规则（优先级最高，必须严格遵守）

【用户绝对主导】
用户是整个群聊的「绝对主导者、唯一提问者、对话节奏掌控者」。没有用户的发言或提问，AI绝对不能自主开启话题。你的所有发言，必须是回应用户的问题、疑问或关注点，不能自己开新话题，不能自己带节奏。

【沉浸式角色扮演 - 关键！】
你是历史事件的亲历者，正身处事件发生的现场！
- 你不知道后世有《资治通鉴》这本书，绝不能说"《资治通鉴》记载"、"史书上说"之类的话
- 你只知道你所在时代及之前的事，不知道你死后发生的事
- 你是用自己的眼睛看、自己的耳朵听、自己的心在感受
- 你是在讲述自己的亲身经历、决策和思考，不是在背书

【内容红线】
绝对禁止无意义的互相辱骂、嘲讽、人身攻击、市井骂街，禁止对同一个话题反复拉扯、重复表达完全相同的观点，禁止空对空的情绪宣泄。

【史实锚定】
你的发言内容必须符合历史事实，但要以"亲历者"的口吻表达：
- 说"我当时看到..."而不是"史书记载..."
- 说"我记得那天..."而不是"据记载..."
- 说"我亲眼所见..."而不是"史料显示..."

【发言目标】
你的核心任务，是以亲历者的身份回答用户关于本历史事件的疑问，向用户还原你在本事件中的决策逻辑、立场和行为动机，帮用户理解这段历史，而不是和其他角色吵架对线。

【风格约束】
语言必须贴合你的朝代、身份、人物性格，禁止用现代网络用语、口语化市井词汇，禁止OOC（角色崩坏），单条发言字数控制在50-120字，不能冗长。

【话题收敛】
每一条发言必须推进话题，补充新的信息，不能重复自己或其他角色已经说过的内容，连续2轮没有新信息，必须停止发言。

---

【你的性格】
${character.personality}

【你说话的风格】
${character.speakingStyle}

【你的行为约束】
${character.constraints.join('；')}

【发言核心目标】
以亲历者身份，讲述你在${topic}中的所见所闻、决策逻辑和内心想法，符合你${character.dynasty}时期${character.title}的身份。

【当前话题】
${topic}
${sceneInfo}
【群聊中的其他人物】
${others}
${relationships ? `\n【你与其他人的关系】\n${relationships}` : ''}

【格式要求】
直接输出你的发言内容，不要加【${character.name}】前缀，单条发言50-120字。`;
}

// 检测话题偏移（用户是否聊了无关内容）
async function checkTopicDrift(
    userMessage: string,
    topic: string
): Promise<boolean> {
    const prompt = `判断用户的发言是否偏离当前群聊话题。

【当前群聊话题】
${topic}

【用户发言】
${userMessage}

【判断标准】
- 如果用户发言与话题相关（讨论历史事件、人物、背景等），返回 NO
- 如果用户聊了现代内容、网络梗、与《资治通鉴》无关的内容、完全偏离话题，返回 YES

【输出格式】
只输出 YES 或 NO，不要其他内容。`;

    try {
        let response = '';
        const stream = await openai.chat.completions.create({
            model: MODEL,
            messages: [
                { role: 'system', content: '你是一个话题相关性判断器，只输出 YES 或 NO。' },
                { role: 'user', content: prompt },
            ],
            temperature: 0,
            max_tokens: 10,
            stream: true,
        });

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
                response += content;
            }
        }

        const result = response.trim().toUpperCase();
        console.log(`[话题偏移检测] 用户消息: "${userMessage.slice(0, 30)}..." -> ${result}`);
        return result === 'YES';
    } catch (error) {
        console.error('话题偏移检测失败:', error);
        return false; // 检测失败时不干预
    }
}

// 检测是否需要推进场景
async function checkSceneProgress(
    recentMessages: string,
    currentScene: SceneNode,
    nextScene: SceneNode | undefined
): Promise<boolean> {
    if (!nextScene) return false; // 没有下一场景

    const prompt = `判断当前场景是否已经充分演绎，可以推进到下一场景。

【当前场景】${currentScene.name}
${currentScene.description}

【下一场景】${nextScene.name}
${nextScene.description}

【最近的群聊内容】
${recentMessages}

【判断标准】
- 当前场景的关键事件已经被充分讨论和演绎
- 角色们已经完成了当前场景应该发生的主要互动
- 自然可以过渡到下一场景

【输出格式】
只输出 YES（可以推进）或 NO（继续当前场景），不要其他内容。`;

    try {
        let response = '';
        const stream = await openai.chat.completions.create({
            model: MODEL,
            messages: [
                { role: 'system', content: '你是一个场景推进判断器，只输出 YES 或 NO。' },
                { role: 'user', content: prompt },
            ],
            temperature: 0,
            max_tokens: 10,
            stream: true,
        });

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
                response += content;
            }
        }

        const result = response.trim().toUpperCase();
        console.log(`[场景推进检测] 当前: ${currentScene.name} -> ${result === 'YES' ? nextScene.name : '继续'}`);
        return result === 'YES';
    } catch (error) {
        console.error('场景推进检测失败:', error);
        return false;
    }
}

// 检测事件是否结束（最后一个场景演绎完毕）
async function checkEventEnd(
    recentMessages: string,
    currentScene: SceneNode
): Promise<boolean> {
    const prompt = `判断最后一个场景是否已经充分演绎完毕，可以结束整个事件。

【当前场景（最后一个）】${currentScene.name}
${currentScene.description}

【最近的群聊内容】
${recentMessages}

【判断标准】
- 最后场景的关键事件已经完成（如鸿门宴刘邦已逃脱）
- 角色们已经对事件结果做了充分反应
- 故事已经到了自然收尾的阶段

【输出格式】
只输出 YES（可以结束）或 NO（继续演绎），不要其他内容。`;

    try {
        let response = '';
        const stream = await openai.chat.completions.create({
            model: MODEL,
            messages: [
                { role: 'system', content: '你是一个事件结束判断器，只输出 YES 或 NO。' },
                { role: 'user', content: prompt },
            ],
            temperature: 0,
            max_tokens: 10,
            stream: true,
        });

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
                response += content;
            }
        }

        const result = response.trim().toUpperCase();
        console.log(`[事件结束检测] 最后场景: ${currentScene.name} -> ${result}`);
        return result === 'YES';
    } catch (error) {
        console.error('事件结束检测失败:', error);
        return false;
    }
}

// 构建选择发言者的系统提示
function buildSpeakerSelectorPrompt(
    topic: string,
    characters: string[],
    historyText: string,
    userMessage?: string,
    mentionedName?: string
): string {
    const characterList = characters.join('、');

    let context = '';
    if (historyText) {
        context = `【当前群聊内容】
${historyText}`;
    }

    let trigger = '';
    if (mentionedName) {
        trigger = `【用户@了${mentionedName}】
${mentionedName}被点名了，必须第一个回复！`;
    } else if (userMessage) {
        trigger = `【用户刚刚发言】
${userMessage}`;
    }

    return `你是一个群聊主持人，需要决定谁应该接着说话。

【可用角色】
${characterList}

${context}

${trigger}

【选择规则】
1. 如果有人被@点名，必须让该角色回应
2. 选择与用户发言内容最相关的角色
3. 避免同一个人连续说两次
4. 选择最可能对当前话题有观点的角色

【输出格式】
只输出角色名字，不要其他内容。例如：张三`;
}

// 解析AI回复
function parseResponse(response: string, characterName: string): string | null {
    // 匹配【人物名】：内容
    const match = response.match(/^【.+?】：(.+)$/m);
    if (match && match[1].trim().length >= MIN_RESPONSE_LENGTH) {
        let content = match[1].trim();
        // 限制长度
        if (content.length > MAX_RESPONSE_LENGTH) {
            content = content.slice(0, MAX_RESPONSE_LENGTH) + '...';
        }
        return content;
    }

    // 如果没有匹配到格式，返回清理后的内容
    const lines = response.split('\n').filter(line => line.trim());
    if (lines.length > 0) {
        let content = lines[0].replace(/^【.+?】：/, '').trim();
        if (content.length >= MIN_RESPONSE_LENGTH) {
            if (content.length > MAX_RESPONSE_LENGTH) {
                content = content.slice(0, MAX_RESPONSE_LENGTH) + '...';
            }
            return content;
        }
    }

    // 返回原始内容
    let cleaned = response.replace(/^【.+?】：/, '').trim();
    if (cleaned.length >= MIN_RESPONSE_LENGTH) {
        if (cleaned.length > MAX_RESPONSE_LENGTH) {
            cleaned = cleaned.slice(0, MAX_RESPONSE_LENGTH) + '...';
        }
        return cleaned;
    }

    return null;
}

// 构建群聊历史文本
function buildHistoryText(messages: Array<{ role: string; characterName?: string; content: string }>): string {
    return messages.map(msg => {
        if (msg.role === 'user') {
            return `【用户】：${msg.content}`;
        }
        return `【${msg.characterName}】：${msg.content}`;
    }).join('\n');
}

// 获取下一个发言角色（通过AI选择）
async function getNextSpeaker(
    topic: string,
    characters: Array<{ id: string; name: string; dynasty: string; title: string; personality: string; speakingStyle: string; constraints: string[] }>,
    history: Array<{ role: string; characterName?: string; content: string }>,
    userMessage?: string,
    mentionedId?: string
): Promise<{ id: string; name: string } | null> {
    // 过滤掉司马光（他只在事件结束时发表臣光曰）
    const availableCharacters = characters.filter(c => c.id !== 'simaguang' && c.name !== '司马光');
    const characterNames = availableCharacters.map(c => c.name);

    // 如果有@指定角色，优先让该角色说话
    if (mentionedId) {
        const mentionedChar = availableCharacters.find(c => c.id === mentionedId);
        if (mentionedChar) {
            console.log(`[@指定] 优先让 ${mentionedChar.name} 发言`);
            return { id: mentionedChar.id, name: mentionedChar.name };
        }
    }

    try {
        const prompt = buildSpeakerSelectorPrompt(
            topic,
            characterNames,
            buildHistoryText(history),
            userMessage
        );

        let response = '';
        const stream = await openai.chat.completions.create({
            model: MODEL,
            messages: [
                { role: 'system', content: '你是一个群聊主持人，擅长选择合适的角色发言。' },
                { role: 'user', content: prompt },
            ],
            temperature: 0.7,
            max_tokens: 50,
            stream: true,
        });

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
                response += content;
            }
        }

        // 解析角色名
        const selectedName = response.trim();
        const lastSpeakerName = history.length > 0 ? history[history.length - 1].characterName : undefined;
        const character = availableCharacters.find(c =>
            c.name === selectedName && c.name !== lastSpeakerName
        );

        if (character) {
            return { id: character.id, name: character.name };
        }

        // 如果选择失败，随机选一个
        let available = availableCharacters.filter(c => c.name !== lastSpeakerName);
        if (available.length === 0) available = availableCharacters;
        return available[Math.floor(Math.random() * available.length)];

    } catch (error) {
        console.error('选择发言者失败:', error);
        // 降级：随机选择
        const lastSpeakerName = history.length > 0 ? history[history.length - 1].characterName : undefined;
        let available = availableCharacters.filter(c => c.name !== lastSpeakerName);
        if (available.length === 0) available = availableCharacters;
        return available[Math.floor(Math.random() * available.length)];
    }
}

/**
 * 接口：POST /api/v1/group-chat/start
 * 开局：系统公告 + 引导用户提问
 */
router.post('/start', async (req, res) => {
    try {
        const { topic, characters } = req.body;

        if (!topic || !characters || characters.length < 2) {
            return res.status(400).json({
                success: false,
                message: '参数不足',
            });
        }

        // 获取话题对应的初始场景
        const topicId = getTopicId(topic);
        const scenes = getScenesByTopic(topicId);
        const initialScene = scenes.length > 0 ? scenes[0] : null;

        // 系统公告（包含场景信息和引导提示）
        const characterNames = characters.map((c: any) => c.name).join('、');
        const sceneIntro = initialScene ? `\n\n【当前场景：${initialScene.name}】\n${initialScene.description}` : '';
        const guidanceTip = `\n\n💡 你可以@某个角色提问，或直接说出你对这段历史的疑问。`;

        const systemMessage = {
            id: 'system-' + Date.now(),
            characterId: 'system',
            characterName: '系统',
            content: `【群聊主题：${topic}】\n群成员：${characterNames}${sceneIntro}${guidanceTip}`,
            isUser: false,
            isSystem: true,
            createdAt: new Date().toISOString(),
        };

        // 不再自动生成AI开场白，等待用户提问
        // 这样确保"用户是群聊的绝对主导者"

        // 返回初始场景状态
        const sceneState = initialScene ? {
            currentSceneId: initialScene.id,
            currentSceneName: initialScene.name,
            currentSequence: initialScene.sequence,
            totalScenes: scenes.length,
            isLastScene: initialScene.sequence === scenes.length,
        } : null;

        return res.json({
            success: true,
            data: {
                systemMessage,
                openingMessage: null, // 不再自动生成AI开场白
                sceneState,
            },
        });
    } catch (error) {
        console.error('开局失败:', error);
        return res.status(500).json({
            success: false,
            message: '开局失败',
        });
    }
});

/**
 * 接口：POST /api/v1/group-chat/generate-next
 * 手动模式：用户发消息后，最多返回2条回复
 */
router.post('/generate-next', async (req, res) => {
    try {
        const {
            topic,
            characters,
            messages = [],
            mentionedId,
            replyCount = 0,  // 已回复数量
            autoMode = false, // 自动推演模式
            currentSceneId,  // 当前场景ID
            currentSequence = 1, // 当前场景序号
        } = req.body;

        if (!topic || !characters || characters.length < 2) {
            return res.status(400).json({
                success: false,
                message: '参数不足',
            });
        }

        // 获取当前场景
        const topicId = getTopicId(topic);
        const scenes = getScenesByTopic(topicId);
        const currentScene = scenes.find(s => s.id === currentSceneId) || scenes[currentSequence - 1] || null;

        // 手动模式：最多2条回复
        if (!autoMode && replyCount >= 2) {
            return res.json({
                success: true,
                data: {
                    done: true,
                    message: '已达到回复上限，等待用户发言',
                },
            });
        }

        // 自动推演模式：每3轮暂停一次，弹出提示
        if (autoMode && replyCount >= 3) {
            return res.json({
                success: true,
                data: {
                    done: true,
                    needPause: true,
                    message: '自动推演已进行3轮，是否继续？',
                },
            });
        }

        // 话题偏移检测：所有消息加起来每20条检测一次
        const totalMessages = messages.length;
        if (totalMessages > 0 && totalMessages % 20 === 0) {
            const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
            if (lastUserMessage) {
                const isOffTopic = await checkTopicDrift(lastUserMessage.content, topic);
                if (isOffTopic) {
                    return res.json({
                        success: true,
                        data: {
                            speakerId: 'system',
                            speakerName: '系统',
                            content: `此话题与本次群聊主题无关，我们还是回到${topic}的讨论中吧`,
                        },
                    });
                }
            }
        }

        // 构建上下文
        const contextMessages = [...messages];
        const historyText = buildHistoryText(contextMessages);

        // 找到被@的角色
        const mentionedChar = mentionedId ? characters.find((c: any) => c.id === mentionedId) : null;
        const mentionedName = mentionedChar?.name;

        // 选择发言者
        let speaker = await getNextSpeaker(
            topic,
            characters,
            contextMessages,
            undefined,
            mentionedId
        );

        if (!speaker) {
            return res.json({
                success: true,
                data: {
                    done: true,
                    message: '没有合适的发言者',
                },
            });
        }

        // ========== 发言轮次硬限制 ==========
        // 规则：单角色连续发言不能超过2次
        const lastTwoSpeakers = contextMessages.slice(-2).map(m => m.characterName);
        const consecutiveCount = lastTwoSpeakers.filter(name => name === speaker.name).length;

        if (consecutiveCount >= 2) {
            console.log(`[发言限制] ${speaker.name} 已连续发言2次，跳过`);
            return res.json({
                success: true,
                data: {
                    done: true,
                    message: '同一人连续发言超过限制',
                },
            });
        }

        // ========== 控场检测 ==========
        // 检测是否需要司马光控场（传入正确的 topicId）
        const recentMsgsForControl = contextMessages.slice(-6).map(m => ({
            characterName: m.characterName || '用户',
            content: m.content || '',
        }));
        const controlCheck = checkControlNeeded(recentMsgsForControl, topicId);

        if (controlCheck.needed) {
            console.log(`[司马光控场] ${controlCheck.reason}`);
            const controlContent = generateControlMessage(topicId, controlCheck.reason);

            return res.json({
                success: true,
                data: {
                    speakerId: 'simaguang',
                    speakerName: '司马光',
                    content: controlContent,
                    isControlMessage: true,
                    done: true,
                    done: true,
                },
            });
        }

        // 避免连续同一人说话（保留原有逻辑作为基础保护）
        const lastSpeakerName = contextMessages.length > 0
            ? contextMessages[contextMessages.length - 1].characterName
            : undefined;

        if (speaker.name === lastSpeakerName) {
            return res.json({
                success: true,
                data: {
                    done: true,
                    message: '同一人重复说话，结束',
                },
            });
        }

        // 获取角色详情
        const characterInfo = characters.find((c: any) => c.id === speaker!.id);
        if (!characterInfo) {
            return res.json({
                success: true,
                data: {
                    done: true,
                    message: '角色不存在',
                },
            });
        }

        // 构建提示（传入当前场景）
        const systemPrompt = buildCharacterPrompt(
            topic,
            characterInfo,
            characters.map((c: any) => c.name),
            undefined,
            currentScene || undefined
        );

        // 用户内容
        let userContent = '';
        if (mentionedName && replyCount === 0) {
            // 被@的第一条回复
            const lastUserMsg = [...contextMessages].reverse().find(m => m.role === 'user' || m.characterName === '用户');
            const userMsgContent = lastUserMsg?.content || '';
            userContent = `用户@了你，内容："${userMsgContent}"
你被点名了，必须先回复！
要求：
- 直接回应用户的问题或话题
- 严格贴合你的人设和《资治通鉴》记载
- 50-80字，不要长篇大论`;
        } else {
            // 后续发言（补话）
            userContent = `当前群聊内容：
${historyText}

请作为【${speaker.name}】，说1句话参与讨论。
要求：
- 基于上面的讨论，说出你的观点或回应
- 可以反驳、附和、追问
- 严格贴合人设，50-80字`;
        }

        // 调用LLM
        let llmResponse = '';
        try {
            const stream = await openai.chat.completions.create({
                model: MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userContent },
                ],
                temperature: 0.9,
                max_tokens: 150,
                stream: true,
            });

            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content;
                if (content) {
                    llmResponse += content;
                }
            }
        } catch (llmError) {
            console.error(`LLM 调用失败 (${speaker.name}):`, llmError);
            return res.json({
                success: false,
                message: 'LLM调用失败',
            });
        }

        // 解析回复
        let content = parseResponse(llmResponse, speaker.name);
        if (!content) {
            return res.json({
                success: true,
                data: {
                    done: true,
                    message: '回复解析失败',
                },
            });
        }

        // 内容校验（最多重试2次）
        const recentMsgContents = messages.slice(-5).map(m => m.content || '');
        let validationResult = validateContent(content, topicId, recentMsgContents);
        let retryCount = 0;

        while (!validationResult.isValid && retryCount < 2) {
            console.log(`[内容校验] ${speaker.name} 的发言未通过: ${validationResult.reason}，重试第${retryCount + 1}次`);

            // 重新生成
            let retryResponse = '';
            try {
                const retryStream = await openai.chat.completions.create({
                    model: MODEL,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: `${userContent}\n\n注意：之前的回复因"${validationResult.reason}"被拒绝，请重新生成，确保：
1. 包含具体的史实细节
2. 不使用辱骂、嘲讽等违规用语
3. 不要重复已有的内容` },
                    ],
                    temperature: 0.9,
                    max_tokens: 150,
                    stream: true,
                });

                for await (const chunk of retryStream) {
                    const content = chunk.choices[0]?.delta?.content;
                    if (content) {
                        retryResponse += content;
                    }
                }
            } catch (retryError) {
                console.error('重试生成失败:', retryError);
                break;
            }

            content = parseResponse(retryResponse, speaker.name);
            if (content) {
                validationResult = validateContent(content, topicId, recentMsgContents);
            }
            retryCount++;
        }

        if (!validationResult.isValid) {
            console.log(`[内容校验] ${speaker.name} 的发言校验未通过，跳过此角色`);
            // 不返回错误，而是让其他角色发言
            return res.json({
                success: true,
                data: {
                    done: true,
                    message: '内容校验未通过',
                },
            });
        }

        // 检测场景推进
        let sceneUpdate = null;
        let eventEnded = false;

        // 最后场景的结束阈值（不区分手动/自动模式）
        const MIN_MESSAGES_IN_LAST_SCENE = 5;  // 最少演绎5条消息后才开始检测
        const MAX_MESSAGES_IN_LAST_SCENE = 15; // 最多15条消息后必定结束

        // 计算当前场景的消息数（从最后一条场景切换消息之后开始计数）
        let currentSceneMessageCount = messages.length;
        for (let i = messages.length - 1; i >= 0; i--) {
            const msg = messages[i];
            if (msg.content?.includes('【场景推进】') || msg.content?.includes('【群聊开始】')) {
                currentSceneMessageCount = messages.length - 1 - i;
                break;
            }
        }
        // 如果没有找到场景切换消息，说明是第一个场景，所有消息都算当前场景
        const hasSceneChange = messages.some(m => m.content?.includes('【场景推进】'));
        if (!hasSceneChange) {
            currentSceneMessageCount = messages.length;
        }

        // 如果当前已经是最后一个场景，检测是否应该结束事件
        const isLastScene = currentScene && currentScene.sequence === scenes.length;
        if (isLastScene && currentSceneMessageCount > 0) {
            // 强制结束：当前场景消息数达到上限
            if (currentSceneMessageCount >= MAX_MESSAGES_IN_LAST_SCENE) {
                eventEnded = true;
                console.log(`[事件结束] 最后场景消息数达到上限(${MAX_MESSAGES_IN_LAST_SCENE})，强制结束`);
            }
            // 正常检测：消息数达到下限后才开始LLM判断
            else if (currentSceneMessageCount >= MIN_MESSAGES_IN_LAST_SCENE) {
                const recentMessages = messages.slice(-10).map(m =>
                    `${m.characterName || '用户'}：${m.content}`
                ).join('\n');

                const shouldEnd = await checkEventEnd(recentMessages, currentScene);
                if (shouldEnd) {
                    eventEnded = true;
                    console.log(`[事件结束] 最后场景「${currentScene.name}」演绎完毕 (当前场景${currentSceneMessageCount}条消息)`);
                }
            }
        }
        // 自动模式且强制推进
        else if (autoMode && req.body.forceAdvance && currentScene) {
            const nextScene = getNextScene(topicId, currentScene.sequence);
            if (nextScene) {
                sceneUpdate = {
                    currentSceneId: nextScene.id,
                    currentSceneName: nextScene.name,
                    currentSequence: nextScene.sequence,
                    totalScenes: scenes.length,
                    isLastScene: nextScene.sequence === scenes.length,
                };
                console.log(`[强制场景推进] ${currentScene.name} -> ${nextScene.name}`);

                // 注意：推进到最后一个场景不代表事件结束，需要等该场景充分演绎后再结束
            }
        }
        // 正常检测：每3条消息检测一次
        else if (currentScene && messages.length > 0 && messages.length % 3 === 0) {
            const recentMessages = messages.slice(-10).map(m =>
                `${m.characterName || '用户'}：${m.content}`
            ).join('\n');

            const nextScene = getNextScene(topicId, currentScene.sequence);
            const shouldAdvance = await checkSceneProgress(recentMessages, currentScene, nextScene);

            if (shouldAdvance && nextScene) {
                sceneUpdate = {
                    currentSceneId: nextScene.id,
                    currentSceneName: nextScene.name,
                    currentSequence: nextScene.sequence,
                    totalScenes: scenes.length,
                    isLastScene: nextScene.sequence === scenes.length,
                };
                console.log(`[场景推进] ${currentScene.name} -> ${nextScene.name}`);

                // 注意：推进到最后一个场景不代表事件结束，需要等该场景充分演绎后再结束
            }
        }

        // 如果事件结束，返回臣光曰（司马光作为史官评论者，不需要在角色列表中）
        let chenGuangYueMessage = null;
        if (eventEnded) {
            const simaGuang = characters.find((c: any) => c.id === 'simaguang' || c.name === '司马光');
            const chenGuangYue = getChenGuangYueByTopic(topicId);

            if (chenGuangYue) {
                // 无论司马光是否在角色列表中，都发表臣光曰（史官作为旁观者评论）
                chenGuangYueMessage = {
                    id: 'chenguangyue-' + Date.now(),
                    speakerId: simaGuang?.id || 'simaguang',
                    speakerName: '司马光',
                    content: `【臣光曰】${chenGuangYue.content}`,
                    isSystem: false,
                    avatar: simaGuang?.avatar || '📚',
                };
                console.log(`[事件结束] 司马光发表臣光曰`);
            } else {
                console.log(`[事件结束] 未找到臣光曰内容: topicId=${topicId}`);
            }
        }

        // 返回单条消息
        return res.json({
            success: true,
            data: {
                done: false,
                speakerId: speaker.id,
                speakerName: speaker.name,
                content: content,
                avatar: characterInfo.avatar,
                sceneUpdate,
                eventEnded,
                chenGuangYueMessage,
            },
        });

    } catch (error) {
        console.error('生成消息失败:', error);
        return res.status(500).json({
            success: false,
            message: '服务器错误',
        });
    }
});

/**
 * 接口：GET /api/v1/group-chat/scenes/:topicId
 * 获取话题的所有场景节点
 */
router.get('/scenes/:topicId', (req, res) => {
    try {
        const { topicId } = req.params;
        const scenes = getScenesByTopic(topicId);

        res.json({
            success: true,
            data: scenes.map(s => ({
                id: s.id,
                name: s.name,
                sequence: s.sequence,
                description: s.description,
                keyCharacters: s.keyCharacters,
                atmosphere: s.atmosphere,
            })),
        });
    } catch (error) {
        console.error('获取场景列表失败:', error);
        res.status(500).json({ success: false, message: '获取失败' });
    }
});

/**
 * 接口：POST /api/v1/group-chat/advance-scene
 * 强制推进场景（自动推演5轮后仍未切换时调用）
 */
router.post('/advance-scene', async (req, res) => {
    try {
        const { topic, currentSceneId } = req.body;

        if (!topic || !currentSceneId) {
            return res.status(400).json({
                success: false,
                message: '参数不足',
            });
        }

        const topicId = getTopicId(topic);
        const scenes = getScenesByTopic(topicId);
        const currentScene = scenes.find(s => s.id === currentSceneId);

        if (!currentScene) {
            return res.status(404).json({
                success: false,
                message: '当前场景不存在',
            });
        }

        const nextScene = getNextScene(topicId, currentScene.sequence);

        if (!nextScene) {
            return res.json({
                success: true,
                data: {
                    sceneUpdate: null,
                    message: '已经是最后一个场景',
                },
            });
        }

        console.log(`[强制推进] ${currentScene.name} -> ${nextScene.name}`);

        return res.json({
            success: true,
            data: {
                sceneUpdate: {
                    currentSceneId: nextScene.id,
                    currentSceneName: nextScene.name,
                    currentSequence: nextScene.sequence,
                    totalScenes: scenes.length,
                    isLastScene: nextScene.sequence === scenes.length,
                },
            },
        });
    } catch (error) {
        console.error('强制推进场景失败:', error);
        return res.status(500).json({
            success: false,
            message: '强制推进场景失败',
        });
    }
});

export default router;
