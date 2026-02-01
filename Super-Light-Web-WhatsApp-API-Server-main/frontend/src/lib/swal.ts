import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

/**
 * Custom SweetAlert2 utility with theme awareness
 */
export const showConfirm = async (title: string, text: string, icon: 'warning' | 'error' | 'success' | 'info' = 'warning') => {
  const isDark = document.documentElement.classList.contains('dark');
  
  return MySwal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonColor: '#10b981', // emerald-500
    cancelButtonColor: '#ef4444', // red-500
    confirmButtonText: 'Confirmer',
    cancelButtonText: 'Annuler',
    background: isDark ? '#0f172a' : '#ffffff',
    color: isDark ? '#f8fafc' : '#0f172a',
    customClass: {
      popup: 'rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl font-inter',
      title: 'text-xl font-bold',
      confirmButton: 'px-6 py-2.5 rounded-lg font-semibold transition-all hover:opacity-90',
      cancelButton: 'px-6 py-2.5 rounded-lg font-semibold transition-all hover:opacity-90',
    },
    buttonsStyling: true,
  });
};

export const showAlert = async (title: string, text: string, icon: 'success' | 'error' | 'info' | 'warning' = 'success') => {
  const isDark = document.documentElement.classList.contains('dark');

  return MySwal.fire({
    title,
    text,
    icon,
    confirmButtonColor: '#10b981',
    background: isDark ? '#0f172a' : '#ffffff',
    color: isDark ? '#f8fafc' : '#0f172a',
    customClass: {
      popup: 'rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl font-inter',
      title: 'text-xl font-bold',
      confirmButton: 'px-6 py-2.5 rounded-lg font-semibold transition-all hover:opacity-90',
    },
  });
};

export const showLoading = (title: string = 'Chargement...') => {
  const isDark = document.documentElement.classList.contains('dark');
  
  return MySwal.fire({
    title,
    allowOutsideClick: false,
    didOpen: () => {
      MySwal.showLoading();
    },
    background: isDark ? '#0f172a' : '#ffffff',
    color: isDark ? '#f8fafc' : '#0f172a',
    customClass: {
      popup: 'rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl font-inter',
    }
  });
};

export default MySwal;
