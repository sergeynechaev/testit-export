import 'https://deno.land/x/dotenv@v3.2.0/load.ts';

export const config = {
  testitUrl: 'https://testit.readymag.net',
  testitApiUrl: 'https://testit.readymag.net/api/v2',
  privateToken: Deno.env.get('TESTIT_API_KEY'),
};
