import { GoogleGenAI, Type } from "@google/genai";
import { GenerationConfig, GeneratedImage, BrandColor, VisualStyle, GraphicType, BrandGuidelinesAnalysis } from "../types";
import { getSafeAspectRatioForModel } from "./aspectRatioService";

const NANO_BANANA_MODEL = 'gemini-3-pro-image-preview'; // DO NOT CHANGE: Required Model
const ANALYSIS_MODEL = 'gemini-2.5-flash'; // DO NOT CHANGE
const SUPPORTED_INPUT_IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'image/heif'
]);

interface GenerationContext {
  brandColors: BrandColor[];
  visualStyles: VisualStyle[];
  graphicTypes: GraphicType[];
}

// Helper to get the client
const getAiClient = (customKey?: string) => {
  // BYOK Enforcement: Only accept customKey.
  const key = (customKey || '').trim();
  if (!key) throw new Error("API Key Required. Please log in and add your Google Gemini API Key in Settings.");
  return new GoogleGenAI({ apiKey: key });
}

const prependSystemInstruction = (prompt: string, systemPrompt?: string): string => {
  if (!systemPrompt || !systemPrompt.trim()) return prompt;
  return `System Instruction: ${systemPrompt.trim()}\n\n${prompt}`;
};

/**
 * Constructs the engineered prompt based on selected presets and dynamic context
 */
const constructFullPrompt = (config: GenerationConfig, context: GenerationContext): string => {
  const colorScheme = context.brandColors.find(c => c.id === config.colorSchemeId);
  const style = context.visualStyles.find(s => s.id === config.visualStyleId);
  const type = context.graphicTypes.find(t => t.id === config.graphicTypeId);

  const colors = colorScheme ? colorScheme.colors.join(', ') : 'standard colors';
  const styleDesc = style ? style.description : 'clean style';
  const typeName = type ? type.name : 'image';

  return `
    Create a ${typeName}.
    Visual Style: ${styleDesc}.
    Color Palette: Strictly use these colors: ${colors}.
    
    Content Request: ${config.prompt}
    
    Ensure the output is high quality and adheres to the style constraints.
  `.trim();
};

export const generateGraphic = async (
  config: GenerationConfig,
  context: GenerationContext,
  customApiKey?: string,
  systemPrompt?: string
): Promise<GeneratedImage> => {
  const ai = getAiClient(customApiKey);
  const fullPrompt = prependSystemInstruction(constructFullPrompt(config, context), systemPrompt);
  const safeAspectRatio = getSafeAspectRatioForModel('gemini', config.aspectRatio, []);

  try {
    const response = await ai.models.generateContent({
      model: NANO_BANANA_MODEL,
      contents: {
        parts: [{ text: fullPrompt }],
      },
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
          aspectRatio: safeAspectRatio,
        }
      },
    });

    return extractImageFromResponse(response);
  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    throw new Error(error.message || "Failed to generate image. Please try again.");
  }
};

export const refineGraphic = async (
  currentImage: GeneratedImage, 
  refinementPrompt: string, 
  config: GenerationConfig,
  context: GenerationContext,
  customApiKey?: string,
  systemPrompt?: string
): Promise<GeneratedImage> => {
  const ai = getAiClient(customApiKey);
  const colorScheme = context.brandColors.find(c => c.id === config.colorSchemeId);
  const style = context.visualStyles.find(s => s.id === config.visualStyleId);
  const safeAspectRatio = getSafeAspectRatioForModel('gemini', config.aspectRatio, []);
  
  const colors = colorScheme ? colorScheme.colors.join(', ') : '';
  const styleDesc = style ? style.description : '';

  const fullRefinementPrompt = prependSystemInstruction(`
    Edit this image.
    Request: ${refinementPrompt}.
    Maintain the existing style (${styleDesc}) and color palette (${colors}).
  `.trim(), systemPrompt);

  try {
    const sourceImage = await resolveImageInputForRefinement(currentImage);
    const response = await ai.models.generateContent({
      model: NANO_BANANA_MODEL,
      contents: {
        parts: [
          {
            text: fullRefinementPrompt,
          },
          {
            inlineData: {
              data: sourceImage.base64Data,
              mimeType: sourceImage.mimeType,
            },
          },
        ],
      },
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
          aspectRatio: safeAspectRatio,
        }
      },
    });

    return extractImageFromResponse(response);
  } catch (error: any) {
    console.error("Gemini Refinement Error:", error);
    throw new Error(error.message || "Failed to refine image. Please try again.");
  }
};

/**
 * Analyzes a brand guideline document (PDF or Image) to extract colors, styles, and types.
 */
