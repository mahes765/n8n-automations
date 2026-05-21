import { ApifyClient } from "apify-client";

/**
 * Types untuk Apify Instagram Scraper Response
 */
export interface ApifyInstagramProfile {
  username: string;
  fullName: string;
  biography: string;
  followerCount: number;
  followingCount: number;
  postsCount: number;
  profilePicUrl: string;
  isBusinessAccount: boolean;
  isVerified: boolean;
  externalUrl?: string;
  posts: ApifyInstagramPost[];
}

export interface ApifyInstagramPost {
  id: string;
  caption: string;
  likeCount: number;
  commentCount: number;
  timestamp: string;
  imageUrl?: string;
  videoUrl?: string;
  isCarousel: boolean;
}

export interface ScrapeResult {
  success: boolean;
  data?: ApifyInstagramProfile;
  error?: string;
  errorCode?: string;
  timestamp: string;
}

/**
 * Cache untuk menyimpan hasil scraping
 * Gunakan Redis atau Supabase di production
 */
interface CacheEntry {
  data: ApifyInstagramProfile;
  timestamp: number;
  ttl: number;
}

const scrapeCache = new Map<string, CacheEntry>();

/**
 * Apify Instagram Scraper Service
 */
export class ApifyInstagramService {
  private client: ApifyClient;
  private actorId: string;
  private cacheTtl: number;
  private timeout: number;

  constructor() {
    const apiKey = process.env.APIFY_API_KEY;
    if (!apiKey) {
      throw new Error("APIFY_API_KEY belum dikonfigurasi");
    }

    this.client = new ApifyClient({ token: apiKey });
    this.actorId = process.env.APIFY_INSTAGRAM_ACTOR_ID || "apify/instagram-scraper";
    this.cacheTtl = parseInt(process.env.APIFY_DATASET_CACHE_TTL || "3600", 10); // 1 jam
    this.timeout = parseInt(process.env.INSTAGRAM_SCRAPE_TIMEOUT || "30000", 10); // 30 detik
  }

  /**
   * Check cache
   */
  private getFromCache(username: string): ApifyInstagramProfile | null {
    const cacheKey = `ig_${username.toLowerCase()}`;
    const entry = scrapeCache.get(cacheKey);

    if (!entry) return null;

    const now = Date.now();
    const age = now - entry.timestamp;

    // Cache expired
    if (age > entry.ttl) {
      scrapeCache.delete(cacheKey);
      return null;
    }

    console.log(`[Cache Hit] Instagram @${username} - Age: ${Math.round(age / 1000)}s`);
    return entry.data;
  }

