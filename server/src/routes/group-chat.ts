import { Router } from 'express';
import { LLMClient, Config } from 'coze-coding-dev-sdk';

const router = Router();

// 初始化 LLM 客户端
const config = new Config();
const llmClient = new LLMClient(config);

// 上下文限制
const MAX_CONTEXT_MESSAGES = 15;

// 回复长度
const MIN_RESPONSE_LENGTH = 20;

// 构建单个角色的系统提示
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
  otherCharacters: string[]
): string {
  const others = otherCharacters.filter(n => n !== character.name).join('、');

  return `你是【${character.name}】（${character.dynasty}·${character.title}）。

【你的性格】
${character.personality}

【你说话的风格】
${character.speakingStyle}

【你的行为约束】
${character.constraints.join('；')}

【当前话题】
${topic}

【群聊中的其他人物】
${others}

【重要规则】
1. 严格依据《资治通鉴》记载的历史事实
2. 不得出现现代词汇、网络梗、穿越内容
3. 不得OOC（角色崩坏）
4. 发言控制在20-60字
5. 只生成你一个人的1条发言，不要生成其他角色的内容

【历史人物群聊格式】
【${character.name}】：（你的发言内容）

请以【${character.name}】的身份，根据群聊上下文，生成你的发言。`;
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
${mentionedName}被点名了，应该先回应！`;
  } else if (userMessage) {
    trigger = `【用户刚刚发言】
${userMessage}`;
  } else if (!historyText) {
    trigger = `【话题】
${topic}`;
  }

  return `你是一个群聊主持人，需要决定谁应该接着说话。

【可用角色】
${characterList}

${context}

${trigger}

【选择规则】
1. 如果有人被@点名，必须让该角色回应
2. 如果用户发言，相关角色应该回应
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
    return match[1].trim();
  }
  
  // 如果没有匹配到格式，返回清理后的内容
  const lines = response.split('\n').filter(line => line.trim());
  if (lines.length > 0) {
    const content = lines[0].replace(/^【.+?】：/, '').trim();
    if (content.length >= MIN_RESPONSE_LENGTH) {
      return content;
    }
  }
  
  // 返回原始内容的前80字
  const cleaned = response.replace(/^【.+?】：/, '').trim();
  if (cleaned.length >= MIN_RESPONSE_LENGTH) {
    return cleaned.slice(0, 80);
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
  const characterNames = characters.map(c => c.name);
  
  // 如果有@指定角色，优先让该角色说话
  if (mentionedId) {
    const mentionedChar = characters.find(c => c.id === mentionedId);
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
    const stream = llmClient.stream([
      { role: 'system', content: '你是一个群聊主持人，擅长选择合适的角色发言。' },
      { role: 'user', content: prompt },
    ], {
      model: 'doubao-seed-1-8-251228',
      temperature: 0.7,
      max_tokens: 50,
    });

    for await (const chunk of stream) {
      if (chunk.content) {
        response += chunk.content.toString();
      }
    }

    // 解析角色名
    const selectedName = response.trim();
    const lastSpeakerName = history.length > 0 ? history[history.length - 1].characterName : undefined;
    const character = characters.find(c => 
      c.name === selectedName && c.name !== lastSpeakerName
    );

    if (character) {
      return { id: character.id, name: character.name };
    }

    // 如果选择失败，随机选一个
    let available = characters.filter(c => c.name !== lastSpeakerName);
    if (available.length === 0) available = characters;
    return available[Math.floor(Math.random() * available.length)];

  } catch (error) {
    console.error('选择发言者失败:', error);
    // 降级：随机选择
    const lastSpeakerName = history.length > 0 ? history[history.length - 1].characterName : undefined;
    let available = characters.filter(c => c.name !== lastSpeakerName);
    if (available.length === 0) available = characters;
    return available[Math.floor(Math.random() * available.length)];
  }
}

/**
 * 接口：POST /api/v1/group-chat/generate-next
 * 串行模式：每次只生成一条消息，基于前端已显示的真实历史
 */
