/**
 * 臣光曰原文数据 - 用于事件结束后的历史总结
 * 司马光在《资治通鉴》中对历史事件的评论
 */

export interface ChenGuangYueText {
    topicId: string;
    topicName: string;
    volumeNumber: number; // 卷号
    content: string; // 臣光曰原文
    modernTranslation?: string; // 白话译文
}

export const CHEN_GUANG_YUE_TEXTS: ChenGuangYueText[] = [
    {
        topicId: 'hongmen',
        topicName: '鸿门宴',
        volumeNumber: 9,
        content: `臣光曰：汉王之入秦，借项籍之力，而欲背之，非信也。籍以世楚之旧望，为诸侯盟主，而欲诛有功之人，非义也。虽然，籍之败也，由此始矣。`,
        modernTranslation: `司马光说：汉王刘邦能够进入关中，是借助了项羽的力量，现在却想背叛他，这是不守信义。项羽凭借楚国世代的名望，做了诸侯的盟主，却想要诛杀有功之人，这是不仁义。虽然如此，项羽的败亡，就从这里开始了。`
    },
    {
        topicId: 'zhenguan',
        topicName: '贞观之治',
        volumeNumber: 192,
        content: `臣光曰：太宗文武之才，高出前古。盖三代以还，中国之盛未之有也。观其听政，孜孜求谏，知无不言，言无不尽。魏征、王珪之徒，常犯颜直谏，虽激怒，不以为罪。此其所以致治也。`,
        modernTranslation: `司马光说：唐太宗文武双全的才能，超越前代古人。大概从夏商周三代以来，中国的强盛从来没有这样过。观察他处理政务，勤勉地征求谏言，知无不言，言无不尽。魏征、王珪等人，经常冒犯龙颜直言进谏，虽然有时激怒了皇帝，也不被定罪。这就是他能够达到大治的原因。`
    },
    {
        topicId: 'yiling',
        topicName: '夷陵之战',
        volumeNumber: 69,
        content: `臣光曰：刘备以一代枭雄，而欲以一朝之忿，举国之兵，以伐强吴，不亦惑乎！且关羽之死，自取之也。以一旅之师，而欲抗举国之锋，其败宜矣。`,
        modernTranslation: `司马光说：刘备作为一代枭雄，却因为一时的愤怒，倾举国之兵去攻打强大的吴国，岂不是太糊涂了！况且关羽的死，是他自取的。以一旅之师，想要抵抗举国的兵锋，他的失败是必然的。`
    },
];

// 根据话题ID获取臣光曰
export function getChenGuangYueByTopic(topicId: string): ChenGuangYueText | undefined {
    return CHEN_GUANG_YUE_TEXTS.find(c => c.topicId === topicId);
}

// 检查话题是否有臣光曰
export function hasChenGuangYue(topicId: string): boolean {
    return CHEN_GUANG_YUE_TEXTS.some(c => c.topicId === topicId);
}
