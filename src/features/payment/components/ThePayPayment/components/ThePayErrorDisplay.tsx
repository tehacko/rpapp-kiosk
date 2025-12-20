import { UI_MESSAGES, CSS_CLASSES } from '../../../../../shared/constants';

interface ThePayErrorDisplayProps {
  error: string;
  onRetry: () => void;
  onCancel: () => void;
}

export function ThePayErrorDisplay({ error, onRetry, onCancel }: ThePayErrorDisplayProps): JSX.Element {
  return (
    <div className={CSS_CLASSES.PAYMENT_CONTAINER}>
      <div className={CSS_CLASSES.ERROR_CONTAINER}>
        <h3>{UI_MESSAGES.PAYMENT_ERROR}</h3>
        <p>{error}</p>
        <div className={CSS_CLASSES.BUTTON_GROUP}>
          <button 
            onClick={onRetry} 
            className={CSS_CLASSES.BUTTON_PRIMARY}
          >
            {UI_MESSAGES.RETRY}
          </button>
          <button 
            onClick={onCancel} 
            className={CSS_CLASSES.BUTTON_SECONDARY}
          >
            {UI_MESSAGES.CANCEL}
          </button>
        </div>
      </div>
    </div>
  );
}
