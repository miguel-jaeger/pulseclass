-- Distinguish whether a reply belongs to the comment or the suggestion of the
-- same rating, so a reply is not duplicated across both tabs.
ALTER TABLE comment_replies
  ADD COLUMN IF NOT EXISTS reply_type TEXT NOT NULL DEFAULT 'comment';

CREATE INDEX IF NOT EXISTS idx_comment_replies_reply_type ON comment_replies(reply_type);
