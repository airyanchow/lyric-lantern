// Mandopop artist seed list, grouped by era of peak activity.
// The catalog generator queries YouTube for each (artist, year) pair within
// the artist's active years. Coverage is Sinosphere-wide:
// Mainland China, Taiwan, Hong Kong (Mandarin tracks), Singapore, Malaysia.
//
// Add/remove artists freely — the generator is keyed off this list.

export interface ArtistSeed {
  /** Display name used in YouTube search queries. */
  name: string;
  /** Alt names (English, Romanized) tried in additional searches. */
  aliases?: string[];
  /** Region — used for tagging only; doesn't affect search. */
  region: "CN" | "TW" | "HK" | "SG" | "MY";
  /** Inclusive [start, end] years of major output (rough). */
  active: [number, number];
}

export const MANDOPOP_ARTISTS: ArtistSeed[] = [
  // ── Mega-stars, 2000s–2020s ──
  { name: "周杰伦", aliases: ["Jay Chou"], region: "TW", active: [2007, 2026] },
  { name: "林俊杰", aliases: ["JJ Lin", "林俊傑"], region: "SG", active: [2007, 2026] },
  { name: "蔡依林", aliases: ["Jolin Tsai"], region: "TW", active: [2007, 2026] },
  { name: "陈奕迅", aliases: ["Eason Chan", "陳奕迅"], region: "HK", active: [2007, 2026] },
  { name: "孙燕姿", aliases: ["Stefanie Sun", "孫燕姿"], region: "SG", active: [2007, 2024] },
  { name: "王力宏", aliases: ["Wang Leehom"], region: "TW", active: [2007, 2021] },
  { name: "五月天", aliases: ["Mayday"], region: "TW", active: [2007, 2026] },
  { name: "張惠妹", aliases: ["A-Mei", "张惠妹", "aMEI"], region: "TW", active: [2007, 2026] },
  { name: "張學友", aliases: ["Jacky Cheung", "张学友"], region: "HK", active: [2007, 2022] },
  { name: "S.H.E", aliases: ["SHE"], region: "TW", active: [2007, 2018] },
  { name: "蔡健雅", aliases: ["Tanya Chua"], region: "SG", active: [2007, 2026] },
  { name: "梁靜茹", aliases: ["Fish Leong", "梁静茹"], region: "MY", active: [2007, 2024] },
  { name: "王菲", aliases: ["Faye Wong"], region: "CN", active: [2007, 2018] },
  { name: "莫文蔚", aliases: ["Karen Mok"], region: "HK", active: [2007, 2024] },
  { name: "陶喆", aliases: ["David Tao"], region: "TW", active: [2007, 2020] },
  { name: "罗志祥", aliases: ["Show Lo", "羅志祥"], region: "TW", active: [2007, 2021] },

  // ── 2010s breakout ──
  { name: "邓紫棋", aliases: ["G.E.M.", "鄧紫棋"], region: "HK", active: [2010, 2026] },
  { name: "田馥甄", aliases: ["Hebe Tien"], region: "TW", active: [2010, 2026] },
  { name: "林宥嘉", aliases: ["Yoga Lin"], region: "TW", active: [2008, 2026] },
  { name: "徐佳瑩", aliases: ["LaLa Hsu", "徐佳莹"], region: "TW", active: [2009, 2026] },
  { name: "蘇打綠", aliases: ["Sodagreen", "苏打绿"], region: "TW", active: [2007, 2026] },
  { name: "魏如萱", aliases: ["Waa Wei"], region: "TW", active: [2010, 2026] },
  { name: "韋禮安", aliases: ["Weibird Wei", "韦礼安"], region: "TW", active: [2010, 2026] },
  { name: "盧廣仲", aliases: ["Crowd Lu", "卢广仲"], region: "TW", active: [2008, 2026] },
  { name: "周興哲", aliases: ["Eric Chou", "周兴哲"], region: "TW", active: [2014, 2026] },
  { name: "李榮浩", aliases: ["Ronghao Li", "李荣浩"], region: "CN", active: [2013, 2026] },
  { name: "薛之谦", aliases: ["Joker Xue", "薛之謙"], region: "CN", active: [2010, 2026] },
  { name: "毛不易", aliases: ["Mao Buyi"], region: "CN", active: [2017, 2026] },
  { name: "华晨宇", aliases: ["Hua Chenyu"], region: "CN", active: [2013, 2026] },
  { name: "张靓颖", aliases: ["Jane Zhang", "張靚穎"], region: "CN", active: [2007, 2026] },
  { name: "韩红", aliases: ["Han Hong", "韓紅"], region: "CN", active: [2007, 2024] },

  // ── Late-2010s / 2020s ──
  { name: "TFBOYS", region: "CN", active: [2013, 2024] },
  { name: "刘宇宁", aliases: ["Liu Yuning", "劉宇寧"], region: "CN", active: [2018, 2026] },
  { name: "張韶涵", aliases: ["Angela Chang", "张韶涵"], region: "TW", active: [2007, 2026] },
  { name: "鄧麗欣", aliases: ["Stephy Tang", "邓丽欣"], region: "HK", active: [2007, 2024] },
  { name: "鄭秀文", aliases: ["Sammi Cheng", "郑秀文"], region: "HK", active: [2007, 2024] },
  { name: "容祖兒", aliases: ["Joey Yung", "容祖儿"], region: "HK", active: [2007, 2024] },
  { name: "蘇打綠", aliases: ["Sodagreen"], region: "TW", active: [2007, 2026] },
  { name: "告五人", aliases: ["Accusefive"], region: "TW", active: [2017, 2026] },
  { name: "理想混蛋", aliases: ["Bestards"], region: "TW", active: [2018, 2026] },
  { name: "9m88", region: "TW", active: [2017, 2026] },
  { name: "落日飛車", aliases: ["Sunset Rollercoaster", "落日飞车"], region: "TW", active: [2011, 2026] },
  { name: "茄子蛋", aliases: ["EggPlantEgg"], region: "TW", active: [2017, 2026] },
  { name: "草东没有派对", aliases: ["No Party For Cao Dong", "草東沒有派對"], region: "TW", active: [2015, 2026] },
  { name: "刘若英", aliases: ["Rene Liu", "劉若英"], region: "TW", active: [2007, 2024] },
  { name: "汪苏泷", aliases: ["Silence Wang", "汪蘇瀧"], region: "CN", active: [2010, 2026] },
  { name: "许嵩", aliases: ["Vae Xu", "許嵩"], region: "CN", active: [2009, 2026] },

  // ── Variety / pop crossover ──
  { name: "胡彦斌", aliases: ["Tiger Hu", "胡彥斌"], region: "CN", active: [2007, 2026] },
  { name: "黄家强", aliases: ["Steve Wong", "Beyond"], region: "HK", active: [2007, 2022] },
  { name: "羅大佑", aliases: ["Lo Ta-yu", "罗大佑"], region: "TW", active: [2007, 2022] },
  { name: "李宇春", aliases: ["Chris Lee"], region: "CN", active: [2007, 2026] },
  { name: "李健", aliases: ["Li Jian"], region: "CN", active: [2007, 2026] },
  { name: "朴树", aliases: ["Pu Shu", "樸樹"], region: "CN", active: [2007, 2024] },
  { name: "陈粒", aliases: ["Chen Li", "陳粒"], region: "CN", active: [2014, 2026] },
  { name: "万能青年旅店", aliases: ["Omnipotent Youth Society"], region: "CN", active: [2010, 2026] },
];

/** Theme/seasonal queries to broaden coverage beyond top artists. */
export const MANDOPOP_THEME_QUERIES: string[] = [
  "华语流行音乐",
  "中文金曲",
  "中文热门歌曲",
  "国语流行",
  "国语经典",
  "校园民谣",
  "古风歌曲",
  "華語流行金曲",
  "KKBOX 中文",
  "Hit FM 中文",
];
