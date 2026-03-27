import { getSupabaseClient } from './src/storage/database/supabase-client';

async function clearData() {
  const supabase = getSupabaseClient();

  console.log('开始清空数据...');

  // 先删除段落（因为有外键约束）
  const { error: paragraphsError } = await supabase
    .from('zizhitongjian_paragraphs')
    .delete()
    .neq('id', 0);

  if (paragraphsError) {
    console.error('删除段落失败:', paragraphsError);
  } else {
    console.log('段落已清空');
  }

  // 再删除卷
  const { error: volumesError } = await supabase
    .from('zizhitongjian_volumes')
    .delete()
    .neq('id', 0);

  if (volumesError) {
    console.error('删除卷失败:', volumesError);
  } else {
    console.log('卷已清空');
  }

  console.log('数据清空完成！');
}

clearData().catch(console.error);
