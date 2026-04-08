import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';

const router = Router();

/**
 * 获取人物百科
 * GET /api/v1/encyclopedia/characters/:name
 */
router.get('/characters/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const supabase = getSupabaseClient();
    
    // 先按 name 精确匹配
    let { data: character, error } = await supabase
      .from('characters')
      .select('*')
      .eq('name', name)
      .single();

    // 如果没找到，再在别名中查找
    if (error || !character) {
      const { data: charactersByAlias, error: aliasError } = await supabase
        .rpc('search_character_by_alias', { search_name: name });
      
      if (!aliasError && charactersByAlias && charactersByAlias.length > 0) {
        character = charactersByAlias[0];
      }
    }

    if (!character) {
      return res.status(404).json({
        success: false,
        error: '人物未找到'
      });
    }

    // 将 aliases 字段从字符串转换为数组
    const processedData = {
      ...character,
      aliases: character.aliases ? character.aliases.split(',').map((s: string) => s.trim()).filter((s: string) => s) : [],
    };

    res.json({
      success: true,
      data: processedData
    });
  } catch (error) {
    console.error('获取人物百科失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器错误'
    });
  }
});

/**
 * 获取官职百科
 * GET /api/v1/encyclopedia/titles/:name
 */
router.get('/titles/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const supabase = getSupabaseClient();
    
    // 先按 name 精确匹配
    let { data: title, error } = await supabase
      .from('titles')
      .select('*')
      .eq('name', name)
      .single();

    // 如果没找到，再在别名中查找
    if (error || !title) {
      const { data: titlesByAlias, error: aliasError } = await supabase
        .rpc('search_title_by_alias', { search_name: name });
      
      if (!aliasError && titlesByAlias && titlesByAlias.length > 0) {
        title = titlesByAlias[0];
      }
    }

    if (!title) {
      return res.status(404).json({
        success: false,
        error: '官职未找到'
      });
    }

    // 将 aliases 字段从字符串转换为数组
    const processedData = {
      ...title,
      aliases: title.aliases ? title.aliases.split(',').map((s: string) => s.trim()).filter((s: string) => s) : [],
    };

    res.json({
      success: true,
      data: processedData
    });
  } catch (error) {
    console.error('获取官职百科失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器错误'
    });
  }
});

/**
 * 获取所有人物列表
 * GET /api/v1/encyclopedia/characters
 */
router.get('/characters', async (req, res) => {
  try {
    const { dynasty, limit = 20, offset = 0 } = req.query;
    const supabase = getSupabaseClient();
    
    let query = supabase.from('characters').select('*');
    
    if (dynasty) {
      query = query.eq('dynasty', dynasty as string);
    }
    
    const { data: characterList, error } = await query
      .limit(Number(limit))
      .range(Number(offset), Number(offset) + Number(limit) - 1);
    
    if (error) {
      throw error;
    }
    
    // 将 aliases 字段从字符串转换为数组
    const processedData = (characterList || []).map((item: any) => ({
      ...item,
      aliases: item.aliases ? item.aliases.split(',').map((s: string) => s.trim()).filter((s: string) => s) : [],
    }));
    
    res.json({
      success: true,
      data: processedData
    });
  } catch (error) {
    console.error('获取人物列表失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器错误'
    });
  }
});

/**
 * 获取所有官职列表
 * GET /api/v1/encyclopedia/titles
 */
router.get('/titles', async (req, res) => {
  try {
    const { dynasty, limit = 20, offset = 0 } = req.query;
    const supabase = getSupabaseClient();
    
    let query = supabase.from('titles').select('*');
    
    if (dynasty) {
      query = query.eq('dynasty', dynasty as string);
    }
    
    const { data: titleList, error } = await query
      .limit(Number(limit))
      .range(Number(offset), Number(offset) + Number(limit) - 1);
    
    if (error) {
      throw error;
    }
    
    // 将 aliases 字段从字符串转换为数组
    const processedData = (titleList || []).map((item: any) => ({
      ...item,
      aliases: item.aliases ? item.aliases.split(',').map((s: string) => s.trim()).filter((s: string) => s) : [],
    }));
    
    res.json({
      success: true,
      data: processedData
    });
  } catch (error) {
    console.error('获取官职列表失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器错误'
    });
  }
});

/**
 * 批量获取人物/官职信息（用于前端高亮）
 * POST /api/v1/encyclopedia/batch
 */
router.post('/batch', async (req, res) => {
  try {
    const { names } = req.body; // names: string[]
    
    if (!Array.isArray(names) || names.length === 0) {
      return res.status(400).json({
        success: false,
        error: '参数错误'
      });
    }

    const supabase = getSupabaseClient();

    // 查找所有匹配的人物和官职
    const [characterResults, titleResults] = await Promise.all([
      supabase
        .from('characters')
        .select('*')
        .in('name', names),
      supabase
        .from('titles')
        .select('*')
        .in('name', names)
    ]);

    if (characterResults.error || titleResults.error) {
      throw new Error('查询失败');
    }

    // 合并结果，并将 aliases 字段从字符串转换为数组
    const results = [
      ...characterResults.data.map((c: any) => ({
        ...c,
        type: 'character',
        aliases: c.aliases ? c.aliases.split(',').map((s: string) => s.trim()).filter((s: string) => s) : [],
      })),
      ...titleResults.data.map((t: any) => ({
        ...t,
        type: 'title',
        aliases: t.aliases ? t.aliases.split(',').map((s: string) => s.trim()).filter((s: string) => s) : [],
      }))
    ];

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('批量获取失败:', error);
    res.status(500).json({
      success: false,
      error: '服务器错误'
    });
  }
});

export default router;
