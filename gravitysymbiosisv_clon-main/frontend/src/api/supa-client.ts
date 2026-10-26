import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { isPasswordRecoveryLocation, mapPasswordResetError, parseRecoveryParams } from '../lib/passwordRecovery.js'

// Prefer environment variables; fallback to production values (dev only)
const SUPABASE_URL = import.meta.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || 'https://nqaiuixiryqlcszikwgb.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.SUPABASE_KEY || import.meta.env.VITE_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xYWl1aXhpcnlxbGNzemlrd2diIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NzQ0NTcsImV4cCI6MjA4NDE1MDQ1N30.zV8cD_bmrx7mKauSljbOVRu7B25msHsMOD2qh6PSrBE';

if (!import.meta.env.SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL) {
  console.warn('⚠️ SUPABASE_URL not found in env vars. Using hardcoded fallback. Create a .env file (see .env.example).');
}
let authListenerStarted = false;

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const supaClient = {
  client: supabase,

  localDateStr(d: Date = new Date()): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  startAuthListener() {
    if (authListenerStarted) {return;}
    authListenerStarted = true;
    supabase.auth.onAuthStateChange((event, _session) => {
      if (event === "SIGNED_OUT") {
        // Reloading here consumes a one-time recovery code and drops the session
        // before the user can set a new password ("Auth session missing").
        if (isPasswordRecoveryLocation(window.location.href)) { return; }
        window.location.reload();
      }
    });
  },

  async isEmailWhitelisted(email: string): Promise<{ isWhitelisted: boolean; error: any | null }> {
    const { data, error } = await supabase
      .from('email_whitelist')
      .select('email')
      .ilike('email', email.trim())
      .maybeSingle();
    return { isWhitelisted: !!data, error };
  },

  async signUp(email: string, password: string, _fullName: string): Promise<{ data: any; error: any | null }> {
    const { isWhitelisted, error: whitelistError } = await this.isEmailWhitelisted(email);
    if (whitelistError || !isWhitelisted) {
      return { data: null, error: { message: "Email no autorizado para registrarse" } };
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { email } },
    });
    // El perfil se crea vía Supabase Trigger (handle_new_user) en el lado del servidor.
    // Si no hay trigger, se creará al primer acceso desde Profile.ts.
    return { data, error };
  },


  async signIn(email: string, password: string): Promise<{ data: any; error: any | null }> {
    const { isWhitelisted, error: whitelistError } = await this.isEmailWhitelisted(email);
    if (whitelistError || !isWhitelisted) {
      return { data: null, error: { message: "Email no autorizado para iniciar sesion" } };
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  },

  async signOut(): Promise<{ error: any | null }> {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  async sendPasswordResetEmail(email: string): Promise<{ data: any; error: any | null }> {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { data, error };
  },

  async establishRecoverySession(): Promise<{ session: any; error: any | null }> {
    const params = parseRecoveryParams(window.location.href);

    if (params.tokenHash) {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: params.tokenHash,
        type: 'recovery',
      });
      window.history.replaceState(null, '', '/reset-password');
      return { session: data.session, error };
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionData.session) {
      return { session: sessionData.session, error: sessionError };
    }

    if (params.code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
      window.history.replaceState(null, '', '/reset-password');
      return { session: data.session, error };
    }

    return { session: null, error: sessionError || { message: 'Auth session missing' } };
  },

  async updatePassword(newPassword: string): Promise<{ data: any; error: any | null }> {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      const recovered = await this.establishRecoverySession();
      if (!recovered.session) {
        return { data: null, error: { message: mapPasswordResetError(recovered.error?.message || 'Auth session missing') } };
      }
    }
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      return { data: null, error: { message: mapPasswordResetError(error.message) } };
    }
    return { data, error: null };
  },

  async getCurrentSession(): Promise<{ session: any; error: any | null }> {
    const { data, error } = await supabase.auth.getSession();
    return { session: data.session, error };
  },

  async getProfile(userId: string): Promise<{ data: any; error: any | null }> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    return { data, error };
  },

  async updateProfile(userId: string, profileData: any): Promise<{ data: any; error: any | null }> {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: userId, ...profileData })
      .select();
    return { data, error };
  },


  async getWhitelist(): Promise<{ data: any; error: any | null }> {
    const { data, error } = await supabase
      .from('email_whitelist')
      .select('*')
      .order('created_at', { ascending: false });
    return { data, error };
  },

  async saveSession(sessionData: any): Promise<{ data: any; error: any | null }> {
    const { data, error } = await supabase
      .from('training_sessions')
      .insert([sessionData])
      .select()
      .single();
    return { data, error };
  },

  async saveCloserUsage(usageData: any): Promise<{ data: any; error: any | null }> {
    const { data, error } = await supabase
      .from('closer_usage')
      .insert([usageData]);
    return { data, error };
  },

  async getTodayTrainingMinutes(userId: string): Promise<number> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
    const { data, error } = await supabase
      .from('training_sessions')
      .select('duration_sec')
      .eq('user_id', userId)
      .gte('started_at', startOfDay)
      .lt('started_at', endOfDay);
    if (error || !data) {return 0;}
    const totalSec = data.reduce((acc: number, s: any) => acc + (s.duration_sec || 0), 0);
    return Math.floor(totalSec / 60);
  },

  async getTodayCloserCount(userId: string): Promise<number> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
    const { data, error } = await supabase
      .from('closer_usage')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', startOfDay)
      .lt('created_at', endOfDay);
    if (error || !data) {return 0;}
    return data.length;
  },

  async getCurrentStreak(userId: string): Promise<{ current: number; max: number }> {
    const { data, error } = await supabase
      .from('daily_metrics')
      .select('day, training_minutes, total_minutes, closer_count, quiz_answers')
      .eq('user_id', userId)
      .order('day', { ascending: false });
    if (error || !data || data.length === 0) {return { current: 0, max: 0 };}
    const activeDays = data.filter((s: any) => s.training_minutes > 0 || s.closer_count > 0 || s.quiz_answers > 0);
    if (activeDays.length === 0) {return { current: 0, max: 0 };}
    const uniqueDates = [...new Set(activeDays.map((s: any) => s.day))].sort().reverse();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    let currentStreak = 0;
    if (uniqueDates[0] === todayStr || uniqueDates[0] === yesterdayStr) {
      currentStreak = 1;
      for (let i = 1; i < uniqueDates.length; i++) {
        const prev = new Date(uniqueDates[i - 1]);
        const curr = new Date(uniqueDates[i]);
        const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86400000);
        if (diffDays === 1) {currentStreak++;}
        else {break;}
      }
    }
    let maxStreak = 1;
    let tempStreak = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      const prev = new Date(uniqueDates[i - 1]);
      const curr = new Date(uniqueDates[i]);
      const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86400000);
      if (diffDays === 1) {tempStreak++; maxStreak = Math.max(maxStreak, tempStreak);}
      else {tempStreak = 1;}
    }
    return { current: currentStreak, max: Math.max(maxStreak, currentStreak) };
  },

  async getKnowledgeProgress(userId: string): Promise<number> {
    const MODULE_TOTALS: Record<string, number> = {
      'el-camino-del-lobo': 40,
      'rompe-la-barrera-del-no': 40,
      'ventas-spin': 40,
      'las-48-leyes-del-poder': 48,
    };
    const GRAND_TOTAL = 168;
    const { data, error } = await supabase
      .from('knowledge_progress')
      .select('module, progress_percent')
      .eq('user_id', userId);
    if (error || !data || data.length === 0) {return 0;}
    let totalAnswered = 0;
    data.forEach((row: any) => {
      const moduleTotal = MODULE_TOTALS[row.module] || 40;
      totalAnswered += Math.floor(((row.progress_percent || 0) / 100) * moduleTotal);
    });
    return Math.min(100, Math.round((totalAnswered / GRAND_TOTAL) * 100));
  },

  async getKnowledgeAnsweredCount(userId: string): Promise<number> {
    const MODULE_TOTALS: Record<string, number> = {
      'el-camino-del-lobo': 40,
      'rompe-la-barrera-del-no': 40,
      'ventas-spin': 40,
      'las-48-leyes-del-poder': 48,
    };
    const { data, error } = await supabase
      .from('knowledge_progress')
      .select('module, progress_percent')
      .eq('user_id', userId);
    if (error || !data) {return 0;}
    let total = 0;
    data.forEach((row: any) => {
      const moduleTotal = MODULE_TOTALS[row.module] || 40;
      total += Math.floor(((row.progress_percent || 0) / 100) * moduleTotal);
    });
    return total;
  },

  async saveModuleProgress(userId: string, module: string, answeredCount: number, totalQuestions: number): Promise<number> {
    const progressPercent = Math.min(100, Math.round((answeredCount / totalQuestions) * 100));
    const { error } = await supabase
      .from('knowledge_progress')
      .upsert({
        user_id: userId,
        module,
        progress_percent: progressPercent,
        last_activity_at: new Date().toISOString(),
      }, { onConflict: 'user_id,module' });
    if (error) {console.warn('Error guardando progreso de conocimiento:', error.message);}
    return progressPercent;
  },

  async getCampaignDay(userId: string): Promise<number> {
    const { data, error } = await supabase
      .from('daily_metrics')
      .select('day')
      .eq('user_id', userId)
      .order('day', { ascending: true })
      .limit(1);
    if (error || !data || data.length === 0) {return 1;}
    const start = new Date(data[0].day + 'T00:00:00');
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - start.getTime()) / 86400000) + 1;
    return Math.min(60, Math.max(1, diffDays));
  },

  async getWeeklyLeaderboard(): Promise<any[]> {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const weekStart = new Date(now);
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
    const weekStartStr = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
    const { data, error } = await supabase
      .from('daily_metrics')
      .select('user_id, training_minutes, total_minutes, closer_count, profiles(email, nickname, role)')
      .gte('day', weekStartStr);
    if (error || !data) {
      console.warn('Error fetching weekly leaderboard metrics:', error);
      return [];
    }
    const MODULE_TOTALS_LB: Record<string, number> = { 'el-camino-del-lobo': 40, 'rompe-la-barrera-del-no': 40, 'ventas-spin': 40, 'las-48-leyes-del-poder': 48 };
    const { data: kpData, error: kpError } = await supabase
      .from('knowledge_progress')
      .select('user_id, module, progress_percent');
    const userCorrectAnswers: Record<string, number> = {};
    if (!kpError && kpData) {
      kpData.forEach((row: any) => {
        const uid = row.user_id;
        const moduleTotal = MODULE_TOTALS_LB[row.module] || 40;
        const answered = Math.floor(((row.progress_percent || 0) / 100) * moduleTotal);
        userCorrectAnswers[uid] = (userCorrectAnswers[uid] || 0) + answered;
      });
    }
    const counts: Record<string, any> = {};
    data.forEach((row: any) => {
      if (row.profiles?.role === 'admin') {return;}
      const uid = row.user_id;
      if (!counts[uid]) {
        let displayName = 'Agente';
        if (row.profiles?.nickname) {displayName = row.profiles.nickname;}
        else if (row.profiles?.email) {displayName = row.profiles.email.split('@')[0];}
        counts[uid] = { user_id: uid, name: displayName, accumulated_mins: 0, accumulated_closer: 0 };
      }
      counts[uid].accumulated_mins += row.total_minutes || 0;
      counts[uid].accumulated_closer += row.closer_count || 0;
    });
    const leaderboard = Object.values(counts).map((user: any) => {
      const me = user.accumulated_mins;
      const mcl = user.accumulated_closer;
      const mc = userCorrectAnswers[user.user_id] || 0;
      return { user_id: user.user_id, name: user.name, points: Math.max(0, me + Math.floor(mcl * 0.5) + Math.floor(mc * 0.5)) };
    });
    return leaderboard.sort((a: any, b: any) => b.points - a.points);
  },

  async getPersonalRecords(userId: string): Promise<{ maxDailyMin: number; maxDailyCloser: number }> {
    const { data: sessions, error: sErr } = await supabase
      .from('training_sessions')
      .select('started_at, duration_sec')
      .eq('user_id', userId);
    const { data: closers, error: cErr } = await supabase
      .from('closer_usage')
      .select('created_at')
      .eq('user_id', userId);
    let maxDailyMin = 0;
    if (!sErr && sessions) {
      const byDay: Record<string, number> = {};
      sessions.forEach((s: any) => {
        const d = new Date(s.started_at);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        byDay[key] = (byDay[key] || 0) + (s.duration_sec || 0);
      });
      maxDailyMin = Math.floor(Math.max(0, ...Object.values(byDay)) / 60);
    }
    let maxDailyCloser = 0;
    if (!cErr && closers) {
      const byDay: Record<string, number> = {};
      closers.forEach((c: any) => {
        const d = new Date(c.created_at);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        byDay[key] = (byDay[key] || 0) + 1;
      });
      maxDailyCloser = Math.max(0, ...Object.values(byDay));
    }
    return { maxDailyMin, maxDailyCloser };
  },

  async getTodayDailyMetrics(userId: string): Promise<any> {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const { data, error } = await supabase
      .from('daily_metrics')
      .select('training_minutes, total_minutes, sessions, avg_score, closer_count, quiz_answers')
      .eq('user_id', userId)
      .eq('day', todayStr)
      .maybeSingle();
    if (error) {
      console.warn('Error fetching today daily_metrics:', error.message);
      return null;
    }
    return data;
  },

  async getDailyMetricsRange(userId: string | null = null, limit = 90): Promise<any[]> {
    let query = supabase
      .from('daily_metrics')
      .select('user_id, day, training_minutes, total_minutes, sessions, closer_count, quiz_answers')
      .order('day', { ascending: true })
      .limit(limit);
    if (userId) {query = query.eq('user_id', userId);}
    const { data, error } = await query;
    if (error) {
      console.warn('Error fetching daily_metrics range:', error.message);
      return [];
    }
    return data || [];
  },

  async getAllProfiles(role: string | null = null): Promise<any[]> {
    let profilesQuery = supabase.from('profiles').select('*');
    if (role) {profilesQuery = profilesQuery.eq('role', role);}
    const { data: profiles, error: profilesError } = await profilesQuery;
    if (profilesError) {
      console.warn('Error fetching profiles:', profilesError);
      return [];
    }
    return profiles || [];
  },

  async getAllKnowledgeProgress(): Promise<any[]> {
    const { data, error } = await supabase.from('knowledge_progress').select('user_id, progress_percent');
    if (error) {console.warn("Error fetching knowledge:", error);}
    return data || [];
  },

  async recordDailyLogin(userId: string): Promise<void> {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    try {
      const { data, error } = await supabase
        .from('daily_metrics')
        .select('id')
        .eq('user_id', userId)
        .eq('day', todayStr)
        .maybeSingle();
      if (error) {
        console.error('⛔ Error checking daily login metrics:', error.message, error);
        return;
      }
      if (!data) {
        const { error: insErr } = await supabase
          .from('daily_metrics')
          .insert({ user_id: userId, day: todayStr, training_minutes: 0, total_minutes: 0, sessions: 0, avg_score: 0 });
        if (insErr) {console.error('⛔ Error inserting daily login metrics:', insErr.message, insErr);}
      }
    } catch (err) {
      console.warn('Error in recordDailyLogin:', err);
    }
  },

  async recordDailyQuizAnswer(userId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('increment_daily_quiz_answer', { target_user_id: userId });
      if (error) {console.warn('Error recording quiz answer:', error.message);}
    } catch (err) {
      console.warn('Error recording daily quiz answer:', err);
    }
  },

  async getLoginStreak(userId: string): Promise<{ current: number; max: number }> {
    const { data, error } = await supabase
      .from('daily_metrics')
      .select('day')
      .eq('user_id', userId)
      .order('day', { ascending: false });
    if (error || !data || data.length === 0) {return { current: 0, max: 0 };}
    const uniqueDates = [...new Set(data.map((s: any) => s.day))].sort().reverse();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    let currentStreak = 0;
    if (uniqueDates[0] === todayStr || uniqueDates[0] === yesterdayStr) {
      currentStreak = 1;
      for (let i = 1; i < uniqueDates.length; i++) {
        const prev = new Date(uniqueDates[i - 1]);
        const curr = new Date(uniqueDates[i]);
        const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86400000);
        if (diffDays === 1) {currentStreak++;}
        else {break;}
      }
    }
    let maxStreak = currentStreak;
    let tempStreak = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      const prev = new Date(uniqueDates[i - 1]);
      const curr = new Date(uniqueDates[i]);
      const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86400000);
      if (diffDays === 1) {tempStreak++; maxStreak = Math.max(maxStreak, tempStreak);}
      else {tempStreak = 1;}
    }
    return { current: currentStreak, max: Math.max(maxStreak, currentStreak) };
  },

  async getMyCompany(): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {return null;}
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();
    if (!profile?.company_id) {return null;}
    const { data } = await supabase
      .from('companies')
      .select('*')
      .eq('id', profile.company_id)
      .single();
    return data || null;
  },

  async getAllCompanies(): Promise<any[]> {
    const { data, error } = await supabase
      .from('companies')
      .select('id, name, slug')
      .order('name');
    if (error) { console.warn('Error fetching all companies:', error); return []; }
    return data || [];
  },

  async getCompanyUsers(companyId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, nickname, first_name, last_name, role, avatar_url, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('Error fetching company users:', error);
      return [];
    }
    return data || [];
  },

  async getCompanyDailyMetrics(companyId: string, limit = 90): Promise<any[]> {
    const users = await this.getCompanyUsers(companyId);
    const userIds = users.map((u: any) => u.id);
    if (userIds.length === 0) {return [];}
    const { data, error } = await supabase
      .from('daily_metrics')
      .select('user_id, day, training_minutes, total_minutes, sessions, closer_count, quiz_answers')
      .in('user_id', userIds)
      .order('day', { ascending: true })
      .limit(limit * userIds.length);
    if (error) {
      console.warn('Error fetching company metrics:', error);
      return [];
    }
    return data || [];
  },

  async createInvitation(email: string, role = 'user'): Promise<{ data: any; error: any | null }> {
    const { data, error } = await supabase
      .from('company_invitations')
      .insert({ email, role })
      .select()
      .single();
    return { data, error };
  },

  async getCompanyInvitations(companyId: string, status: string | null = null): Promise<any[]> {
    let query = supabase
      .from('company_invitations')
      .select('*, invited_by_profile:invited_by(email, first_name, last_name)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (status === 'pending') {query = query.is('accepted_at', 'null');}
    else if (status === 'accepted') {query = query.not('accepted_at', 'is', 'null');}
    const { data, error } = await query;
    if (error) {
      console.warn('Error fetching invitations:', error);
      return [];
    }
    return data || [];
  },

  async revokeInvitation(invitationId: string): Promise<{ error: any | null }> {
    const { error } = await supabase
      .from('company_invitations')
      .delete()
      .eq('id', invitationId);
    return { error };
  }
};