export const analyzeBrandGuidelines = async (
  file: File,
  customApiKey?: string,
  systemPrompt?: string
): Promise<BrandGuidelinesAnalysis> => {
  const ai = getAiClient(customApiKey);
  const base64Data = await fileToBase64(file);
  const mimeType = file.type;

  const prompt = prependSystemInstruction(`
    Analyze this brand guideline document. 
    Extract the following structured data:
    1. Brand Colors: Extract up to 5 distinct color palettes found. Provide a descriptive name for each palette (e.g., "Primary Brand", "Secondary Accents") and a list of hex codes.
    2. Visual Styles: Identify up to 5 distinct visual styles described or implied (e.g., "Line Art", "Isometric", "Photorealistic"). Provide a name and a short description for each.
    3. Graphic Types: Identify the types of graphics mentioned (e.g., "Icons", "Banners").

    Return the result as a strict JSON object matching the schema.
  `.trim(), systemPrompt);

  try {
    const response = await ai.models.generateContent({
      model: ANALYSIS_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            brandColors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  colors: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
              }
            },
            visualStyles: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  description: { type: Type.STRING }
                }
              }
            },
            graphicTypes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    if (!response.text) throw new Error("No analysis result generated");
    
    return JSON.parse(response.text) as BrandGuidelinesAnalysis;
  } catch (error) {
    console.error("Brand Analysis Error:", error);
    throw new Error("Failed to analyze brand guidelines.");
  }
};

/**
 * Analyzes a single image to extract a specific option type (Style or Color).
 */
export const analyzeImageForOption = async (
  file: File, 
  type: 'style' | 'color', 
  customApiKey?: string,
  systemPrompt?: string
): Promise<{ name: string; description?: string; colors?: string[] }> => {
  const ai = getAiClient(customApiKey);
  const base64Data = await fileToBase64(file);
  const mimeType = file.type;

  let prompt = '';
  let responseSchema: any = {};

  if (type === 'style') {
    prompt = `
      Analyze the visual style of this image.
      Provide a short, catchy Name for this style (e.g. "Neon Cyberpunk", "Minimal Line Art").
      Provide a concise Description of the visual characteristics (e.g. lighting, texture, line weight, composition) that could be used to generate similar images.
    `;
    responseSchema = {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        description: { type: Type.STRING }
      },
      required: ["name", "description"]
    };
  } else if (type === 'color') {
    prompt = `
      Analyze the color palette of this image.
      Provide a descriptive Name for this palette (e.g. "Sunset Vibes", "Corporate Blue").
      Extract the 4-5 dominant colors as HEX codes.
    `;
    responseSchema = {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        colors: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING } 
        }
      },
      required: ["name", "colors"]
    };
  }

  try {
    const finalPrompt = systemPrompt && systemPrompt.trim()
      ? `System Instruction: ${systemPrompt.trim()}\n\n${prompt}`
      : prompt;

    const response = await ai.models.generateContent({
      model: ANALYSIS_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          { text: finalPrompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    });

    if (!response.text) throw new Error("No analysis result generated");
    
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Option Analysis Error:", error);
    throw new Error(`Failed to analyze image for ${type}.`);
  }
};

// Describe an image to produce a rich recreation prompt
export const describeImagePrompt = async (
  base64Data: string,
  mimeType: string,
  customApiKey?: string
): Promise<string> => {
  const ai = getAiClient(customApiKey);

  const prompt = `
    Provide a concise but richly detailed generation prompt (2-4 sentences) that fully describes this image with no need to reference another image. Include:
    - Subject and key objects
    - Composition and camera/view (angle, framing, depth of field)
    - Lighting (type, direction, mood), color palette highlights
    - Style cues (art style, texture, rendering approach)
    - Any notable text, logos, or graphic elements (if present)
    Respond with a single paragraph optimized for image generation (self-contained).
  `;

  const response = await ai.models.generateContent({
    model: ANALYSIS_MODEL,
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Data,
            mimeType
          }
        },
        { text: prompt }
      ]
    }
  });

  if (!response.text) throw new Error("No description generated");
  return response.text.trim();
};

