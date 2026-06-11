-- Hotel guest inbox mock data for NL → Safe SQL testing
-- Reference "today": 2026-06-03

-- ─── Conversations (20) ───────────────────────────────────────────
INSERT INTO conversations (guest_name, channel, created_at, status) VALUES
  ('Anna Müller',    'email',     '2026-05-28', 'open'),
  ('James Wilson',   'whatsapp',  '2026-05-30', 'open'),
  ('Sofia Rossi',    'email',     '2026-05-20', 'closed'),
  ('Anna Müller',    'whatsapp',  '2026-05-29', 'open'),
  ('Carlos Vega',    'email',     '2026-05-31', 'open'),
  ('James Wilson',   'email',     '2026-05-10', 'closed'),
  ('Elena Petrova',  'whatsapp',  '2026-05-25', 'open'),
  ('Sofia Rossi',    'whatsapp',  '2026-05-27', 'open'),
  ('Carlos Vega',    'whatsapp',  '2026-04-28', 'open'),
  ('Elena Petrova',  'email',     '2026-03-12', 'closed'),
  ('Anna Müller',    'email',     '2026-05-18', 'closed'),
  ('James Wilson',   'whatsapp',  '2026-05-27', 'open'),
  ('Carlos Vega',    'email',     '2026-05-29', 'open'),
  ('Sofia Rossi',    'email',     '2026-02-01', 'closed'),
  ('Elena Petrova',  'whatsapp',  '2026-01-10', 'closed'),
  ('Tom Baker',      'email',     '2026-06-04', 'open'),
  ('Tom Baker',      'whatsapp',  '2026-06-04', 'open'),
  ('Lina Park',      'email',     '2026-06-04', 'open'),
  ('Lina Park',      'whatsapp',  '2026-05-15', 'open'),
  ('Tom Baker',      'email',     '2026-05-01', 'closed');

-- ─── Messages ─────────────────────────────────────────────────────
INSERT INTO messages (conversation_id, direction, body, sent_at) VALUES
  -- 1 Anna email billing
  (1,  'incoming', 'I was charged twice for my room', '2026-05-28'),
  (1,  'outgoing', 'Let me check your billing history', '2026-05-28'),
  -- 2 James whatsapp complaint+breakfast
  (2,  'incoming', 'The breakfast buffet was cold this morning', '2026-05-30'),
  (2,  'outgoing', 'We apologize and will speak with kitchen staff', '2026-05-30'),
  -- 3 Sofia email closed
  (3,  'incoming', 'Please confirm late checkout', '2026-05-20'),
  (3,  'outgoing', 'Late checkout confirmed until 2pm', '2026-05-20'),
  -- 4 Anna whatsapp room_order
  (4,  'incoming', 'Can I order room service breakfast for tomorrow?', '2026-05-29'),
  (4,  'outgoing', 'Room service menu sent to your phone', '2026-05-29'),
  -- 5 Carlos email complaint
  (5,  'incoming', 'Noise from the hallway all night', '2026-05-31'),
  (5,  'outgoing', 'Security has been notified', '2026-05-31'),
  -- 6 James email closed
  (6,  'incoming', 'Thanks for a wonderful stay', '2026-05-10'),
  (6,  'outgoing', 'Thank you for staying with us', '2026-05-11'),
  -- 7 Elena whatsapp
  (7,  'incoming', 'Hi, is the spa open today?', '2026-05-25'),
  (7,  'outgoing', 'Spa hours are 9am to 8pm', '2026-05-25'),
  -- 8 Sofia whatsapp complaint+breakfast
  (8,  'incoming', 'Breakfast options were limited and cold', '2026-05-27'),
  (8,  'outgoing', 'We will improve breakfast service tomorrow', '2026-05-27'),
  -- 9 Carlos whatsapp old
  (9,  'incoming', 'Pool towels are missing again', '2026-04-28'),
  (9,  'outgoing', 'Housekeeping is on the way', '2026-04-28'),
  -- 10 Elena email closed
  (10, 'incoming', 'Corporate rate inquiry for 20 rooms', '2026-03-12'),
  (10, 'outgoing', 'Sales will contact you within 2 days', '2026-03-13'),
  -- 11 Anna email closed
  (11, 'incoming', 'Password for wifi not working', '2026-05-18'),
  (11, 'outgoing', 'Here is a new wifi code', '2026-05-18'),
  -- 12 James whatsapp unanswered (incoming only)
  (12, 'incoming', 'Hi, can I get extra pillows?', '2026-05-27'),
  -- 13 Carlos email open recent
  (13, 'incoming', 'Air conditioning is too loud', '2026-05-29'),
  (13, 'outgoing', 'Maintenance will visit shortly', '2026-05-29'),
  -- 14 Sofia email old closed
  (14, 'incoming', 'Group booking for next summer', '2026-02-01'),
  (14, 'outgoing', 'Events team will follow up', '2026-02-02'),
  -- 15 Elena whatsapp old closed
  (15, 'incoming', 'Holiday opening hours?', '2026-01-10'),
  (15, 'outgoing', 'Limited hours Dec 24-Jan 2', '2026-01-10'),
  -- 16 Tom tomorrow email unanswered
  (16, 'incoming', 'Hi, arriving tomorrow — early check-in possible?', '2026-06-04'),
  -- 17 Tom tomorrow whatsapp
  (17, 'incoming', 'Hi, we land at 10am tomorrow', '2026-06-04'),
  (17, 'outgoing', 'Early check-in noted', '2026-06-04'),
  -- 18 Lina tomorrow email unanswered
  (18, 'incoming', 'Hi, need a crib in the room tomorrow', '2026-06-04'),
  -- 19 Lina whatsapp with multiple incoming
  (19, 'incoming', 'Hi, is parking included?', '2026-05-15'),
  (19, 'incoming', 'Also need directions from the airport', '2026-05-16'),
  (19, 'outgoing', 'Parking is included; directions sent', '2026-05-16'),
  -- 20 Tom old closed
  (20, 'incoming', 'Thanks for everything', '2026-05-01'),
  (20, 'outgoing', 'We hope to welcome you again', '2026-05-01');

-- June messages for send vs receive stats
INSERT INTO messages (conversation_id, direction, body, sent_at) VALUES
  (1,  'incoming', 'Follow-up on the double charge', '2026-06-01'),
  (1,  'outgoing', 'Refund initiated', '2026-06-01'),
  (2,  'incoming', 'Breakfast was better today', '2026-06-02'),
  (5,  'incoming', 'Still hearing noise at night', '2026-06-02'),
  (12, 'incoming', 'Any update on the pillows?', '2026-06-01');

-- Messages with starts_with / ends_with test patterns
INSERT INTO messages (conversation_id, direction, body, sent_at) VALUES
  (7,  'incoming', 'Hi there, quick question about gym hours', '2026-05-26'),
  (11, 'incoming', 'All sorted now, thanks', '2026-05-19');

-- ─── Tags ─────────────────────────────────────────────────────────
INSERT INTO tags (conversation_id, label) VALUES
  (1,  'billing'),
  (2,  'complaint'),
  (3,  'support'),
  (4,  'room_order'),
  (5,  'complaint'),
  (6,  'feedback'),
  (7,  'support'),
  (8,  'complaint'),
  (9,  'support'),
  (10, 'corporate'),
  (11, 'support'),
  (13, 'complaint'),
  (14, 'corporate'),
  (15, 'support'),
  (19, 'support');

-- Untagged conversations: 12, 16, 17, 18, 20