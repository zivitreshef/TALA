import { maskPromptForAi } from '../goalBankData';
import { callAiProxyEndpoint } from './aiProxyClient';

export const parseAiJsonResult = (result) => {
  if (result && !result.goals && typeof result.raw === 'string') {
    try {
      const direct = JSON.parse(result.raw);
      if (direct && typeof direct === 'object') return direct;
    } catch (_) {}
    const m = result.raw.match(/[\{\[][\s\S]*[\}\]]/);
    if (m) {
      try {
        const parsed = JSON.parse(m[0]);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch (_) {}
    }
  }
  return result;
};

export const callAiJson = async (promptText, student = {}) => {
  try {
    const maskedPromptClientSide = maskPromptForAi(promptText, student);
    const hints = {
      gender: student?.gender || 'boy',
      name: student?.name,
      idNumber: student?.idNumber,
      birthDate: student?.birthDate,
      address: student?.address,
      phone: student?.phone,
      educationalFramework: student?.educationalFramework
    };

    const result = await callAiProxyEndpoint({
      operation: 'rawPrompt',
      payload: { prompt: maskedPromptClientSide },
      hints
    });

    return parseAiJsonResult(result);
  } catch (error) {
    console.warn('Backend AI Proxy request failed, falling back to local processing:', error);
    return null;
  }
};
