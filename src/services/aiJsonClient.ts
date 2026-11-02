import { maskPromptForAi } from '../goalBankData';
import { callAiProxyEndpoint } from './aiProxyClient';

export interface StudentAiContext {
  name?: string;
  gender?: string;
  idNumber?: string;
  birthDate?: string;
  address?: string;
  phone?: string;
  educationalFramework?: string;
  privacyMode?: string;
  defaultPrivacyMode?: string;
  [key: string]: unknown;
}

export const parseAiJsonResult = <T = unknown>(result: T): T => {
  if (result && typeof result === 'object') {
    const obj = result as Record<string, unknown>;
    if (!obj.goals && typeof obj.raw === 'string') {
      try {
        const direct = JSON.parse(obj.raw);
        if (direct && typeof direct === 'object') return direct as T;
      } catch (_) {}
      const m = obj.raw.match(/[\{\[][\s\S]*[\}\]]/);
      if (m) {
        try {
          const parsed = JSON.parse(m[0]);
          if (parsed && typeof parsed === 'object') return parsed as T;
        } catch (_) {}
      }
    }
  }
  return result;
};

export const callAiJson = async (
  promptText: string,
  student: StudentAiContext = {}
): Promise<unknown> => {
  try {
    const maskedPromptClientSide = maskPromptForAi(
      promptText,
      student,
      student?.privacyMode || student?.defaultPrivacyMode
    );
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
      hints,
      model: undefined
    });

    return parseAiJsonResult(result);
  } catch (error) {
    console.warn('Backend AI Proxy request failed, falling back to local processing:', error);
    return null;
  }
};
