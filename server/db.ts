// Referenced from javascript_database blueprint

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://twlmyweabereqhbwukjr.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;
if (!supabaseKey) {
	throw new Error('SUPABASE_KEY must be set in environment variables.');
}
export const db = createClient(supabaseUrl, supabaseKey);
