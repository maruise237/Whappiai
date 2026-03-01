import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

const BaseSwal = withReactContent(Swal);

// Configuration de base conforme au DESIGN_SYSTEM.md
export const MySwal = BaseSwal.mixin({
  customClass: {
    container: "backdrop-blur-sm bg-background/30",
    popup: "rounded-xl border border-border bg-card shadow-lg p-6 max-w-[95vw] sm:max-w-md !font-sans overflow-hidden",
    title: "text-foreground font-semibold text-xl mb-2 tracking-tight",
    htmlContainer: "text-muted-foreground text-sm leading-relaxed",
    confirmButton: "bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md transition-all font-medium text-sm active:scale-95 w-full sm:w-auto shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    cancelButton: "bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 rounded-md transition-all font-medium text-sm active:scale-95 w-full sm:w-auto ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    denyButton: "bg-destructive text-destructive-foreground hover:bg-destructive/90 px-4 py-2 rounded-md transition-all font-medium text-sm active:scale-95 w-full sm:w-auto shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    input: "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 mt-4 mb-2",
    inputLabel: "text-[10px] font-semibold text-muted-foreground/80 mb-1 block text-left ml-1",
    validationMessage: "text-[10px] font-medium text-destructive mt-2 bg-destructive/5 p-2 rounded-md border border-destructive/10 text-center",
    actions: "flex flex-col sm:flex-row gap-2 justify-end mt-8 w-full sm:w-auto",
    loader: "text-primary",
  },
  buttonsStyling: false,
});

export const showLoading = (title: string = "Chargement...") => {
  return MySwal.fire({
    title,
    allowOutsideClick: false,
    didOpen: () => {
      MySwal.showLoading();
    },
  });
};

export const showAlert = (title: string, text: string, icon: "success" | "error" | "warning" | "info" | "question" = "info") => {
  return MySwal.fire({
    title,
    text,
    icon,
  });
};

export const showConfirm = (title: string, text: string, icon: "warning" | "error" | "success" | "info" | "question" = "warning") => {
  return MySwal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText: "Confirmer",
    cancelButtonText: "Annuler",
  });
};

export default MySwal;
