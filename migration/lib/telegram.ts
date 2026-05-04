import { createLinkToken } from "@/lib/auth";
import { addDays } from "@/lib/dates";
import { supabaseAdmin } from "@/lib/supabase";
import type { User } from "@/lib/types";

export async function ensureTelegramLinkToken(user: User): Promise<string> {
  if (
    user.telegram_link_token &&
    user.telegram_link_token_expires_at &&
    new Date(user.telegram_link_token_expires_at).getTime() > Date.now()
  ) {
    return user.telegram_link_token;
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const token = createLinkToken();
    const { error } = await supabaseAdmin
      .from("users")
      .update({
        telegram_link_token: token,
        telegram_link_token_expires_at: addDays(new Date(), 7).toISOString(),
      })
      .eq("id", user.id);

    if (!error) {
      return token;
    }
  }

  throw new Error("Gagal membuat kode hubungkan Telegram.");
}

export async function linkTelegram(telegramId: string, linkToken: string) {
  const cleanTelegramId = telegramId.trim();
  const cleanToken = linkToken.trim();

  if (!/^[0-9]+$/.test(cleanTelegramId)) {
    return {
      linked: false,
      status: "invalid_telegram_id",
      message: "Telegram ID tidak valid.",
    };
  }

  if (!cleanToken) {
    return {
      linked: false,
      status: "missing_token",
      message: "Kode hubungkan Telegram tidak ditemukan.",
    };
  }

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("telegram_link_token", cleanToken)
    .maybeSingle();

  const targetUser = user as User | null;

  if (
    !targetUser ||
    !targetUser.telegram_link_token_expires_at ||
    new Date(targetUser.telegram_link_token_expires_at).getTime() <= Date.now()
  ) {
    return {
      linked: false,
      status: "invalid_or_expired_token",
      message: "Kode hubungkan Telegram tidak valid atau sudah kedaluwarsa.",
    };
  }

  const { data: owner } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("telegram_id", cleanTelegramId)
    .neq("id", targetUser.id)
    .maybeSingle();

  if (owner) {
    return {
      linked: false,
      status: "telegram_id_already_linked",
      message: "Telegram ini sudah terhubung ke akun lain.",
    };
  }

  const { error: updateError } = await supabaseAdmin
    .from("users")
    .update({
      telegram_id: cleanTelegramId,
      telegram_link_token: null,
      telegram_link_token_expires_at: null,
    })
    .eq("id", targetUser.id);

  if (updateError) {
    console.error("Error linking Telegram:", updateError);
    return {
      linked: false,
      status: "update_failed",
      message: "Gagal menyimpan Telegram ID ke database.",
    };
  }

  return {
    linked: true,
    status: "linked",
    telegram_id: cleanTelegramId,
    user_id: targetUser.id,
    message: "Telegram berhasil terhubung.",
  };
}
