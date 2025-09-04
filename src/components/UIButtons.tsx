import React from 'react';

export const EditButton = React.memo(({ onClick, title = "Edit" }) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className="p-1 rounded-full text-slate-500 hover:bg-sky-500/20 hover:text-sky-400 transition-colors opacity-0 group-hover:opacity-100"
    title={title}
  >
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
      <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
    </svg>
  </button>
));

export const DeleteButton = React.memo(({ onClick, title = "Delete" }) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className="p-1 rounded-full text-slate-500 hover:bg-red-500/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
    title={title}
  >
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  </button>
));

export const DeleteRelationshipButton = React.memo(({ onClick, title = "Delete relationship" }) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className="p-0.5 rounded-full text-slate-500 hover:bg-red-500/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
    title={title}
  >
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  </button>
));

export const SaveButton = React.memo(({ onClick, title = "Save" }) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className="p-1 rounded-full text-green-400 hover:text-green-300 transition-colors"
    title={title}
  >
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  </button>
));

export const CancelButton = React.memo(({ onClick, title = "Cancel" }) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className="p-1 rounded-full text-slate-400 hover:text-slate-300 transition-colors"
    title={title}
  >
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  </button>
));

// Backwards compatibility
export const EditTagButton = EditButton;
export const DeleteTagButton = DeleteButton;