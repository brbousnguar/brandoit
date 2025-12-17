import { GenerationConfig, GeneratedImage } from '../types';

const MODEL_ID = 'gpt-image-1.5';

// Map aspect ratios to OpenAI-supported sizes
const aspectToSize = (aspect: string): string => {
  switch (aspect) {
    case '16:9':
      return '1792x1024';
    case '9:16':
      return '1024x1792';
    case '4:3':
      return '1392x1024';
    case '3:4':
      return '1024x1392';
    case '1:1':
    default:
      return '1024x1024';
  }
};

/**
 * Generate image using OpenAI gpt-image-1.5
 * Expects a BYOK API key (no platform key usage)
 */
export const generateOpenAIImage = async (
  prompt: string,
  config: GenerationConfig,
  apiKey: string,
  systemPrompt?: string
): Promise<GeneratedImage> => {
  if (!apiKey?.trim()) {
    throw new Error('OpenAI API key is required for gpt-image-1.5');
  }

  const size = aspectToSize(config.aspectRatio);

  const fullPrompt = systemPrompt && systemPrompt.trim()
    ? `${systemPrompt.trim()}\n\n${prompt}`
    : prompt;

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`
    },
    body: JSON.stringify({
      model: MODEL_ID,
      prompt: fullPrompt,
      size,
      response_format: 'b64_json'
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI image generation failed: ${errText}`);
  }

  const json = await response.json();
  const data = json?.data?.[0];
  if (!data?.b64_json) {
    throw new Error('OpenAI image generation returned no image data');
  }

  const base64Data = data.b64_json;
  const mimeType = 'image/png';
  const imageUrl = `data:${mimeType};base64,${base64Data}`;

  return {
    imageUrl,
    base64Data,
    mimeType
  };
};

