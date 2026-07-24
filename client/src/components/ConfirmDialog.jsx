import { useEffect, useRef } from 'react';

/**
 * Boite de confirmation accessible — remplace window.confirm (RGAA).
 *
 * window.confirm bloque le thread, n'est pas stylable et surtout n'est pas
 * annonce correctement par les lecteurs d'ecran. Ce composant applique les
 * exigences d'une fenetre modale :
 *  - role="alertdialog" avec titre et description relies par aria-labelledby
 *    et aria-describedby ;
 *  - focus place sur le bouton de confirmation a l'ouverture ;
 *  - focus maintenu dans la modale (piege au Tab) ;
 *  - fermeture par Echap, et restitution du focus a l'element declencheur.
 */
export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  destructive = false,
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null);
  const confirmRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    previouslyFocused.current = document.activeElement;
    confirmRef.current?.focus();

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key !== 'Tab') return;

      // Piege du focus : on boucle sur les elements focusables de la modale.
      const focusables = dialogRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables?.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      // Rend le focus a l'element qui a ouvert la modale.
      previouslyFocused.current?.focus?.();
    };
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 id="confirm-title" className="text-lg font-semibold text-gray-900">
          {title}
        </h2>
        <p id="confirm-message" className="mt-2 text-sm text-gray-600">
          {message}
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="btn-secondary">
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className={destructive ? 'btn-danger' : 'btn-primary'}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
