 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { useState, useCallback, useRef } from 'react'
import { insforge } from '../lib/insforge'
import { useAuth } from './useAuth'









export function useRatingVotes() {
  const { user } = useAuth()
  const [voteCounts, setVoteCounts] = useState({})
  const [userVotes, setUserVotes] = useState({})
  const userVotesRef = useRef({})
  const voteCountsRef = useRef({})

  const fetchVotes = useCallback(async (ratingIds) => {
    if (ratingIds.length === 0) return

    const { data: votesData } = await insforge.database
      .from('rating_votes')
      .select('rating_id, vote_type, user_id')
      .in('rating_id', ratingIds)

    const counts = {}
    const votes = {}

    for (const id of ratingIds) {
      counts[id] = { likes: 0, dislikes: 0 }
      votes[id] = null
    }

    for (const v of (votesData || []) ) {
      if (v.vote_type === 'like') counts[v.rating_id].likes++
      else counts[v.rating_id].dislikes++

      if (v.user_id === _optionalChain([user, 'optionalAccess', _ => _.id])) {
        votes[v.rating_id] = v.vote_type 
      }
    }

    voteCountsRef.current = counts
    userVotesRef.current = votes
    setVoteCounts(counts)
    setUserVotes(votes)
  }, [_optionalChain([user, 'optionalAccess', _2 => _2.id])])

  const vote = useCallback(async (ratingId, voteType) => {
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
