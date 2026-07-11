const GRAPH_API_VERSION = process.env.FB_GRAPH_API_VERSION || "v21.0";

export class FacebookPublishError extends Error {}

/**
 * Publishes a photo post to a Facebook Page via the Graph API.
 * The image must already be reachable at a public URL (Facebook fetches it).
 */
export async function publishPhotoPost(params: {
  pageId: string;
  accessToken: string;
  imageUrl: string;
  caption: string;
}): Promise<{ postId: string }> {
  const { pageId, accessToken, imageUrl, caption } = params;

  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}/photos`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: imageUrl,
        caption,
        access_token: accessToken,
      }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    const message = data?.error?.message || `Facebook API error (HTTP ${res.status})`;
    throw new FacebookPublishError(message);
  }

  const postId: string | undefined = data.post_id || data.id;
  if (!postId) {
    throw new FacebookPublishError("Facebook API did not return a post id");
  }
  return { postId };
}
