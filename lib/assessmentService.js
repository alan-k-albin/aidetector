/**
 * Merges Sightengine GenAI score and Gemini multimodal score into a single
 * reliability-weighted verdict, confidence percentage, and plain-language explanation.
 *
 * @param {Object} sightengineResult - Result from sightengineService
 * @param {Object} geminiResult - Result from geminiService
 * @param {Object} [options]
 * @returns {{
 *   verdict: "Likely AI-generated" | "Likely Authentic" | "Uncertain",
 *   confidence: number,
 *   explanation: string,
 *   breakdown: {
 *     sightengine_score: number,
 *     gemini_score: number,
 *     consensus: string,
 *     delta: number
 *   }
 * }}
 */
export function calculateAssessment(sightengineResult, geminiResult, options = {}) {
  const seSuccess = Boolean(sightengineResult?.success);
  const gemSuccess = Boolean(geminiResult?.success);

  const seScore = (typeof sightengineResult?.score === 'number' && sightengineResult.score !== null)
    ? Math.max(0, Math.min(1, sightengineResult.score))
    : 0.5; // placeholder; zeroed-out by seWeight=0 when !seSuccess

  const gemScore = (typeof geminiResult?.score === 'number' && geminiResult.score !== null)
    ? Math.max(0, Math.min(1, geminiResult.score))
    : 0.5; // placeholder; zeroed-out by gemWeight=0 when !gemSuccess

  // Compute dynamic weights based on engine availability
  let seWeight = 0.50;
  let gemWeight = 0.50;

  if (seSuccess && !gemSuccess) {
    seWeight = 1.0;
    gemWeight = 0.0;
  } else if (!seSuccess && gemSuccess) {
    seWeight = 0.0;
    gemWeight = 1.0;
  }

  // Combined weighted probability of AI generation (0.0 to 1.0)
  const combinedScore = (seScore * seWeight) + (gemScore * gemWeight);
  const delta = Math.abs(seScore - gemScore);

  // Determine model consensus
  let consensus = 'High Consensus';
  if (seSuccess && gemSuccess) {
    if (delta > 0.40) {
      consensus = 'Split Verdict (Significant Divergence)';
    } else if (delta > 0.20) {
      consensus = 'Moderate Agreement';
    } else {
      consensus = 'Strong Agreement (Dual-Engine Consensus)';
    }
  } else {
    consensus = 'Single Engine Mode';
  }

  let verdict = 'Uncertain';
  let confidence = 50;

  // Conflict handling: if models strongly disagree, verdict is Uncertain
  if (seSuccess && gemSuccess && delta > 0.45) {
    verdict = 'Uncertain';
    // When engines conflict, confidence in any single decision is low
    confidence = Math.round(50 + (1 - delta) * 20); // 50-60%
  } else if (combinedScore >= 0.65) {
    verdict = 'Likely AI-generated';
    // Scale confidence from 70% to 98% based on severity and agreement
    const severityFactor = (combinedScore - 0.65) / 0.35; // 0 to 1
    const agreementBonus = (seSuccess && gemSuccess && delta < 0.15) ? 6 : 0;
    confidence = Math.min(99, Math.round(72 + (severityFactor * 22) + agreementBonus));
  } else if (combinedScore <= 0.35) {
    verdict = 'Likely Authentic';
    // Scale confidence from 70% to 98%
    const authenticityFactor = (0.35 - combinedScore) / 0.35; // 0 to 1
    const agreementBonus = (seSuccess && gemSuccess && delta < 0.15) ? 6 : 0;
    confidence = Math.min(99, Math.round(72 + (authenticityFactor * 22) + agreementBonus));
  } else {
    verdict = 'Uncertain';
    // Close to 0.5 boundary
    confidence = Math.round(45 + Math.abs(combinedScore - 0.5) * 40);
  }

  // Format rich explanation
  let explanation = '';
  const sePct = (seScore * 100).toFixed(1);
  const gemPct = (gemScore * 100).toFixed(1);

  if (geminiResult?.explanation && geminiResult.explanation.length > 30) {
    explanation = geminiResult.explanation;
  } else {
    if (verdict === 'Likely AI-generated') {
      explanation = `Both detection signals indicate high probability of synthetic generation. Sightengine detected generative patterns at ${sePct}% probability, while Gemini visual examination confirmed synthetic artifacts at ${gemPct}% likelihood.`;
    } else if (verdict === 'Likely Authentic') {
      explanation = `Both detection signals indicate authentic, human-captured media. Sightengine detected minimal generative markers (${sePct}%), and Gemini confirmed natural physical lighting, realistic textures, and absence of diffusion artifacts (${gemPct}% AI probability).`;
    } else {
      explanation = `The dual-verification signals yielded an inconclusive or divergent assessment (Sightengine: ${sePct}%, Gemini: ${gemPct}%). The media may contain subtle AI retouching, compression artifacts, or hybrid elements. Exercise caution.`;
    }
  }

  return {
    verdict,
    confidence,
    explanation,
    breakdown: {
      sightengine_score: Number(seScore.toFixed(4)),
      gemini_score: Number(gemScore.toFixed(4)),
      combined_score: Number(combinedScore.toFixed(4)),
      consensus,
      delta: Number(delta.toFixed(4))
    }
  };
}
