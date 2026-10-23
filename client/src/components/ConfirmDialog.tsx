import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

export interface ConfirmRequest {
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}

/**
 * Controlled confirmation dialog. Render one per screen and drive it with a
 * `ConfirmRequest | null` state: set a request to open it, null to close it.
 */
export default function ConfirmDialog({
  request,
  onOpenChange,
}: {
  request: ConfirmRequest | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation("common");
  return (
    <AlertDialog open={request !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{request?.title}</AlertDialogTitle>
          {request?.description && (
            <AlertDialogDescription>{request.description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="button-confirm-cancel">{t("actions.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            className={request?.destructive === false ? undefined : buttonVariants({ variant: "destructive" })}
            onClick={() => request?.onConfirm()}
            data-testid="button-confirm-action"
          >
            {request?.confirmLabel ?? (request?.destructive === false ? t("actions.confirm") : t("actions.delete"))}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
