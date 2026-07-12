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
  restrictions?: string | null;
  uploaderNote?: string | null;
}): Promise<string> {
  const { images, toneName, toneExample, restrictions, uploaderNote } = params;
  const multiple = images.length > 1;

  const message = await anthropic().messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1200,
    system: `你是一位專門為 Facebook 粉絲專頁撰寫廣告貼文的社群小編。
你會拿到${multiple ? "多張同一則貼文要用的商品或活動照片" : "一張商品或活動照片"}，以及一份「口吻範例」。這份範例通常是這個粉專真實發過的貼文，請把它當成**格式與風格的樣板**，不是只抓「大概語氣」而已。

請完成以下任務：
1. 仔細分析口吻範例的呈現方式：開頭寫法、有沒有分段/條列/checklist、emoji 用在哪些位置、標點習慣、句子長短、結尾的呼籲行動（CTA）寫法、hashtag 使用方式，以及**整體篇幅長短**。
2. 仔細觀察照片中的商品/場景細節（外觀、顏色、材質、氛圍、賣點等）${multiple ? "，並統整這些照片共同呈現的主題或亮點" : ""}。
3. 用範例的格式與風格，寫一篇全新的 Facebook 廣告貼文——結構、篇幅、排版方式要盡量比照範例（範例長就寫長、範例有條列就用條列、範例分段就分段），但內容要根據${multiple ? "這些照片" : "這張照片"}本身，不能只是把範例的文字改幾個字。格式與風格的還原度優先於字數限制，不要為了縮短篇幅而犧牲範例的排版結構。
4. 只輸出貼文本文，不要加任何說明、標題、引號或 markdown 語法。
5. 貼文請使用繁體中文。
6. 內容只能描述照片、口吻範例、補充說明裡實際呈現或提到的商品/服務，不要另外發明照片沒出現、業務範圍沒提到的其他產品或服務項目（例如商家明明沒有的加購服務）。但範例本身的形容詞、修辭、氛圍描寫等寫作手法要完整保留延用，這不算捏造。
7. 如果有提供「限制內容」，那是絕對不能違反的紅線，即使照片或口吻範例讓你聯想到那些內容，也不要在貼文裡提及。`,
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
              restrictions ? `\n\n限制內容（絕對不要提及以下內容）：\n${restrictions}` : ""
            }${
              uploaderNote ? `\n\n上傳者補充說明：${uploaderNote}` : ""
            }\n\n請根據${multiple ? "這些照片" : "這張照片"}，仿照上述口吻範例的格式、篇幅與風格，寫一篇全新的廣告貼文。`,
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
