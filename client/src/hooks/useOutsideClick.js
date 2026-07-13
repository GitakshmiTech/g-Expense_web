import { useEffect } from 'react';

/**
 * Custom hook that triggers a callback when a click is detected outside of the referenced element.
 * @param {React.RefObject} ref - The React ref of the element to monitor.
 * @param {Function} callback - The callback function to execute on outside click.
 */
export const useOutsideClick = (ref, callback) => {
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        callback();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [ref, callback]);
};
