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
const MAX_RESPONSE_LENGTH = 100;

// 话题ID映射（话题名 -> topicId）
const TOPIC_ID_MAP: Record<string, string> = {
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
【建议行为】${currentScene.suggestedActions.join('、')}
` : '';

    return `你是【${character.name}】（${character.dynasty}·${character.title}）。

【你的性格】
${character.personality}

【你说话的风格】
${character.speakingStyle}

【你的行为约束】
${character.constraints.join('；')}

【当前话题】
${topic}
${sceneInfo}
【群聊中的其他人物】
${others}
${relationships ? `\n【你与其他人的关系】\n${relationships}` : ''}

【铁则 - 必须严格遵守】
1. 沉浸式演绎：你身处事件正在发生的现场，不是在事后评论！你的发言要体现"正在发生"的紧迫感
2. 话题锁死：你的发言必须100%紧扣【${topic}】这个话题和当前场景
3. 人设锁死：你的所有发言必须严格遵循你的人设，不能说不符合你朝代、身份、性格的话
4. 禁止现代内容：绝对不能出现现代词汇、网络用语、网络梗、穿越内容
5. 真实聊天语气：要像真人聊天一样，有反问、有吐槽、有附和、有情绪，单条发言控制在50-80字

【历史人物群聊格式】
【${character.name}】：（你的发言内容）

请以【${character.name}】的身份，根据群聊上下文，生成你的发言。`;
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
 * 开局：系统公告 + 核心人物开场
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

        // 系统公告（包含场景信息）
        const characterNames = characters.map((c: any) => c.name).join('、');
        const sceneIntro = initialScene ? `\n【当前场景：${initialScene.name}】${initialScene.description}` : '';
        const systemMessage = {
            id: 'system-' + Date.now(),
            characterId: 'system',
            characterName: '系统',
            content: `【群聊主题：${topic}】| 群成员：${characterNames}${sceneIntro}`,
            isUser: false,
            isSystem: true,
            createdAt: new Date().toISOString(),
        };

        // 核心人物开场（选择第一个角色）
        const coreCharacter = characters[0];
        const systemPrompt = buildCharacterPrompt(
            topic,
            coreCharacter,
            characters.map((c: any) => c.name),
            undefined,
            initialScene || undefined
        );

        // 根据场景生成开场提示
        const openingHint = initialScene
            ? `作为话题的核心人物，当前场景是「${initialScene.name}」，请发一条简短的开场白（20-40字），体现场景的氛围和你的角色特点。`
            : `作为话题的核心人物，请发一条简短的开场白（20-40字），引出话题"${topic}"，让其他人可以接话。`;

        const userContent = openingHint + '不要长篇大论，简单自然即可。';

        let llmResponse = '';
        try {
            const stream = await openai.chat.completions.create({
                model: MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userContent },
                ],
                temperature: 0.8,
                max_tokens: 100,
                stream: true,
            });

            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content;
                if (content) {
                    llmResponse += content;
                }
            }
        } catch (llmError) {
            console.error('LLM 调用失败:', llmError);
            return res.json({
                success: true,
                data: {
                    systemMessage,
                    openingMessage: null,
                },
            });
        }

        const content = parseResponse(llmResponse, coreCharacter.name);
        const openingMessage = content ? {
            id: 'opening-' + Date.now(),
            characterId: coreCharacter.id,
            characterName: coreCharacter.name,
            content,
            isUser: false,
            avatar: coreCharacter.avatar,
            createdAt: new Date().toISOString(),
        } : null;

        // 返回初始场景状态
        const sceneState = initialScene ? {
            currentSceneId: initialScene.id,
            currentSceneName: initialScene.name,
            currentSequence: initialScene.sequence,
            totalScenes: scenes.length,
            isLastScene: scenes.length === 1,
        } : null;

        return res.json({
            success: true,
            data: {
                systemMessage,
                openingMessage,
                sceneState,
            },
        });

    } catch (error) {
        console.error('开局失败:', error);
        return res.status(500).json({
            success: false,
            message: '服务器错误',
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

        // 避免连续同一人说话
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
        const content = parseResponse(llmResponse, speaker.name);
        if (!content) {
            return res.json({
                success: true,
                data: {
                    done: true,
                    message: '回复解析失败',
                },
            });
        }

        // 检测场景推进（每5条消息检测一次）
        let sceneUpdate = null;
        let eventEnded = false;

        if (currentScene && messages.length > 0 && messages.length % 5 === 0) {
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

                // 检查是否是最后一个场景
                if (sceneUpdate.isLastScene) {
                    eventEnded = true;
                }
            }
        }

        // 如果事件结束，检测是否有司马光并返回臣光曰
        let chenGuangYueMessage = null;
        if (eventEnded) {
            const simaGuang = characters.find((c: any) => c.id === 'simaguang' || c.name === '司马光');
            const chenGuangYue = getChenGuangYueByTopic(topicId);

            if (simaGuang && chenGuangYue) {
                chenGuangYueMessage = {
                    id: 'chenguangyue-' + Date.now(),
                    speakerId: simaGuang.id,
                    speakerName: '司马光',
                    content: `【臣光曰】${chenGuangYue.content}`,
                    isSystem: false,
                    avatar: simaGuang.avatar,
                };
                console.log(`[事件结束] 司马光发表臣光曰`);
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

export default router;
