-- Mock dataset for NL → Safe SQL testing
-- Reference "today": 2026-06-03

-- ─── Conversations (15) ───────────────────────────────────────────
INSERT INTO conversations (title, status, created_at) VALUES
  ('Billing issue #1042',           'open',   '2026-05-28'),
  ('Refund request order 8821',     'closed', '2026-05-20'),
  ('Product feedback dashboard',    'open',   '2026-05-01'),
  ('Onboarding: invite team',       'open',   '2026-04-15'),
  ('Double charge subscription',    'open',   '2026-05-30'),
  ('Cancel annual plan',            'closed', '2026-05-10'),
  ('API rate limit question',       'open',   '2026-05-25'),
  ('Security: suspicious login',    'open',   '2026-05-29'),
  ('Feature request dark mode',     'open',   '2026-04-28'),
  ('Enterprise pricing inquiry',    'closed', '2026-03-12'),
  ('Password reset not working',    'closed', '2026-05-18'),
  ('Export CSV broken',             'open',   '2026-05-27'),
  ('Mobile app crash on launch',    'open',   '2026-05-31'),
  ('Partnership proposal',          'closed', '2026-02-01'),
  ('Holiday support hours',         'closed', '2026-01-10');

-- ─── Messages (28) ────────────────────────────────────────────────
INSERT INTO messages (conversation_id, role, content, created_at) VALUES
  -- 1 billing
  (1,  'user',      'I was charged twice for my subscription last month', '2026-05-28'),
  (1,  'assistant', 'Let me check your billing history for duplicate charges', '2026-05-28'),
  -- 2 refund
  (2,  'user',      'Please process a refund for order 8821', '2026-05-20'),
  (2,  'assistant', 'Your refund request has been submitted to billing', '2026-05-20'),
  -- 3 feedback
  (3,  'user',      'The new dashboard layout is confusing', '2026-05-01'),
  (3,  'assistant', 'Thanks for the feedback, we are iterating on the UI', '2026-05-02'),
  -- 4 onboarding
  (4,  'user',      'How do I invite team members to my workspace?', '2026-04-15'),
  (4,  'assistant', 'Go to Settings → Team → Invite by email', '2026-04-15'),
  -- 5 double charge
  (5,  'user',      'Another duplicate billing charge appeared on my card', '2026-05-30'),
  (5,  'assistant', 'I escalated this to our billing team', '2026-05-30'),
  -- 6 cancel
  (6,  'user',      'I want to cancel my annual subscription', '2026-05-10'),
  (6,  'assistant', 'Cancellation confirmed, refund prorated', '2026-05-11'),
  -- 7 API
  (7,  'user',      'Why am I hitting API rate limits on the free tier?', '2026-05-25'),
  (7,  'assistant', 'Upgrade to Pro for higher rate limits', '2026-05-25'),
  -- 8 security
  (8,  'user',      'I see a suspicious login from another country', '2026-05-29'),
  (8,  'assistant', 'We locked the account and sent a password reset', '2026-05-29'),
  -- 9 dark mode
  (9,  'user',      'Please add dark mode to the web app', '2026-04-28'),
  -- 10 enterprise
  (10, 'user',      'Looking for enterprise pricing for 500 seats', '2026-03-12'),
  (10, 'assistant', 'Sales will contact you within 2 business days', '2026-03-13'),
  -- 11 password
  (11, 'user',      'Password reset email never arrived', '2026-05-18'),
  (11, 'assistant', 'Try the alternate reset link we sent', '2026-05-18'),
  -- 12 export
  (12, 'user',      'Export to CSV fails with error 500', '2026-05-27'),
  (12, 'assistant', 'Engineering is investigating the export bug', '2026-05-27'),
  -- 13 mobile
  (13, 'user',      'Mobile app crashes immediately on launch', '2026-05-31'),
  (13, 'assistant', 'Please update to version 3.2.1 from the store', '2026-05-31'),
  -- 14 partnership
  (14, 'user',      'We would like to discuss a technology partnership', '2026-02-01'),
  -- 15 holiday
  (15, 'user',      'What are support hours during the holidays?', '2026-01-10'),
  (15, 'assistant', 'Limited support Dec 24–Jan 2', '2026-01-10');

-- ─── Tags (10) ────────────────────────────────────────────────────
INSERT INTO tags (name) VALUES
  ('billing'),
  ('refund'),
  ('feedback'),
  ('support'),
  ('security'),
  ('api'),
  ('enterprise'),
  ('bug'),
  ('mobile'),
  ('onboarding');

-- ─── Conversation ↔ Tag links ─────────────────────────────────────
INSERT INTO conversation_tags (conversation_id, tag_id) VALUES
  (1,  1),  -- billing
  (1,  4),  -- support
  (2,  2),  -- refund
  (2,  1),  -- billing
  (3,  3),  -- feedback
  (4,  10), -- onboarding
  (5,  1),  -- billing
  (5,  2),  -- refund
  (6,  1),  -- billing
  (7,  6),  -- api
  (8,  5),  -- security
  (9,  3),  -- feedback
  (10, 7),  -- enterprise
  (11, 5),  -- security
  (11, 4),  -- support
  (12, 8),  -- bug
  (13, 9),  -- mobile
  (13, 8),  -- bug
  (14, 7),  -- enterprise
  (15, 4);  -- support