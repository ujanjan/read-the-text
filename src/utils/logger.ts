export const debugLog = (...args: any[]) => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === 'true') {
        console.log(...args);
    }
};
