import { useState, useCallback, useRef } from 'react'
import { insforge } from '../lib/insforge'
import { useAuth } from './useAuth'

interface VoteCounts {
  [ratingId: string]: { likes: number; dislikes: number }
}

interface UserVotes {
  [ratingId: string]: 'like' | 'dislike' | null
}

export function useRatingVotes() {
  const { user } = useAuth()
  const [voteCounts, setVoteCounts] = useState<VoteCounts>({})
  const [userVotes, setUserVotes] = useState<UserVotes>({})
  const userVotesRef = useRef<UserVotes>({})
  const voteCountsRef = useRef<VoteCounts>({})

  const fetchVotes = useCallback(async (ratingIds: string[]) => {
    if (ratingIds.length === 0) return

    const { data: votesData } = await insforge.database
      .from('rating_votes')
      .select('rating_id, vote_type, user_id')
      .in('rating_id', ratingIds)

    const counts: VoteCounts = {}
    const votes: UserVotes = {}

    for (const id of ratingIds) {
      counts[id] = { likes: 0, dislikes: 0 }
      votes[id] = null
    }

    for (const v of (votesData || []) as { rating_id: string; vote_type: string; user_id: string }[]) {
      if (v.vote_type === 'like') counts[v.rating_id].likes++
      else counts[v.rating_id].dislikes++

      if (v.user_id === user?.id) {
        votes[v.rating_id] = v.vote_type as 'like' | 'dislike'
      }
    }

    voteCountsRef.current = counts
    userVotesRef.current = votes
    setVoteCounts(counts)
    setUserVotes(votes)
  }, [user?.id])

  const vote = useCallback(async (ratingId: string, voteType: 'like' | 'dislike') => {
    if (!user) return

    const currentVote = userVotesRef.current[ratingId]
    const currentCounts = voteCountsRef.current[ratingId] || { likes: 0, dislikes: 0 }

    if (currentVote === voteType) {
      const { error } = await insforge.database
        .from('rating_votes')
        .delete()
        .eq('rating_id', ratingId)
        .eq('user_id', user.id)

      if (!error) {
        const newVote = { ...userVotesRef.current, [ratingId]: null }
        const newCounts = {
          ...voteCountsRef.current,
          [ratingId]: {
            likes: currentCounts.likes - (voteType === 'like' ? 1 : 0),
            dislikes: currentCounts.dislikes - (voteType === 'dislike' ? 1 : 0)
          }
        }
        userVotesRef.current = newVote
        voteCountsRef.current = newCounts
        setUserVotes(newVote)
        setVoteCounts(newCounts)
      }
    } else {
      if (currentVote) {
        await insforge.database
          .from('rating_votes')
          .delete()
          .eq('rating_id', ratingId)
          .eq('user_id', user.id)
      }

      const { error } = await insforge.database
        .from('rating_votes')
        .insert([{ rating_id: ratingId, user_id: user.id, vote_type: voteType }])

      if (!error) {
        const newVote = { ...userVotesRef.current, [ratingId]: voteType }
        const newCounts = {
          ...voteCountsRef.current,
          [ratingId]: {
            likes: currentCounts.likes + (voteType === 'like' ? 1 : 0) - (currentVote === 'like' ? 1 : 0),
            dislikes: currentCounts.dislikes + (voteType === 'dislike' ? 1 : 0) - (currentVote === 'dislike' ? 1 : 0)
          }
        }
        userVotesRef.current = newVote
        voteCountsRef.current = newCounts
        setUserVotes(newVote)
        setVoteCounts(newCounts)
      }
    }
  }, [user])

  return { voteCounts, userVotes, fetchVotes, vote }
}
