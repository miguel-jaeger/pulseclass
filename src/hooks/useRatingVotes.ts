import { useState, useCallback, useRef } from 'react'
import { insforge } from '../lib/insforge'
import { useAuth } from './useAuth'

export type VoteKind = 'comment' | 'suggestion'

interface VoteCounts {
  [key: string]: { likes: number; dislikes: number }
}

interface UserVotes {
  [key: string]: 'like' | 'dislike' | null
}

const KINDS: VoteKind[] = ['comment', 'suggestion']

export function voteKey(ratingId: string, kind: VoteKind): string {
  return `${ratingId}:${kind}`
}

function isKind(value: string): value is VoteKind {
  return KINDS.includes(value as VoteKind)
}

export function useRatingVotes() {
  const { user } = useAuth()
  const [voteCounts, setVoteCounts] = useState<VoteCounts>({})
  const [userVotes, setUserVotes] = useState<UserVotes>({})
  const userVotesRef = useRef<UserVotes>({})
  const voteCountsRef = useRef<VoteCounts>({})

  const applyVotes = useCallback((counts: VoteCounts, votes: UserVotes) => {
    voteCountsRef.current = counts
    userVotesRef.current = votes
    setVoteCounts(counts)
    setUserVotes(votes)
  }, [])

  const fetchVotes = useCallback(async (ratingIds: string[]) => {
    if (ratingIds.length === 0) return

    const { data: votesData } = await insforge.database
      .from('rating_votes')
      .select('rating_id, vote_type, user_id, kind')
      .in('rating_id', ratingIds)

    const counts: VoteCounts = {}
    const votes: UserVotes = {}

    for (const id of ratingIds) {
      for (const kind of KINDS) {
        counts[voteKey(id, kind)] = { likes: 0, dislikes: 0 }
        votes[voteKey(id, kind)] = null
      }
    }

    for (const v of (votesData || []) as { rating_id: string; vote_type: string; user_id: string; kind: string }[]) {
      const kind = isKind(v.kind) ? v.kind : 'comment'
      const key = voteKey(v.rating_id, kind)
      if (!counts[key]) counts[key] = { likes: 0, dislikes: 0 }

      if (v.vote_type === 'like') counts[key].likes++
      else counts[key].dislikes++

      if (v.user_id === user?.id) votes[key] = v.vote_type as 'like' | 'dislike'
    }

    applyVotes(counts, votes)
  }, [applyVotes, user?.id])

  const vote = useCallback(async (ratingId: string, voteType: 'like' | 'dislike', kind: VoteKind = 'comment') => {
    if (!user) return

    const key = voteKey(ratingId, kind)
    const currentVote = userVotesRef.current[key]
    const currentCounts = voteCountsRef.current[key] || { likes: 0, dislikes: 0 }

    if (currentVote === voteType) {
      const { error } = await insforge.database
        .from('rating_votes')
        .delete()
        .eq('rating_id', ratingId)
        .eq('user_id', user.id)
        .eq('kind', kind)

      if (!error) {
        const newVote = { ...userVotesRef.current, [key]: null }
        const newCounts = {
          ...voteCountsRef.current,
          [key]: {
            likes: currentCounts.likes - (voteType === 'like' ? 1 : 0),
            dislikes: currentCounts.dislikes - (voteType === 'dislike' ? 1 : 0)
          }
        }
        applyVotes(newCounts, newVote)
      }
      return
    }

    if (currentVote) {
      await insforge.database
        .from('rating_votes')
        .delete()
        .eq('rating_id', ratingId)
        .eq('user_id', user.id)
        .eq('kind', kind)
    }

    const { error } = await insforge.database
      .from('rating_votes')
      .insert([{ rating_id: ratingId, user_id: user.id, vote_type: voteType, kind }])

    if (!error) {
      const newVote = { ...userVotesRef.current, [key]: voteType }
      const newCounts = {
        ...voteCountsRef.current,
        [key]: {
          likes: currentCounts.likes + (voteType === 'like' ? 1 : 0) - (currentVote === 'like' ? 1 : 0),
          dislikes: currentCounts.dislikes + (voteType === 'dislike' ? 1 : 0) - (currentVote === 'dislike' ? 1 : 0)
        }
      }
      applyVotes(newCounts, newVote)
    }
  }, [applyVotes, user])

  return { voteCounts, userVotes, fetchVotes, vote }
}
