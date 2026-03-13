export type ThemeType = 'default' | 'blue' | 'pink';

export interface Category {
  id: string;
  name: string;
  shops: string[];
}

export interface FoodData {
  categories: Category[];
  ratings?: Record<string, number>; // key: categoryId + ":" + shopName
}
