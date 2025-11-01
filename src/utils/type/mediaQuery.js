import { useState, useEffect } from 'react';

/**
 * Custom hook để kiểm tra media query
 * @param {string} query - Media query string
 * @returns {boolean} Trả về true nếu media query khớp
 */
export const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event) => setMatches(event.matches);
    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
};
