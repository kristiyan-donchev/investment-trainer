import YahooFinance from 'yahoo-finance2';

// The custom User-Agent works around Yahoo rate-limiting (HTTP 429) requests from
// cloud/datacenter IPs (e.g. Render) that don't look like an ordinary browser —
// see https://github.com/gadicc/yahoo-finance2/issues/977.
export const yahooFinance = new YahooFinance({
  suppressNotices: ['yahooSurvey'],
  fetchOptions: {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    },
  },
});
