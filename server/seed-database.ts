import { getSupabaseClient } from './src/storage/database/supabase-client';

async function seedDatabase() {
  const supabase = getSupabaseClient();

  console.log('开始插入示例数据...');

  // 第一卷数据
  const volume1Data = {
    volume_number: 1,
    era_name: '周纪一',
    dynasty: '周',
    emperor: '周威烈王',
    year: '公元前403年',
    reign_year: '威烈王二十三年',
    summary: '初命晋大夫魏斯、赵籍、韩虔为诸侯。',
    paragraphs: [
      {
        paragraph_index: 1,
        original: '初命晋大夫魏斯、赵籍、韩虔为诸侯。',
        annotation: '【胡三省注】魏斯即魏文侯，赵籍即赵烈侯，韩虔即韩景侯。三晋受命为诸侯，在此年开始。',
        translation: '开始任命晋国的大夫魏斯、赵籍、韩虔为诸侯。'
      },
      {
        paragraph_index: 2,
        original: '臣光曰：臣闻天子之职莫大于礼，礼莫大于分，分莫大于名。',
        annotation: '【胡三省注】此为司马光评论周室衰微的原因。',
        translation: '臣司马光说：我听说天子的职责没有比礼更重要的，礼没有比分更重要的，分没有比名更重要的。'
      },
      {
        paragraph_index: 3,
        original: '是故以天子之势，而令三晋之臣，违礼乱分，不可不也。',
        annotation: '【胡三省注】司马光批评周威烈王破坏礼制。',
        translation: '所以凭着天子的权势，而命令三晋的臣子，违背礼制、破坏名分，是不可以的。'
      }
    ]
  };

  // 第二卷数据
  const volume2Data = {
    volume_number: 2,
    era_name: '周纪二',
    dynasty: '周',
    emperor: '周安王',
    year: '公元前402年',
    reign_year: '安王元年',
    summary: '周安王元年，齐、楚、晋、越等诸侯会盟。',
    paragraphs: [
      {
        paragraph_index: 1,
        original: '安王元年。庚辰，公元四百零一年。',
        annotation: '【胡三省注】周安王即位。',
        translation: '周安王元年。庚辰年，公元前401年。'
      },
      {
        paragraph_index: 2,
        original: '齐田和初为诸侯。',
        annotation: '【胡三省注】田氏代齐，田和被封为诸侯。',
        translation: '齐国的田和开始成为诸侯。'
      }
    ]
  };

  // 第三卷数据
  const volume3Data = {
    volume_number: 3,
    era_name: '周纪三',
    dynasty: '周',
    emperor: '周安王',
    year: '公元前401年',
    reign_year: '安王二年',
    summary: '周安王二年，晋国六卿内乱。',
    paragraphs: [
      {
        paragraph_index: 1,
        original: '安王二年。辛巳，公元四百年。',
        annotation: '【胡三省注】继续记载周安王时期。',
        translation: '周安王二年。辛巳年，公元前400年。'
      },
      {
        paragraph_index: 2,
        original: '魏、韩、赵三家分晋。',
        annotation: '【胡三省注】三家分晋是战国时期的标志性事件。',
        translation: '魏、韩、赵三家瓜分了晋国。'
      },
      {
        paragraph_index: 3,
        original: '韩景侯伐郑，取雍丘。',
        annotation: '【胡三省注】韩国开始对外扩张。',
        translation: '韩景侯攻打郑国，夺取了雍丘。'
      }
    ]
  };

  // 插入第一卷
  console.log('插入第一卷...');
  const { data: volume1, error: volume1Error } = await supabase
    .from('zizhitongjian_volumes')
    .insert({
      volume_number: volume1Data.volume_number,
      era_name: volume1Data.era_name,
      dynasty: volume1Data.dynasty,
      emperor: volume1Data.emperor,
      year: volume1Data.year,
      reign_year: volume1Data.reign_year,
      summary: volume1Data.summary,
    })
    .select()
    .single();

  if (volume1Error) {
    console.error('插入第一卷失败:', volume1Error);
  } else {
    console.log('第一卷插入成功，ID:', volume1.id);

    // 插入第一卷段落
    const paragraphs1ToInsert = volume1Data.paragraphs.map(p => ({
      volume_id: volume1.id,
      paragraph_index: p.paragraph_index,
      original: p.original,
      annotation: p.annotation,
      translation: p.translation,
    }));

    const { error: paragraphs1Error } = await supabase
      .from('zizhitongjian_paragraphs')
      .insert(paragraphs1ToInsert);

    if (paragraphs1Error) {
      console.error('插入第一卷段落失败:', paragraphs1Error);
    } else {
      console.log('第一卷段落插入成功');
    }
  }

  // 插入第二卷
  console.log('插入第二卷...');
  const { data: volume2, error: volume2Error } = await supabase
    .from('zizhitongjian_volumes')
    .insert({
      volume_number: volume2Data.volume_number,
      era_name: volume2Data.era_name,
      dynasty: volume2Data.dynasty,
      emperor: volume2Data.emperor,
      year: volume2Data.year,
      reign_year: volume2Data.reign_year,
      summary: volume2Data.summary,
    })
    .select()
    .single();

  if (volume2Error) {
    console.error('插入第二卷失败:', volume2Error);
  } else {
    console.log('第二卷插入成功，ID:', volume2.id);

    // 插入第二卷段落
    const paragraphs2ToInsert = volume2Data.paragraphs.map(p => ({
      volume_id: volume2.id,
      paragraph_index: p.paragraph_index,
      original: p.original,
      annotation: p.annotation,
      translation: p.translation,
    }));

    const { error: paragraphs2Error } = await supabase
      .from('zizhitongjian_paragraphs')
      .insert(paragraphs2ToInsert);

    if (paragraphs2Error) {
      console.error('插入第二卷段落失败:', paragraphs2Error);
    } else {
      console.log('第二卷段落插入成功');
    }
  }

  // 插入第三卷
  console.log('插入第三卷...');
  const { data: volume3, error: volume3Error } = await supabase
    .from('zizhitongjian_volumes')
    .insert({
      volume_number: volume3Data.volume_number,
      era_name: volume3Data.era_name,
      dynasty: volume3Data.dynasty,
      emperor: volume3Data.emperor,
      year: volume3Data.year,
      reign_year: volume3Data.reign_year,
      summary: volume3Data.summary,
    })
    .select()
    .single();

  if (volume3Error) {
    console.error('插入第三卷失败:', volume3Error);
  } else {
    console.log('第三卷插入成功，ID:', volume3.id);

    // 插入第三卷段落
    const paragraphs3ToInsert = volume3Data.paragraphs.map(p => ({
      volume_id: volume3.id,
      paragraph_index: p.paragraph_index,
      original: p.original,
      annotation: p.annotation,
      translation: p.translation,
    }));

    const { error: paragraphs3Error } = await supabase
      .from('zizhitongjian_paragraphs')
      .insert(paragraphs3ToInsert);

    if (paragraphs3Error) {
      console.error('插入第三卷段落失败:', paragraphs3Error);
    } else {
      console.log('第三卷段落插入成功');
    }
  }

  console.log('示例数据插入完成！');
}

seedDatabase().catch(console.error);
