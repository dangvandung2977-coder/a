// types/progression.ts
export type ExerciseCategory = 'upper_compound' | 'lower_compound' | 'isolation';

export interface ExerciseState {
  currentWeight: number;
  targetReps: number[];
  plateauCount: number;
  isCalibrating: boolean;
  lastReps?: number[];
}

export interface ProgressionResult {
  nextWeight: number;
  nextTargetReps: number[];
  nextPlateauCount: number;
  isCalibrating: boolean;
  actionMessage: string;
}

/**
 * THUẬT TOÁN DOUBLE PROGRESSION + DELOAD
 */
export function calculateNextSession(
  state: ExerciseState,
  actualReps: number[],
  category: ExerciseCategory,
  hasMicroplates: boolean,
  minRep: number = 8,
  maxRep: number = 12
): ProgressionResult {
  const { currentWeight, plateauCount, isCalibrating } = state;
  const numSets = actualReps.length;

  // Bước nhảy tạ tiêu chuẩn
  let weightIncrement = 2.5; // Thân trên mặc định 2.5kg
  if (category === 'lower_compound') {
    weightIncrement = 5.0; // Thân dưới 5kg
  } else if (category === 'isolation') {
    weightIncrement = hasMicroplates ? 1.0 : 2.0;
  }

  // TRƯỜNG HỢP 1: GIAI ĐOẠN DÒ TẠ BUỔI ĐẦU (CALIBRATION)
  // Nếu rớt xuống dưới min rep ở bất kỳ set nào -> Buổi sau hạ tạ
  if (isCalibrating) {
    const isBelowMin = actualReps.some(r => r < minRep);
    if (isBelowMin) {
      const loweredWeight = Math.max(0, currentWeight - weightIncrement);
      return {
        nextWeight: loweredWeight,
        nextTargetReps: Array(numSets).fill(minRep),
        nextPlateauCount: 0,
        isCalibrating: true, // Vẫn tiếp tục dò
        actionMessage: `Tạ hơi nặng (chưa đạt ${minRep} rep). Tự động hạ ${weightIncrement}kg để đúng form!`
      };
    } else {
      // Đã đẩy đạt từ minRep trở lên -> Chính thức kết thúc dò tạ, vào chu kỳ chuẩn
      return {
        nextWeight: currentWeight,
        nextTargetReps: distributePlusOneRep(actualReps, maxRep),
        nextPlateauCount: 0,
        isCalibrating: false,
        actionMessage: `Đã xác nhận mức tạ chuẩn! Bắt đầu chu kỳ tăng rep.`
      };
    }
  }

  // TRƯỜNG HỢP 2: CHẠM TRẦN (HIT THE CAP) - TẤT CẢ CÁC SET ĐẠT MAX REP
  const hitTheCap = actualReps.every(r => r >= maxRep);
  if (hitTheCap) {
    return {
      nextWeight: currentWeight + weightIncrement,
      nextTargetReps: Array(numSets).fill(minRep), // Reset về đáy range (ví dụ 8 rep)
      nextPlateauCount: 0,
      isCalibrating: false,
      actionMessage: `QUÁ ĐỈNH! Chạm trần ${maxRep} reps toàn bộ set. Buổi sau tăng +${weightIncrement}kg!`
    };
  }

  // TRƯỜNG HỢP 3: KIỂM TRA ĐÌNH TRỆ (PLATEAU & DELOAD)
  const previousTotalReps = (state.lastReps || []).reduce((a, b) => a + b, 0);
  const currentTotalReps = actualReps.reduce((a, b) => a + b, 0);

  // Kẹt tạ: Không tăng được thêm rep nào so với buổi trước
  const isStagnant = previousTotalReps > 0 && currentTotalReps <= previousTotalReps;

  if (isStagnant) {
    const newPlateauCount = plateauCount + 1;

    // Đã kẹt 2 buổi liên tiếp -> Buổi thứ 3 kích hoạt DELOAD tự động
    if (newPlateauCount >= 2) {
      const deloadWeight = Math.max(0, currentWeight - weightIncrement);
      return {
        nextWeight: deloadWeight,
        nextTargetReps: Array(numSets).fill(maxRep), // Buổi deload cho đẩy mốc trên để hồi phục
        nextPlateauCount: 0, // Reset chu kỳ
        isCalibrating: false,
        actionMessage: `Kẹt tạ 2 buổi liên tục. Hệ thống tự động DELOAD -${weightIncrement}kg để hồi phục cơ thần kinh!`
      };
    }

    // Mới kẹt 1 buổi -> Giữ nguyên để cố gắng thêm 1 buổi nữa
    return {
      nextWeight: currentWeight,
      nextTargetReps: [...state.targetReps],
      nextPlateauCount: newPlateauCount,
      isCalibrating: false,
      actionMessage: `Chưa tăng rep (buổi ${newPlateauCount}/2). Buổi sau giữ nguyên tạ để vượt ngưỡng!`
    };
  }

  // TRƯỜNG HỢP 4: CÓ TIẾN BỘ REP (BUILDING REPS) -> TĂNG +1 REP VÀO TARGET
  return {
    nextWeight: currentWeight,
    nextTargetReps: distributePlusOneRep(actualReps, maxRep),
    nextPlateauCount: 0,
    isCalibrating: false,
    actionMessage: `Đang tiến triển tốt! Giữ tạ ${currentWeight}kg và ép tăng rep cho buổi sau.`
  };
}

/**
 * Hàm phân bổ +1 rep vào các set chưa chạm ngưỡng max rep
 */
function distributePlusOneRep(actualReps: number[], maxRep: number): number[] {
  const newTargets = [...actualReps];
  // Ưu tiên tăng rep vào set có số rep thấp nhất chưa chạm trần
  for (let i = 0; i < newTargets.length; i++) {
    if (newTargets[i] < maxRep) {
      newTargets[i] += 1;
      break; // Mỗi buổi ép tiến bộ ít nhất 1 rep mục tiêu
    }
  }
  return newTargets;
}