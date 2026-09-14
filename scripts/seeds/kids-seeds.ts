// Children's song seeds.
// Mix of:
//  - Curated YouTube channels (Disney 中文, 宝宝巴士, 贝瓦儿歌, etc.) — the generator
//    enumerates the uploads playlist via the YouTube Data API.
//  - Classic public-domain folk song queries — broad, always-safe.

export interface KidsChannelSeed {
  name: string;
  channelId?: string; // optional; leave blank to discover by handle/name search
  handle?: string;    // YouTube @handle
  maxSongs?: number;  // cap pulls per channel (default 30)
}

export const KIDS_CHANNELS: KidsChannelSeed[] = [
  { name: "贝瓦儿歌 Beva Kids", handle: "@beva", maxSongs: 40 },
  { name: "宝宝巴士 BabyBus", handle: "@babybus", maxSongs: 40 },
  { name: "小伴龙儿歌 XBL", handle: "@xiaobanlong", maxSongs: 30 },
  { name: "Little Fox Chinese", handle: "@LittleFoxChinese", maxSongs: 40 },
  { name: "Super Simple 中文", handle: "@SuperSimpleChineseTV", maxSongs: 30 },
  { name: "迪士尼中文官方", handle: "@DisneyChannelTaiwan", maxSongs: 30 },
  { name: "巧虎中文官方頻道", handle: "@QiaohuTaiwan", maxSongs: 30 },
  { name: "Chinese Buddy 儿歌", handle: "@chinesebuddy", maxSongs: 20 },
];

/** Public-domain or widely-covered children's songs (used as direct search queries). */
export const KIDS_CLASSIC_QUERIES: string[] = [
  "两只老虎 儿歌",
  "小星星 儿歌",
  "茉莉花 儿歌",
  "卖报歌 儿歌",
  "数鸭子 儿歌",
  "采蘑菇的小姑娘 儿歌",
  "一闪一闪亮晶晶 中文",
  "拔萝卜 儿歌",
  "找朋友 儿歌",
  "上学歌 儿歌",
  "新年好 儿歌",
  "捉泥鳅 儿歌",
  "妈妈的吻 儿歌",
  "小燕子 儿歌",
  "丢手绢 儿歌",
  "让我们荡起双桨 儿歌",
  "小毛驴 儿歌",
  "我爱北京天安门 儿歌",
  "歌声与微笑 儿歌",
  "幸福拍手歌 儿歌",
  "三只小熊 中文",
  "蝴蝶花 儿歌",
  "小蜜蜂 儿歌",
  "大头儿子小头爸爸 主题曲",
  "葫芦兄弟 主题曲",
  "黑猫警长 主题曲",
  "西游记 儿歌",
  "小哪吒 儿歌",
  "蓝皮鼠和大脸猫 主题曲",
  "猫和老鼠 中文版 主题曲",
];
