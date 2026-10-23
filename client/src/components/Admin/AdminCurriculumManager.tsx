import { Fragment, useState, useMemo, useEffect, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useToast } from "@/hooks/use-toast";
import ConfirmDialog, { type ConfirmRequest } from "@/components/ConfirmDialog";
import { ContentLanguageTabs } from "@/components/ContentLanguageTabs";
import { apiRequest } from "@/lib/queryClient";
import { getApiErrorMessage } from "@/lib/utils";
import { formatCohortDate } from "@/lib/dates";
import { useLocalized } from "@/lib/localized";
import type { Module, Lesson, Quiz, Cohort, Locale } from "@shared/schema";

// UI Components
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConnectorBadge } from "@/components/brand";
import { cohortTiming } from "@/lib/programWeek";

// Form handling
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Icons
import {
  Plus, Edit, Trash2, BookOpen, Users, Clock,
  ChevronDown, ChevronRight, Copy, PlayCircle,
  FileText, HelpCircle, Calendar, Target, X, ExternalLink, Check
} from "lucide-react";

type T = TFunction<["adminCurriculum", "common"]>;

// Form schemas. Spanish text lives in `translations.es` and is always optional.
const makeModuleFormSchema = (t: T) => z.object({
  title: z.string().min(1, t("validation.moduleTitle")),
  description: z.string().min(1, t("validation.description")),
  cohortId: z.string().min(1, t("validation.cohort")),
  week: z.coerce.number().min(1, t("validation.week")),
  orderIndex: z.coerce.number().min(0, t("validation.order")),
  translations: z.object({
    es: z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      objectives: z.array(z.string()).optional(),
      resources: z.array(z.string()).optional(),
    }).optional(),
  }).optional(),
});

const makeLessonFormSchema = (t: T) => z.object({
  title: z.string().min(1, t("validation.lessonTitle")),
  content: z.string().min(1, t("validation.content")),
  moduleId: z.string().min(1, t("validation.module")),
  orderIndex: z.coerce.number().min(0, t("validation.order")),
  media: z.array(z.string()).default([]),
  quizId: z.string().nullable().default(null),
  translations: z.object({
    es: z.object({
      title: z.string().optional(),
      content: z.string().optional(),
    }).optional(),
  }).optional(),
});

const makeQuizFormSchema = (t: T) => z.object({
  title: z.string().min(1, t("validation.quizTitle")),
  questions: z.array(z.object({
    question: z.string().trim().min(1, t("validation.question")),
    options: z.array(z.string().trim().min(1, t("validation.option")))
      .min(2, t("validation.minOptions"))
      .max(6, t("validation.maxOptions")),
    correctAnswer: z.number().int().min(0, t("validation.pickCorrect")),
  }).refine((q) => q.correctAnswer < q.options.length, {
    message: t("validation.pickCorrect"),
    path: ["correctAnswer"],
  })).min(1, t("validation.minQuestions")),
  passThreshold: z.coerce.number().min(1, t("validation.passThreshold")).max(100, t("validation.passThreshold")),
  maxAttempts: z.coerce.number().min(1, t("validation.maxAttempts")).optional(),
  translations: z.object({
    es: z.object({
      title: z.string().optional(),
      questions: z.array(z.object({ question: z.string(), options: z.array(z.string()) })).optional(),
    }).optional(),
  }).optional(),
});

type ModuleFormData = z.infer<ReturnType<typeof makeModuleFormSchema>>;
type LessonFormData = z.infer<ReturnType<typeof makeLessonFormSchema>>;
type QuizFormData = z.infer<ReturnType<typeof makeQuizFormSchema>>;

const NO_QUIZ = "__none__";
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;

type QuizQuestion = QuizFormData["questions"][number];
type EsQuestion = { question: string; options: string[] };

const emptyQuestion = (): QuizQuestion => ({ question: "", options: ["", ""], correctAnswer: 0 });

// Normalise stored quiz questions (jsonb) into the editor's shape
function toEditableQuestions(raw: unknown): QuizQuestion[] {
  if (!Array.isArray(raw) || raw.length === 0) return [emptyQuestion()];
  return raw.map((q: any) => {
    const options = Array.isArray(q?.options) ? q.options.map((o: unknown) => String(o ?? "")) : ["", ""];
    while (options.length < MIN_OPTIONS) options.push("");
    const correct = typeof q?.correctAnswer === "number" && q.correctAnswer < options.length ? q.correctAnswer : 0;
    return { question: String(q?.question ?? ""), options, correctAnswer: correct };
  });
}

/** The stored Spanish copy of an entity, or an empty object. */
function spanishOf(entity: { translations?: unknown } | null | undefined): Record<string, any> {
  const es = (entity?.translations as Record<string, unknown> | undefined)?.es;
  return es && typeof es === "object" ? (es as Record<string, any>) : {};
}

const hasSpanishTitle = (entity: { translations?: unknown } | null | undefined) =>
  typeof spanishOf(entity).title === "string" && spanishOf(entity).title.trim() !== "";

/** Pad or trim a translated list so each item lines up with the English item at the same position. */
function alignList(list: unknown, length: number): string[] {
  const source = Array.isArray(list) ? list : [];
  return Array.from({ length }, (_, i) => (typeof source[i] === "string" ? source[i] : ""));
}

/** Spanish questions aligned by index (and option index) with the English questions. */
function alignQuestions(list: unknown, english: { options: string[] }[]): EsQuestion[] {
  const source = Array.isArray(list) ? list : [];
  return english.map((q, i) => ({
    question: typeof source[i]?.question === "string" ? source[i].question : "",
    options: alignList(source[i]?.options, q.options.length),
  }));
}

/** Muted marker for content that has no Spanish title yet; shown only while the interface is in Spanish. */
function MissingSpanish({ entity }: { entity: { translations?: unknown } | null | undefined }) {
  const { t } = useTranslation();
  const { locale } = useLocalized();
  if (locale !== "es" || hasSpanishTitle(entity)) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-1 font-display text-xs font-normal text-muted-foreground">
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full border border-steel/70" />
      {t("content.missing")}
    </span>
  );
}

/** English text shown above a Spanish input as a translation hint. */
function EnglishHint({ children }: { children: ReactNode }) {
  return (
    <p lang="en" className="whitespace-pre-wrap break-words text-xs text-muted-foreground">
      {children}
    </p>
  );
}

function ModuleTextFields({
  form,
  lang,
  onLangChange,
  idPrefix,
  baseObjectives,
  baseResources,
}: {
  form: UseFormReturn<ModuleFormData>;
  lang: Locale;
  onLangChange: (lang: Locale) => void;
  idPrefix: "module" | "edit-module";
  baseObjectives: string[];
  baseResources: string[];
}) {
  const { t } = useTranslation(["adminCurriculum", "common"]);
  const esTitle = form.watch("translations.es.title");
  const esObjectives = form.watch("translations.es.objectives") ?? [];
  const esResources = form.watch("translations.es.resources") ?? [];
  const englishTitle = form.watch("title");
  const englishDescription = form.watch("description");

  const setListItem = (field: "objectives" | "resources", base: string[], index: number, value: string) => {
    const next = alignList(form.getValues(`translations.es.${field}`), base.length);
    next[index] = value;
    form.setValue(`translations.es.${field}`, next, { shouldDirty: true });
  };

  const renderList = (field: "objectives" | "resources", base: string[], current: string[]) =>
    base.length > 0 && (
      <div className="space-y-2">
        <Label>{t(`module.${field}`)}</Label>
        {base.map((item, index) => (
          <div key={index} className="space-y-1 rounded-md border border-border bg-card p-3">
            <EnglishHint>{item}</EnglishHint>
            <Input
              lang="es"
              value={current[index] ?? ""}
              onChange={(e) => setListItem(field, base, index, e.target.value)}
              aria-label={t(`module.${field}Item`, { number: index + 1 })}
              data-testid={`input-${idPrefix}-${field}-es-${index}`}
            />
          </div>
        ))}
      </div>
    );

  return (
    <>
      <ContentLanguageTabs value={lang} onChange={onLangChange} spanishMissing={!esTitle?.trim()} />
      {lang === "en" ? (
        <Fragment key="en">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("module.title")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("module.titlePlaceholder")}
                    {...field}
                    data-testid={`input-${idPrefix}-title`}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("module.description")}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={t("module.descriptionPlaceholder")}
                    {...field}
                    data-testid={`input-${idPrefix}-description`}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </Fragment>
      ) : (
        <Fragment key="es">
          <FormField
            control={form.control}
            name="translations.es.title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("module.title")}</FormLabel>
                {englishTitle && <EnglishHint>{englishTitle}</EnglishHint>}
                <FormControl>
                  <Input lang="es" {...field} value={field.value ?? ""} data-testid={`input-${idPrefix}-title-es`} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="translations.es.description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("module.description")}</FormLabel>
                {englishDescription && <EnglishHint>{englishDescription}</EnglishHint>}
                <FormControl>
                  <Textarea lang="es" {...field} value={field.value ?? ""} data-testid={`input-${idPrefix}-description-es`} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {renderList("objectives", baseObjectives, esObjectives)}
          {renderList("resources", baseResources, esResources)}
        </Fragment>
      )}
    </>
  );
}