  /**
   * Save to cache
   */
  private saveToCache(username: string, data: ApifyInstagramProfile): void {
    const cacheKey = `ig_${username.toLowerCase()}`;
    scrapeCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl: this.cacheTtl,
    });
    console.log(`[Cache Save] Instagram @${username}`);
  }

  /**
   * Normalize Apify response ke format standard
   */
  private normalizeResponse(rawData: any): ApifyInstagramProfile {
    // Apify actor mengembalikan array, ambil first item
    const profile = Array.isArray(rawData) ? rawData[0] : rawData;

    if (!profile) {
      throw new Error("Profile data tidak ditemukan dalam response");
    }

    return {
      username: profile.username || profile.name || "",
      fullName: profile.fullName || profile.name || "",
      biography: profile.biography || "",
      followerCount: profile.followers || profile.followersCount || 0,
      followingCount: profile.following || profile.followingCount || 0,
      postsCount: profile.postsCount || 0,
      profilePicUrl: profile.profilePicUrl || "",
      isBusinessAccount: Boolean(profile.isBusinessAccount),
      isVerified: Boolean(profile.isVerified),
      externalUrl: profile.externalUrl || undefined,
      posts: (profile.latestPosts || []).map((post: any) => ({
        id: post.id || post.shortCode || "",
        caption: post.caption || "",
        likeCount: post.likesCount || post.likes || 0,
        commentCount: post.commentsCount || post.comments || 0,
        timestamp: post.timestamp || new Date().toISOString(),
        imageUrl: post.imageUrl || undefined,
        videoUrl: post.videoUrl || undefined,
        isCarousel: Boolean(post.isCarousel),
      })),
    };
  }

  /**
   * Main method: Scrape Instagram profile
   */
  async scrapeProfile(username: string): Promise<ScrapeResult> {
    const timestamp = new Date().toISOString();

    try {
      // Validasi username
      if (!username || typeof username !== "string") {
        return {
          success: false,
          errorCode: "INVALID_USERNAME",
          error: "Username tidak valid",
          timestamp,
        };
      }

      username = username.toLowerCase().trim();

      // Check cache first
      const cachedData = this.getFromCache(username);
      if (cachedData) {
        return {
          success: true,
          data: cachedData,
          timestamp,
        };
      }

      console.log(`[Apify] Scraping Instagram @${username}...`);

      // Call Apify actor dengan timeout
      const runPromise = this.client.actor(this.actorId).call({
        username,
        resultsLimit: 15, // Ambil 15 posts terbaru
      });

      const run = await Promise.race([
        runPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("SCRAPE_TIMEOUT")), this.timeout)
        ),
      ]);

      if (!run) {
        return {
          success: false,
          errorCode: "EMPTY_RESPONSE",
          error: "Apify tidak mengembalikan response",
          timestamp,
        };
      }

      // Get dataset dari Apify
      const dataset = await this.client.dataset(run.defaultDatasetId).listItems();
      const items = dataset.items as any[];

      if (!items || items.length === 0) {
        return {
          success: false,
          errorCode: "PROFILE_NOT_FOUND",
          error: `Profile Instagram @${username} tidak ditemukan`,
          timestamp,
        };
      }

      // Normalize response
      const normalizedData = this.normalizeResponse(items);

      // Save to cache
      this.saveToCache(username, normalizedData);

      console.log(
        `[Success] Instagram @${username} - Followers: ${normalizedData.followerCount}, Posts: ${normalizedData.posts.length}`
      );

      return {
        success: true,
        data: normalizedData,
        timestamp,
      };
    } catch (error: any) {
      console.error(`[Error] Instagram scrape @${username}:`, error.message);

      // Map specific errors
      let errorCode = "UNKNOWN_ERROR";
      let errorMessage = error.message || "Terjadi error saat scraping";

      if (error.message?.includes("SCRAPE_TIMEOUT")) {
        errorCode = "SCRAPE_TIMEOUT";
        errorMessage = `Timeout saat scraping @${username} (>${this.timeout}ms)`;
      } else if (error.message?.includes("not found") || error.statusCode === 404) {
        errorCode = "PROFILE_NOT_FOUND";
        errorMessage = `Profile Instagram @${username} tidak ditemukan`;
      } else if (error.message?.includes("rate limit") || error.statusCode === 429) {
        errorCode = "RATE_LIMIT";
        errorMessage = "Instagram memblock request, coba lagi nanti";
      } else if (error.message?.includes("API key")) {
        errorCode = "APIFY_AUTH_ERROR";
        errorMessage = "Apify API key tidak valid atau sudah expired";
      }

      return {
        success: false,
        error: errorMessage,
        errorCode,
        timestamp,
      };
    }
  }

  /**
   * Batch scrape multiple profiles
   * Useful untuk mengurangi API calls
   */
  async scrapeMultiple(usernames: string[]): Promise<Record<string, ScrapeResult>> {
    const results: Record<string, ScrapeResult> = {};

    // Proses sequential untuk menghindari rate limit
    for (const username of usernames) {
      results[username] = await this.scrapeProfile(username);
      // Rate limiting: wait 2 seconds between requests
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return results;
  }

  /**
   * Clear cache manual
   */
  clearCache(username?: string): void {
    if (username) {
      const cacheKey = `ig_${username.toLowerCase()}`;
      scrapeCache.delete(cacheKey);
      console.log(`[Cache Cleared] @${username}`);
    } else {
      scrapeCache.clear();
      console.log(`[Cache Cleared] All`);
    }
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return {
      entries: scrapeCache.size,
      ttl: this.cacheTtl,
      timeout: this.timeout,
    };
  }
}

/**
 * Singleton instance
 */
let instance: ApifyInstagramService | null = null;

export function getApifyService(): ApifyInstagramService {
  if (!instance) {
    instance = new ApifyInstagramService();
  }
  return instance;
}
