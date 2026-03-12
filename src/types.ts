export interface Category {
  id: string;
  name: string;
  shops: string[];
}

export interface FoodData {
  categories: Category[];
}
