import React, { useState } from 'react';
import DeletionDialog from './DeletionDialog';

export default function useDeletionDialog(options) {
  const [id, setId] = useState(null);
  return {
    requestDeletion: (value) => setId(value),
    dialog:
      id === null ? null : (
        <DeletionDialog
          key={`${options.resource}:${id}`}
          {...options}
          id={id}
          onClose={() => setId(null)}
        />
      ),
  };
}
