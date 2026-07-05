// config.js — Supabase client singleton
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL  = 'https://uhwtguibukujmxtoqsmw.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVod3RndWlidWt1am14dG9xc213Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNjAxMjcsImV4cCI6MjA5ODczNjEyN30.jJ2r1nXhe-x_YtyZ-GIgd9yg8DPCK4MQzYVBSm0lTnk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
