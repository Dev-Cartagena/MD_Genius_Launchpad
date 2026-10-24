import { useTranslation } from "react-i18next";
import { PlayCircle } from "lucide-react";

/** Marks a lesson whose video is planned but not produced yet. Admins remove it when the video is uploaded. */
export const VIDEO_PENDING = "video:pending";

const VIDEO_FILE = /\.(mp4|webm)(\?.*)?$/i;

export function isVideoFile(url: string): boolean {
  return VIDEO_FILE.test(url.trim());
}

/** The lesson's video in the viewer's language: `…-es.mp4` for Spanish when present, else the English or only file. */
function pickVideo(media: string[], language: string): string | undefined {
  const videos = media.filter(isVideoFile);
  const byLang = (lng: string) => videos.find((u) => new RegExp(`-${lng}\\.(mp4|webm)(\\?.*)?$`, "i").test(u));
  return byLang(language) ?? byLang("en") ?? videos[0];
}

/** Poster convention: `<video name>-poster.jpg` next to the video file. */
function posterFor(url: string): string {
  return url.replace(VIDEO_FILE, "-poster.jpg");
}

interface LessonVideoProps {
  lessonId: string;
  media: string[] | null | undefined;
}

/** Inline player for a lesson's video, or a placeholder while it is in production. Renders nothing otherwise. */
export function LessonVideo({ lessonId, media }: LessonVideoProps) {
  const { t, i18n } = useTranslation("curriculum");
  const list = media ?? [];
  const src = pickVideo(list, i18n.language);

  if (src) {
    return (
      <div className="overflow-hidden rounded-xl border border-primary/[0.08] bg-primary shadow-card">
        <video
          key={src}
          src={src}
          poster={posterFor(src)}
          controls
          preload="metadata"
          playsInline
          className="block aspect-video w-full"
          aria-label={t("lessonVideo.label")}
          data-testid={`video-lesson-${lessonId}`}
        >
          {t("lessonVideo.unsupported")}
        </video>
      </div>
    );
  }

  if (list.includes(VIDEO_PENDING)) {
    return (
      <div
        className="dashed-zone flex w-full flex-col items-center justify-center gap-2 bg-card/60 px-6 py-8 text-center"
        data-testid={`video-pending-${lessonId}`}
      >
        <PlayCircle className="h-8 w-8 text-accent" aria-hidden="true" />
        <p className="font-display text-base font-medium text-foreground">{t("lessonVideo.comingSoonTitle")}</p>
        <p className="max-w-[48ch] text-sm text-muted-foreground">{t("lessonVideo.comingSoonBody")}</p>
      </div>
    );
  }

  return null;
}
