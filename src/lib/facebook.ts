const GRAPH_API_VERSION = process.env.FB_GRAPH_API_VERSION || "v21.0";

export class FacebookPublishError extends Error {}

async function uploadUnpublishedPhoto(params: {
  pageId: string;
  accessToken: string;
  imageUrl: string;
}): Promise<{ photoId: string }> {
  const { pageId, accessToken, imageUrl } = params;

  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}/photos`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: imageUrl,
        published: false,
        access_token: accessToken,
      }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    const message = data?.error?.message || `Facebook API error (HTTP ${res.status})`;
    throw new FacebookPublishError(message);
  }
  if (!data.id) {
    throw new FacebookPublishError("Facebook API did not return a photo id");
  }
  return { photoId: data.id };
}

/**
 * Publishes a post to a Facebook Page via the Graph API. A single image is
 * posted directly; multiple images are uploaded unpublished first and then
 * attached to one feed post (an album-style multi-photo post).
 * Images must already be reachable at public URLs (Facebook fetches them).
 */
export async function publishPost(params: {
  pageId: string;
  accessToken: string;
  imageUrls: string[];
  caption: string;
}): Promise<{ postId: string }> {
  const { pageId, accessToken, imageUrls, caption } = params;

  if (imageUrls.length === 0) {
    throw new FacebookPublishError("No images to publish");
  }

  if (imageUrls.length === 1) {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}/photos`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: imageUrls[0],
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

  const photos = await Promise.all(
    imageUrls.map((imageUrl) => uploadUnpublishedPhoto({ pageId, accessToken, imageUrl }))
  );

  const res = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: caption,
      attached_media: photos.map((p) => ({ media_fbid: p.photoId })),
      access_token: accessToken,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    const message = data?.error?.message || `Facebook API error (HTTP ${res.status})`;
    throw new FacebookPublishError(message);
  }
  if (!data.id) {
    throw new FacebookPublishError("Facebook API did not return a post id");
  }
  return { postId: data.id };
}
