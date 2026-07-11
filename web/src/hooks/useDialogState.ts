import { useState } from 'react';

export default function useDialogState<T>() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<T | null>(null);

  function openDialog(value: T) {
    setData(value);
    setOpen(true);
  }

  return {
    open,
    data,
    openDialog,
    closeDialog: () => setOpen(false),
    onOpenChange: setOpen,
  };
}
