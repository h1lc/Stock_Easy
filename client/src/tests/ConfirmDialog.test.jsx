import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ConfirmDialog from '../components/ConfirmDialog';

const setup = (props = {}) => {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <ConfirmDialog
      title="Archiver ce produit ?"
      message="Cette action masque le produit."
      confirmLabel="Archiver"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    />
  );
  return { onConfirm, onCancel };
};

describe('ConfirmDialog — accessibilite (RGAA)', () => {
  it('expose une fenetre modale correctement etiquetee', () => {
    setup();
    const dialog = screen.getByRole('alertdialog');

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    // Le titre et le message doivent etre annonces par le lecteur d'ecran
    expect(dialog).toHaveAccessibleName('Archiver ce produit ?');
    expect(dialog).toHaveAccessibleDescription('Cette action masque le produit.');
  });

  it('place le focus sur le bouton de confirmation a l\'ouverture', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Archiver' })).toHaveFocus();
  });

  it('se ferme avec la touche Echap', () => {
    const { onCancel } = setup();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });

  it('declenche l\'action seulement sur confirmation explicite', () => {
    const { onConfirm, onCancel } = setup();

    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Archiver' }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('maintient le focus dans la modale (piege au Tab)', () => {
    setup();
    const confirm = screen.getByRole('button', { name: 'Archiver' });
    const cancel = screen.getByRole('button', { name: 'Annuler' });

    // Depuis le dernier element, Tab revient au premier
    confirm.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(cancel).toHaveFocus();

    // Et Shift+Tab depuis le premier renvoie au dernier
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(confirm).toHaveFocus();
  });
});
