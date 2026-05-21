import { ApifyClient } from "apify-client";

/**
 * Type untuk Apify Run response
 */
interface ApifyRun {
    defaultDatasetId?: string;
    [key: string]: any;
}

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
    private debugApifyParsing: boolean;

    constructor() {
        const apiKey = process.env.APIFY_API_KEY;
        if (!apiKey) {
            throw new Error("APIFY_API_KEY belum dikonfigurasi");
        }

        this.client = new ApifyClient({ token: apiKey });
        this.actorId = process.env.APIFY_INSTAGRAM_ACTOR_ID || "apify/instagram-scraper";
        this.cacheTtl = parseInt(process.env.APIFY_DATASET_CACHE_TTL || "3600", 10); // 1 jam
        this.timeout = parseInt(process.env.INSTAGRAM_SCRAPE_TIMEOUT || "30000", 10); // 30 detik
        this.debugApifyParsing = process.env.APIFY_DEBUG === "true";
    }

    private safePreview(value: any): any {
        if (Array.isArray(value)) {
            return {
                type: "array",
                length: value.length,
                firstItemKeys:
                    value.length > 0 && value[0] && typeof value[0] === "object"
                        ? Object.keys(value[0]).slice(0, 20)
                        : [],
            };
        }

        if (value && typeof value === "object") {
            const preview: Record<string, any> = {
                type: "object",
                keys: Object.keys(value).slice(0, 20),
            };

            if ("items" in value && Array.isArray((value as any).items)) {
                preview.items = {
                    type: "array",
                    length: (value as any).items.length,
                    firstItemKeys:
                        (value as any).items.length > 0 && typeof (value as any).items[0] === "object"
                            ? Object.keys((value as any).items[0]).slice(0, 20)
                            : [],
                };
            }

            return preview;
        }

        return { type: typeof value };
    }

    private extractProfileRecord(rawData: any): any {
        const looksLikeProfileRecord = (candidate: any): boolean => {
            if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
                return false;
            }

            return Boolean(
                candidate.username ||
                    candidate.userName ||
                    candidate.fullName ||
                    candidate.biography ||
                    candidate.followersCount !== undefined ||
                    candidate.followers !== undefined ||
                    candidate.followingCount !== undefined ||
                    candidate.followsCount !== undefined ||
                    candidate.postsCount !== undefined ||
                    candidate.latestPosts ||
                    candidate.posts ||
                    candidate.profilePicUrl ||
                    candidate.verified !== undefined
            );
        };

        if (Array.isArray(rawData)) {
            const profileRecord = rawData.find((item) => looksLikeProfileRecord(item));
            return profileRecord || rawData[0];
        }

        if (!rawData || typeof rawData !== "object") {
            return rawData;
        }

        const candidateContainers = [
            rawData.data,
            rawData.profile,
            rawData.item,
            rawData.items,
            rawData.result,
            rawData.results,
            rawData.output,
            rawData.instagramProfile,
        ];

        for (const candidate of candidateContainers) {
            if (!candidate) {
                continue;
            }

            if (Array.isArray(candidate)) {
                if (candidate.length > 0) {
                    const profileRecord = candidate.find((item) => looksLikeProfileRecord(item));
                    return profileRecord || candidate[0];
                }
                continue;
            }

            if (typeof candidate === "object") {
                return candidate;
            }
        }

        return rawData;
    }

    private extractPostsSource(profile: any): any[] {
        const candidatePosts =
            profile?.latestPosts ||
            profile?.posts ||
            profile?.media ||
            profile?.edges ||
            profile?.timeline ||
            profile?.feed?.items ||
            [];

        if (Array.isArray(candidatePosts)) {
            return candidatePosts;
        }

        return [];
    }

    private getNumberValue(...values: any[]): number {
        for (const value of values) {
            if (typeof value === "number" && Number.isFinite(value)) {
                return value;
            }

            if (typeof value === "string") {
                const parsed = Number(value.replace(/,/g, ""));
                if (!Number.isNaN(parsed)) {
                    return parsed;
                }
            }

            if (value && typeof value === "object" && typeof value.count === "number") {
                return value.count;
            }
        }

        return 0;
    }

    private getStringValue(...values: any[]): string {
        for (const value of values) {
            if (typeof value === "string" && value.trim()) {
                return value.trim();
            }
        }

        return "";
    }

    private getBooleanValue(...values: any[]): boolean {
        for (const value of values) {
            if (typeof value === "boolean") {
                return value;
            }

            if (typeof value === "number") {
                return value !== 0;
            }

            if (typeof value === "string") {
                const normalized = value.toLowerCase().trim();
                if (["true", "1", "yes"].includes(normalized)) {
                    return true;
                }
                if (["false", "0", "no"].includes(normalized)) {
                    return false;
                }
            }
        }

        return false;
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
        // Apify actor bisa mengembalikan array dataset atau object pembungkus; ambil profile record yang paling mungkin
        const profile = this.extractProfileRecord(rawData);

        if (!profile) {
            throw new Error("Profile data tidak ditemukan dalam response");
        }

        const postsSource = this.extractPostsSource(profile);

        const mappedData: ApifyInstagramProfile = {
            username: this.getStringValue(
                profile.username,
                profile.userName,
                profile.ownerUsername,
                profile.handle,
                profile.name
            ),
            fullName: this.getStringValue(profile.fullName, profile.full_name, profile.name, profile.title),
            biography: this.getStringValue(profile.biography, profile.bio, profile.description, profile.caption),
            followerCount: this.getNumberValue(
                profile.followerCount,
                profile.followersCount,
                profile.followers,
                profile.edge_followed_by?.count,
                profile.followers_total
            ),
            followingCount: this.getNumberValue(
                profile.followingCount,
                profile.followsCount,
                profile.following,
                profile.edge_follow?.count,
                profile.following_total
            ),
            postsCount: this.getNumberValue(
                profile.postsCount,
                profile.posts_count,
                profile.posts?.length,
                postsSource.length
            ),
            profilePicUrl: this.getStringValue(
                profile.profilePicUrl,
                profile.profile_pic_url,
                profile.profilePictureUrl,
                profile.profilePicture,
                profile.profile_pic_url_hd
            ),
            isBusinessAccount: this.getBooleanValue(
                profile.isBusinessAccount,
                profile.is_business_account,
                profile.businessAccount
            ),
            isVerified: this.getBooleanValue(profile.isVerified, profile.verified),
            externalUrl: this.getStringValue(profile.externalUrl, profile.external_url) || undefined,
            posts: postsSource.map((post: any) => ({
                id: this.getStringValue(post.id, post.shortCode, post.shortcode, post.code),
                caption: this.getStringValue(post.caption, post.text, post.description),
                likeCount: this.getNumberValue(post.likeCount, post.likesCount, post.likes, post.edge_liked_by?.count),
                commentCount: this.getNumberValue(
                    post.commentCount,
                    post.commentsCount,
                    post.comments,
                    post.edge_media_to_comment?.count
                ),
                timestamp: this.getStringValue(post.timestamp, post.takenAtTimestamp, post.date) || new Date().toISOString(),
                imageUrl: this.getStringValue(post.imageUrl, post.displayUrl, post.display_url) || undefined,
                videoUrl: this.getStringValue(post.videoUrl, post.video_url) || undefined,
                isCarousel: this.getBooleanValue(post.isCarousel, post.is_carousel, post.isSidecar),
            })),
        };

        if (this.debugApifyParsing) {
            console.log("[Apify Debug] Raw profile preview:", this.safePreview(rawData));
            console.log("[Apify Debug] Selected profile keys:", Object.keys(profile || {}).slice(0, 30));
            console.log("[Apify Debug] Mapped profile preview:", {
                username: mappedData.username,
                fullName: mappedData.fullName,
                followerCount: mappedData.followerCount,
                followingCount: mappedData.followingCount,
                postsCount: mappedData.postsCount,
                postsLength: mappedData.posts.length,
                isVerified: mappedData.isVerified,
                isBusinessAccount: mappedData.isBusinessAccount,
            });
        }

        return mappedData;
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

            const actorInput = {
                usernames: [username],
                resultsLimit: 15,
            };

            console.log(`[Apify] Payload for ${this.actorId}:`, actorInput);

            // Call Apify actor dengan timeout
            const runPromise = this.client.actor(this.actorId).call(actorInput);

            const run = (await Promise.race([
                runPromise,
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("SCRAPE_TIMEOUT")), this.timeout)
                ),
            ])) as ApifyRun;

            if (!run || !run.defaultDatasetId) {
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

            if (this.debugApifyParsing) {
                console.log("[Apify Debug] Run info:", {
                    actorId: this.actorId,
                    username,
                    defaultDatasetId: run.defaultDatasetId,
                    itemCount: items?.length || 0,
                    datasetPreview: this.safePreview(dataset),
                    firstItemPreview: items && items.length > 0 ? this.safePreview(items[0]) : null,
                });
            }

            if (!items || items.length === 0) {
                console.warn(
                    `[Apify] Dataset kosong untuk @${username}. Kemungkinan actor tidak mengembalikan item profil atau username tidak dikenali.`
                );
                if (this.debugApifyParsing) {
                    console.log(`[Apify Debug] Empty dataset response for @${username}:`, this.safePreview(dataset));
                }
                return {
                    success: false,
                    errorCode: "PROFILE_NOT_FOUND",
                    error: `Profile Instagram @${username} tidak ditemukan`,
                    timestamp,
                };
            }

            // Normalize response
            const normalizedData = this.normalizeResponse(items);

            if (this.debugApifyParsing) {
                console.log("[Apify Debug] Before mapping:", {
                    itemType: Array.isArray(items) ? "array" : typeof items,
                    itemCount: items.length,
                    firstItemKeys:
                        items.length > 0 && items[0] && typeof items[0] === "object"
                            ? Object.keys(items[0]).slice(0, 30)
                            : [],
                });
                console.log("[Apify Debug] After mapping:", {
                    username: normalizedData.username,
                    followerCount: normalizedData.followerCount,
                    followingCount: normalizedData.followingCount,
                    postsCount: normalizedData.postsCount,
                    postsLength: normalizedData.posts.length,
                    isVerified: normalizedData.isVerified,
                    isBusinessAccount: normalizedData.isBusinessAccount,
                });
            }

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
