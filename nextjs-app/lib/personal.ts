import type { User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './supabase'

export async function currentUser(): Promise<User | null> {
  if (!isSupabaseConfigured) return null
  const { data } = await supabase.auth.getUser()
  return data.user
}

export async function recordSageView(userId: string, sageId: string) {
  return supabase.from('user_history').insert({ user_id: userId, sage_id: sageId })
}

export async function loadSageMemory(userId: string, sageId: string) {
  const [bookmarkResult, noteResult] = await Promise.all([
    supabase
      .from('bookmarks')
      .select('sage_id')
      .eq('user_id', userId)
      .eq('sage_id', sageId)
      .maybeSingle(),
    supabase
      .from('user_history')
      .select('note')
      .eq('user_id', userId)
      .eq('sage_id', sageId)
      .not('note', 'is', null)
      .order('viewed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  return {
    bookmarked: Boolean(bookmarkResult.data),
    note: noteResult.data?.note ?? '',
  }
}

export async function setSageBookmark(userId: string, sageId: string, bookmarked: boolean) {
  if (bookmarked) {
    return supabase.from('bookmarks').upsert({ user_id: userId, sage_id: sageId })
  }
  return supabase.from('bookmarks').delete().eq('user_id', userId).eq('sage_id', sageId)
}

export async function saveSageNote(userId: string, sageId: string, note: string) {
  return supabase.from('user_history').insert({
    user_id: userId,
    sage_id: sageId,
    note: note.trim(),
  })
}
