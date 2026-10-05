export interface ScoreInput {
  plannedDurationMinutes: number;
  focusedDurationSeconds: number;
  distractedDurationSeconds: number;
  idleDurationSeconds: number;
  tabSwitchCount: number;
  warningCount: number;
  blockAttemptCount?: number;
}

export interface ScoreBreakdown {
  baseScore: number;
  tabSwitchPenalty: number;
  distractionPenalty: number;
  idlePenalty: number;
  warningPenalty: number;
  blockAttemptPenalty: number;
  totalPenalty: number;
  finalScore: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  focusRate: number;
}

export class FocusScoringService {
  /**
   * Calculates transparent focus score and penalty breakdown
   */
  public static calculateScore(input: ScoreInput): ScoreBreakdown {
    const plannedSeconds = Math.max(60, input.plannedDurationMinutes * 60);
    const focusedSec = Math.max(0, input.focusedDurationSeconds);
    const distractedSec = Math.max(0, input.distractedDurationSeconds);
    const idleSec = Math.max(0, input.idleDurationSeconds);
    const totalRecordedSec = Math.max(1, focusedSec + distractedSec + idleSec);

    // Focus rate = focused / total active time
    const focusRate = Math.min(100, Math.round((focusedSec / totalRecordedSec) * 100));

    // Base score is based on focused time vs planned duration
    const baseScore = Math.min(100, Math.round((focusedSec / plannedSeconds) * 100 * 10) / 10);

    // Penalties
    // 1. Tab switches: 1 grace switch, then 2.5 pts per switch
    const excessSwitches = Math.max(0, input.tabSwitchCount - 1);
    const tabSwitchPenalty = Math.round(excessSwitches * 2.5 * 10) / 10;

    // 2. Distraction duration: 1 pt per 30s away
    const distractionPenalty = Math.round((distractedSec / 30) * 10) / 10;

    // 3. Idle duration: 0.5 pt per 30s idle beyond 2 min grace
    const excessIdle = Math.max(0, idleSec - 120);
    const idlePenalty = Math.round((excessIdle / 60) * 1.5 * 10) / 10;

    // 4. Warnings: 2 pts per warning triggered
    const warningPenalty = Math.round(input.warningCount * 2.0 * 10) / 10;

    // 5. Block Attempts: 1 pt per attempt after 1 free warning
    const blockAttempts = input.blockAttemptCount || 0;
    const excessAttempts = Math.max(0, blockAttempts - 1);
    const blockAttemptPenalty = Math.round(excessAttempts * 1.0 * 10) / 10;

    const totalPenalty = Math.round(
      (tabSwitchPenalty + distractionPenalty + idlePenalty + warningPenalty + blockAttemptPenalty) * 10
    ) / 10;
    
    // Final score cannot exceed baseScore or drop below 0
    let finalScore = Math.max(0, Math.min(100, Math.round((baseScore - totalPenalty) * 10) / 10));

    let grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
    if (finalScore >= 95) grade = 'A+';
    else if (finalScore >= 85) grade = 'A';
    else if (finalScore >= 75) grade = 'B';
    else if (finalScore >= 60) grade = 'C';
    else if (finalScore >= 40) grade = 'D';

    return {
      baseScore,
      tabSwitchPenalty,
      distractionPenalty,
      idlePenalty,
      warningPenalty,
      blockAttemptPenalty,
      totalPenalty,
      finalScore,
      grade,
      focusRate,
    };
  }
}
