import { Category } from "./types";

export const INITIAL_CATEGORIES: Category[] = [
  { id: "1", name: "中式快餐店", shops: ["老乡鸡", "真功夫", "大米先生"] },
  { id: "2", name: "包子粥点店", shops: ["芭比馒头", "三津汤包", "嘉和一品"] },
  { id: "3", name: "米线面条店", shops: ["阿香米线", "兰州拉面", "和府捞面"] },
  { id: "4", name: "火锅店", shops: ["海底捞", "呷哺呷哺", "小龙坎"] },
  { id: "5", name: "烧烤店", shops: ["木屋烧烤", "很久以前", "丰茂烤串"] },
  { id: "6", name: "自助餐店", shops: ["比格比萨", "多伦多海鲜", "第六季"] },
  { id: "7", name: "特色小吃店", shops: ["沙县小吃", "正新鸡排", "夸父炸串"] },
];

export const STORAGE_KEY = "food_picker_data";
export const THEME_STORAGE_KEY = "food_picker_theme";