router.post('/generate-next', async (req, res) => {
  try {
    const {
      topic,
      characters,
      messages = [],      // 前端已显示的消息历史
      messageType,         // 'init' | 'user'
      userMessage,         // 用户说的话
      mentionedId,         // 被@的角色ID
    } = req.body;

    if (!topic || !characters || characters.length < 2) {
      return res.status(400).json({
        success: false,
        message: '参数不足',
      });
    }

    // 构建上下文（包含前端传过来的真实历史）
    const contextMessages = [...messages];
    if (messageType === 'user' && userMessage) {
      contextMessages.push({
        role: 'user',
        characterName: '用户',
        content: userMessage,
      });
    }

    // 找到被@的角色
    const mentionedChar = mentionedId ? characters.find((c: any) => c.id === mentionedId) : null;
    const mentionedName = mentionedChar?.name;

    // 选择发言者
    let speaker = await getNextSpeaker(
      topic,
      characters,
      contextMessages,
      messageType === 'user' ? userMessage : undefined,
      mentionedId
    );

    // 如果有@指定，确保被@的角色优先
    if (mentionedName && speaker?.name !== mentionedName) {
      const mentionedCharInfo = characters.find((c: any) => c.name === mentionedName);
      if (mentionedCharInfo) {
        speaker = { id: mentionedCharInfo.id, name: mentionedName };
      }
    }

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
      speaker = await getNextSpeaker(
        topic,
        characters,
        contextMessages,
        undefined,
        undefined
      );
      if (!speaker || speaker.name === lastSpeakerName) {
        return res.json({
          success: true,
          data: {
            done: true,
            message: '同一人重复说话，结束',
          },
        });
      }
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

    // 构建历史文本（基于前端传过来的真实历史）
    const historyText = buildHistoryText(contextMessages);

    // 构建提示
    const systemPrompt = buildCharacterPrompt(
      topic,
      characterInfo,
      characters.map((c: any) => c.name)
    );

    // 用户内容
    let userContent = '';
    if (mentionedName && messageType === 'user') {
      // 用户@了某角色
      userContent = `用户（我）@了你："${userMessage}"
你被点名了！【${speaker.name}】，请回应用户的发言！
要求：
- 你被@了，必须回应
- 符合【${speaker.name}】的性格
- 情绪要饱满，可以感谢、反驳、支持或追问`;
    } else if (messageType === 'init') {
      // 初始发言
      userContent = `请围绕"${topic}"这个话题，作为【${speaker.name}】发表你的看法或发起讨论。
要求：
- 符合【${speaker.name}】的性格和说话风格
- 内容要引人入胜，能引发其他人的讨论
- 可以表达观点、提出问题、或者发表感慨`;
    } else if (messageType === 'user' && contextMessages.length === 1) {
      // 用户发言后的第一条AI回复
      userContent = `用户（我）刚刚发言："${userMessage}"
请作为【${speaker.name}】，对用户的发言做出回应。
要求：
- 符合【${speaker.name}】的性格
- 情绪要饱满，可以支持、反驳、追问或感慨`;
    } else {
      // 后续发言：基于真实历史
      userContent = `当前群聊内容：
${historyText}

请作为【${speaker.name}】，继续参与讨论。
要求：
- 基于上面的讨论，说出你的观点或回应
- 可以反驳、附和、追问、或者引入新角度
- 符合【${speaker.name}】的性格和说话风格`;
    }

    // 调用LLM
    let llmResponse = '';
    try {
      const stream = llmClient.stream([
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: userContent },
      ], {
        model: 'doubao-seed-1-8-251228',
        temperature: 0.9,
        max_tokens: 200,
      });

      for await (const chunk of stream) {
        if (chunk.content) {
          llmResponse += chunk.content.toString();
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

    // 返回单条消息
    return res.json({
      success: true,
      data: {
        done: false,
        speakerId: speaker.id,
        speakerName: speaker.name,
        content: content,
        avatar: characterInfo.avatar,
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
