import { ApifyInstagramProfile } from "@/lib/medsos/apify";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Tipe untuk stored Instagram profile cache di Supabase
 */
export interface InstagramProfileCache {
  id: string;
  username: string;
  profile_data: ApifyInstagramProfile;
  created_at: string;
  expires_at: string;
  usage_count: number;
}

/**
 * Parse Instagram URL dan extract username
 *
 * Input: https://www.instagram.com/kompascom/
 * Output: kompascom
 */
export function extractInstagramUsername(urlOrUsername: string): string | null {
  try {
    // Direct username
    if (!urlOrUsername.includes("/") && !urlOrUsername.includes(".")) {
      return urlOrUsername.toLowerCase().trim();
    }

    // URL format
    const url = new URL(urlOrUsername);
    if (!["instagram.com", "www.instagram.com"].includes(url.hostname)) {
      return null;
    }

    // Extract from pathname: /username/
    const pathSegments = url.pathname.split("/").filter(Boolean);
    const username = pathSegments[0];

    if (!username || username === "stories" || username === "reels") {
      return null;
    }

    return username.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Save profile ke Supabase cache
 */
export async function cacheProfileToDatabase(
  username: string,
  profileData: ApifyInstagramProfile,
  ttlSeconds: number = 3600
): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  const { error } = await supabaseAdmin.from("instagram_profiles_cache").upsert(
    {
      username: username.toLowerCase(),
      profile_data: profileData,
      expires_at: expiresAt,
      usage_count: 0,
    },
    { onConflict: "username" }
  );

  if (error) {
    console.error("[DB Cache Error]", error);
    // Don't throw, cache is optional
  }
}

/**
 * Get profile dari Supabase cache
 */
export async function getCachedProfileFromDatabase(
  username: string
): Promise<ApifyInstagramProfile | null> {
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("instagram_profiles_cache")
    .select("*")
    .eq("username", username.toLowerCase())
    .gt("expires_at", now) // Not expired
    .single();

  if (error || !data) {
    return null;
  }

  // Increment usage count
  await supabaseAdmin
    .from("instagram_profiles_cache")
    .update({ usage_count: (data.usage_count || 0) + 1 })
    .eq("id", data.id);

  return data.profile_data;
}

/**
 * Clear expired cache entries
 * Run ini secara periodic (cron job)
 */
export async function cleanupExpiredCache(): Promise<number> {
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("instagram_profiles_cache")
    .delete()
    .lt("expires_at", now);

  if (error) {
    console.error("[Cleanup Error]", error);
    return 0;
  }

  console.log(`[Cache Cleanup] Deleted ${data?.length || 0} expired entries`);
  return data?.length || 0;
}

/**
 * Store scrape result ke database untuk audit/history
 */
export async function saveScrapeResult(
  requestId: string,
  userId: string,
  username: string,
  result: any
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("medsos_scrape_results")
    .insert({
      request_id: requestId,
      user_id: userId,
      platform: "instagram",
      username: username,
      result_data: result,
      status: result.success ? "success" : "failed",
      error_code: result.errorCode || null,
    });

  if (error) {
    console.error("[Save Result Error]", error);
  }
}

/**
 * Get scrape history untuk user
 */
export async function getUserScrapeHistory(userId: string, limit: number = 20) {
  const { data, error } = await supabaseAdmin
    .from("medsos_scrape_results")
    .select("*")
    .eq("user_id", userId)
    .eq("platform", "instagram")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[History Error]", error);
    return [];
  }

  return data || [];
}

/**
 * Format Instagram profile untuk response
 */
export function formatInstagramProfile(profile: ApifyInstagramProfile) {
  return {
    username: profile.username,
    fullName: profile.fullName,
    bio: profile.biography,
    followers: profile.followerCount,
    following: profile.followingCount,
    postsCount: profile.postsCount,
    profilePic: profile.profilePicUrl,
    isVerified: profile.isVerified,
    isBusinessAccount: profile.isBusinessAccount,
    externalUrl: profile.externalUrl,
    recentPosts: profile.posts.slice(0, 10).map((post) => ({
      id: post.id,
      caption: post.caption,
      likes: post.likeCount,
      comments: post.commentCount,
      date: post.timestamp,
    })),
  };
}
