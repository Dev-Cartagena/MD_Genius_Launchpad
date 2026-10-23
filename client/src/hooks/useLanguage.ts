import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { Locale, User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

/** Current interface language and a setter that also saves it to the signed-in account. */
export function useLanguage() {
  const { i18n } = useTranslation();
  const language: Locale = i18n.language === "es" ? "es" : "en";

  const setLanguage = useCallback(
    async (next: Locale) => {
      if (next === language) return;
      const user = queryClient.getQueryData<User | null>(["/api/auth/user"]);
      // Update the cached account first, so the account-language sync in App doesn't switch back.
      if (user) queryClient.setQueryData<User | null>(["/api/auth/user"], { ...user, locale: next });
      await i18n.changeLanguage(next);
      if (!user) return;
      try {
        await apiRequest("PUT", "/api/auth/user/locale", { locale: next });
      } catch {
        // The interface already switched; the account keeps its old setting until the next change.
      }
    },
    [i18n, language],
  );

  return { language, setLanguage };
}
