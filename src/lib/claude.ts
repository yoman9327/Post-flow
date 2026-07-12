import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

function anthropic() {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY environment variable");
  client = new Anthropic({ apiKey });
  return client;
}

const SUPPORTED_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;
type SupportedMediaType = (typeof SUPPORTED_MEDIA_TYPES)[number];

export function isSupportedImageType(mime: string): mime is SupportedMediaType {
  return (SUPPORTED_MEDIA_TYPES as readonly string[]).includes(mime);
}

/**
 * Looks at one or more product photos (all part of the same post) and
 * writes a single Facebook ad post in the voice described by `toneExample`.
 * Returns plain post text (no markdown).
 */
export async function generateCaption(params: {
  images: { imageBase64: string; mediaType: SupportedMediaType }[];
  toneName: string;
  toneExample: string;
  uploaderNote?: string | null;
}): Promise<string> {
  const { images, toneName, toneExample, uploaderNote } = params;
  const multiple = images.length > 1;

  const message = await anthropic().messages.create({
    model: "claude-sonnet-5",
    max_tokens: 700,
    system: `你是一位專門為 Facebook 粉絲專頁撰寫廣告貼文的社群小編。
你會拿到${multiple ? "多張同一則貼文要用的商品或活動照片" : "一張商品或活動照片"}，以及一份「口吻範例」，範例代表這個粉專平常說話的語氣、用詞習慣與風格（可能包含慣用的標點、表情符號使用習慣、句子長短等）。

請完成以下任務：
1. 仔細觀察照片中的商品/場景細節（外觀、顏色、材質、氛圍、賣點等）${multiple ? "，並統整這些照片共同呈現的主題或亮點" : ""}。
2. 用與範例「相同的口吻與風格」寫一篇全新的 Facebook 廣告貼文，內容要根據${multiple ? "這些照片" : "這張照片"}本身，不能只是套用範例的內容。
3. 貼文請使用繁體中文，長度適合 Facebook 貼文（約 60~150 字），可視風格加入合適的表情符號與 1~5 個 hashtag。
4. 只輸出貼文本文，不要加任何說明、標題、引號或 markdown 語法。`,
    messages: [
      {
        role: "user",
        content: [
          ...images.map(
            (img) =>
              ({
                type: "image",
                source: {
                  type: "base64",
                  media_type: img.mediaType,
                  data: img.imageBase64,
                },
              }) as const
          ),
          {
            type: "text",
            text: `口吻名稱：${toneName}\n口吻範例：\n${toneExample}${
              uploaderNote ? `\n\n上傳者補充說明：${uploaderNote}` : ""
            }\n\n請根據${multiple ? "這些照片" : "這張照片"}，用上述口吻寫一篇全新的廣告貼文。`,
          },
        ],
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude did not return any text content");
  }
  return textBlock.text.trim();
}
