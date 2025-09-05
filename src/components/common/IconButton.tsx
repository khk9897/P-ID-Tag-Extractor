import React from 'react';

export type IconType = 'delete' | 'edit' | 'save' | 'cancel' | 'trash' | 'check' | 'close';

interface IconButtonProps {
  icon: IconType;
  onClick: (e?: React.MouseEvent) => void;
  title?: string;
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

const iconPaths: Record<IconType, React.ReactNode> = {
  delete: (
    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
  ),
  edit: (
    <>
      <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
      <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
    </>
  ),
  save: (
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  ),
  cancel: (
    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
  ),
  trash: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  ),
  check: (
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  ),
  close: (
    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
  ),
};

const sizeClasses = {
  small: 'h-3.5 w-3.5',
  medium: 'h-4 w-4',
  large: 'h-5 w-5',
};

const defaultStyles: Record<IconType, string> = {
  delete: 'text-slate-500 hover:bg-red-500/20 hover:text-red-400',
  edit: 'text-slate-500 hover:bg-sky-500/20 hover:text-sky-400',
  save: 'text-green-400 hover:text-green-300',
  cancel: 'text-slate-400 hover:text-slate-300',
  trash: 'text-slate-500 hover:bg-red-500/20 hover:text-red-400',
  check: 'text-green-400 hover:text-green-300',
  close: 'text-slate-500 hover:text-slate-400',
};

export const IconButton: React.FC<IconButtonProps> = React.memo(({ 
  icon, 
  onClick, 
  title, 
  className = '', 
  size = 'medium' 
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(e);
  };

  const baseClasses = 'p-1 rounded-full transition-colors';
  const iconClasses = defaultStyles[icon];
  const finalClasses = `${baseClasses} ${iconClasses} ${className}`;
  
  const isStrokeIcon = icon === 'trash';

  return (
    <button onClick={handleClick} className={finalClasses} title={title}>
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className={sizeClasses[size]} 
        viewBox="0 0 20 20" 
        fill={isStrokeIcon ? 'none' : 'currentColor'}
        stroke={isStrokeIcon ? 'currentColor' : undefined}
        strokeWidth={isStrokeIcon ? 2 : undefined}
      >
        {iconPaths[icon]}
      </svg>
    </button>
  );
});

IconButton.displayName = 'IconButton';

// Export specialized versions for backwards compatibility
export const DeleteRelationshipButton = React.memo(({ onClick }: { onClick: () => void }) => (
  <IconButton 
    icon="delete" 
    onClick={onClick} 
    title="Delete relationship"
    size="small"
    className="ml-2 p-0.5"
  />
));

export const DeleteTagButton = React.memo(({ onClick }: { onClick: () => void }) => (
  <IconButton
    icon="trash"
    onClick={onClick}
    title="Delete tag"
    className="opacity-0 group-hover:opacity-100"
  />
));

export const EditButton = React.memo(({ onClick, title = "Edit" }: { onClick: () => void; title?: string }) => (
  <IconButton
    icon="edit"
    onClick={onClick}
    title={title}
    className="opacity-0 group-hover:opacity-100"
  />
));

export const SaveButton = React.memo(({ onClick, title = "Save" }: { onClick: () => void; title?: string }) => (
  <IconButton icon="save" onClick={onClick} title={title} />
));

export const CancelButton = React.memo(({ onClick, title = "Cancel" }: { onClick: () => void; title?: string }) => (
  <IconButton icon="cancel" onClick={onClick} title={title} />
));

// Backwards compatibility
export const EditTagButton = EditButton;