function LessonTextFields({
  form,
  lang,
  onLangChange,
  idPrefix,
  moduleField,
}: {
  form: UseFormReturn<LessonFormData>;
  lang: Locale;
  onLangChange: (lang: Locale) => void;
  idPrefix: "lesson" | "edit-lesson";
  moduleField: ReactNode;
}) {
  const { t } = useTranslation(["adminCurriculum", "common"]);
  const esTitle = form.watch("translations.es.title");
  const englishTitle = form.watch("title");
  const englishContent = form.watch("content");

  return (
    <>
      <ContentLanguageTabs value={lang} onChange={onLangChange} spanishMissing={!esTitle?.trim()} />
      {lang === "en" ? (
        <FormField
          key="title-en"
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("lesson.title")}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t("lesson.titlePlaceholder")}
                  {...field}
                  data-testid={`input-${idPrefix}-title`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : (
        <FormField
          key="title-es"
          control={form.control}
          name="translations.es.title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("lesson.title")}</FormLabel>
              {englishTitle && <EnglishHint>{englishTitle}</EnglishHint>}
              <FormControl>
                <Input lang="es" {...field} value={field.value ?? ""} data-testid={`input-${idPrefix}-title-es`} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      {moduleField}
      {lang === "en" ? (
        <FormField
          key="content-en"
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("lesson.content")}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t("lesson.contentPlaceholder")}
                  className="min-h-[200px]"
                  {...field}
                  data-testid={`input-${idPrefix}-content`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : (
        <FormField
          key="content-es"
          control={form.control}
          name="translations.es.content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("lesson.content")}</FormLabel>
              {englishContent && (
                <div className="max-h-40 overflow-y-auto rounded-md bg-secondary/40 p-3">
                  <EnglishHint>{englishContent}</EnglishHint>
                </div>
              )}
              <FormControl>
                <Textarea
                  lang="es"
                  className="min-h-[200px]"
                  {...field}
                  value={field.value ?? ""}
                  data-testid={`input-${idPrefix}-content-es`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </>
  );
}

function LessonMediaField({ form, edit }: { form: UseFormReturn<LessonFormData>; edit: boolean }) {
  const { t } = useTranslation(["adminCurriculum", "common"]);
  return (
    <FormField
      control={form.control}
      name="media"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t("lesson.media")}</FormLabel>
          <FormControl>
            <div className="space-y-3">
              {field.value.map((resource: string, index: number) => (
                <div key={index} className="flex items-center gap-2 rounded-md border border-border bg-card p-3">
                  <div className="flex-1">
                    <Input
                      placeholder={t("lesson.mediaPlaceholder")}
                      value={resource}
                      onChange={(e) => {
                        const newResources = [...field.value];
                        newResources[index] = e.target.value;
                        field.onChange(newResources);
                      }}
                      data-testid={edit ? `input-edit-lesson-resource-${index}` : `input-lesson-resource-${index}`}
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Resource type indicator */}
                    {resource.includes('youtube.com') || resource.includes('youtu.be') || resource.includes('vimeo.com') ? (
                      <Badge variant="secondary" className="text-xs">
                        <PlayCircle className="h-3 w-3 mr-1" />
                        {t("lesson.mediaType.video")}
                      </Badge>
                    ) : resource.includes('.pdf') || resource.includes('pdf') ? (
                      <Badge variant="secondary" className="text-xs">
                        <FileText className="h-3 w-3 mr-1" />
                        {t("lesson.mediaType.pdf")}
                      </Badge>
                    ) : resource.startsWith('http') ? (
                      <Badge variant="secondary" className="text-xs">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        {t("lesson.mediaType.link")}
                      </Badge>
                    ) : resource ? (
                      <Badge variant="secondary" className="text-xs">
                        <FileText className="h-3 w-3 mr-1" />
                        {t("lesson.mediaType.file")}
                      </Badge>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const newResources = field.value.filter((_: string, i: number) => i !== index);
                        field.onChange(newResources);
                      }}
                      aria-label={t("lesson.removeMedia")}
                      title={t("lesson.removeMedia")}
                      data-testid={edit ? `button-remove-edit-resource-${index}` : `button-remove-resource-${index}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  field.onChange([...field.value, ""]);
                }}
                className="w-full"
                data-testid={edit ? "button-add-edit-resource" : "button-add-resource"}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("lesson.addMedia")}
              </Button>
              <div className="text-sm text-muted-foreground">
                <p className="font-display">{t("lesson.mediaHelp.title")}</p>
                <ul className="list-disc list-inside space-y-1 mt-1">
                  <li><span className="font-medium text-foreground">{t("lesson.mediaHelp.videoLabel")}</span> {t("lesson.mediaHelp.video")}</li>
                  <li><span className="font-medium text-foreground">{t("lesson.mediaHelp.pdfLabel")}</span> {t("lesson.mediaHelp.pdf")}</li>
                  <li><span className="font-medium text-foreground">{t("lesson.mediaHelp.linksLabel")}</span> {t("lesson.mediaHelp.links")}</li>
                  <li><span className="font-medium text-foreground">{t("lesson.mediaHelp.filesLabel")}</span> {t("lesson.mediaHelp.files")}</li>
                </ul>
              </div>
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function QuizFormFields({
  form,
  idPrefix,
  lang,
  onLangChange,
}: {
  form: UseFormReturn<QuizFormData>;
  idPrefix: string;
  lang: Locale;
  onLangChange: (lang: Locale) => void;
}) {
  const { t } = useTranslation(["adminCurriculum", "common"]);
  const questions = form.watch("questions") || [];
  const esTitle = form.watch("translations.es.title");
  const esQuestions = alignQuestions(form.watch("translations.es.questions"), questions);
  const englishTitle = form.watch("title");
  const passThreshold = form.watch("passThreshold");
  const maxAttempts = form.watch("maxAttempts");
  const questionErrors = form.formState.errors.questions;

  const setQuestions = (next: QuizQuestion[], nextEs?: EsQuestion[]) => {
    form.setValue("questions", next, { shouldDirty: true, shouldValidate: form.formState.isSubmitted });
    form.setValue("translations.es.questions", alignQuestions(nextEs ?? esQuestions, next), { shouldDirty: true });
  };

  const setEsQuestions = (next: EsQuestion[]) => {
    form.setValue("translations.es.questions", next, { shouldDirty: true });
  };

  const updateQuestion = (index: number, patch: Partial<QuizQuestion>, esPatch?: Partial<EsQuestion>) => {
    setQuestions(
      questions.map((q, i) => (i === index ? { ...q, ...patch } : q)),
      esPatch ? esQuestions.map((q, i) => (i === index ? { ...q, ...esPatch } : q)) : undefined,
    );
  };

  if (lang === "es") {
    return (
      <Fragment key="es">
        <ContentLanguageTabs value={lang} onChange={onLangChange} spanishMissing={!esTitle?.trim()} />
        <FormField
          control={form.control}
          name="translations.es.title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("quiz.title")}</FormLabel>
              {englishTitle && <EnglishHint>{englishTitle}</EnglishHint>}
              <FormControl>
                <Input lang="es" {...field} value={field.value ?? ""} data-testid={`input-${idPrefix}-title-es`} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <p className="font-display text-sm text-muted-foreground">
          {t("quiz.sharedSettings", { threshold: passThreshold ?? "", attempts: maxAttempts ?? "" })}
        </p>
        <div className="space-y-4">
          <h4 className="font-display text-sm font-medium">{t("quiz.questionsHeading", { count: questions.length })}</h4>
          <p className="text-xs text-muted-foreground">{t("quiz.spanishHint")}</p>
          {questions.map((q, qIndex) => (
            <div key={qIndex} className="space-y-3 rounded-lg border border-border bg-card p-4">
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="mt-2">{qIndex + 1}</Badge>
                <div className="flex-1 space-y-1">
                  {q.question && <EnglishHint>{q.question}</EnglishHint>}
                  <Input
                    lang="es"
                    placeholder={t("quiz.questionPlaceholder")}
                    value={esQuestions[qIndex]?.question ?? ""}
                    onChange={(e) =>
                      setEsQuestions(esQuestions.map((eq, i) => (i === qIndex ? { ...eq, question: e.target.value } : eq)))
                    }
                    data-testid={`input-${idPrefix}-question-es-${qIndex}`}
                  />
                </div>
              </div>
              <div className="space-y-2 sm:pl-9">
                {q.options.map((option, oIndex) => {
                  const correct = q.correctAnswer === oIndex;
                  return (
                    <div key={oIndex} className="space-y-1">
                      <div className="flex items-center gap-2">
                        {option && <EnglishHint>{option}</EnglishHint>}
                        {correct && (
                          <span className="inline-flex items-center gap-1 font-display text-xs text-success">
                            <Check className="h-3 w-3" aria-hidden="true" />
                            {t("quiz.correct")}
                          </span>
                        )}
                      </div>
                      <Input
                        lang="es"
                        placeholder={t("quiz.optionPlaceholder", { number: oIndex + 1 })}
                        value={esQuestions[qIndex]?.options[oIndex] ?? ""}
                        onChange={(e) =>
                          setEsQuestions(
                            esQuestions.map((eq, i) =>
                              i === qIndex
                                ? { ...eq, options: eq.options.map((o, j) => (j === oIndex ? e.target.value : o)) }
                                : eq,
                            ),
                          )
                        }
                        data-testid={`input-${idPrefix}-option-es-${qIndex}-${oIndex}`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Fragment>
    );
  }

  return (
    <Fragment key="en">
      <ContentLanguageTabs value={lang} onChange={onLangChange} spanishMissing={!esTitle?.trim()} />
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("quiz.title")}</FormLabel>
            <FormControl>
              <Input
                placeholder={t("quiz.titlePlaceholder")}
                {...field}
                data-testid={`input-${idPrefix}-title`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="passThreshold"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("quiz.passThreshold")}</FormLabel>
              <FormControl>
                <Input type="number" min={1} max={100} {...field} data-testid={`input-${idPrefix}-threshold`} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="maxAttempts"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("quiz.maxAttempts")}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  {...field}
                  value={field.value ?? ""}
                  data-testid={`input-${idPrefix}-attempts`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-display text-sm font-medium">{t("quiz.questionsHeading", { count: questions.length })}</h4>
          <Button
            type="button"
            size="sm"
            onClick={() => setQuestions([...questions, emptyQuestion()], [...esQuestions, { question: "", options: ["", ""] }])}
            data-testid={`button-${idPrefix}-add-question`}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("quiz.addQuestion")}
          </Button>
        </div>
        {typeof questionErrors?.message === "string" && (
          <p className="text-sm font-medium text-destructive">{questionErrors.message}</p>
        )}
        {questions.map((q, qIndex) => {
          const errors = Array.isArray(questionErrors) ? questionErrors[qIndex] : undefined;
          return (
            <div key={qIndex} className="space-y-3 rounded-lg border border-border bg-card p-4">
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="mt-2">{qIndex + 1}</Badge>
                <div className="flex-1 space-y-1">
                  <Input
                    placeholder={t("quiz.questionPlaceholder")}
                    value={q.question}
                    onChange={(e) => updateQuestion(qIndex, { question: e.target.value })}
                    data-testid={`input-${idPrefix}-question-${qIndex}`}
                  />
                  {errors?.question?.message && (
                    <p className="text-sm font-medium text-destructive">{errors.question.message}</p>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={questions.length <= 1}
                  onClick={() =>
                    setQuestions(
                      questions.filter((_, i) => i !== qIndex),
                      esQuestions.filter((_, i) => i !== qIndex),
                    )
                  }
                  aria-label={t("quiz.removeQuestion")}
                  data-testid={`button-${idPrefix}-remove-question-${qIndex}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{t("quiz.selectCorrect")}</p>
              <RadioGroup
                value={String(q.correctAnswer)}
                onValueChange={(value) => updateQuestion(qIndex, { correctAnswer: Number(value) })}
                className="space-y-1"
              >
                {q.options.map((option, oIndex) => {
                  const optionId = `${idPrefix}-q${qIndex}-o${oIndex}`;
                  const optionError = Array.isArray(errors?.options) ? errors?.options[oIndex]?.message : undefined;
                  return (
                    <div key={oIndex} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value={String(oIndex)} id={optionId} aria-label={t("quiz.optionCorrect", { number: oIndex + 1 })} />
                        <Input
                          placeholder={t("quiz.optionPlaceholder", { number: oIndex + 1 })}
                          value={option}
                          onChange={(e) => {
                            const options = [...q.options];
                            options[oIndex] = e.target.value;
                            updateQuestion(qIndex, { options });
                          }}
                          data-testid={`input-${idPrefix}-option-${qIndex}-${oIndex}`}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={q.options.length <= MIN_OPTIONS}
                          onClick={() => {
                            const options = q.options.filter((_, i) => i !== oIndex);
                            let correctAnswer = q.correctAnswer;
                            if (correctAnswer === oIndex) correctAnswer = 0;
                            else if (correctAnswer > oIndex) correctAnswer -= 1;
                            updateQuestion(
                              qIndex,
                              { options, correctAnswer },
                              { options: (esQuestions[qIndex]?.options ?? []).filter((_, i) => i !== oIndex) },
                            );
                          }}
                          aria-label={t("quiz.removeOption")}
                          data-testid={`button-${idPrefix}-remove-option-${qIndex}-${oIndex}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      {optionError && <p className="text-sm font-medium text-destructive ml-6">{optionError}</p>}
                    </div>
                  );
                })}
              </RadioGroup>
              {typeof errors?.options?.message === "string" && (
                <p className="text-sm font-medium text-destructive">{errors.options.message}</p>
              )}
              {errors?.correctAnswer?.message && (
                <p className="text-sm font-medium text-destructive">{errors.correctAnswer.message}</p>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={q.options.length >= MAX_OPTIONS}
                onClick={() => updateQuestion(qIndex, { options: [...q.options, ""] })}
                data-testid={`button-${idPrefix}-add-option-${qIndex}`}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("quiz.addOption")}
              </Button>
            </div>
          );
        })}
      </div>
    </Fragment>
  );
}

function LessonQuizField({ form, quizzes }: { form: UseFormReturn<LessonFormData>; quizzes: Quiz[] }) {
  const { t } = useTranslation(["adminCurriculum", "common"]);
  const localized = useLocalized();
  return (
    <FormField
      control={form.control}
      name="quizId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t("lesson.quiz")}</FormLabel>
          <Select
            onValueChange={(value) => field.onChange(value === NO_QUIZ ? null : value)}
            value={field.value ?? NO_QUIZ}
          >
            <FormControl>
              <SelectTrigger data-testid="select-lesson-quiz">
                <SelectValue placeholder={t("lesson.noQuiz")} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value={NO_QUIZ}>{t("lesson.noQuiz")}</SelectItem>
              {quizzes.map((quiz) => (
                <SelectItem key={quiz.id} value={quiz.id}>
                  {localized.text(quiz, "title")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {t("lesson.quizHelp")}
          </p>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface ModuleWithLessons extends Module {
  lessons?: Lesson[];
  cohortName?: string;
}

interface AdminCurriculumManagerProps {
  /** Optional lifted cohort selection, so it survives the parent switching tabs. */
  selectedCohort?: string | null;
  onSelectedCohortChange?: (cohortId: string | null) => void;
  /** Opens the create-cohort flow; shown when there are no cohorts yet. */
  onRequestCreateCohort?: () => void;
}

const emptyModuleValues = (cohortId = ""): ModuleFormData => ({
  title: "",
  description: "",
  cohortId,
  week: 1,
  orderIndex: 0,
  translations: { es: { title: "", description: "", objectives: [], resources: [] } },
});

const emptyLessonValues = (moduleId = "", orderIndex = 0): LessonFormData => ({
  title: "",
  content: "",
  moduleId,
  orderIndex,
  media: [],
  quizId: null,
  translations: { es: { title: "", content: "" } },
});

const emptyQuizValues = (): QuizFormData => ({
  title: "",
  questions: [emptyQuestion()],
  passThreshold: 70,
  maxAttempts: 3,
  translations: { es: { title: "", questions: [{ question: "", options: ["", ""] }] } },
});

export default function AdminCurriculumManager({
  selectedCohort: controlledCohort,
  onSelectedCohortChange,
  onRequestCreateCohort,
}: AdminCurriculumManagerProps = {}) {
  const { t } = useTranslation(["adminCurriculum", "common"]);
  const localized = useLocalized();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [localCohort, setLocalCohort] = useState<string | null>(null);
  const selectedCohort = controlledCohort !== undefined ? controlledCohort : localCohort;
  const setSelectedCohort = (cohortId: string | null) => {
    if (onSelectedCohortChange) onSelectedCohortChange(cohortId);
    else setLocalCohort(cohortId);
  };
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<string>("modules");

  // Dialog states
  const [isCreateModuleOpen, setIsCreateModuleOpen] = useState(false);
  const [isCreateLessonOpen, setIsCreateLessonOpen] = useState(false);
  const [isCreateQuizOpen, setIsCreateQuizOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [duplicatingModule, setDuplicatingModule] = useState<Module | null>(null);
  const [duplicateTargetCohort, setDuplicateTargetCohort] = useState<string>("");
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);
  // Content language shown in each form (English is the base; Spanish is optional)
  const [moduleLang, setModuleLang] = useState<Locale>("en");
  const [lessonLang, setLessonLang] = useState<Locale>("en");
  const [quizLang, setQuizLang] = useState<Locale>("en");

  const moduleFormSchema = useMemo(() => makeModuleFormSchema(t), [t]);
  const lessonFormSchema = useMemo(() => makeLessonFormSchema(t), [t]);
  const quizFormSchema = useMemo(() => makeQuizFormSchema(t), [t]);

  const cohortLabel = (cohort: Cohort) => {
    const name = localized.text(cohort, "name");
    const base = cohort.startDate
      ? t("cohortOption.withStart", { name, date: formatCohortDate(cohort.startDate) })
      : name;
    return cohort.isActive === false ? t("cohortOption.inactive", { name: base }) : base;
  };

  // Forms
  const moduleForm = useForm<ModuleFormData>({
    resolver: zodResolver(moduleFormSchema),
    defaultValues: emptyModuleValues(),
  });

  const lessonForm = useForm<LessonFormData>({
    resolver: zodResolver(lessonFormSchema),
    defaultValues: emptyLessonValues(),
  });

  const quizForm = useForm<QuizFormData>({
    resolver: zodResolver(quizFormSchema),
    defaultValues: emptyQuizValues(),
  });

  // Populate forms with existing data when editing, reset when closing
  useEffect(() => {
    setModuleLang("en");
    if (editingModule) {
      // Populate form with existing data, including the stored Spanish copy
      const es = spanishOf(editingModule);
      moduleForm.reset({
        title: editingModule.title,
        description: editingModule.description || "",
        cohortId: editingModule.cohortId,
        week: editingModule.week,
        orderIndex: editingModule.orderIndex,
        translations: {
          es: {
            title: typeof es.title === "string" ? es.title : "",
            description: typeof es.description === "string" ? es.description : "",
            objectives: alignList(es.objectives, editingModule.objectives?.length ?? 0),
            resources: alignList(es.resources, editingModule.resources?.length ?? 0),
          },
        },
      });
    } else {
      // Reset to defaults when not editing
      moduleForm.reset(emptyModuleValues());
    }
  }, [editingModule, moduleForm]);

  useEffect(() => {
    setLessonLang("en");
    if (editingLesson) {
      // Populate form with existing data, including the stored Spanish copy
      const es = spanishOf(editingLesson);
      lessonForm.reset({
        title: editingLesson.title,
        content: editingLesson.content || "",
        moduleId: editingLesson.moduleId,
        orderIndex: editingLesson.orderIndex,
        media: editingLesson.media || [],
        quizId: editingLesson.quizId ?? null,
        translations: {
          es: {
            title: typeof es.title === "string" ? es.title : "",
            content: typeof es.content === "string" ? es.content : "",
          },
        },
      });
    } else {
      // Reset to defaults when not editing
      lessonForm.reset(emptyLessonValues());
    }
  }, [editingLesson, lessonForm]);

  useEffect(() => {
    setQuizLang("en");
    if (editingQuiz) {
      // Populate form with existing data, including the stored Spanish copy
      const es = spanishOf(editingQuiz);
      const questions = toEditableQuestions(editingQuiz.questions);
      quizForm.reset({
        title: editingQuiz.title,
        questions,
        passThreshold: editingQuiz.passThreshold ?? 70,
        maxAttempts: editingQuiz.maxAttempts ?? 3,
        translations: {
          es: {
            title: typeof es.title === "string" ? es.title : "",
            questions: alignQuestions(es.questions, questions),
          },
        },
      });
    } else {
      // Reset to defaults when not editing
      quizForm.reset(emptyQuizValues());
    }
  }, [editingQuiz, quizForm]);

  // Queries
  // Admin endpoint returns every cohort, including inactive ones
  const { data: cohorts = [], isLoading: isLoadingCohorts } = useQuery<Cohort[]>({
    queryKey: ['/api/admin/cohorts'],
  });

  // Open on the cohort that matters now: the running one, else the next, else the latest.
  useEffect(() => {
    if (selectedCohort || cohorts.length === 0) return;
    const byStart = [...cohorts].sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );
    const pick =
      byStart.find((c) => cohortTiming(c)?.state === "running") ??
      byStart.find((c) => cohortTiming(c)?.state === "upcoming") ??
      byStart[byStart.length - 1];
    if (pick) setSelectedCohort(pick.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cohorts, selectedCohort]);

  const { data: modules = [], isLoading: isLoadingModules } = useQuery({
    queryKey: ['/api/admin/modules', { cohortId: selectedCohort }],
    queryFn: async () => {
      if (!selectedCohort) return [];
      const response = await apiRequest("GET", `/api/admin/modules?cohortId=${selectedCohort}`);
      return response.json();
    },
    enabled: !!selectedCohort,
  });

  const { data: allQuizzes = [], isLoading: isLoadingQuizzes } = useQuery<Quiz[]>({
    queryKey: ['/api/admin/quizzes'],
  });

  // Get lessons for selected module (used in Modules tab)
  const { data: lessons = [] } = useQuery({
    queryKey: ['/api/admin/lessons', { moduleId: selectedModule }],
    queryFn: async () => {
      if (!selectedModule) return [];
      const response = await apiRequest("GET", `/api/admin/lessons?moduleId=${selectedModule}`);
      return response.json();
    },
    enabled: !!selectedModule,
  });

  // Get all lessons for all modules in selected cohort (used in Lessons tab)
  const { data: allCohortLessons = [], isLoading: isLoadingAllLessons } = useQuery({
    queryKey: ['/api/admin/cohort-lessons', { cohortId: selectedCohort }],
    queryFn: async () => {
      if (!selectedCohort || !modules || modules.length === 0) return [];
      
      // Fetch lessons for all modules in this cohort
      const lessonPromises = (modules as Module[]).map(async (module) => {
        try {
          const response = await apiRequest("GET", `/api/admin/lessons?moduleId=${module.id}`);
          const moduleLessons = await response.json();
          return moduleLessons.map((lesson: Lesson) => ({
            ...lesson,
            moduleName: module.title,
            moduleWeek: module.week,
          }));
        } catch (error) {
          console.error(`Failed to fetch lessons for module ${module.id}:`, error);
          return [];
        }
      });

      const allLessons = await Promise.all(lessonPromises);
      return allLessons.flat();
    },
    enabled: !!selectedCohort && !!modules && Array.isArray(modules) && modules.length > 0,
  });

  // Mutations
  const createModuleMutation = useMutation({
    mutationFn: async (data: ModuleFormData) => {
      const response = await apiRequest("POST", "/api/admin/modules", data);
      return response.json();
    },
    onSuccess: () => {
      setIsCreateModuleOpen(false);
      moduleForm.reset(emptyModuleValues());
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && 
          (query.queryKey[0] === '/api/admin/modules' || query.queryKey[0] === '/api/admin/cohort-lessons')
      });
      // Force refetch the current modules query if selectedCohort exists
      if (selectedCohort) {
        queryClient.refetchQueries({ 
          queryKey: ['/api/admin/modules', { cohortId: selectedCohort }],
          exact: true 
        });
      }
      // Force refetch cohort lessons overview after module creation
      if (selectedCohort) {
        queryClient.refetchQueries({ 
          queryKey: ['/api/admin/cohort-lessons', { cohortId: selectedCohort }],
          exact: true 
        });
      }
      toast({ title: t("toast.moduleCreated") });
    },
    onError: (error: any) => {
      toast({
        title: t("toast.error.createModule"),
        description: getApiErrorMessage(error, t("common:status.tryAgainLater")),
        variant: "destructive",
      });
    },
  });

  const updateModuleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ModuleFormData }) => {
      const response = await apiRequest("PUT", `/api/admin/modules/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      setEditingModule(null);
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && 
          (query.queryKey[0] === '/api/admin/modules' || query.queryKey[0] === '/api/admin/cohort-lessons')
      });
      // Force refetch cohort lessons overview after module update
      if (selectedCohort) {
        queryClient.refetchQueries({ 
          queryKey: ['/api/admin/cohort-lessons', { cohortId: selectedCohort }],
          exact: true 
        });
      }
      toast({ title: t("toast.moduleUpdated") });
    },
    onError: (error: any) => {
      toast({
        title: t("toast.error.updateModule"),
        description: getApiErrorMessage(error, t("common:status.tryAgainLater")),
        variant: "destructive",
      });
    },
  });

  const deleteModuleMutation = useMutation({
    mutationFn: async (id: string) => {
      // DELETE returns 204 with no body
      await apiRequest("DELETE", `/api/admin/modules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && 
          (query.queryKey[0] === '/api/admin/modules' || query.queryKey[0] === '/api/admin/cohort-lessons')
      });
      // Force refetch cohort lessons overview after module deletion
      if (selectedCohort) {
        queryClient.refetchQueries({ 
          queryKey: ['/api/admin/cohort-lessons', { cohortId: selectedCohort }],
          exact: true 
        });
      }
      toast({ title: t("toast.moduleDeleted") });
    },
    onError: (error: any) => {
      toast({
        title: t("toast.error.deleteModule"),
        description: getApiErrorMessage(error, t("common:status.tryAgainLater")),
        variant: "destructive",
      });
    },
  });

  const duplicateModuleMutation = useMutation({
    mutationFn: async ({ id, newCohortId }: { id: string; newCohortId: string }) => {
      const response = await apiRequest("POST", `/api/admin/modules/${id}/duplicate`, { newCohortId });
      return response.json();
    },
    onSuccess: () => {
      setDuplicatingModule(null);
      setDuplicateTargetCohort("");
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && 
          (query.queryKey[0] === '/api/admin/modules' || query.queryKey[0] === '/api/admin/cohort-lessons')
      });
      // Force refetch cohort lessons overview after module duplication
      if (selectedCohort) {
        queryClient.refetchQueries({ 
          queryKey: ['/api/admin/cohort-lessons', { cohortId: selectedCohort }],
          exact: true 
        });
      }
      toast({ title: t("toast.moduleDuplicated") });
    },
    onError: (error: any) => {
      toast({
        title: t("toast.error.duplicateModule"),
        description: getApiErrorMessage(error, t("common:status.tryAgainLater")),
        variant: "destructive",
      });
    },
  });

  const createLessonMutation = useMutation({
    mutationFn: async (data: LessonFormData) => {
      const response = await apiRequest("POST", "/api/admin/lessons", data);
      return response.json();
    },
    onSuccess: () => {
      setIsCreateLessonOpen(false);
      lessonForm.reset(emptyLessonValues());
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && 
          (query.queryKey[0] === '/api/admin/lessons' || query.queryKey[0] === '/api/admin/cohort-lessons')
      });
      // Force refetch the current lessons query if selectedModule exists
      if (selectedModule) {
        queryClient.refetchQueries({ 
          queryKey: ['/api/admin/lessons', { moduleId: selectedModule }],
          exact: true 
        });
      }
      // Force refetch cohort lessons overview
      if (selectedCohort) {
        queryClient.refetchQueries({ 
          queryKey: ['/api/admin/cohort-lessons', { cohortId: selectedCohort }],
          exact: true 
        });
      }
      toast({ title: t("toast.lessonCreated") });
    },
    onError: (error: any) => {
      toast({
        title: t("toast.error.createLesson"),
        description: getApiErrorMessage(error, t("common:status.tryAgainLater")),
        variant: "destructive",
      });
    },
  });

  const updateLessonMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: LessonFormData }) => {
      const response = await apiRequest("PUT", `/api/admin/lessons/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      setEditingLesson(null);
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && 
          (query.queryKey[0] === '/api/admin/lessons' || query.queryKey[0] === '/api/admin/cohort-lessons')
      });
      // Force refetch lessons for the module of the edited lesson
      if (editingLesson && editingLesson.moduleId) {
        queryClient.refetchQueries({ 
          queryKey: ['/api/admin/lessons', { moduleId: editingLesson.moduleId }],
          exact: true 
        });
      }
      // Also refetch for selectedModule if it exists and is different
      if (selectedModule && selectedModule !== editingLesson?.moduleId) {
        queryClient.refetchQueries({ 
          queryKey: ['/api/admin/lessons', { moduleId: selectedModule }],
          exact: true 
        });
      }
      // Force refetch cohort lessons overview
      if (selectedCohort) {
        queryClient.refetchQueries({ 
          queryKey: ['/api/admin/cohort-lessons', { cohortId: selectedCohort }],
          exact: true 
        });
      }
      toast({ title: t("toast.lessonUpdated") });
    },
    onError: (error: any) => {
      toast({
        title: t("toast.error.updateLesson"),
        description: getApiErrorMessage(error, t("common:status.tryAgainLater")),
        variant: "destructive",
      });
    },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (id: string) => {
      // DELETE returns 204 with no body
      await apiRequest("DELETE", `/api/admin/lessons/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && 
          (query.queryKey[0] === '/api/admin/lessons' || query.queryKey[0] === '/api/admin/cohort-lessons')
      });
      if (selectedModule) {
        queryClient.refetchQueries({ 
          queryKey: ['/api/admin/lessons', { moduleId: selectedModule }],
          exact: true 
        });
      }
      // Force refetch cohort lessons overview
      if (selectedCohort) {
        queryClient.refetchQueries({ 
          queryKey: ['/api/admin/cohort-lessons', { cohortId: selectedCohort }],
          exact: true 
        });
      }
      toast({ title: t("toast.lessonDeleted") });
    },
    onError: (error: any) => {
      toast({
        title: t("toast.error.deleteLesson"),
        description: getApiErrorMessage(error, t("common:status.tryAgainLater")),
        variant: "destructive",
      });
    },
  });

  const createQuizMutation = useMutation({
    mutationFn: async (data: QuizFormData) => {
      const response = await apiRequest("POST", "/api/admin/quizzes", data);
      return response.json();
    },
    onSuccess: () => {
      setIsCreateQuizOpen(false);
      quizForm.reset(emptyQuizValues());
      queryClient.invalidateQueries({ queryKey: ['/api/admin/quizzes'] });
      toast({ title: t("toast.quizCreated") });
    },
    onError: (error: any) => {
      toast({
        title: t("toast.error.createQuiz"),
        description: getApiErrorMessage(error, t("common:status.tryAgainLater")),
        variant: "destructive",
      });
    },
  });

  const updateQuizMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: QuizFormData }) => {
      const response = await apiRequest("PUT", `/api/admin/quizzes/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      setEditingQuiz(null);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/quizzes'] });
      toast({ title: t("toast.quizUpdated") });
    },
    onError: (error: any) => {
      toast({
        title: t("toast.error.updateQuiz"),
        description: getApiErrorMessage(error, t("common:status.tryAgainLater")),
        variant: "destructive",
      });
    },
  });

  const deleteQuizMutation = useMutation({
    mutationFn: async (id: string) => {
      // DELETE returns 204 with no body
      await apiRequest("DELETE", `/api/admin/quizzes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/quizzes'] });
      toast({ title: t("toast.quizDeleted") });
    },
    onError: (error: any) => {
      toast({
        title: t("toast.error.deleteQuiz"),
        description: getApiErrorMessage(error, t("common:status.tryAgainLater")),
        variant: "destructive",
      });
    },
  });

  // Spanish copies are sent as a whole (the server replaces `translations`), aligned to the English lists.
  const withModuleTranslations = (data: ModuleFormData, base: Module | null): ModuleFormData => {
    const es = data.translations?.es ?? {};
    return {
      ...data,
      translations: {
        es: {
          title: es.title ?? "",
          description: es.description ?? "",
          objectives: alignList(es.objectives, base?.objectives?.length ?? 0),
          resources: alignList(es.resources, base?.resources?.length ?? 0),
        },
      },
    };
  };

  const withLessonTranslations = (data: LessonFormData): LessonFormData => {
    const es = data.translations?.es ?? {};
    return { ...data, translations: { es: { title: es.title ?? "", content: es.content ?? "" } } };
  };

  const withQuizTranslations = (data: QuizFormData): QuizFormData => {
    const es = data.translations?.es ?? {};
    return {
      ...data,
      translations: { es: { title: es.title ?? "", questions: alignQuestions(es.questions, data.questions) } },
    };
  };

  // Handlers
  const handleCreateModule = (data: ModuleFormData) => {
    createModuleMutation.mutate(withModuleTranslations(data, null));
  };

  const handleUpdateModule = (data: ModuleFormData) => {
    if (editingModule) {
      updateModuleMutation.mutate({ id: editingModule.id, data: withModuleTranslations(data, editingModule) });
    }
  };

  const handleCreateLesson = (data: LessonFormData) => {
    createLessonMutation.mutate(withLessonTranslations(data));
  };

  const handleUpdateLesson = (data: LessonFormData) => {
    if (editingLesson) {
      updateLessonMutation.mutate({ id: editingLesson.id, data: withLessonTranslations(data) });
    }
  };

  const handleCreateQuiz = (data: QuizFormData) => {
    createQuizMutation.mutate(withQuizTranslations(data));
  };

  const handleUpdateQuiz = (data: QuizFormData) => {
    if (editingQuiz) {
      updateQuizMutation.mutate({ id: editingQuiz.id, data: withQuizTranslations(data) });
    }
  };

  const toggleModuleExpansion = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
      setSelectedModule(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  // Computed data
  const modulesWithLessons: ModuleWithLessons[] = useMemo(() => {
    if (!modules || !Array.isArray(modules) || modules.length === 0) return [];
    
    return (modules as Module[]).map((module: Module) => {
      const cohort = (cohorts as Cohort[]).find((c: Cohort) => c.id === module.cohortId);
      return {
        ...module,
        cohortName: (cohort && localized.text(cohort, "name")) || t("unknownCohort"),
        lessons: expandedModules.has(module.id) ? (lessons as Lesson[]) : undefined,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modules, cohorts, lessons, expandedModules, localized.locale, t]);


  if (isLoadingCohorts) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const moduleFields = (idPrefix: "module" | "edit-module", testIds: { week: string; order: string; cohort: string }) => (
    <>
      <ModuleTextFields
        form={moduleForm}
        lang={moduleLang}
        onLangChange={setModuleLang}
        idPrefix={idPrefix}
        baseObjectives={idPrefix === "edit-module" ? editingModule?.objectives ?? [] : []}
        baseResources={idPrefix === "edit-module" ? editingModule?.resources ?? [] : []}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={moduleForm.control}
          name="week"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("module.week")}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  {...field}
                  data-testid={testIds.week}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={moduleForm.control}
          name="orderIndex"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("module.order")}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  {...field}
                  data-testid={testIds.order}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={moduleForm.control}
        name="cohortId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("module.cohort")}</FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value}
              data-testid={testIds.cohort}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={t("module.selectCohort")} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {(cohorts as Cohort[]).map((cohort: Cohort) => (
                  <SelectItem key={cohort.id} value={cohort.id}>
                    {cohortLabel(cohort)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );

  const lessonFields = (edit: boolean) => (
    <>
      <LessonTextFields
        form={lessonForm}
        lang={lessonLang}
        onLangChange={setLessonLang}
        idPrefix={edit ? "edit-lesson" : "lesson"}
        moduleField={
          <FormField
            control={lessonForm.control}
            name="moduleId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("lesson.module")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid={edit ? "select-edit-lesson-module" : "select-lesson-module"}>
                      <SelectValue placeholder={t("lesson.selectModule")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(modules as Module[]).map((module: Module) => (
                      <SelectItem key={module.id} value={module.id}>
                        {localized.text(module, "title")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        }
      />

      {/* Media Resources Section */}
      <LessonMediaField form={lessonForm} edit={edit} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <LessonQuizField form={lessonForm} quizzes={allQuizzes} />
        <FormField
          control={lessonForm.control}
          name="orderIndex"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("lesson.order")}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  {...field}
                  data-testid={edit ? "input-edit-lesson-order" : "input-lesson-order"}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </>
  );

  const confirmDeleteLesson = (lesson: Lesson) =>
    setConfirmRequest({
      title: t("confirm.deleteLesson", { title: localized.text(lesson, "title") }),
      description: t("confirm.cannotUndo"),
      onConfirm: () => deleteLessonMutation.mutate(lesson.id),
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-display text-2xl font-medium text-foreground">{t("header.title")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("header.description")}
        </p>
      </div>

      {cohorts.length === 0 && (
        <div className="dashed-zone flex flex-col items-start gap-4 bg-card/60 p-6 sm:flex-row sm:items-center sm:justify-between" data-testid="curriculum-no-cohorts">
          <div>
            <p className="font-display text-base font-medium text-foreground">{t("noCohorts.title")}</p>
            <p className="mt-1 max-w-[60ch] text-sm text-muted-foreground">
              {t("noCohorts.body")}
            </p>
          </div>
          {onRequestCreateCohort && (
            <Button onClick={onRequestCreateCohort} className="shrink-0" data-testid="button-curriculum-create-cohort">
              <Plus className="h-4 w-4" />
              {t("noCohorts.action")}
            </Button>
          )}
        </div>
      )}

      {/* Cohort Selection */}
      {cohorts.length > 0 && <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex shrink-0 items-center gap-2 font-display text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            {t("cohortPicker.label")}
          </div>
          <div className="w-full sm:max-w-md">
          <Select
            value={selectedCohort || ""}
            onValueChange={setSelectedCohort}
            data-testid="select-cohort"
          >
            <SelectTrigger>
              <SelectValue placeholder={t("cohortPicker.placeholder")} />
            </SelectTrigger>
            <SelectContent>
              {(cohorts as Cohort[]).map((cohort: Cohort) => (
                <SelectItem key={cohort.id} value={cohort.id}>
                  {cohortLabel(cohort)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>
        </CardContent>
      </Card>}

      {selectedCohort && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex w-full justify-start overflow-x-auto overflow-y-hidden h-auto sm:grid sm:grid-cols-3">
            <TabsTrigger value="modules" data-testid="tab-modules">
              <BookOpen className="h-4 w-4 mr-2" />
              {t("tabs.modules")}
            </TabsTrigger>
            <TabsTrigger value="lessons" data-testid="tab-lessons">
              <FileText className="h-4 w-4 mr-2" />
              {t("tabs.lessons")}
            </TabsTrigger>
            <TabsTrigger value="quizzes" data-testid="tab-quizzes">
              <HelpCircle className="h-4 w-4 mr-2" />
              {t("tabs.quizzes")}
            </TabsTrigger>
          </TabsList>

          {/* Modules Tab */}
          <TabsContent value="modules" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg">{t("tabs.modules")}</h3>
              <Dialog
                open={isCreateModuleOpen}
                onOpenChange={(open) => {
                  if (open) {
                    // Pre-select the cohort currently being viewed
                    moduleForm.reset(emptyModuleValues(selectedCohort || ""));
                    setModuleLang("en");
                  }
                  setIsCreateModuleOpen(open);
                }}
              >
                <DialogTrigger asChild>
                  <Button data-testid="button-create-module">
                    <Plus className="h-4 w-4 mr-2" />
                    {t("module.create")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{t("module.newTitle")}</DialogTitle>
                  </DialogHeader>
                  <Form {...moduleForm}>
                    <form onSubmit={moduleForm.handleSubmit(handleCreateModule, () => setModuleLang("en"))} className="space-y-4">
                      {moduleFields("module", {
                        week: "input-module-week",
                        order: "input-module-order",
                        cohort: "select-module-cohort",
                      })}
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsCreateModuleOpen(false)}
                          data-testid="button-cancel-module"
                        >
                          {t("common:actions.cancel")}
                        </Button>
                        <Button
                          type="submit"
                          disabled={createModuleMutation.isPending}
                          data-testid="button-submit-module"
                        >
                          {createModuleMutation.isPending ? t("form.creating") : t("module.create")}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {isLoadingModules ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : modulesWithLessons.length === 0 ? (
              <div className="dashed-zone flex flex-col items-center justify-center bg-card px-6 py-12 text-center">
                <BookOpen className="mb-3 h-8 w-8 text-muted-foreground" />
                <h3 className="mb-1 text-base">{t("module.emptyTitle")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("module.emptyBody")}
                </p>
              </div>
            ) : (
              <Card className="divide-y divide-border">
                {modulesWithLessons.map((module) => {
                  const moduleTitle = localized.text(module, "title");
                  const moduleDescription = localized.text(module, "description");
                  return (
                  <div key={module.id}>
                    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <ConnectorBadge state="upcoming" className="mt-0.5">{module.week}</ConnectorBadge>
                        <div className="min-w-0 space-y-1">
                          <Collapsible>
                            <CollapsibleTrigger
                              onClick={() => toggleModuleExpansion(module.id)}
                              className="flex items-center gap-1.5 text-left"
                              data-testid={`button-expand-module-${module.id}`}
                            >
                              {expandedModules.has(module.id) ? (
                                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                              )}
                              <span className="font-display text-base font-medium text-foreground">{moduleTitle}</span>
                            </CollapsibleTrigger>
                          </Collapsible>
                          <div className="flex flex-wrap items-center gap-2 font-display text-xs text-muted-foreground">
                            <span>{t("common:week", { week: module.week })}</span>
                            <span aria-hidden="true">·</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {t("module.orderValue", { order: module.orderIndex })}
                            </span>
                            <Badge variant="secondary">{module.cohortName}</Badge>
                            <MissingSpanish entity={module} />
                          </div>
                          {module.description && (
                            <p className="text-sm text-muted-foreground">{moduleDescription}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 sm:pl-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setDuplicateTargetCohort("");
                            setDuplicatingModule(module);
                          }}
                          aria-label={t("module.duplicateLabel", { title: moduleTitle })}
                          title={t("module.duplicateTitle")}
                          data-testid={`button-duplicate-module-${module.id}`}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingModule(module)}
                          aria-label={t("module.editLabel", { title: moduleTitle })}
                          title={t("module.editTitle")}
                          data-testid={`button-edit-module-${module.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setConfirmRequest({
                            title: t("confirm.deleteModule", { title: moduleTitle }),
                            description: t("confirm.deleteModuleBody"),
                            onConfirm: () => deleteModuleMutation.mutate(module.id),
                          })}
                          aria-label={t("module.deleteLabel", { title: moduleTitle })}
                          title={t("module.deleteTitle")}
                          data-testid={`button-delete-module-${module.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <Collapsible open={expandedModules.has(module.id)}>
                      <CollapsibleContent>
                        <div className="space-y-3 border-t border-border bg-secondary/40 px-4 py-4 sm:pl-16">
                          <div className="flex items-center justify-between">
                            <h4 className="font-display text-sm text-muted-foreground">{t("tabs.lessons")}</h4>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                lessonForm.reset(emptyLessonValues(module.id));
                                setLessonLang("en");
                                setIsCreateLessonOpen(true);
                              }}
                              data-testid={`button-add-lesson-${module.id}`}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              {t("lesson.add")}
                            </Button>
                          </div>
                          {module.lessons && module.lessons.length > 0 ? (
                            <div className="divide-y divide-border rounded-lg border border-border bg-card">
                              {module.lessons.map((lesson: Lesson, index: number) => {
                                const lessonTitle = localized.text(lesson, "title");
                                return (
                                <div
                                  key={lesson.id}
                                  className="flex items-center justify-between gap-3 px-3 py-2.5"
                                >
                                  <div className="flex min-w-0 items-center gap-3">
                                    <span className="w-5 shrink-0 text-right font-display text-sm text-muted-foreground">{index + 1}</span>
                                    <div className="min-w-0">
                                      <div className="truncate font-medium">{lessonTitle}</div>
                                      <div className="flex items-center gap-2 font-display text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          {t("lesson.number", { number: index + 1 })}
                                        </span>
                                        <MissingSpanish entity={lesson} />
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setEditingLesson(lesson)}
                                      aria-label={t("lesson.editLabel", { title: lessonTitle })}
                                      title={t("lesson.editTitle")}
                                      data-testid={`button-edit-lesson-${lesson.id}`}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => confirmDeleteLesson(lesson)}
                                      aria-label={t("lesson.deleteLabel", { title: lessonTitle })}
                                      title={t("lesson.deleteTitle")}
                                      data-testid={`button-delete-lesson-${lesson.id}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="rounded-lg border border-dashed border-steel/50 py-4 text-center text-sm text-muted-foreground">
                              {t("lesson.emptyInModule")}
                            </p>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                  );
                })}
              </Card>
            )}
          </TabsContent>

          {/* Lessons Tab */}
          <TabsContent value="lessons" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg">{t("lesson.byModule")}</h3>
              <Dialog
                open={isCreateLessonOpen}
                onOpenChange={(open) => {
                  if (open) setLessonLang("en");
                  setIsCreateLessonOpen(open);
                }}
              >
                <DialogTrigger asChild>
                  <Button data-testid="button-create-lesson">
                    <Plus className="h-4 w-4 mr-2" />
                    {t("lesson.create")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{t("lesson.newTitle")}</DialogTitle>
                  </DialogHeader>
                  <Form {...lessonForm}>
                    <form onSubmit={lessonForm.handleSubmit(handleCreateLesson, () => setLessonLang("en"))} className="space-y-4">
                      {lessonFields(false)}
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsCreateLessonOpen(false)}
                          data-testid="button-cancel-lesson"
                        >
                          {t("common:actions.cancel")}
                        </Button>
                        <Button
                          type="submit"
                          disabled={createLessonMutation.isPending}
                          data-testid="button-submit-lesson"
                        >
                          {createLessonMutation.isPending ? t("form.creating") : t("lesson.create")}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Lesson Overview - All lessons grouped by module */}
            {isLoadingAllLessons ? (
              <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : allCohortLessons.length > 0 ? (
              <div className="space-y-4">
                {/* Group lessons by module */}
                {modulesWithLessons.map((module) => {
                  const moduleLessons = allCohortLessons.filter((lesson: any) => lesson.moduleId === module.id);

                  return (
                    <Card key={module.id}>
                      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <ConnectorBadge state="upcoming">{module.week}</ConnectorBadge>
                          <div className="min-w-0">
                            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                              <span className="truncate">{localized.text(module, "title")}</span>
                              <Badge variant="secondary">
                                {t("lesson.count", { count: moduleLessons.length })}
                              </Badge>
                            </CardTitle>
                            <p className="font-display text-xs text-muted-foreground">
                              {t("lesson.moduleMeta", { cohort: module.cohortName, week: module.week })}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="self-start sm:self-auto"
                          onClick={() => {
                            lessonForm.reset(emptyLessonValues(module.id, moduleLessons.length));
                            setLessonLang("en");
                            setIsCreateLessonOpen(true);
                          }}
                          data-testid={`button-add-lesson-overview-${module.id}`}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {t("lesson.add")}
                        </Button>
                      </div>
                      {moduleLessons.length > 0 ? (
                        <div className="divide-y divide-border">
                          {moduleLessons.map((lesson: any, index: number) => {
                            const lessonTitle = localized.text(lesson, "title");
                            return (
                            <div
                              key={lesson.id}
                              className="flex items-center justify-between gap-3 px-4 py-3"
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <span className="w-5 shrink-0 text-right font-display text-sm text-muted-foreground">{index + 1}</span>
                                <div className="min-w-0">
                                  <div className="truncate font-medium">{lessonTitle}</div>
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-display text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {t("lesson.number", { number: index + 1 })}
                                    </span>
                                    {lesson.media && lesson.media.length > 0 && (
                                      <span className="flex items-center gap-1">
                                        <FileText className="h-3 w-3" />
                                        {t("lesson.resourceCount", { count: lesson.media.length })}
                                      </span>
                                    )}
                                    <MissingSpanish entity={lesson} />
                                  </div>
                                </div>
                              </div>
                              <div className="flex shrink-0 items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingLesson(lesson)}
                                  aria-label={t("lesson.editLabel", { title: lessonTitle })}
                                  title={t("lesson.editTitle")}
                                  data-testid={`button-edit-lesson-overview-${lesson.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => confirmDeleteLesson(lesson)}
                                  aria-label={t("lesson.deleteLabel", { title: lessonTitle })}
                                  title={t("lesson.deleteTitle")}
                                  data-testid={`button-delete-lesson-overview-${lesson.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="m-4 rounded-lg border border-dashed border-steel/50 py-4 text-center text-sm text-muted-foreground">
                          {t("lesson.emptyInModuleOverview")}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="dashed-zone bg-card p-6">
                <p className="text-center text-sm text-muted-foreground">
                  {t("lesson.emptyCohort")}
                </p>
              </div>
            )}
          </TabsContent>

          {/* Quizzes Tab */}
          <TabsContent value="quizzes" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg">{t("tabs.quizzes")}</h3>
              <Dialog
                open={isCreateQuizOpen}
                onOpenChange={(open) => {
                  if (open) {
                    setEditingQuiz(null);
                    quizForm.reset(emptyQuizValues());
                    setQuizLang("en");
                  }
                  setIsCreateQuizOpen(open);
                }}
              >
                <DialogTrigger asChild>
                  <Button data-testid="button-create-quiz">
                    <Plus className="h-4 w-4 mr-2" />
                    {t("quiz.create")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{t("quiz.newTitle")}</DialogTitle>
                  </DialogHeader>
                  <Form {...quizForm}>
                    <form onSubmit={quizForm.handleSubmit(handleCreateQuiz, () => setQuizLang("en"))} className="space-y-4">
                      <QuizFormFields form={quizForm} idPrefix="quiz" lang={quizLang} onLangChange={setQuizLang} />
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsCreateQuizOpen(false)}
                          data-testid="button-cancel-quiz"
                        >
                          {t("common:actions.cancel")}
                        </Button>
                        <Button
                          type="submit"
                          disabled={createQuizMutation.isPending}
                          data-testid="button-submit-quiz"
                        >
                          {createQuizMutation.isPending ? t("form.creating") : t("quiz.create")}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {isLoadingQuizzes ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : !allQuizzes || !Array.isArray(allQuizzes) || allQuizzes.length === 0 ? (
              <div className="dashed-zone flex flex-col items-center justify-center bg-card px-6 py-12 text-center">
                <HelpCircle className="mb-3 h-8 w-8 text-muted-foreground" />
                <h3 className="mb-1 text-base">{t("quiz.emptyTitle")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("quiz.emptyBody")}
                </p>
              </div>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>{t("quiz.table.quiz")}</TableHead>
                      <TableHead>{t("quiz.table.questions")}</TableHead>
                      <TableHead>{t("quiz.table.passMark")}</TableHead>
                      <TableHead>{t("quiz.table.maxAttempts")}</TableHead>
                      <TableHead className="text-right"><span className="sr-only">{t("quiz.table.actions")}</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(allQuizzes as Quiz[]).map((quiz: Quiz) => {
                      const quizTitle = localized.text(quiz, "title");
                      return (
                      <TableRow key={quiz.id}>
                        <TableCell className="min-w-[12rem] font-medium">
                          <div className="flex flex-wrap items-center gap-2">
                            <span>{quizTitle}</span>
                            <MissingSpanish entity={quiz} />
                          </div>
                        </TableCell>
                        <TableCell className="font-display">{Array.isArray(quiz.questions) ? quiz.questions.length : 0}</TableCell>
                        <TableCell className="font-display">{t("quiz.percent", { value: quiz.passThreshold })}</TableCell>
                        <TableCell className="font-display text-muted-foreground">
                          {quiz.maxAttempts && (
                            <span className="flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              {quiz.maxAttempts}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingQuiz(quiz)}
                              aria-label={t("quiz.editLabel", { title: quizTitle })}
                              title={t("quiz.editTitle")}
                              data-testid={`button-edit-quiz-${quiz.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => setConfirmRequest({
                                title: t("confirm.deleteQuiz", { title: quizTitle }),
                                description: t("confirm.deleteQuizBody"),
                                onConfirm: () => deleteQuizMutation.mutate(quiz.id),
                              })}
                              aria-label={t("quiz.deleteLabel", { title: quizTitle })}
                              title={t("quiz.deleteTitle")}
                              data-testid={`button-delete-quiz-${quiz.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Duplicate Module Dialog */}
      <Dialog
        open={!!duplicatingModule}
        onOpenChange={(open) => {
          if (!open) {
            setDuplicatingModule(null);
            setDuplicateTargetCohort("");
          }
        }}
      >
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>{t("duplicate.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("duplicate.body", { title: localized.text(duplicatingModule, "title") })}
            </p>
            <div className="space-y-2">
              <Label htmlFor="select-duplicate-cohort">{t("duplicate.target")}</Label>
              <Select value={duplicateTargetCohort} onValueChange={setDuplicateTargetCohort}>
                <SelectTrigger id="select-duplicate-cohort" data-testid="select-duplicate-cohort">
                  <SelectValue placeholder={t("duplicate.targetPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {cohorts
                    .filter((cohort) => cohort.id !== duplicatingModule?.cohortId)
                    .map((cohort) => (
                      <SelectItem key={cohort.id} value={cohort.id}>
                        {cohortLabel(cohort)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {cohorts.filter((cohort) => cohort.id !== duplicatingModule?.cohortId).length === 0 && (
                <p className="text-xs text-muted-foreground">{t("duplicate.noOtherCohort")}</p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDuplicatingModule(null);
                  setDuplicateTargetCohort("");
                }}
                data-testid="button-cancel-duplicate-module"
              >
                {t("common:actions.cancel")}
              </Button>
              <Button
                type="button"
                disabled={!duplicateTargetCohort || duplicateModuleMutation.isPending}
                onClick={() => {
                  if (duplicatingModule && duplicateTargetCohort) {
                    duplicateModuleMutation.mutate({ id: duplicatingModule.id, newCohortId: duplicateTargetCohort });
                  }
                }}
                data-testid="button-confirm-duplicate-module"
              >
                {duplicateModuleMutation.isPending ? t("duplicate.pending") : t("duplicate.action")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Module Dialog */}
      {editingModule && (
        <Dialog open={!!editingModule} onOpenChange={() => setEditingModule(null)}>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("module.editTitle")}</DialogTitle>
            </DialogHeader>
            <Form {...moduleForm}>
              <form onSubmit={moduleForm.handleSubmit(handleUpdateModule, () => setModuleLang("en"))} className="space-y-4">
                {moduleFields("edit-module", {
                  week: "input-edit-module-week",
                  order: "input-edit-module-order",
                  cohort: "select-edit-module-cohort",
                })}
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingModule(null)}
                    data-testid="button-cancel-edit-module"
                  >
                    {t("common:actions.cancel")}
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateModuleMutation.isPending}
                    data-testid="button-save-module"
                  >
                    {updateModuleMutation.isPending ? t("form.saving") : t("common:actions.saveChanges")}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Lesson Dialog */}
      {editingLesson && (
        <Dialog open={!!editingLesson} onOpenChange={() => setEditingLesson(null)}>
          <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("lesson.editTitle")}</DialogTitle>
            </DialogHeader>
            <Form {...lessonForm}>
              <form onSubmit={lessonForm.handleSubmit(handleUpdateLesson, () => setLessonLang("en"))} className="space-y-4">
                {lessonFields(true)}
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingLesson(null)}
                    data-testid="button-cancel-edit-lesson"
                  >
                    {t("common:actions.cancel")}
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateLessonMutation.isPending}
                    data-testid="button-save-lesson"
                  >
                    {updateLessonMutation.isPending ? t("form.saving") : t("common:actions.saveChanges")}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Quiz Dialog */}
      {editingQuiz && (
        <Dialog open={!!editingQuiz} onOpenChange={() => setEditingQuiz(null)}>
          <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("quiz.editTitle")}</DialogTitle>
            </DialogHeader>
            <Form {...quizForm}>
              <form onSubmit={quizForm.handleSubmit(handleUpdateQuiz, () => setQuizLang("en"))} className="space-y-4">
                <QuizFormFields form={quizForm} idPrefix="edit-quiz" lang={quizLang} onLangChange={setQuizLang} />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingQuiz(null)}
                    data-testid="button-cancel-edit-quiz"
                  >
                    {t("common:actions.cancel")}
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateQuizMutation.isPending}
                    data-testid="button-save-quiz"
                  >
                    {updateQuizMutation.isPending ? t("form.saving") : t("common:actions.saveChanges")}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}

      <ConfirmDialog
        request={confirmRequest}
        onOpenChange={(open) => { if (!open) setConfirmRequest(null); }}
      />
    </div>
  );
}