// Expand a short prompt into a richer, visual-focused description (text-only, no reference image)
export const expandPrompt = async (
  prompt: string,
  config: GenerationConfig,
  context: { brandColors: BrandColor[]; visualStyles: VisualStyle[]; graphicTypes: GraphicType[]; aspectRatios: GraphicType[] },
  customApiKey?: string
): Promise<string> => {
  const ai = getAiClient(customApiKey);

  const typeLabel = context.graphicTypes.find(g => g.id === config.graphicTypeId)?.name || config.graphicTypeId;
  const style = context.visualStyles.find(s => s.id === config.visualStyleId);
  const styleLabel = style?.name || config.visualStyleId;
  const styleDesc = style?.description || '';
  const palette = context.brandColors.find(c => c.id === config.colorSchemeId);
  const colors = palette ? `${palette.name}: ${palette.colors.join(', ')}` : '';
  const aspect = (context as any).aspectRatios?.find((a: any) => a.value === config.aspectRatio)?.label || config.aspectRatio;

  const systemPrompt = `
    You expand short text prompts into rich, creative, and visual image prompts.
    Include and amplify:
    - Topic and clear subject focus
    - Environment: background + foreground details
    - Emotion and mood
    - Technical details: camera/view, depth of field, lighting, texture
    - Nouns with size/age/state (large, tiny, old, weathered, pristine)
    - Prepositions to relate objects (on top of, beneath, around, beside)
    - Adjectives/materials (matte, glossy, metallic, wooden, fabric)
    - Colors hinting at the palette: ${colors || 'use a cohesive palette'}
    - Adverbs for action (soaring, gliding, drifting)
    - Art style references: ${styleLabel}${styleDesc ? ` (${styleDesc})` : ''}
    Keep it 2-4 sentences, vivid, and optimized for image generation. Do not mention any reference image.
    Current choices: Type=${typeLabel}, Style=${styleLabel}, Palette=${colors || 'cohesive palette'}, Aspect=${aspect}.
  `.trim();

  const response = await ai.models.generateContent({
    model: ANALYSIS_MODEL,
    contents: {
      parts: [
        { text: systemPrompt },
        { text: `Original prompt: ${prompt}` }
      ]
    }
  });

  if (!response.text) throw new Error("No expanded prompt generated");
  return response.text.trim();
};

const parseDataUrl = (value?: string | null): { base64Data: string; mimeType: string } | null => {
  if (!value) return null;
  const match = value.match(/^data:([^;,]+)?(?:;[^,]*)?;base64,(.+)$/i);
  if (!match) return null;

  return {
    mimeType: (match[1] || '').toLowerCase(),
    base64Data: match[2]
  };
};

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const parsed = parseDataUrl(result);
      if (!parsed?.base64Data) {
        reject(new Error('Failed to convert image blob to base64.'));
        return;
      }
      resolve(parsed.base64Data);
    };
    reader.onerror = () => reject(new Error('Failed to read image blob.'));
    reader.readAsDataURL(blob);
  });
};

const fetchImageAsBase64 = async (imageUrl: string): Promise<{ base64Data: string; mimeType: string }> => {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch source image (${response.status}).`);
  }

  const blob = await response.blob();
  const base64Data = await blobToBase64(blob);
  const mimeType = (blob.type || 'image/png').toLowerCase();
  return { base64Data, mimeType };
};

const resolveImageInputForRefinement = async (
  currentImage: GeneratedImage
): Promise<{ base64Data: string; mimeType: string }> => {
  let base64Data = (currentImage.base64Data || '').trim();
  let mimeType = (currentImage.mimeType || '').trim().toLowerCase();

  // Some persisted records accidentally carry a full data URL in `base64Data`.
  const parsedInline = parseDataUrl(base64Data);
  if (parsedInline) {
    base64Data = parsedInline.base64Data;
    mimeType = parsedInline.mimeType || mimeType;
  }

  const imageUrl = (currentImage.imageUrl || '').trim();
  if ((!base64Data || !mimeType) && imageUrl) {
    const parsedUrl = parseDataUrl(imageUrl);
    if (parsedUrl) {
      base64Data = base64Data || parsedUrl.base64Data;
      mimeType = mimeType || parsedUrl.mimeType;
    } else {
      const fetched = await fetchImageAsBase64(imageUrl);
      base64Data = base64Data || fetched.base64Data;
      mimeType = mimeType || fetched.mimeType;
    }
  }

  if (!base64Data) {
    throw new Error(
      "Source image data is unavailable for refinement. Please restore a recent image or generate it again."
    );
  }

  // Base64 payloads should not contain whitespace/newlines.
  base64Data = base64Data.replace(/\s+/g, '');
  if (!mimeType) mimeType = 'image/png';

  if (!SUPPORTED_INPUT_IMAGE_MIME_TYPES.has(mimeType)) {
    console.warn(`Refine input image mime type may be unsupported: ${mimeType}`);
  }

  return { base64Data, mimeType };
};

// Helper to parse the response structure
const extractImageFromResponse = (response: any): GeneratedImage => {
  if (!response.candidates || response.candidates.length === 0) {
    throw new Error("No candidates returned from API.");
  }

  const parts = response.candidates[0].content.parts;
  let imagePart = null;

  for (const part of parts) {
    if (part.inlineData) {
      imagePart = part;
      break;
    }
  }

  if (!imagePart) {
     // Sometimes errors come back as text in the part
     const textPart = parts.find((p: any) => p.text);
     if (textPart) {
         throw new Error(`Model returned text instead of image: ${textPart.text}`);
     }
    throw new Error("No image data found in response.");
  }

  const base64Data = imagePart.inlineData.data;
  const mimeType = imagePart.inlineData.mimeType || 'image/png';
  const imageUrl = `data:${mimeType};base64,${base64Data}`;

  return {
    imageUrl,
    base64Data,
    mimeType
  };
};

// Helper to convert File to Base64 string (without data URL prefix)
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:application/pdf;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
};
