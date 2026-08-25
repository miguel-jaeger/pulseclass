import { useState, useCallback } from 'react'
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
  const [loading, setLoading] = useState(false)

  const fetchVotes = useCallback(async (ratingIds: string[]) => {
    if (ratingIds.length === 0) return
    setLoading(true)

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

    setVoteCounts(counts)
    setUserVotes(votes)
    setLoading(false)
  }, [user?.id])

  const vote = useCallback(async (ratingId: string, voteType: 'like' | 'dislike') => {
    if (!user) return

    const currentVote = userVotes[ratingId]

    if (currentVote === voteType) {
      const { error } = await insforge.database
        .from('rating_votes')
        .delete()
        .eq('rating_id', ratingId)
        .eq('user_id', user.id)

      if (!error) {
        setUserVotes(prev => ({ ...prev, [ratingId]: null }))
        setVoteCounts(prev => ({
          ...prev,
          [ratingId]: {
            ...prev[ratingId],
            likes: prev[ratingId].likes - (voteType === 'like' ? 1 : 0),
            dislikes: prev[ratingId].dislikes - (voteType === 'dislike' ? 1 : 0)
          }
        }))
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
        setUserVotes(prev => ({ ...prev, [ratingId]: voteType }))
        setVoteCounts(prev => {
          const prevVotes = prev[ratingId] || { likes: 0, dislikes: 0 }
          return {
            ...prev,
            [ratingId]: {
              likes: prevVotes.likes + (voteType === 'like' ? 1 : 0) - (currentVote === 'like' ? 1 : 0),
              dislikes: prevVotes.dislikes + (voteType === 'dislike' ? 1 : 0) - (currentVote === 'dislike' ? 1 : 0)
            }
          }
        })
      }
    }
  }, [user, userVotes])

  return { voteCounts, userVotes, loading, fetchVotes, vote }
}
