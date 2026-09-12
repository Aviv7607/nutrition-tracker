export function calculateBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: string
): number {
  // Mifflin-St Jeor Equation
  if (gender.toLowerCase() === "female") {
    return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }
  return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
}

export function calculateTDEE(bmr: number, activityLevel: number): number {
  return bmr * activityLevel;
}

export function calculateTargets(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: string,
  activityLevel: number,
  targetDeficit: number,
  proteinPerKg: number,
  manualCalorieTarget?: number,
  manualProteinTarget?: number
) {
  const bmr = calculateBMR(weightKg, heightCm, age, gender);
  const tdee = calculateTDEE(bmr, activityLevel);
  
  const dailyCalorieTarget = manualCalorieTarget && manualCalorieTarget > 0 
    ? manualCalorieTarget 
    : (tdee - targetDeficit);
    
  const targetProtein = manualProteinTarget && manualProteinTarget > 0 
    ? manualProteinTarget 
    : (weightKg * proteinPerKg);

  // Assuming generic macro split for remaining calories:
  // 1g protein = 4 kcal, 1g fat = 9 kcal, 1g carbs = 4 kcal
  // Let's say fat is 25% of calories
  const fatCalories = dailyCalorieTarget * 0.25;
  const targetFat = fatCalories / 9;
  
  const proteinCalories = targetProtein * 4;
  const remainingCalories = dailyCalorieTarget - proteinCalories - fatCalories;
  const targetCarbs = Math.max(0, remainingCalories / 4);

  return {
    bmr,
    tdee,
    dailyCalorieTarget,
    targetProtein,
    targetFat,
    targetCarbs,
  };
}
